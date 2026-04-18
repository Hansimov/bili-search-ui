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
    type UsageTrace,
    type ToolEvent,
    type ToolCall,
} from 'src/services/chatService';
import { useExploreStore } from './exploreStore';

/** 生成 UUID v4 */
function generateSessionId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * 流式响应时间线中的一个片段。
 * 保留 thinking / tool_event 的原始时间顺序，
 */
export interface StreamSegment {
    /** 片段类型：thinking 文本或 tool 事件 */
    type: 'thinking' | 'tool';
    /** type='thinking' 时的文本内容 */
    content?: string;
    /** type='tool' 时的工具事件 */
    toolEvent?: ToolEvent;
}

/** 多轮对话中的单条消息 */
export interface ConversationMessage {
    /** Unique ID for stable v-for keys */
    id: string;
    role: 'user' | 'assistant';
    content: string;
    /** LLM 思考/推理内容 */
    thinkingContent?: string;
    /** Tool events for this assistant message (only for assistant role) */
    toolEvents?: ToolEvent[];
    /** 保留时间线顺序的流片段（thinking + tool 交替） */
    streamSegments?: StreamSegment[];
    /** Performance stats for this assistant message (only for assistant role) */
    perfStats?: PerfStats;
    /** Token usage for this assistant message (only for assistant role) */
    usage?: Usage;
    /** Model routing / usage trace for this assistant message */
    usageTrace?: UsageTrace;
}

/** Auto-incrementing message ID for stable v-for keys */
let _msgIdCounter = 0;
function nextMsgId(): string {
    return `msg_${++_msgIdCounter}_${Date.now()}`;
}

function toolCallKey(call: Pick<ToolCall, 'type' | 'args'>): string {
    return `${call.type}:${JSON.stringify(call.args || {})}`;
}

function mergeToolCalls(existing: ToolCall[] = [], incoming: ToolCall[] = []): ToolCall[] {
    const merged: ToolCall[] = [];
    const indexByKey = new Map<string, number>();

    const upsert = (call: ToolCall) => {
        const key = toolCallKey(call);
        const existingIndex = indexByKey.get(key);
        if (existingIndex == null) {
            indexByKey.set(key, merged.length);
            merged.push(call);
            return;
        }
        merged[existingIndex] = call;
    };

    existing.forEach(upsert);
    incoming.forEach(upsert);
    return merged;
}

function mergeToolEvents(existing: ToolEvent, incoming: ToolEvent): ToolEvent {
    const mergedCalls = mergeToolCalls(existing.calls || [], incoming.calls || []);
    const tools = mergedCalls.length > 0
        ? mergedCalls.map((call) => call.type)
        : Array.from(new Set([...(existing.tools || []), ...(incoming.tools || [])]));

    return {
        ...existing,
        ...incoming,
        tools,
        calls: mergedCalls.length > 0 ? mergedCalls : incoming.calls || existing.calls,
    };
}

function sessionHasRenderableState(session: ChatSession): boolean {
    return !!(
        session.query ||
        session.content ||
        session.thinkingContent ||
        session.toolEvents.length > 0 ||
        session.streamSegments.length > 0 ||
        session.error
    );
}

function isSessionIncludedInConversationHistory(
    session: ChatSession,
    conversationHistory: ConversationMessage[],
): boolean {
    if (conversationHistory.length < 2) {
        return false;
    }

    const lastUser = conversationHistory[conversationHistory.length - 2];
    const lastAssistant = conversationHistory[conversationHistory.length - 1];
    if (lastUser.role !== 'user' || lastAssistant.role !== 'assistant') {
        return false;
    }

    return (
        lastUser.content === (session.query || '') &&
        lastAssistant.content === (session.content || '')
    );
}

/** 上下文管理：最多保留的对话轮数（每轮 = 1 user + 1 assistant） */
const MAX_CONVERSATION_TURNS = 5;

/** 单条聊天会话 */
export interface ChatSession {
    /** 会话唯一标识（UUID） */
    sessionId: string;
    /** 用户查询（首次提交的查询文本） */
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
    /** 是否被用户中止 */
    isAborted: boolean;
    /** 错误信息 */
    error: string | null;
    /** 性能统计 */
    perfStats: PerfStats | null;
    /** Token 用量统计 */
    usage: Usage | null;
    /** 模型选择与调用轨迹 */
    usageTrace?: UsageTrace | null;
    /** 工具调用事件 */
    toolEvents: ToolEvent[];
    /** 流式响应时间线片段（保持 thinking/tool 交替顺序） */
    streamSegments: StreamSegment[];
    /** 是否为 thinking 模式 */
    thinking: boolean;
    /** 创建时间戳 */
    createdAt: number;
}

function defaultSession(sessionId?: string): ChatSession {
    return {
        sessionId: sessionId || generateSessionId(),
        query: '',
        mode: 'smart',
        content: '',
        thinkingContent: '',
        isLoading: false,
        isThinkingPhase: false,
        isDone: false,
        isAborted: false,
        error: null,
        perfStats: null,
        usage: null,
        usageTrace: null,
        toolEvents: [],
        streamSegments: [],
        thinking: false,
        createdAt: Date.now(),
    };
}

export const useChatStore = defineStore('chat', {
    state: () => ({
        /** 当前活跃的聊天会话 */
        currentSession: defaultSession() as ChatSession,
        /** 当前会话 ID（快捷访问，与 currentSession.sessionId 同步） */
        currentSessionId: '' as string,
        /** 多轮对话历史（user/assistant 消息对） */
        conversationHistory: [] as ConversationMessage[],
        /** 历史会话列表 */
        sessions: [] as ChatSession[],
        /** 当前会话在历史列表中的索引 */
        currentSessionIdx: -1,
        /** 用于取消当前请求的 AbortController */
        _abortController: null as AbortController | null,
        /** 当前流式请求的 stream_id（用于主动通知后端中止） */
        _streamId: null as string | null,
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

        /** 当前会话是否被用户中止 */
        isAborted(): boolean {
            return this.currentSession.isAborted;
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

        /** 当前会话的模型调用轨迹 */
        usageTrace(): UsageTrace | null {
            return this.currentSession.usageTrace || null;
        },

        /** 当前会话的工具事件 */
        toolEvents(): ToolEvent[] {
            return this.currentSession.toolEvents;
        },

        /** 当前会话的流式时间线片段 */
        streamSegments(): StreamSegment[] {
            return this.currentSession.streamSegments;
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
        exportSnapshot() {
            return {
                session: { ...this.currentSession },
                conversationHistory: this.conversationHistory.map((message) => ({
                    ...message,
                })),
            };
        },

        /** 中止当前正在进行的请求 */
        abortCurrentRequest() {
            const wasLoading = this.currentSession.isLoading;
            if (this._abortController) {
                this._abortController.abort();
                this._abortController = null;
            }
            // Explicitly notify backend to stop processing
            if (this._streamId) {
                const streamId = this._streamId;
                this._streamId = null;
                fetch('/api/chat/abort', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stream_id: streamId }),
                }).catch(() => {
                    // fire-and-forget: backend may already be done
                });
                console.log(`[ChatStore] Abort sent for stream ${streamId}`);
            }
            // Immediately update UI state so animations stop
            if (wasLoading) {
                this.currentSession.isLoading = false;
                this.currentSession.isThinkingPhase = false;
                this.currentSession.isAborted = true;
                this.currentSession.isDone = false;
                if (this._currentHistoryRecordId && sessionHasRenderableState(this.currentSession)) {
                    void this._updateHistorySnapshot();
                }
            }
        },

        /** 重置当前会话状态（不清除对话历史，保留 sessionId） */
        resetSession() {
            this.abortCurrentRequest();
            const sid = this.currentSessionId;
            this.currentSession = defaultSession(sid || undefined);
            if (sid) {
                this.currentSession.sessionId = sid;
            }
        },

        /** 清除对话历史（开始全新对话） */
        clearConversation() {
            this.conversationHistory = [];
            this._conversationLengthBeforeCurrentRound = 0;
        },

        /**
         * 开始全新对话：重置当前会话 + 清除对话历史 + 生成新 sessionId
         *
         * 注意：不在此处重置 initialSessionMode，由调用方按需处理。
         * - 导航到首页时：调用方自行调用 searchModeStore.resetInitialSessionMode()
         * - 提交新聊天时：调用方先设置 setInitialSessionMode(mode) 再调用本方法
         */
        startNewChat() {
            this.clearConversation();
            this.abortCurrentRequest();
            const newId = generateSessionId();
            this.currentSessionId = newId;
            this.currentSession = defaultSession(newId);
            this._currentHistoryRecordId = null;
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
        _buildMessages(
            query: string,
            history?: ConversationMessage[],
        ): ChatMessage[] {
            const sourceHistory = history ?? this.conversationHistory;
            const messages: ChatMessage[] = [];
            // 添加历史消息
            for (const msg of sourceHistory) {
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

        _buildAssistantMessageFromSession(
            session?: ChatSession,
        ): ConversationMessage | null {
            const sourceSession = session ?? this.currentSession;
            const hasAssistantState =
                !!sourceSession.content ||
                !!sourceSession.thinkingContent ||
                sourceSession.toolEvents.length > 0 ||
                sourceSession.streamSegments.length > 0;

            if (!hasAssistantState) {
                return null;
            }

            return {
                id: nextMsgId(),
                role: 'assistant',
                content: sourceSession.content,
                thinkingContent: sourceSession.thinkingContent || undefined,
                toolEvents:
                    sourceSession.toolEvents.length > 0
                        ? [...sourceSession.toolEvents]
                        : undefined,
                streamSegments:
                    sourceSession.streamSegments.length > 0
                        ? [...sourceSession.streamSegments]
                        : undefined,
                perfStats: sourceSession.perfStats || undefined,
                usage: sourceSession.usage || undefined,
                usageTrace: sourceSession.usageTrace || undefined,
            };
        },

        _currentRoundBaseHistory(): ConversationMessage[] {
            return this.conversationHistory.slice(
                0,
                this._conversationLengthBeforeCurrentRound
            );
        },

        _currentRoundContinuationHistory(): ConversationMessage[] {
            if (this.currentSession.isDone) {
                return [...this.conversationHistory];
            }

            const baseHistory = this._currentRoundBaseHistory();
            if (this.currentSession.query) {
                baseHistory.push({
                    id: nextMsgId(),
                    role: 'user',
                    content: this.currentSession.query,
                });
            }

            const assistantMessage = this._buildAssistantMessageFromSession();
            if (assistantMessage) {
                baseHistory.push(assistantMessage);
            }

            return baseHistory;
        },

        async retryCurrentRound() {
            if (!this.currentSession.query) return;
            await this.sendChat(
                this.currentSession.query,
                this.currentSession.mode,
                this._currentRoundBaseHistory()
            );
        },

        async continueCurrentRound() {
            const canContinue = this.currentSession.isDone || !!this.currentSession.content;
            if (!canContinue) return;

            await this.sendChat(
                '继续',
                this.currentSession.mode,
                this._currentRoundContinuationHistory()
            );
        },

        /**
         * 发送聊天请求（流式、多轮）
         *
         * @param query - 用户查询文本
         * @param mode - 搜索模式 ('smart' | 'think')
         */
        async sendChat(
            query: string,
            mode: 'smart' | 'think',
            baseHistory?: ConversationMessage[]
        ) {
            const sourceHistory = baseHistory ?? this.conversationHistory;
            // 中止之前的请求
            this.abortCurrentRequest();

            // 确保有 sessionId（首次提交时可能还没有）
            if (!this.currentSessionId) {
                this.currentSessionId = generateSessionId();
            }
            const sessionId = this.currentSessionId;

            // 记录当前回合开始前的历史长度，用于显示分离
            this._conversationLengthBeforeCurrentRound = sourceHistory.length;

            // 重置当前会话（保留对话历史）
            this.currentSession = {
                ...defaultSession(sessionId),
                query,
                mode,
                thinking: mode === 'think',
                isLoading: true,
                createdAt: Date.now(),
            };

            const abortController = new AbortController();
            this._abortController = abortController;

            try {
                // 构建消息也纳入 try，避免前置异常把 UI 卡在加载态。
                const messages = this._buildMessages(query, sourceHistory);

                await chatCompletionStream(
                    {
                        messages,
                        thinking: mode === 'think',
                    },
                    {
                        onStreamId: (streamId) => {
                            this._streamId = streamId;
                        },
                        onStart: (chunk) => {
                            if (chunk.thinking !== undefined) {
                                this.currentSession.thinking = chunk.thinking;
                            }
                        },
                        onThinking: (content) => {
                            this.currentSession.thinkingContent += content;
                            this.currentSession.isThinkingPhase = true;
                            // 维护时间线片段：追加到最后一个 thinking 片段，或新建
                            const segs = this.currentSession.streamSegments;
                            const last = segs[segs.length - 1];
                            if (last && last.type === 'thinking') {
                                last.content = (last.content || '') + content;
                            } else {
                                segs.push({ type: 'thinking', content });
                            }
                        },
                        onResetThinking: () => {
                            this.currentSession.thinkingContent = '';
                            this.currentSession.isThinkingPhase = true;
                            const segs = this.currentSession.streamSegments;
                            const last = segs[segs.length - 1];
                            if (last && last.type === 'thinking' && last.content) {
                                segs.push({ type: 'thinking', content: '' });
                            }
                        },
                        onContent: (content) => {
                            this.currentSession.content += content;
                            this.currentSession.isThinkingPhase = false;
                        },
                        onRetractContent: () => {
                            // Backend signals that the streamed content was
                            // analysis text for a tool-calling iteration.
                            // Clear the content area; the analysis will arrive
                            // shortly as reasoning_content in the thinking section.
                            this.currentSession.content = '';
                            this.currentSession.isThinkingPhase = true;
                        },
                        onToolEvent: (event) => {
                            // Merge tool events: if same iteration exists, update it
                            // (pending → completed transition)
                            const existingIdx = this.currentSession.toolEvents.findIndex(
                                (e) => e.iteration === event.iteration
                            );
                            if (existingIdx >= 0) {
                                const mergedEvent = mergeToolEvents(
                                    this.currentSession.toolEvents[existingIdx],
                                    event
                                );
                                this.currentSession.toolEvents = [
                                    ...this.currentSession.toolEvents.slice(0, existingIdx),
                                    mergedEvent,
                                    ...this.currentSession.toolEvents.slice(existingIdx + 1),
                                ];
                            } else {
                                this.currentSession.toolEvents = [
                                    ...this.currentSession.toolEvents,
                                    event,
                                ];
                            }
                            // 维护时间线片段：更新已有同 iteration 或新建
                            const segs = this.currentSession.streamSegments;
                            const segIdx = segs.findIndex(
                                (s) => s.type === 'tool' && s.toolEvent?.iteration === event.iteration
                            );
                            if (segIdx >= 0) {
                                segs[segIdx] = {
                                    type: 'tool',
                                    toolEvent: mergeToolEvents(
                                        segs[segIdx].toolEvent || event,
                                        event
                                    ),
                                };
                            } else {
                                segs.push({ type: 'tool', toolEvent: event });
                            }
                        },
                        onDone: (perfStats, usage, usageTrace) => {
                            this.currentSession.isLoading = false;
                            this.currentSession.isThinkingPhase = false;
                            this.currentSession.isDone = true;
                            if (perfStats) {
                                this.currentSession.perfStats = perfStats;
                            }
                            if (usage) {
                                this.currentSession.usage = usage;
                            }
                            if (usageTrace) {
                                this.currentSession.usageTrace = usageTrace;
                            }
                            // 清除 abort controller 和 stream_id（请求已完成）
                            this._abortController = null;
                            this._streamId = null;
                            // 将当前轮次追加到对话历史，包含 tool events + thinking + segments
                            this.conversationHistory.push(
                                { id: nextMsgId(), role: 'user', content: query },
                                {
                                    id: nextMsgId(),
                                    role: 'assistant',
                                    content: this.currentSession.content,
                                    thinkingContent: this.currentSession.thinkingContent || undefined,
                                    toolEvents: this.currentSession.toolEvents.length > 0
                                        ? [...this.currentSession.toolEvents]
                                        : undefined,
                                    streamSegments: this.currentSession.streamSegments.length > 0
                                        ? [...this.currentSession.streamSegments]
                                        : undefined,
                                    perfStats: this.currentSession.perfStats || undefined,
                                    usage: this.currentSession.usage || undefined,
                                    usageTrace: this.currentSession.usageTrace || undefined,
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
                            this._streamId = null;
                            console.error('[ChatStore] Stream error:', error);
                        },
                    },
                    abortController.signal
                );

                // 安全兜底：如果流式响应结束但 onDone/onError 都未触发
                // （例如连接中断、前端未拿到最终 finish 事件），确保清除加载状态，
                // 但不要把这轮误标为“正常完成”。
                if (this.currentSession.isLoading && this.currentSession.query === query) {
                    console.warn('[ChatStore] Stream ended without onDone, marking as interrupted');
                    this.currentSession.isLoading = false;
                    this.currentSession.isThinkingPhase = false;
                    this.currentSession.isDone = false;
                    if (!this.currentSession.error) {
                        this.currentSession.error = '响应流意外结束，请重试';
                    }
                    this._abortController = null;
                    this._streamId = null;
                }
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    this.currentSession.isLoading = false;
                    this.currentSession.isThinkingPhase = false;
                    this.currentSession.error = (error as Error).message;
                    this._abortController = null;
                    this._streamId = null;
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
                    this.exportSnapshot(),
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
            // 恢复 sessionId
            const sessionId = snapshot.session.sessionId || generateSessionId();
            this.currentSessionId = sessionId;
            // 恢复对话历史（确保所有消息都有 ID，兼容旧快照）
            this.conversationHistory = snapshot.conversationHistory.map(m => ({
                ...m,
                id: m.id || nextMsgId(),
            }));
            const includedInHistory = isSessionIncludedInConversationHistory(
                snapshot.session,
                this.conversationHistory,
            );
            this._conversationLengthBeforeCurrentRound = includedInHistory
                ? Math.max(0, this.conversationHistory.length - 2)
                : this.conversationHistory.length;
            // 恢复当前会话状态；历史恢复不应继续流式请求，但应保留完成/中止语义
            this.currentSession = {
                ...snapshot.session,
                sessionId,
                isLoading: false,
                isThinkingPhase: false,
                isDone: snapshot.session.isDone,
                isAborted: snapshot.session.isAborted,
                error: snapshot.session.error,
            };
            this._abortController = null;
            this._streamId = null;
        },

        /** 清空所有会话历史 */
        clearHistory() {
            this.sessions = [];
            this.currentSessionIdx = -1;
            this.conversationHistory = [];
            this._currentHistoryRecordId = null;
            this._conversationLengthBeforeCurrentRound = 0;
            this.currentSessionId = '';
            this.resetSession();
        },

        /**
         * 根据 sessionId 查找并恢复会话
         * 用于从 URL 参数 chat=<sessionId> 恢复会话
         * @returns true 如果成功恢复，false 如果未找到
         */
        restoreBySessionId(sessionId: string): boolean {
            // 如果当前会话已是该 sessionId，无需操作
            if (this.currentSessionId === sessionId) {
                return true;
            }
            // 在历史会话中查找
            const idx = this.sessions.findIndex(s => s.sessionId === sessionId);
            if (idx >= 0) {
                this.restoreSession(idx);
                this.currentSessionId = sessionId;
                return true;
            }
            return false;
        },
    },
});
