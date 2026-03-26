import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatCompletionStream } from 'src/services/chatService';

const encoder = new TextEncoder();

describe('chatService SSE parsing', () => {
    afterEach(() => {
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
            }
        );
        expect(callbacks.onError).not.toHaveBeenCalled();
    });
});