import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatCompletionStream } from 'src/services/chatService';

const encoder = new TextEncoder();

describe('chatService SSE parsing', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('chatCompletionStream 应正确解析按事件帧分隔的多行 SSE 数据', async () => {
        const streamPayload = [
            'data: {"stream_id":"stream-1"}\n\n',
            'event: message\n',
            'data: {"id":"chunk-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-2","object":"chat.completion.chunk",\n',
            'data: "choices":[{"index":0,"delta":{"reasoning_content":"先分析"},"finish_reason":null}],\n',
            'data: "tool_events":[{"iteration":1,"tools":["search_videos"]}]}\n\n',
            'data: {"id":"chunk-3","object":"chat.completion.chunk",\n',
            'data: "choices":[{"index":0,"delta":{"content":"最终答案"},"finish_reason":"stop"}],\n',
            'data: "usage":{"total_tokens":3},"perf_stats":{"tokens_per_second":1,"total_elapsed":"1s","total_elapsed_ms":1000}}\n\n',
            'data: [DONE]\n\n',
        ];

        const response = new Response(
            new ReadableStream({
                start(controller) {
                    for (const chunk of streamPayload) {
                        controller.enqueue(encoder.encode(chunk));
                    }
                    controller.close();
                },
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'text/event-stream' },
            }
        );

        vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

        const callbacks = {
            onStreamId: vi.fn(),
            onStart: vi.fn(),
            onThinking: vi.fn(),
            onContent: vi.fn(),
            onToolEvent: vi.fn(),
            onDone: vi.fn(),
            onError: vi.fn(),
        };

        await chatCompletionStream(
            {
                messages: [{ role: 'user', content: '测试' }],
                thinking: true,
            },
            callbacks
        );

        expect(callbacks.onStreamId).toHaveBeenCalledWith('stream-1');
        expect(callbacks.onStart).toHaveBeenCalledTimes(1);
        expect(callbacks.onThinking).toHaveBeenCalledWith('先分析');
        expect(callbacks.onContent).toHaveBeenCalledWith('最终答案');
        expect(callbacks.onToolEvent).toHaveBeenCalledWith({
            iteration: 1,
            tools: ['search_videos'],
        });
        expect(callbacks.onDone).toHaveBeenCalledWith(
            {
                tokens_per_second: 1,
                total_elapsed: '1s',
                total_elapsed_ms: 1000,
            },
            {
                total_tokens: 3,
            },
            undefined
        );
        expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('同一读取批次里的 content 和 finish 应先让内容对 UI 可见', async () => {
        vi.useFakeTimers();

        const response = new Response(
            new ReadableStream({
                start(controller) {
                    controller.enqueue(
                        encoder.encode(
                            [
                                'data: {"stream_id":"stream-2"}\n\n',
                                'data: {"id":"chunk-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n',
                                'data: {"id":"chunk-2","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"先看到答案"},"finish_reason":null}]}\n\n',
                                'data: {"id":"chunk-3","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"total_tokens":3}}\n\n',
                                'data: [DONE]\n\n',
                            ].join('')
                        )
                    );
                    controller.close();
                },
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'text/event-stream' },
            }
        );

        vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

        let resolveContentSeen: (() => void) | undefined;
        const contentSeen = new Promise<void>((resolve) => {
            resolveContentSeen = resolve;
        });

        const callbacks = {
            onStreamId: vi.fn(),
            onStart: vi.fn(),
            onContent: vi.fn(() => resolveContentSeen?.()),
            onDone: vi.fn(),
            onError: vi.fn(),
        };

        const streamPromise = chatCompletionStream(
            {
                messages: [{ role: 'user', content: '测试' }],
                thinking: true,
            },
            callbacks
        );

        await contentSeen;

        expect(callbacks.onContent).toHaveBeenCalledWith('先看到答案');
        expect(callbacks.onDone).not.toHaveBeenCalled();

        await vi.runAllTimersAsync();
        await streamPromise;

        expect(callbacks.onDone).toHaveBeenCalledWith(
            undefined,
            {
                total_tokens: 3,
            },
            undefined
        );
        expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('chatCompletionStream 应处理 retract_content 与 pending/completed tool events', async () => {
        const streamPayload = [
            'data: {"stream_id":"stream-3"}\n\n',
            'data: {"id":"chunk-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-2","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"先规划一下"},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-3","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"retract_content":true},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-4","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"reasoning_content":"先规划一下"},"finish_reason":null}],"tool_events":[{"iteration":1,"tools":["search_videos"],"calls":[{"type":"search_videos","args":{"queries":["黑神话"]},"status":"pending"}]}]}\n\n',
            'data: {"id":"chunk-5","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":null}],"tool_events":[{"iteration":1,"tools":["search_videos"],"calls":[{"type":"search_videos","args":{"queries":["黑神话"]},"status":"completed","result":{"hits":[]}}]}]}\n\n',
            'data: {"id":"chunk-6","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"最终答案"},"finish_reason":"stop"}],"usage":{"total_tokens":6}}\n\n',
            'data: [DONE]\n\n',
        ];

        const response = new Response(
            new ReadableStream({
                start(controller) {
                    for (const chunk of streamPayload) {
                        controller.enqueue(encoder.encode(chunk));
                    }
                    controller.close();
                },
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'text/event-stream' },
            }
        );

        vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

        const callbacks = {
            onStreamId: vi.fn(),
            onStart: vi.fn(),
            onContent: vi.fn(),
            onThinking: vi.fn(),
            onRetractContent: vi.fn(),
            onToolEvent: vi.fn(),
            onDone: vi.fn(),
            onError: vi.fn(),
        };

        await chatCompletionStream(
            {
                messages: [{ role: 'user', content: '测试' }],
                thinking: true,
            },
            callbacks
        );

        expect(callbacks.onRetractContent).toHaveBeenCalledTimes(1);
        expect(callbacks.onThinking).toHaveBeenCalledWith('先规划一下');
        expect(callbacks.onToolEvent).toHaveBeenCalledTimes(2);
        expect(callbacks.onToolEvent).toHaveBeenNthCalledWith(1, {
            iteration: 1,
            tools: ['search_videos'],
            calls: [
                {
                    type: 'search_videos',
                    args: { queries: ['黑神话'] },
                    status: 'pending',
                },
            ],
        });
        expect(callbacks.onToolEvent).toHaveBeenNthCalledWith(2, {
            iteration: 1,
            tools: ['search_videos'],
            calls: [
                {
                    type: 'search_videos',
                    args: { queries: ['黑神话'] },
                    status: 'completed',
                    result: { hits: [] },
                },
            ],
        });
        expect(callbacks.onContent).toHaveBeenCalledWith('先规划一下');
        expect(callbacks.onContent).toHaveBeenCalledWith('最终答案');
        expect(callbacks.onDone).toHaveBeenCalledWith(undefined, {
            total_tokens: 6,
        }, undefined);
        expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('chatCompletionStream 应处理 reasoning reset 事件', async () => {
        const streamPayload = [
            'data: {"stream_id":"stream-3b"}\n\n',
            'data: {"id":"chunk-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-2","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"reset_reasoning":true,"reasoning_phase":"planner"},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-3","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"reasoning_content":"先读转写"},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-4","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"reset_reasoning":true,"reasoning_phase":"response"},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-5","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"reasoning_content":"再整理回答"},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-6","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"最终答案"},"finish_reason":"stop"}],"usage":{"total_tokens":5}}\n\n',
            'data: [DONE]\n\n',
        ];

        const response = new Response(
            new ReadableStream({
                start(controller) {
                    for (const chunk of streamPayload) {
                        controller.enqueue(encoder.encode(chunk));
                    }
                    controller.close();
                },
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'text/event-stream' },
            }
        );

        vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

        const callbacks = {
            onStreamId: vi.fn(),
            onStart: vi.fn(),
            onThinking: vi.fn(),
            onResetThinking: vi.fn(),
            onContent: vi.fn(),
            onDone: vi.fn(),
            onError: vi.fn(),
        };

        await chatCompletionStream(
            {
                messages: [{ role: 'user', content: '测试' }],
                thinking: true,
            },
            callbacks
        );

        expect(callbacks.onResetThinking).toHaveBeenNthCalledWith(1, 'planner');
        expect(callbacks.onResetThinking).toHaveBeenNthCalledWith(2, 'response');
        expect(callbacks.onThinking).toHaveBeenNthCalledWith(1, '先读转写');
        expect(callbacks.onThinking).toHaveBeenNthCalledWith(2, '再整理回答');
        expect(callbacks.onContent).toHaveBeenCalledWith('最终答案');
        expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('chatCompletionStream 应在 EOF flush 时保留最后一个 done 事件', async () => {
        vi.useFakeTimers();

        const streamPayload = [
            'data: {"stream_id":"stream-4"}\n\n',
            'data: {"id":"chunk-1","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-2","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"最终答案"},"finish_reason":null}]}\n\n',
            'data: {"id":"chunk-3","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"total_tokens":9}}',
        ];

        const response = new Response(
            new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(streamPayload.join('')));
                    controller.close();
                },
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'text/event-stream' },
            }
        );

        vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

        const callbacks = {
            onStreamId: vi.fn(),
            onStart: vi.fn(),
            onContent: vi.fn(),
            onDone: vi.fn(),
            onError: vi.fn(),
        };

        const streamPromise = chatCompletionStream(
            {
                messages: [{ role: 'user', content: '测试 EOF flush' }],
            },
            callbacks
        );

        await vi.runAllTimersAsync();
        await streamPromise;

        expect(callbacks.onContent).toHaveBeenCalledWith('最终答案');
        expect(callbacks.onDone).toHaveBeenCalledWith(
            undefined,
            {
                total_tokens: 9,
            },
            undefined
        );
        expect(callbacks.onError).not.toHaveBeenCalled();
    });
});