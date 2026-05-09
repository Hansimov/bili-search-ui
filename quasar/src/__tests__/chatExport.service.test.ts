// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import {
    DEFAULT_CHAT_EXPORT_OPTIONS,
    buildChatExportFileName,
    cloneChatExportOptions,
    filterChatExportBundle,
    generateChatExport,
    generateChatExportFile,
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
        const content = generated.content as string;

        expect(generated.fileName.endsWith('.md')).toBe(true);
        expect(content).toContain('# Chat Session Export');
        expect(content).toContain('### 用户输入');
        expect(content).toContain('### 思考过程');
        expect(content).toContain('### 工具调用');
        expect(content).toContain('### 最终回答');
        expect(content).toContain('示例视频');
        expect(content).not.toContain('### 模型轨迹');
        expect(content).not.toContain('### 原始时间线');
    });

    it('generates filtered json export without unselected tool results', () => {
        const options = cloneChatExportOptions(DEFAULT_CHAT_EXPORT_OPTIONS);
        options.format = 'json';
        options.sections.toolResults = false;
        options.sections.rawTimeline = true;

        const generated = generateChatExport(sampleBundle, options);
        const parsed = JSON.parse(generated.content as string) as {
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

    it('filters the export bundle by selected round indexes', () => {
        const multiRoundBundle: ChatExportSessionBundle = {
            ...sampleBundle,
            rounds: [
                ...sampleBundle.rounds,
                {
                    index: 2,
                    phase: 'current',
                    status: 'completed',
                    user: {
                        id: 'u-2',
                        createdAt: 1713500110000,
                        role: 'user',
                        content: '第二轮问题',
                    },
                    assistant: {
                        id: 'a-2',
                        createdAt: 1713500120000,
                        role: 'assistant',
                        content: '第二轮回答',
                    },
                },
            ],
        };

        const filtered = filterChatExportBundle(multiRoundBundle, [2]);

        expect(filtered.rounds).toHaveLength(1);
        expect(filtered.rounds[0]?.index).toBe(2);
        expect(filtered.rounds[0]?.user?.content).toBe('第二轮问题');
    });

    it('builds a smart export filename from the latest selected question and timestamp', () => {
        const multiRoundBundle: ChatExportSessionBundle = {
            ...sampleBundle,
            exportedAt: 1713500100000,
            session: {
                ...sampleBundle.session,
                query: '请帮我总结：BV1e9cfz5EKj 这期视频讲了什么？',
            },
            rounds: [
                {
                    ...sampleBundle.rounds[0],
                    user: {
                        id: 'u-2',
                        role: 'user',
                        content: '请帮我总结：BV1e9cfz5EKj 这期视频讲了什么？',
                    },
                },
            ],
        };

        expect(buildChatExportFileName(multiRoundBundle, 'json')).toMatch(
            /^BV1e9cfz5EKj-这期视频讲了什么-\d{8}-\d{6}\.json$/
        );
    });

    it('collapses extra blank lines in exported text content', () => {
        const bundleWithSparseParagraphs: ChatExportSessionBundle = {
            ...sampleBundle,
            rounds: [
                {
                    ...sampleBundle.rounds[0],
                    user: {
                        ...sampleBundle.rounds[0]!.user!,
                        content: '第一段\n\n\n\n第二段',
                    },
                    assistant: {
                        ...sampleBundle.rounds[0]!.assistant!,
                        content: '回答开头\n\n\n\n\n回答结尾',
                        thinkingContent: '思考一\n\n\n\n思考二',
                        streamSegments: [
                            {
                                type: 'thinking',
                                content: '第一段思考\n\n\n\n第二段思考',
                            },
                        ],
                    },
                },
            ],
        };

        const markdownExport = generateChatExport(
            bundleWithSparseParagraphs,
            cloneChatExportOptions(DEFAULT_CHAT_EXPORT_OPTIONS),
        );
        const markdownContent = markdownExport.content as string;

        expect(markdownContent).toContain('第一段\n\n\n第二段');
        expect(markdownContent).toContain('回答开头\n\n\n回答结尾');
        expect(markdownContent).not.toContain('\n\n\n\n');

        const jsonOptions = cloneChatExportOptions(DEFAULT_CHAT_EXPORT_OPTIONS);
        jsonOptions.format = 'json';
        const jsonExport = generateChatExport(bundleWithSparseParagraphs, jsonOptions);
        const payload = JSON.parse(jsonExport.content as string) as {
            rounds: Array<{
                user?: { content: string };
                thinking?: { content: string };
                answer?: { content: string };
            }>;
        };

        expect(payload.rounds[0]?.user?.content).toBe('第一段\n\n\n第二段');
        expect(payload.rounds[0]?.thinking?.content).toBe('第一段思考\n\n\n第二段思考');
        expect(payload.rounds[0]?.answer?.content).toBe('回答开头\n\n\n回答结尾');
    });

    it('builds png export metadata and uses a png blob for long-image export', async () => {
        const options = cloneChatExportOptions(DEFAULT_CHAT_EXPORT_OPTIONS);
        options.format = 'png';
        options.pngTheme = 'dark';

        class MockImage {
            onload: (() => void) | null = null;
            onerror: (() => void) | null = null;
            set src(_value: string) {
                setTimeout(() => this.onload?.(), 0);
            }
        }
        const context = {
            drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D;
        const canvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => context),
            toBlob: vi.fn((callback: BlobCallback) => {
                callback(new Blob(['png'], { type: 'image/png' }));
            }),
        } as unknown as HTMLCanvasElement;
        const originalCreateElement = document.createElement.bind(document);
        const originalImage = globalThis.Image;
        const originalUrl = globalThis.URL;
        vi.stubGlobal('Image', MockImage);
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:chat-export-svg'),
            revokeObjectURL: vi.fn(),
        });
        const createElementSpy = vi
            .spyOn(document, 'createElement')
            .mockImplementation((tagName: string) => {
                if (tagName === 'canvas') {
                    return canvas;
                }
                return originalCreateElement(tagName);
            });

        const generated = await generateChatExportFile(sampleBundle, options);

        expect(generated.fileName.endsWith('.png')).toBe(true);
        expect(generated.mimeType).toBe('image/png');
        expect(generated.content).toBeInstanceOf(Blob);
        expect((generated.content as Blob).type).toBe('image/png');
        expect(context.drawImage).toHaveBeenCalled();

        createElementSpy.mockRestore();
        vi.stubGlobal('Image', originalImage);
        vi.stubGlobal('URL', originalUrl);
    });
});
