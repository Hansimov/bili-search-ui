/**
 * ChatStore - LLM 聊天状态管理
 *
 * 管理 "快速问答" 和 "智能思考" 模式下的 LLM 对话状态：
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
} from 'src/services/chatService';

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
    },

    actions: {
        /** 中止当前正在进行的请求 */
        abortCurrentRequest() {
            if (this._abortController) {
                this._abortController.abort();
                this._abortController = null;
            }
        },

        /** 重置当前会话状态 */
        resetSession() {
            this.abortCurrentRequest();
            this.currentSession = defaultSession();
        },

        /**
         * 发送聊天请求（流式）
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

            const messages: ChatMessage[] = [
                { role: 'user', content: query },
            ];

            try {
                await chatCompletionStream(
                    {
                        messages,
                        thinking: mode === 'think',
                    },
                    {
                        onStart: (chunk) => {
                            // 接收到首个 chunk，记录 thinking 状态
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
                            this.currentSession.toolEvents = [
                                ...this.currentSession.toolEvents,
                                event,
                            ];
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
                            // 保存到历史列表
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
            // 如果用户从历史中分叉，截断后续会话
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
            this.resetSession();
        },
    },
});
