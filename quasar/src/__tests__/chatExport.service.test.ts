import { describe, expect, it } from 'vitest';
import {
    DEFAULT_CHAT_EXPORT_OPTIONS,
    cloneChatExportOptions,
    generateChatExport,
} from 'src/services/chatExport';
import type { ChatExportSessionBundle } from 'src/stores/chatStore';

const sampleBundle: ChatExportSessionBundle = {
    schemaVersion: 2,
    capturedAt: 1713500000000,
    exportedAt: 1713500100000,
    currentHistoryRecordId: 'history-1',
    session: {
        sessionId: 'session-export-1',
        query: '这期视频讲了什么？',
        mode: 'think',
        content: '最终回答',
        thinkingContent: '汇总思考',
        isLoading: false,
        isThinkingPhase: false,
        isDone: true,
        isAborted: false,
        error: null,
        perfStats: {
            tokens_per_second: 25,
            total_elapsed: '12s',
            total_elapsed_ms: 12000,
        },
        usage: {
            prompt_tokens: 1200,
            completion_tokens: 320,
        },
        usageTrace: {
            models: {
                planner: {
                    config: 'planner',
                    model: 'planner-model',
                },
                response: {
                    config: 'response',
                    model: 'response-model',
                },
            },
        },
        toolEvents: [
            {
                iteration: 1,
                tools: ['get_video_transcript'],
                calls: [
                    {
                        type: 'get_video_transcript',
                        args: { video_id: 'BV1xx411c7mD', head_chars: 20000 },
                        status: 'completed',
                        result: { title: '示例视频', transcript: { text: '示例转写' } },
                    },
                ],
            },
        ],
        streamSegments: [
            { type: 'thinking', content: '第一段思考' },
            {
                type: 'tool',
                toolEvent: {
                    iteration: 1,
                    tools: ['get_video_transcript'],
                    calls: [
                        {
                            type: 'get_video_transcript',
                            args: { video_id: 'BV1xx411c7mD', head_chars: 20000 },
                            status: 'completed',
                            result: { title: '示例视频', transcript: { text: '示例转写' } },
                        },
                    ],
                },
            },
        ],
        thinking: true,
        createdAt: 1713499999000,
    },
    conversationHistory: [
        {
            id: 'u-1',
            createdAt: 1713499999000,
            role: 'user',
            content: '这期视频讲了什么？',
        },
        {
            id: 'a-1',
            createdAt: 1713500005000,
            role: 'assistant',
            content: '最终回答',
            thinkingContent: '汇总思考',
            toolEvents: [
                {
                    iteration: 1,
                    tools: ['get_video_transcript'],
                    calls: [
                        {
                            type: 'get_video_transcript',
                            args: { video_id: 'BV1xx411c7mD', head_chars: 20000 },
                            status: 'completed',
                            result: { title: '示例视频', transcript: { text: '示例转写' } },
                        },
                    ],
                },
            ],
            streamSegments: [
                { type: 'thinking', content: '第一段思考' },
            ],
            perfStats: {
                tokens_per_second: 25,
                total_elapsed: '12s',
                total_elapsed_ms: 12000,
            },
            usage: {
                prompt_tokens: 1200,
                completion_tokens: 320,
            },
            usageTrace: {
                models: {
                    response: {
                        config: 'response',
                        model: 'response-model',
                    },
                },
            },
        },
    ],
    rounds: [
        {
            index: 1,
            phase: 'historical',
            status: 'completed',
            user: {
                id: 'u-1',
                createdAt: 1713499999000,
                role: 'user',
                content: '这期视频讲了什么？',
            },
            assistant: {
                id: 'a-1',
                createdAt: 1713500005000,
                role: 'assistant',
                content: '最终回答',
                thinkingContent: '汇总思考',
                toolEvents: [
                    {
                        iteration: 1,
                        tools: ['get_video_transcript'],
                        calls: [
                            {
                                type: 'get_video_transcript',
                                args: { video_id: 'BV1xx411c7mD', head_chars: 20000 },
                                status: 'completed',
                                result: { title: '示例视频', transcript: { text: '示例转写' } },
                            },
                        ],
                    },
                ],
                streamSegments: [
                    { type: 'thinking', content: '第一段思考' },
                ],
                perfStats: {
                    tokens_per_second: 25,
                    total_elapsed: '12s',
                    total_elapsed_ms: 12000,
                },
                usage: {
                    prompt_tokens: 1200,
                    completion_tokens: 320,
                },
                usageTrace: {
                    models: {
                        response: {
                            config: 'response',
                            model: 'response-model',
                        },
                    },
                },
            },
        },
    ],
};

describe('chat export service', () => {
    it('generates markdown export with selected sections only', () => {
        const options = cloneChatExportOptions(DEFAULT_CHAT_EXPORT_OPTIONS);
        options.sections.modelTrace = false;
        options.sections.rawTimeline = false;

        const generated = generateChatExport(sampleBundle, options);

        expect(generated.fileName.endsWith('.md')).toBe(true);
        expect(generated.content).toContain('# Chat Session Export');
        expect(generated.content).toContain('### 用户输入');
        expect(generated.content).toContain('### 思考过程');
        expect(generated.content).toContain('### 工具调用');
        expect(generated.content).toContain('### 最终回答');
        expect(generated.content).toContain('示例视频');
        expect(generated.content).not.toContain('### 模型轨迹');
        expect(generated.content).not.toContain('### 原始时间线');
    });

    it('generates filtered json export without unselected tool results', () => {
        const options = cloneChatExportOptions(DEFAULT_CHAT_EXPORT_OPTIONS);
        options.format = 'json';
        options.sections.toolResults = false;
        options.sections.rawTimeline = true;

        const generated = generateChatExport(sampleBundle, options);
        const parsed = JSON.parse(generated.content) as {
            session: { mode: string };
            rounds: Array<{
                user?: { content: string };
                toolEvents?: Array<{
                    calls?: Array<{ args?: Record<string, unknown>; result?: unknown }>;
                }>;
                rawTimeline?: unknown[];
            }>;
        };

        expect(generated.fileName.endsWith('.json')).toBe(true);
        expect(parsed.session.mode).toBe('think');
        expect(parsed.rounds[0]?.user?.content).toBe('这期视频讲了什么？');
        expect(parsed.rounds[0]?.toolEvents?.[0]?.calls?.[0]?.args).toEqual({
            video_id: 'BV1xx411c7mD',
            head_chars: 20000,
        });
        expect(parsed.rounds[0]?.toolEvents?.[0]?.calls?.[0]?.result).toBeUndefined();
        expect(parsed.rounds[0]?.rawTimeline).toHaveLength(1);
    });
});