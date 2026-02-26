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
 * - 对话快照导出/恢复（用于历史记录恢复）
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
import { useSearchModeStore } from './searchModeStore';

/** 多轮对话中的单条消息 */
export interface ConversationMessage {
    /** Unique ID for stable v-for keys */
    id: string;
    role: 'user' | 'assistant';
    content: string;
    /** Tool events for this assistant message (only for assistant role) */
    toolEvents?: ToolEvent[];
    /** Performance stats for this assistant message (only for assistant role) */
    perfStats?: PerfStats;
    /** Token usage for this assistant message (only for assistant role) */
    usage?: Usage;
}

/** Auto-incrementing message ID for stable v-for keys */
let _msgIdCounter = 0;
function nextMsgId(): string {
    return `msg_${++_msgIdCounter}_${Date.now()}`;
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
        /** 当前历史记录 ID（用于更新 chat 快照） */
        _currentHistoryRecordId: null as string | null,
        /** 当前回合开始前的 conversationHistory 长度，用于分离历史消息和当前回合 */
        _conversationLengthBeforeCurrentRound: 0,
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

        /** 用于显示的历史消息（不含当前正在渲染的回合） */
        historyMessages(): ConversationMessage[] {
            return this.conversationHistory.slice(0, this._conversationLengthBeforeCurrentRound);
        },

        /** 当前关联的历史记录 ID */
        currentHistoryRecordId(): string | null {
            return this._currentHistoryRecordId;
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
            this._conversationLengthBeforeCurrentRound = 0;
        },

        /** 开始全新对话：重置当前会话 + 清除对话历史 */
        startNewChat() {
            this.clearConversation();
            this.resetSession();
            // 重置首次会话模式，让下次提交可以重新决定布局
            const searchModeStore = useSearchModeStore();
            searchModeStore.resetInitialSessionMode();
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
            const result = toolCall.result as {
                hits?: unknown[];
                results?: Array<{ hits?: unknown[] }>;
            } | undefined;

            let allHits: unknown[] = [];
            // Single query format
            if (result?.hits && Array.isArray(result.hits)) {
                allHits = result.hits;
            }
            // Multi-query format
            else if (result?.results && Array.isArray(result.results)) {
                for (const r of result.results) {
                    if (r.hits && Array.isArray(r.hits)) {
                        allHits.push(...r.hits);
                    }
                }
            }

            if (allHits.length === 0) return;

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
                    hits: allHits,
                    return_hits: allHits.length,
                    total_hits: allHits.length,
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

            // 记录当前回合开始前的历史长度，用于显示分离
            this._conversationLengthBeforeCurrentRound = this.conversationHistory.length;

            // 重置当前会话（保留对话历史）
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
                            // 清除 abort controller（请求已完成）
                            this._abortController = null;
                            // 将当前轮次追加到对话历史，包含 tool events
                            this.conversationHistory.push(
                                { id: nextMsgId(), role: 'user', content: query },
                                {
                                    id: nextMsgId(),
                                    role: 'assistant',
                                    content: this.currentSession.content,
                                    toolEvents: this.currentSession.toolEvents.length > 0
                                        ? [...this.currentSession.toolEvents]
                                        : undefined,
                                    perfStats: this.currentSession.perfStats || undefined,
                                    usage: this.currentSession.usage || undefined,
                                }
                            );
                            // 修剪历史以控制上下文大小
                            this._trimConversationHistory();
                            // 保存到会话历史列表
                            this._saveToHistory();
                            // 更新搜索历史中的 chat 快照
                            this._updateHistorySnapshot();
                        },
                        onError: (error) => {
                            if (error.name === 'AbortError') return;
                            this.currentSession.isLoading = false;
                            this.currentSession.error = error.message;
                            this._abortController = null;
                            console.error('[ChatStore] Stream error:', error);
                        },
                    },
                    abortController.signal
                );

                // 安全兜底：如果流式响应结束但 onDone/onError 都未触发
                // （例如连接中断、后端未发送 finish_reason），确保清除加载状态
                if (this.currentSession.isLoading && this.currentSession.query === query) {
                    console.warn('[ChatStore] Stream ended without onDone, cleaning up');
                    this.currentSession.isLoading = false;
                    this.currentSession.isDone = true;
                    this._abortController = null;
                    // 仍然保存已接收到的内容到对话历史
                    if (this.currentSession.content) {
                        this.conversationHistory.push(
                            { id: nextMsgId(), role: 'user', content: query },
                            {
                                id: nextMsgId(),
                                role: 'assistant',
                                content: this.currentSession.content,
                                toolEvents: this.currentSession.toolEvents.length > 0
                                    ? [...this.currentSession.toolEvents]
                                    : undefined,
                            }
                        );
                        this._trimConversationHistory();
                        this._saveToHistory();
                        this._updateHistorySnapshot();
                    }
                }
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    this.currentSession.isLoading = false;
                    this.currentSession.error = (error as Error).message;
                    this._abortController = null;
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

        /** 更新搜索历史中的 chat 快照 */
        async _updateHistorySnapshot() {
            if (!this._currentHistoryRecordId) return;
            try {
                const { useSearchHistoryStore } = await import('./searchHistoryStore');
                const searchHistoryStore = useSearchHistoryStore();
                await searchHistoryStore.updateChatSnapshot(
                    this._currentHistoryRecordId,
                    {
                        session: { ...this.currentSession },
                        conversationHistory: this.conversationHistory.map(m => ({ ...m })),
                    },
                );
            } catch (error) {
                console.error('[ChatStore] Failed to update history snapshot:', error);
            }
        },

        /** 设置当前关联的历史记录 ID */
        setCurrentHistoryRecordId(id: string | null) {
            this._currentHistoryRecordId = id;
        },

        /** 切换到历史会话 */
        restoreSession(index: number) {
            if (index >= 0 && index < this.sessions.length) {
                this.currentSessionIdx = index;
                this.currentSession = { ...this.sessions[index] };
            }
        },

        /**
         * 从历史记录快照恢复完整的对话状态
         * 用于点击历史记录时恢复 chat 模式的页面、状态和样式
         */
        restoreFromSnapshot(snapshot: {
            session: ChatSession;
            conversationHistory: ConversationMessage[];
        }) {
            this.abortCurrentRequest();
            // 恢复对话历史（确保所有消息都有 ID，兼容旧快照）
            this.conversationHistory = snapshot.conversationHistory.map(m => ({
                ...m,
                id: m.id || nextMsgId(),
            }));
            // 当前会话是最后一轮，显示其他历史消息作为历史
            this._conversationLengthBeforeCurrentRound = Math.max(0, this.conversationHistory.length - 2);
            // 恢复当前会话状态（确保标记为已完成、非加载状态）
            this.currentSession = {
                ...snapshot.session,
                isLoading: false,
                isThinkingPhase: false,
                isDone: true,
                error: null,
            };
        },

        /** 清空所有会话历史 */
        clearHistory() {
            this.sessions = [];
            this.currentSessionIdx = -1;
            this.conversationHistory = [];
            this._currentHistoryRecordId = null;
            this._conversationLengthBeforeCurrentRound = 0;
            this.resetSession();
        },
    },
});
