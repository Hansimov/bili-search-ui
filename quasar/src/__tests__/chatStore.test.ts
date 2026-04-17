/**
 * ChatStore 和 ChatService 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChatStore } from 'src/stores/chatStore';
import type { ChatMessage } from 'src/services/chatService';

const searchHistoryStoreMock = vi.hoisted(() => ({
    updateChatSnapshot: vi.fn().mockResolvedValue(undefined),
}));

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock chatService
vi.mock('src/services/chatService', () => ({
    chatCompletionStream: vi.fn(),
    chatCompletion: vi.fn(),
}));

vi.mock('src/stores/searchHistoryStore', () => ({
    useSearchHistoryStore: () => searchHistoryStoreMock,
}));

describe('ChatStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorageMock.clear();
        vi.restoreAllMocks();
        searchHistoryStoreMock.updateChatSnapshot.mockClear();
    });

    describe('初始状态', () => {
        it('默认会话应该为空', () => {
            const store = useChatStore();
            expect(store.currentSession.query).toBe('');
            expect(store.currentSession.content).toBe('');
            expect(store.currentSession.thinkingContent).toBe('');
            expect(store.currentSession.isLoading).toBe(false);
            expect(store.currentSession.isThinkingPhase).toBe(false);
            expect(store.currentSession.isDone).toBe(false);
            expect(store.currentSession.error).toBeNull();
            expect(store.currentSession.usage).toBeNull();
        });

        it('默认模式为 smart', () => {
            const store = useChatStore();
            expect(store.currentSession.mode).toBe('smart');
        });

        it('sessions 应该为空数组', () => {
            const store = useChatStore();
            expect(store.sessions).toEqual([]);
            expect(store.currentSessionIdx).toBe(-1);
        });
    });

    describe('getters', () => {
        it('isLoading 应该反映 session 状态', () => {
            const store = useChatStore();
            expect(store.isLoading).toBe(false);
            store.currentSession.isLoading = true;
            expect(store.isLoading).toBe(true);
        });

        it('hasContent 应该检测内容', () => {
            const store = useChatStore();
            expect(store.hasContent).toBe(false);
            store.currentSession.content = '测试内容';
            expect(store.hasContent).toBe(true);
        });

        it('hasThinkingContent 应该检测思考内容', () => {
            const store = useChatStore();
            expect(store.hasThinkingContent).toBe(false);
            store.currentSession.thinkingContent = '思考中...';
            expect(store.hasThinkingContent).toBe(true);
        });

        it('isThinkingPhase 应该反映思考阶段', () => {
            const store = useChatStore();
            expect(store.isThinkingPhase).toBe(false);
            store.currentSession.isThinkingPhase = true;
            expect(store.isThinkingPhase).toBe(true);
        });

        it('isDone 应该反映完成状态', () => {
            const store = useChatStore();
            expect(store.isDone).toBe(false);
            store.currentSession.isDone = true;
            expect(store.isDone).toBe(true);
        });

        it('hasError 应该检测错误', () => {
            const store = useChatStore();
            expect(store.hasError).toBe(false);
            store.currentSession.error = '网络错误';
            expect(store.hasError).toBe(true);
        });

        it('content 应该返回当前内容', () => {
            const store = useChatStore();
            store.currentSession.content = '# Hello\nworld';
            expect(store.content).toBe('# Hello\nworld');
        });

        it('thinkingContent 应该返回思考内容', () => {
            const store = useChatStore();
            store.currentSession.thinkingContent = '让我分析...';
            expect(store.thinkingContent).toBe('让我分析...');
        });

        it('perfStats 默认为 null', () => {
            const store = useChatStore();
            expect(store.perfStats).toBeNull();
        });

        it('usage 默认为 null', () => {
            const store = useChatStore();
            expect(store.usage).toBeNull();
        });

        it('toolEvents 默认为空数组', () => {
            const store = useChatStore();
            expect(store.toolEvents).toEqual([]);
        });
    });

    describe('actions', () => {
        it('resetSession 应该重置所有状态', () => {
            const store = useChatStore();
            store.currentSession.query = '测试';
            store.currentSession.content = '回答';
            store.currentSession.thinkingContent = '思考';
            store.currentSession.isLoading = true;
            store.currentSession.isThinkingPhase = true;
            store.resetSession();
            expect(store.currentSession.query).toBe('');
            expect(store.currentSession.content).toBe('');
            expect(store.currentSession.thinkingContent).toBe('');
            expect(store.currentSession.isLoading).toBe(false);
            expect(store.currentSession.isThinkingPhase).toBe(false);
        });

        it('abortCurrentRequest 应该清理 controller', () => {
            const store = useChatStore();
            const controller = new AbortController();
            const abortSpy = vi.spyOn(controller, 'abort');
            store._abortController = controller;
            store.abortCurrentRequest();
            expect(abortSpy).toHaveBeenCalled();
        });

        it('abortCurrentRequest 应该调用 /chat/abort 端点', async () => {
            const store = useChatStore();
            const controller = new AbortController();
            store._abortController = controller;
            store._streamId = 'test-stream-123';

            // Mock fetch for the abort call
            const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
                new Response(JSON.stringify({ status: 'aborted' }))
            );

            store.abortCurrentRequest();

            expect(store._streamId).toBeNull();
            expect(fetchSpy).toHaveBeenCalledWith('/api/chat/abort', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stream_id: 'test-stream-123' }),
            });

            fetchSpy.mockRestore();
        });

        it('abortCurrentRequest 应持久化已中止会话的快照', async () => {
            const store = useChatStore();
            const controller = new AbortController();
            store._abortController = controller;
            store.setCurrentHistoryRecordId('history-1');
            store.currentSession.query = '中止问题';
            store.currentSession.content = '部分回答';
            store.currentSession.isLoading = true;

            store.abortCurrentRequest();
            await Promise.resolve();
            await Promise.resolve();
            await new Promise((resolve) => setTimeout(resolve, 0));

            expect(searchHistoryStoreMock.updateChatSnapshot).toHaveBeenCalledWith(
                'history-1',
                expect.objectContaining({
                    session: expect.objectContaining({
                        query: '中止问题',
                        content: '部分回答',
                        isAborted: true,
                        isDone: false,
                    }),
                    conversationHistory: [],
                })
            );
        });

        it('_saveToHistory 应该追加会话', () => {
            const store = useChatStore();
            store.currentSession.query = '测试1';
            store.currentSession.content = '回答1';
            store.currentSession.isDone = true;
            store._saveToHistory();
            expect(store.sessions.length).toBe(1);
            expect(store.sessions[0].query).toBe('测试1');
            expect(store.currentSessionIdx).toBe(0);
        });

        it('_saveToHistory 应该截断分叉后的会话', () => {
            const store = useChatStore();

            // 添加3个会话
            store.currentSession.query = '会话1';
            store._saveToHistory();
            store.currentSession.query = '会话2';
            store._saveToHistory();
            store.currentSession.query = '会话3';
            store._saveToHistory();
            expect(store.sessions.length).toBe(3);

            // 退回到第1个会话
            store.currentSessionIdx = 0;
            store.currentSession.query = '分叉会话';
            store._saveToHistory();
            expect(store.sessions.length).toBe(2); // 截断了会话2和3
            expect(store.sessions[1].query).toBe('分叉会话');
        });

        it('restoreSession 应该恢复指定会话', () => {
            const store = useChatStore();
            store.currentSession.query = '会话A';
            store.currentSession.content = '内容A';
            store._saveToHistory();
            store.currentSession.query = '会话B';
            store.currentSession.content = '内容B';
            store._saveToHistory();

            store.restoreSession(0);
            expect(store.currentSession.query).toBe('会话A');
            expect(store.currentSession.content).toBe('内容A');
        });

        it('restoreSession 对非法索引无操作', () => {
            const store = useChatStore();
            store.currentSession.query = '原始';
            store.restoreSession(-1);
            expect(store.currentSession.query).toBe('原始');
            store.restoreSession(999);
            expect(store.currentSession.query).toBe('原始');
        });

        it('clearHistory 应该清空所有', () => {
            const store = useChatStore();
            store.currentSession.query = '会话';
            store._saveToHistory();
            store.clearHistory();
            expect(store.sessions.length).toBe(0);
            expect(store.currentSessionIdx).toBe(-1);
            expect(store.currentSession.query).toBe('');
        });
    });

    describe('多轮对话', () => {
        it('conversationHistory 默认为空', () => {
            const store = useChatStore();
            expect(store.conversationHistory).toEqual([]);
            expect(store.conversationTurns).toBe(0);
        });

        it('sendChat 完成后应该追加到对话历史', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onContent?.('回答1');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('问题1', 'smart');

            expect(store.conversationHistory).toHaveLength(2);
            expect(store.conversationHistory[0]).toMatchObject({
                role: 'user',
                content: '问题1',
            });
            expect(store.conversationHistory[0].id).toBeTruthy();
            expect(store.conversationHistory[1]).toMatchObject({
                role: 'assistant',
                content: '回答1',
            });
            expect(store.conversationHistory[1].id).toBeTruthy();
            expect(store.conversationTurns).toBe(1);
        });

        it('多轮对话应累积历史', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            let callIdx = 0;
            mockStream.mockImplementation(async (_params, callbacks) => {
                callIdx++;
                callbacks.onContent?.(`回答${callIdx}`);
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('问题1', 'smart');
            await store.sendChat('问题2', 'smart');

            expect(store.conversationHistory).toHaveLength(4);
            expect(store.conversationTurns).toBe(2);
        });

        it('多轮对话应将历史消息传给后端', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            const sentMessages: ChatMessage[][] = [];
            mockStream.mockImplementation(async (params, callbacks) => {
                sentMessages.push([...params.messages]);
                callbacks.onContent?.('回答');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('问题1', 'smart');
            await store.sendChat('问题2', 'smart');

            // 第一轮：只有当前消息
            expect(sentMessages[0]).toHaveLength(1);
            expect(sentMessages[0][0].content).toBe('问题1');

            // 第二轮：历史 + 当前消息
            expect(sentMessages[1]).toHaveLength(3);
            expect(sentMessages[1][0].content).toBe('问题1');
            expect(sentMessages[1][1].content).toBe('回答');
            expect(sentMessages[1][2].content).toBe('问题2');
        });

        it('对话历史应自动修剪（超过最大轮数）', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            let callIdx = 0;
            mockStream.mockImplementation(async (_params, callbacks) => {
                callIdx++;
                callbacks.onContent?.(`回答${callIdx}`);
                callbacks.onDone?.();
            });

            const store = useChatStore();
            // 发送 7 轮（超过 MAX_CONVERSATION_TURNS=5）
            for (let i = 1; i <= 7; i++) {
                await store.sendChat(`问题${i}`, 'smart');
            }

            // 应该被修剪到最多 10 条消息（5 轮 × 2）
            expect(store.conversationHistory.length).toBeLessThanOrEqual(10);
            expect(store.conversationTurns).toBeLessThanOrEqual(5);
        });

        it('clearConversation 应清除对话历史', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onContent?.('回答');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('问题', 'smart');
            expect(store.conversationHistory.length).toBe(2);

            store.clearConversation();
            expect(store.conversationHistory).toEqual([]);
        });

        it('clearHistory 也应清除对话历史', () => {
            const store = useChatStore();
            store.conversationHistory.push(
                { id: 'test-1', role: 'user', content: '问题' },
                { id: 'test-2', role: 'assistant', content: '回答' }
            );
            store.clearHistory();
            expect(store.conversationHistory).toEqual([]);
        });

        it('startNewChat 应重置会话并清除对话历史', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onContent?.('回答');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('问题', 'smart');
            expect(store.conversationHistory.length).toBe(2);
            expect(store.currentSession.content).toBe('回答');

            store.startNewChat();
            expect(store.conversationHistory).toEqual([]);
            expect(store.currentSession.content).toBe('');
            expect(store.currentSession.query).toBe('');
            expect(store.currentSession.isLoading).toBe(false);
        });
    });

    describe('sendChat 集成', () => {
        it('sendChat 应该初始化正确的 session 状态', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            // 模拟 chatCompletionStream 立即调用 callbacks
            mockStream.mockImplementation(async (params, callbacks) => {
                callbacks.onStart?.({
                    id: 'test',
                    object: 'chat.completion.chunk',
                    choices: [
                        {
                            index: 0,
                            delta: { role: 'assistant', content: '' },
                            finish_reason: null,
                        },
                    ],
                });
                callbacks.onToolEvent?.({
                    iteration: 1,
                    tools: ['search_videos'],
                });
                callbacks.onContent?.('Hello ');
                callbacks.onContent?.('World');
                callbacks.onDone?.(
                    {
                        tokens_per_second: 50,
                        total_elapsed: '1.2s',
                        total_elapsed_ms: 1200,
                    },
                    {
                        completion_tokens: 100,
                        total_tokens: 500,
                    }
                );
            });

            const store = useChatStore();
            await store.sendChat('测试问题', 'smart');

            expect(store.currentSession.query).toBe('测试问题');
            expect(store.currentSession.mode).toBe('smart');
            expect(store.currentSession.content).toBe('Hello World');
            expect(store.currentSession.isDone).toBe(true);
            expect(store.currentSession.isLoading).toBe(false);
            expect(store.currentSession.toolEvents).toEqual([
                { iteration: 1, tools: ['search_videos'] },
            ]);
            expect(store.currentSession.perfStats?.tokens_per_second).toBe(50);
            expect(store.currentSession.usage?.completion_tokens).toBe(100);
        });

        it('sendChat 应该保存 stream_id 用于中止', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            mockStream.mockImplementation(async (_params, callbacks) => {
                // Backend sends stream_id as the very first event
                callbacks.onStreamId?.('abc123');
                callbacks.onContent?.('回答');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('测试', 'smart');

            // After onDone, _streamId should be cleared
            expect(store._streamId).toBeNull();
        });

        it('sendChat 在流异常结束且未收到 onDone 时不应误标为完成', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onThinking?.('先读取转写');
                callbacks.onToolEvent?.({
                    iteration: 1,
                    tools: ['get_video_transcript'],
                    calls: [
                        {
                            type: 'get_video_transcript',
                            args: { video_id: 'BV1CY9VB1E5f' },
                            status: 'pending',
                        },
                    ],
                });
            });

            const store = useChatStore();
            await store.sendChat('BV1CY9VB1E5f 这个视频讲了什么', 'smart');

            expect(store.currentSession.isLoading).toBe(false);
            expect(store.currentSession.isDone).toBe(false);
            expect(store.currentSession.error).toBe('响应流意外结束，请重试');
            expect(store.currentSession.toolEvents).toEqual([
                {
                    iteration: 1,
                    tools: ['get_video_transcript'],
                    calls: [
                        {
                            type: 'get_video_transcript',
                            args: { video_id: 'BV1CY9VB1E5f' },
                            status: 'pending',
                        },
                    ],
                },
            ]);
            expect(store.conversationHistory).toEqual([]);
        });

        it('sendChat think 模式应该设置 thinking=true', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            mockStream.mockImplementation(async (params, callbacks) => {
                expect(params.thinking).toBe(true);
                callbacks.onStart?.({
                    id: 'test',
                    object: 'chat.completion.chunk',
                    choices: [
                        {
                            index: 0,
                            delta: { role: 'assistant' },
                            finish_reason: null,
                        },
                    ],
                    thinking: true,
                });
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('深度问题', 'think');

            expect(store.currentSession.mode).toBe('think');
            expect(store.currentSession.thinking).toBe(true);
        });

        it('sendChat 应该处理 thinking 内容', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onStart?.({
                    id: 'test',
                    object: 'chat.completion.chunk',
                    choices: [
                        {
                            index: 0,
                            delta: { role: 'assistant' },
                            finish_reason: null,
                        },
                    ],
                    thinking: true,
                });
                callbacks.onThinking?.('让我思考');
                callbacks.onThinking?.('一下...');
                callbacks.onContent?.('答案是42');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('深度问题', 'think');

            expect(store.currentSession.thinkingContent).toBe(
                '让我思考一下...'
            );
            expect(store.currentSession.content).toBe('答案是42');
            expect(store.currentSession.isThinkingPhase).toBe(false);
        });

        it('sendChat 应在 reasoning reset 后清空聚合思考文本并新开片段', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onStart?.({
                    id: 'test',
                    object: 'chat.completion.chunk',
                    choices: [
                        {
                            index: 0,
                            delta: { role: 'assistant' },
                            finish_reason: null,
                        },
                    ],
                    thinking: true,
                });
                callbacks.onThinking?.('先分析工具结果');
                callbacks.onResetThinking?.('response');
                callbacks.onThinking?.('再整理最终回答');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('深度问题', 'think');

            expect(store.currentSession.thinkingContent).toBe('再整理最终回答');
            expect(store.currentSession.streamSegments).toHaveLength(2);
            expect(store.currentSession.streamSegments[0]).toEqual({
                type: 'thinking',
                content: '先分析工具结果',
            });
            expect(store.currentSession.streamSegments[1]).toEqual({
                type: 'thinking',
                content: '再整理最终回答',
            });
        });

        it('sendChat 在思考模式下应在 onDone 前显示增量答案', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            let resumeStream: (() => void) | undefined;
            const streamGate = new Promise<void>((resolve) => {
                resumeStream = resolve;
            });

            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onStart?.({
                    id: 'test',
                    object: 'chat.completion.chunk',
                    choices: [
                        {
                            index: 0,
                            delta: { role: 'assistant' },
                            finish_reason: null,
                        },
                    ],
                    thinking: true,
                });
                callbacks.onThinking?.('先分析');
                callbacks.onContent?.('第一段答案');

                await streamGate;

                callbacks.onContent?.('，第二段答案');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            const pending = store.sendChat('深度问题', 'think');

            await Promise.resolve();

            expect(store.currentSession.thinkingContent).toBe('先分析');
            expect(store.currentSession.content).toBe('第一段答案');
            expect(store.currentSession.isLoading).toBe(true);
            expect(store.currentSession.isDone).toBe(false);
            expect(store.currentSession.isThinkingPhase).toBe(false);

            if (!resumeStream) {
                throw new Error('expected stream resume callback');
            }
            resumeStream();
            await pending;

            expect(store.currentSession.content).toBe('第一段答案，第二段答案');
            expect(store.currentSession.isLoading).toBe(false);
            expect(store.currentSession.isDone).toBe(true);
        });

        it('sendChat 应该实时更新 toolEvents', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onStart?.({
                    id: 'test',
                    object: 'chat.completion.chunk',
                    choices: [
                        {
                            index: 0,
                            delta: { role: 'assistant' },
                            finish_reason: null,
                        },
                    ],
                });
                callbacks.onToolEvent?.({
                    iteration: 1,
                    tools: ['search_videos'],
                });
                callbacks.onToolEvent?.({
                    iteration: 2,
                    tools: ['check_author'],
                });
                callbacks.onContent?.('结果');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('测试', 'smart');

            expect(store.currentSession.toolEvents).toHaveLength(2);
            expect(store.currentSession.toolEvents[0].iteration).toBe(1);
            expect(store.currentSession.toolEvents[1].iteration).toBe(2);
        });

        it('sendChat 应该处理错误', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);

            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onError?.(new Error('网络超时'));
            });

            const store = useChatStore();
            await store.sendChat('测试', 'smart');

            expect(store.currentSession.isLoading).toBe(false);
            expect(store.currentSession.error).toBe('网络超时');
        });

        it('sendChat 应该中止之前的请求', async () => {
            const { chatCompletionStream } = await import(
                'src/services/chatService'
            );
            const mockStream = vi.mocked(chatCompletionStream);
            let callCount = 0;

            mockStream.mockImplementation(async (_params, callbacks) => {
                callCount++;
                callbacks.onDone?.();
            });

            const store = useChatStore();
            // 第一次请求
            await store.sendChat('问题1', 'smart');
            // 第二次请求应中止第一次
            await store.sendChat('问题2', 'smart');

            expect(callCount).toBe(2);
            expect(store.currentSession.query).toBe('问题2');
        });
    });
});

describe('ChatService SSE 解析', () => {
    it('应该正确导出类型', async () => {
        const mod = await import('src/services/chatService');
        expect(typeof mod.chatCompletionStream).toBe('function');
        expect(typeof mod.chatCompletion).toBe('function');
    });
});

describe('Markdown 渲染', () => {
    it('应该渲染基本 markdown', async () => {
        const { renderMarkdown } = await import('src/utils/markdown');
        const html = renderMarkdown('**bold** text');
        expect(html).toContain('<strong>bold</strong>');
        expect(html).toContain('text');
    });

    it('应该处理空字符串', async () => {
        const { renderMarkdown } = await import('src/utils/markdown');
        expect(renderMarkdown('')).toBe('');
    });

    it('应该渲染链接', async () => {
        const { renderMarkdown } = await import('src/utils/markdown');
        const html = renderMarkdown('[test](https://example.com)');
        expect(html).toContain('<a');
        expect(html).toContain('https://example.com');
    });

    it('应该将完整 bilibili 视频链接标记为富链接引用', async () => {
        const { renderMarkdown } = await import('src/utils/markdown');
        const html = renderMarkdown(
            '[主视频](https://www.bilibili.com/video/BV1AA411c7mD?p=2)'
        );

        expect(html).toContain('class="bili-video-ref"');
        expect(html).toContain('data-bvid="BV1AA411c7mD"');
        expect(html).toContain('href="https://www.bilibili.com/video/BV1AA411c7mD"');
    });

    it('应该渲染代码块', async () => {
        const { renderMarkdown } = await import('src/utils/markdown');
        const html = renderMarkdown('```js\nconsole.log("hi")\n```');
        expect(html).toContain('<code');
    });

    it('应该渲染表格', async () => {
        const { renderMarkdown } = await import('src/utils/markdown');
        const md = '| A | B |\n|---|---|\n| 1 | 2 |';
        const html = renderMarkdown(md);
        expect(html).toContain('<table');
    });

    it('应该渲染不完整的流式 markdown', async () => {
        const { renderMarkdown } = await import('src/utils/markdown');
        // 不完整的 markdown（流式中间状态）
        const html = renderMarkdown('# 标题\n\n正在生成中...\n\n- 列表项');
        expect(html).toContain('标题');
        expect(html).toContain('列表项');
    });
});

describe('ChatStore 扩展功能', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorageMock.clear();
        vi.restoreAllMocks();
    });

    describe('消息 ID 与历史分离', () => {
        it('sendChat 在流式开始前抛错时应退出加载态', async () => {
            const { chatCompletionStream } = await import('src/services/chatService');
            const mockStream = vi.mocked(chatCompletionStream);
            mockStream.mockImplementation(async () => {
                throw new Error('pre-stream failure');
            });

            const store = useChatStore();
            await store.sendChat('问题', 'smart');

            expect(store.isLoading).toBe(false);
            expect(store.isThinkingPhase).toBe(false);
            expect(store.currentSession.error).toBe('pre-stream failure');
        });

        it('sendChat 完成后消息应有唯一 ID', async () => {
            const { chatCompletionStream } = await import('src/services/chatService');
            const mockStream = vi.mocked(chatCompletionStream);
            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onContent?.('回答');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('问题', 'smart');

            expect(store.conversationHistory).toHaveLength(2);
            expect(store.conversationHistory[0].id).toBeTruthy();
            expect(store.conversationHistory[1].id).toBeTruthy();
            expect(store.conversationHistory[0].id).not.toBe(store.conversationHistory[1].id);
        });

        it('historyMessages 应排除当前回合', async () => {
            const { chatCompletionStream } = await import('src/services/chatService');
            const mockStream = vi.mocked(chatCompletionStream);
            let callCount = 0;
            mockStream.mockImplementation(async (_params, callbacks) => {
                callCount++;
                callbacks.onContent?.(`回答${callCount}`);
                callbacks.onDone?.();
            });

            const store = useChatStore();

            // 第一轮
            await store.sendChat('问题1', 'smart');
            // 第一轮完成后 historyMessages 应该为空（最后一轮由 currentSession 显示）
            expect(store.historyMessages).toHaveLength(0);
            expect(store.conversationHistory).toHaveLength(2);

            // 第二轮
            await store.sendChat('问题2', 'smart');
            // 第二轮完成后 historyMessages 应有第一轮的 2 条消息
            expect(store.historyMessages).toHaveLength(2);
            expect(store.historyMessages[0].content).toBe('问题1');
            expect(store.historyMessages[1].content).toBe('回答1');
            expect(store.conversationHistory).toHaveLength(4);
        });

        it('_conversationLengthBeforeCurrentRound 应在 sendChat 开始时更新', async () => {
            const { chatCompletionStream } = await import('src/services/chatService');
            const mockStream = vi.mocked(chatCompletionStream);
            mockStream.mockImplementation(async (_params, callbacks) => {
                callbacks.onContent?.('回答');
                callbacks.onDone?.();
            });

            const store = useChatStore();
            expect(store._conversationLengthBeforeCurrentRound).toBe(0);

            await store.sendChat('问题1', 'smart');
            // After first round, length was 0 when started, now has 2 messages
            expect(store.conversationHistory).toHaveLength(2);

            // Start second round - length before should now be 2
            await store.sendChat('问题2', 'smart');
            expect(store._conversationLengthBeforeCurrentRound).toBe(2);
        });

        it('retryCurrentRound 应基于当前轮之前的历史重试同一问题', async () => {
            const { chatCompletionStream } = await import('src/services/chatService');
            const mockStream = vi.mocked(chatCompletionStream);
            const sentMessages: ChatMessage[][] = [];

            let callCount = 0;
            mockStream.mockImplementation(async (params, callbacks) => {
                sentMessages.push([...params.messages]);
                callCount += 1;
                callbacks.onContent?.(`回答${callCount}`);
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('问题1', 'smart');
            await store.retryCurrentRound();

            expect(sentMessages).toHaveLength(2);
            expect(sentMessages[1]).toEqual([
                { role: 'user', content: '问题1' },
            ]);
        });

        it('continueCurrentRound 应在已完成回合后追加继续追问', async () => {
            const { chatCompletionStream } = await import('src/services/chatService');
            const mockStream = vi.mocked(chatCompletionStream);
            const sentMessages: ChatMessage[][] = [];

            let callCount = 0;
            mockStream.mockImplementation(async (params, callbacks) => {
                sentMessages.push([...params.messages]);
                callCount += 1;
                callbacks.onContent?.(`回答${callCount}`);
                callbacks.onDone?.();
            });

            const store = useChatStore();
            await store.sendChat('问题1', 'smart');
            await store.continueCurrentRound();

            expect(sentMessages).toHaveLength(2);
            expect(sentMessages[1]).toEqual([
                { role: 'user', content: '问题1' },
                { role: 'assistant', content: '回答1' },
                { role: 'user', content: '继续' },
            ]);
        });
    });

    describe('快照恢复', () => {
        it('restoreFromSnapshot 应恢复对话状态', () => {
            const store = useChatStore();
            const snapshot = {
                session: {
                    sessionId: 'test-session-1',
                    query: '历史问题',
                    mode: 'smart' as const,
                    content: '历史回答',
                    thinkingContent: '',
                    isLoading: false,
                    isThinkingPhase: false,
                    isDone: true,
                    isAborted: false,
                    error: null,
                    perfStats: null,
                    usage: null,
                    toolEvents: [],
                    streamSegments: [],
                    thinking: false,
                    createdAt: Date.now(),
                },
                conversationHistory: [
                    { id: 'old-1', role: 'user' as const, content: '历史问题' },
                    { id: 'old-2', role: 'assistant' as const, content: '历史回答' },
                ],
            };

            store.restoreFromSnapshot(snapshot);

            expect(store.currentSession.query).toBe('历史问题');
            expect(store.currentSession.content).toBe('历史回答');
            expect(store.currentSession.isDone).toBe(true);
            expect(store.currentSession.isLoading).toBe(false);
            expect(store.conversationHistory).toHaveLength(2);
            expect(store.historyMessages).toHaveLength(0); // Last round excluded
        });

        it('restoreFromSnapshot 应为缺少 ID 的旧消息生成 ID', () => {
            const store = useChatStore();
            const snapshot = {
                session: {
                    sessionId: 'test-session-2',
                    query: '问题',
                    mode: 'smart' as const,
                    content: '回答',
                    thinkingContent: '',
                    isLoading: false,
                    isThinkingPhase: false,
                    isDone: true,
                    isAborted: false,
                    error: null,
                    perfStats: null,
                    usage: null,
                    toolEvents: [],
                    streamSegments: [],
                    thinking: false,
                    createdAt: Date.now(),
                },
                conversationHistory: [
                    { role: 'user' as const, content: '问题' },
                    { role: 'assistant' as const, content: '回答' },
                ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            };

            store.restoreFromSnapshot(snapshot);
            expect(store.conversationHistory[0].id).toBeTruthy();
            expect(store.conversationHistory[1].id).toBeTruthy();
        });

        it('restoreFromSnapshot 应保留中止态并显示完整历史消息', () => {
            const store = useChatStore();
            const snapshot = {
                session: {
                    sessionId: 'aborted-session-1',
                    query: '当前中止问题',
                    mode: 'smart' as const,
                    content: '中止前的部分回答',
                    thinkingContent: '中止前思考',
                    isLoading: false,
                    isThinkingPhase: false,
                    isDone: false,
                    isAborted: true,
                    error: null,
                    perfStats: null,
                    usage: null,
                    toolEvents: [],
                    streamSegments: [],
                    thinking: false,
                    createdAt: Date.now(),
                },
                conversationHistory: [
                    { id: 'u-1', role: 'user' as const, content: '上一轮问题' },
                    { id: 'a-1', role: 'assistant' as const, content: '上一轮回答' },
                ],
            };

            store.restoreFromSnapshot(snapshot);

            expect(store.currentSession.isAborted).toBe(true);
            expect(store.currentSession.isDone).toBe(false);
            expect(store.currentSession.content).toBe('中止前的部分回答');
            expect(store.historyMessages).toHaveLength(2);
            expect(store.historyMessages[0].content).toBe('上一轮问题');
            expect(store.historyMessages[1].content).toBe('上一轮回答');
        });
    });

    describe('currentHistoryRecordId getter', () => {
        it('默认应为 null', () => {
            const store = useChatStore();
            expect(store.currentHistoryRecordId).toBeNull();
        });

        it('setCurrentHistoryRecordId 应更新值', () => {
            const store = useChatStore();
            store.setCurrentHistoryRecordId('test-id-123');
            expect(store.currentHistoryRecordId).toBe('test-id-123');
        });

        it('clearHistory 应重置 recordId', () => {
            const store = useChatStore();
            store.setCurrentHistoryRecordId('test-id-123');
            store.clearHistory();
            expect(store.currentHistoryRecordId).toBeNull();
        });
    });

    describe('sessionId 管理', () => {
        it('默认会话应有 sessionId', () => {
            const store = useChatStore();
            expect(store.currentSession.sessionId).toBeTruthy();
            expect(typeof store.currentSession.sessionId).toBe('string');
        });

        it('startNewChat 应生成新的 sessionId', () => {
            const store = useChatStore();
            const oldSessionId = store.currentSessionId;
            store.startNewChat();
            expect(store.currentSessionId).toBeTruthy();
            expect(store.currentSessionId).not.toBe(oldSessionId);
            expect(store.currentSession.sessionId).toBe(store.currentSessionId);
        });

        it('startNewChat 应重置对话历史和会话状态', () => {
            const store = useChatStore();
            store.conversationHistory.push(
                { id: 'u1', role: 'user', content: 'hello' },
                { id: 'a1', role: 'assistant', content: 'hi' },
            );
            store.setCurrentHistoryRecordId('record-1');

            store.startNewChat();

            expect(store.conversationHistory).toHaveLength(0);
            expect(store.currentHistoryRecordId).toBeNull();
            expect(store.currentSession.query).toBe('');
            expect(store.currentSession.content).toBe('');
        });

        it('restoreFromSnapshot 应恢复 sessionId', () => {
            const store = useChatStore();
            const snapshot = {
                session: {
                    sessionId: 'restored-session-abc',
                    query: '测试问题',
                    mode: 'smart' as const,
                    content: '测试回答',
                    thinkingContent: '',
                    isLoading: false,
                    isThinkingPhase: false,
                    isDone: true,
                    isAborted: false,
                    error: null,
                    perfStats: null,
                    usage: null,
                    toolEvents: [],
                    streamSegments: [],
                    thinking: false,
                    createdAt: Date.now(),
                },
                conversationHistory: [
                    { id: 'u1', role: 'user' as const, content: '测试问题' },
                    { id: 'a1', role: 'assistant' as const, content: '测试回答' },
                ],
            };

            store.restoreFromSnapshot(snapshot);
            expect(store.currentSessionId).toBe('restored-session-abc');
            expect(store.currentSession.sessionId).toBe('restored-session-abc');
        });

        it('restoreFromSnapshot 应为缺少 sessionId 的旧快照生成新 sessionId', () => {
            const store = useChatStore();
            const snapshot = {
                session: {
                    sessionId: '',
                    query: '旧快照',
                    mode: 'think' as const,
                    content: '旧回答',
                    thinkingContent: '',
                    isLoading: false,
                    isThinkingPhase: false,
                    isDone: true,
                    isAborted: false,
                    error: null,
                    perfStats: null,
                    usage: null,
                    toolEvents: [],
                    streamSegments: [],
                    thinking: true,
                    createdAt: Date.now(),
                },
                conversationHistory: [],
            };

            store.restoreFromSnapshot(snapshot);
            // 空 sessionId 应被替换为新生成的
            expect(store.currentSessionId).toBeTruthy();
            expect(store.currentSession.sessionId).toBeTruthy();
        });

        it('restoreBySessionId 应在当前会话匹配时返回 true', () => {
            const store = useChatStore();
            const sid = store.currentSessionId;
            expect(store.restoreBySessionId(sid)).toBe(true);
        });

        it('restoreBySessionId 应在找不到会话时返回 false', () => {
            const store = useChatStore();
            expect(store.restoreBySessionId('nonexistent-id')).toBe(false);
        });

        it('clearHistory 应重置 sessionId', () => {
            const store = useChatStore();
            store.startNewChat();
            expect(store.currentSessionId).toBeTruthy();
            store.clearHistory();
            expect(store.currentSessionId).toBe('');
        });
    });
});
