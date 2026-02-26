/**
 * ChatStore - LLM 聊天状态管理
 *
 * 管理 "快速问答" 和 "智能思考" 模式下的 LLM 对话状态：
 * - 多轮对话上下文管理
 * - 流式响应内容累积
 * - 加载/错误状态
 * - 性能统计
 * - 工具调用事件追踪
 * - 会话历史管理
 */

import { defineStore } from 'pinia';
import {
    chatCompletionStream,
    type ChatMessage,
    type PerfStats,
    type Usage,
    type ToolEvent,
    type ToolCall,
} from 'src/services/chatService';
import { useExploreStore } from './exploreStore';

/** 多轮对话中的单条消息 */
export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
}

/** 上下文管理：最多保留的对话轮数（每轮 = 1 user + 1 assistant） */
const MAX_CONVERSATION_TURNS = 5;

/** 单条聊天会话 */
export interface ChatSession {
    /** 用户查询 */
    query: string;
    /** 搜索模式: smart | think */
    mode: 'smart' | 'think';
    /** LLM 回答内容（流式累积） */
    content: string;
    /** LLM 思考/推理内容（流式累积） */
    thinkingContent: string;
    /** 是否正在加载/生成 */
    isLoading: boolean;
    /** 是否正在思考（reasoning_content 阶段） */
    isThinkingPhase: boolean;
    /** 是否已完成 */
    isDone: boolean;
    /** 错误信息 */
    error: string | null;
    /** 性能统计 */
    perfStats: PerfStats | null;
    /** Token 用量统计 */
    usage: Usage | null;
    /** 工具调用事件 */
    toolEvents: ToolEvent[];
    /** 是否为 thinking 模式 */
    thinking: boolean;
    /** 创建时间戳 */
    createdAt: number;
}

function defaultSession(): ChatSession {
    return {
        query: '',
        mode: 'smart',
        content: '',
        thinkingContent: '',
        isLoading: false,
        isThinkingPhase: false,
        isDone: false,
        error: null,
        perfStats: null,
        usage: null,
        toolEvents: [],
        thinking: false,
        createdAt: Date.now(),
    };
}

export const useChatStore = defineStore('chat', {
    state: () => ({
        /** 当前活跃的聊天会话 */
        currentSession: defaultSession() as ChatSession,
        /** 多轮对话历史（user/assistant 消息对） */
        conversationHistory: [] as ConversationMessage[],
        /** 历史会话列表 */
        sessions: [] as ChatSession[],
        /** 当前会话在历史列表中的索引 */
        currentSessionIdx: -1,
        /** 用于取消当前请求的 AbortController */
        _abortController: null as AbortController | null,
    }),

    getters: {
        /** 当前会话是否正在加载 */
        isLoading(): boolean {
            return this.currentSession.isLoading;
        },

        /** 当前会话是否有内容 */
        hasContent(): boolean {
            return this.currentSession.content.length > 0;
        },

        /** 当前会话是否有思考内容 */
        hasThinkingContent(): boolean {
            return this.currentSession.thinkingContent.length > 0;
        },

        /** 当前会话是否正在思考阶段 */
        isThinkingPhase(): boolean {
            return this.currentSession.isThinkingPhase;
        },

        /** 当前会话是否已完成 */
        isDone(): boolean {
            return this.currentSession.isDone;
        },

        /** 当前会话是否有错误 */
        hasError(): boolean {
            return this.currentSession.error !== null;
        },

        /** 当前会话的回答内容 */
        content(): string {
            return this.currentSession.content;
        },

        /** 当前会话的思考内容 */
        thinkingContent(): string {
            return this.currentSession.thinkingContent;
        },

        /** 当前会话的性能统计 */
        perfStats(): PerfStats | null {
            return this.currentSession.perfStats;
        },

        /** 当前会话的 token 用量 */
        usage(): Usage | null {
            return this.currentSession.usage;
        },

        /** 当前会话的工具事件 */
        toolEvents(): ToolEvent[] {
            return this.currentSession.toolEvents;
        },

        /** 多轮对话的总轮数 */
        conversationTurns(): number {
            return Math.floor(this.conversationHistory.length / 2);
        },
    },

    actions: {
        /** 中止当前正在进行的请求 */
        abortCurrentRequest() {
            if (this._abortController) {
                this._abortController.abort();
                this._abortController = null;
            }
        },

        /** 重置当前会话状态（不清除对话历史） */
        resetSession() {
            this.abortCurrentRequest();
            this.currentSession = defaultSession();
        },

        /** 清除对话历史（开始全新对话） */
        clearConversation() {
            this.conversationHistory = [];
        },

        /** 开始全新对话：重置当前会话 + 清除对话历史 */
        startNewChat() {
            this.clearConversation();
            this.resetSession();
        },

        /**
         * 修剪对话历史以控制上下文大小
         * 保留最近的 MAX_CONVERSATION_TURNS 轮对话
         */
        _trimConversationHistory() {
            const maxMessages = MAX_CONVERSATION_TURNS * 2;
            if (this.conversationHistory.length > maxMessages) {
                // 从开头删除最早的消息对
                const excess = this.conversationHistory.length - maxMessages;
                // 确保删除偶数条（完整的对话轮次）
                const toRemove = excess % 2 === 0 ? excess : excess + 1;
                this.conversationHistory.splice(0, toRemove);
            }
        },

        /**
         * 构建发送给后端的完整消息列表
         * 包含对话历史 + 当前用户消息
         */
        _buildMessages(query: string): ChatMessage[] {
            const messages: ChatMessage[] = [];
            // 添加历史消息
            for (const msg of this.conversationHistory) {
                messages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
            // 添加当前用户消息
            messages.push({ role: 'user', content: query });
            return messages;
        },

        /**
         * 从工具调用中同步搜索结果到 exploreStore
         * 这样 ResultsList 组件可以正常显示聊天模式下的搜索结果
         */
        _syncSearchResultsToExploreStore(toolCall: ToolCall) {
            if (toolCall.type !== 'search_videos' || toolCall.status !== 'completed') {
                return;
            }
            const result = toolCall.result as { hits?: unknown[] } | undefined;
            if (!result?.hits || !Array.isArray(result.hits)) {
                return;
            }
            const exploreStore = useExploreStore();
            // 更新 exploreStore 的最新搜索结果
            exploreStore.updateLatestHitsResult({
                step: 0,
                name: 'search_videos',
                name_zh: '搜索视频',
                status: 'finished',
                input: {},
                output_type: 'hits',
                comment: '',
                output: {
                    hits: result.hits,
                    return_hits: result.hits.length,
                    total_hits: result.hits.length,
                },
            });
        },

        /**
         * 发送聊天请求（流式、多轮）
         *
         * @param query - 用户查询文本
         * @param mode - 搜索模式 ('smart' | 'think')
         */
        async sendChat(query: string, mode: 'smart' | 'think') {
            // 中止之前的请求
            this.abortCurrentRequest();

            // 初始化新会话
            this.currentSession = {
                ...defaultSession(),
                query,
                mode,
                thinking: mode === 'think',
                isLoading: true,
                createdAt: Date.now(),
            };

            const abortController = new AbortController();
            this._abortController = abortController;

            // 构建含历史的完整消息列表
            const messages = this._buildMessages(query);

            try {
                await chatCompletionStream(
                    {
                        messages,
                        thinking: mode === 'think',
                    },
                    {
                        onStart: (chunk) => {
                            if (chunk.thinking !== undefined) {
                                this.currentSession.thinking = chunk.thinking;
                            }
                        },
                        onThinking: (content) => {
                            this.currentSession.thinkingContent += content;
                            this.currentSession.isThinkingPhase = true;
                        },
                        onContent: (content) => {
                            this.currentSession.content += content;
                            this.currentSession.isThinkingPhase = false;
                        },
                        onToolEvent: (event) => {
                            // Merge tool events: if same iteration exists, update it
                            // (pending → completed transition)
                            const existingIdx = this.currentSession.toolEvents.findIndex(
                                (e) => e.iteration === event.iteration
                            );
                            if (existingIdx >= 0) {
                                // Update existing event (e.g., pending → completed)
                                this.currentSession.toolEvents = [
                                    ...this.currentSession.toolEvents.slice(0, existingIdx),
                                    event,
                                    ...this.currentSession.toolEvents.slice(existingIdx + 1),
                                ];
                            } else {
                                // Add new event
                                this.currentSession.toolEvents = [
                                    ...this.currentSession.toolEvents,
                                    event,
                                ];
                            }
                            // Sync completed search results to exploreStore
                            if (event.calls) {
                                for (const call of event.calls) {
                                    this._syncSearchResultsToExploreStore(call);
                                }
                            }
                        },
                        onDone: (perfStats, usage) => {
                            this.currentSession.isLoading = false;
                            this.currentSession.isThinkingPhase = false;
                            this.currentSession.isDone = true;
                            if (perfStats) {
                                this.currentSession.perfStats = perfStats;
                            }
                            if (usage) {
                                this.currentSession.usage = usage;
                            }
                            // 将当前轮次追加到对话历史
                            this.conversationHistory.push(
                                { role: 'user', content: query },
                                { role: 'assistant', content: this.currentSession.content }
                            );
                            // 修剪历史以控制上下文大小
                            this._trimConversationHistory();
                            // 保存到会话历史列表
                            this._saveToHistory();
                        },
                        onError: (error) => {
                            if (error.name === 'AbortError') return;
                            this.currentSession.isLoading = false;
                            this.currentSession.error = error.message;
                            console.error('[ChatStore] Stream error:', error);
                        },
                    },
                    abortController.signal
                );
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    this.currentSession.isLoading = false;
                    this.currentSession.error = (error as Error).message;
                    console.error('[ChatStore] Request error:', error);
                }
            }
        },

        /** 保存当前会话到历史 */
        _saveToHistory() {
            if (this.currentSessionIdx < this.sessions.length - 1) {
                this.sessions.splice(this.currentSessionIdx + 1);
            }
            this.sessions.push({ ...this.currentSession });
            this.currentSessionIdx = this.sessions.length - 1;
        },

        /** 切换到历史会话 */
        restoreSession(index: number) {
            if (index >= 0 && index < this.sessions.length) {
                this.currentSessionIdx = index;
                this.currentSession = { ...this.sessions[index] };
            }
        },

        /** 清空所有会话历史 */
        clearHistory() {
            this.sessions = [];
            this.currentSessionIdx = -1;
            this.conversationHistory = [];
            this.resetSession();
        },
    },
});
