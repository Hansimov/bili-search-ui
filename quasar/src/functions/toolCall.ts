import { api } from 'boot/axios';
import { useQueryStore } from 'src/stores/queryStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import { generateSessionId, useChatStore } from 'src/stores/chatStore';
import { cacheService, STORE_NAMES, EXPLORE_CACHE_TTL } from 'src/services/cacheService';
import { getSmartSuggestService } from 'src/services/smartSuggestService';
import { saveToolHistorySelection } from 'src/utils/toolHistorySelection';
import {
    getActiveToolCommand,
    normalizeToolCommandInput,
} from 'src/config/toolCommands';
import type { ToolCallResponse, ExploreStepResult } from 'src/stores/resultStore';
import type { ToolCall, ToolEvent } from 'src/services/chatService';

let toolCallAbortController = new AbortController();

export const generateUtilitySessionId = generateSessionId;

/** 中止当前的实用工具请求 */
export const abortToolCall = () => {
    toolCallAbortController.abort();
    const exploreStore = useExploreStore();
    exploreStore.setExploreLoading(false);
};

interface ToolCallCachePayload {
    stepResults: ExploreStepResult[];
    toolCall: ToolCall | null;
}

const normalizeToolCall = (response: ToolCallResponse): ToolCall | null => {
    const call = response.tool_event?.calls?.[0];
    if (call) {
        return {
            type: String(response.tool || call.type || 'unknown_tool'),
            args: (call.args || response.args || {}) as Record<string, unknown>,
            status: 'completed',
            visibility: (call.visibility as 'user' | 'internal') || 'user',
            result_id: String(call.result_id || 'D1'),
            summary: call.summary,
            result: call.result || response.result,
        };
    }
    if (!response.tool && response.error) {
        return {
            type: 'unknown_tool',
            args: {},
            status: 'completed',
            visibility: 'user',
            result_id: 'D1',
            result: { error: response.error, available_commands: response.available_commands },
        };
    }
    if (!response.tool) return null;
    return {
        type: response.tool,
        args: (response.args || {}) as Record<string, unknown>,
        status: 'completed',
        visibility: 'user',
        result_id: 'D1',
        result: response.result,
    };
};

const STREAMING_UTILITY_TOOLS = new Set([
    'get_video_transcript',
    'run_small_llm_task',
    'summarize_transcript',
]);

const shouldUseUtilityStream = (queryValue: string): boolean => {
    const activeCommand = getActiveToolCommand(queryValue);
    return !!activeCommand && STREAMING_UTILITY_TOOLS.has(activeCommand.tool);
};

const normalizeToolCallFromEvent = (event: ToolEvent): ToolCall | null => {
    const call = event.calls?.[0];
    if (!call) return null;
    return {
        type: call.type,
        args: call.args || {},
        status: call.status || 'completed',
        visibility: call.visibility || 'user',
        result_id: call.result_id || 'D1',
        summary: call.summary,
        result: call.result,
    };
};

const buildUtilityStepResults = (toolCall: ToolCall | null): ExploreStepResult[] => {
    if (!toolCall) return [];
    const hasError = toolCall.result &&
        typeof toolCall.result === 'object' &&
        'error' in (toolCall.result as Record<string, unknown>);
    const status = hasError
        ? 'failed'
        : toolCall.status === 'pending' || toolCall.status === 'streaming'
          ? 'running'
          : 'finished';
    return [
        {
            step: 1,
            name: toolCall.type,
            name_zh:
                toolCall.type === 'summarize_transcript'
                    ? '总结转写'
                    : toolCall.type === 'run_small_llm_task'
                      ? '小模型'
                      : toolCall.type,
            status,
            input: toolCall.args,
            output: { tool_result: toolCall.result || {} },
            output_type: 'tool_result',
            comment: '',
        },
    ];
};

const parseSseDataBlocks = (buffer: string): { blocks: string[]; rest: string } => {
    const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const chunks = normalized.split('\n\n');
    return {
        blocks: chunks.slice(0, -1),
        rest: chunks[chunks.length - 1] || '',
    };
};

const executeUtilityStream = async (
    queryValue: string,
    signal: AbortSignal,
    onToolCall: (toolCall: ToolCall) => void,
): Promise<ToolCall | null> => {
    const response = await fetch('/api/utility/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: queryValue }),
        signal,
    });
    if (!response.ok) {
        throw new Error(`Utility stream error: ${response.status} ${response.statusText}`);
    }
    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('No utility stream response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let latestToolCall: ToolCall | null = null;

    const processBlock = (block: string) => {
        const dataLines = block
            .split('\n')
            .map((line) => line.replace(/\r$/, ''))
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.replace(/^data:\s?/, ''));
        if (!dataLines.length) return;
        const data = dataLines.join('\n').trim();
        if (!data || data === '[DONE]') return;
        const parsed = JSON.parse(data) as {
            stream_id?: string;
            error?: string;
            tool_events?: ToolEvent[];
        };
        if (parsed.stream_id) return;
        if (parsed.error) {
            latestToolCall = {
                type: 'unknown_tool',
                args: {},
                status: 'completed',
                visibility: 'user',
                result_id: 'D1',
                result: parsed,
            };
            onToolCall(latestToolCall);
            return;
        }
        for (const event of parsed.tool_events || []) {
            const toolCall = normalizeToolCallFromEvent(event);
            if (!toolCall) continue;
            latestToolCall = toolCall;
            onToolCall(toolCall);
        }
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                buffer += decoder.decode();
                if (buffer.trim()) processBlock(buffer);
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            const parsed = parseSseDataBlocks(buffer);
            buffer = parsed.rest;
            for (const block of parsed.blocks) {
                processBlock(block);
            }
        }
    } finally {
        reader.releaseLock();
    }

    return latestToolCall;
};

/** 缓存实用工具结果到 IndexedDB */
const cacheToolCallResults = async (
    query: string,
    payload: ToolCallCachePayload
): Promise<void> => {
    try {
        const plainResults = JSON.parse(JSON.stringify(payload));
        await cacheService.set(
            STORE_NAMES.DATA,
            `utility:${query}`,
            plainResults,
            { ttl: EXPLORE_CACHE_TTL, namespace: 'utility-results' }
        );
        console.log(`[ToolCallCache] Cached results for: ${query}`);
    } catch (error) {
        console.error('[ToolCallCache] Failed to cache results:', error);
    }
};

/** 从缓存恢复搜索结果，跳过网络请求 */
export const restoreToolCallFromCache = async (
    queryValue: string,
    options: { setRoute?: boolean; sessionId?: string } = {}
): Promise<boolean> => {
    const queryStore = useQueryStore();
    const exploreStore = useExploreStore();
    const layoutStore = useLayoutStore();
    const { setRoute = true, sessionId } = options;

    queryValue = normalizeToolCommandInput(queryValue);
    if (!queryValue) return false;

    try {
        let cached = await cacheService.get<ToolCallCachePayload>(
            STORE_NAMES.DATA,
            `utility:${queryValue}`
        );
        cached ||= await cacheService.get<ToolCallCachePayload>(
            STORE_NAMES.DATA,
            `tool-call:${queryValue}`
        );

        if (cached && Array.isArray(cached.stepResults)) {
            console.log(`[ToolCallCache] Restoring cached results for: ${queryValue}`);

            layoutStore.setIsSuggestVisible(false);
            exploreStore.clearAuthorFilters();
            exploreStore.setSubmittedQuery(queryValue);
            exploreStore.setRestoringSession(true);

            queryStore.setQuery({ newQuery: queryValue, setRoute: false });
            if (setRoute && sessionId) {
                queryStore.setChatRoute(sessionId);
            }
            exploreStore.setStepResults(cached.stepResults);
            exploreStore.setToolCall(cached.toolCall || null);
            exploreStore.saveExploreSession();

            setTimeout(() => {
                exploreStore.setRestoringSession(false);
            }, 100);

            return true;
        }
    } catch (error) {
        console.error('[ToolCallCache] Failed to restore from cache:', error);
    }

    return false;
};

export const executeToolCall = async ({
    queryValue, setQuery = true, setRoute = false, sessionId, recordHistory = true,
}: {
    queryValue: string,
    setQuery?: boolean,
    setRoute?: boolean,
    sessionId?: string,
    recordHistory?: boolean,
}) => {
    // Get store instances inside function to ensure they are always fresh
    const queryStore = useQueryStore();
    const exploreStore = useExploreStore();
    const layoutStore = useLayoutStore();
    const searchHistoryStore = useSearchHistoryStore();
    const chatStore = useChatStore();

    queryValue = normalizeToolCommandInput(queryValue);
    layoutStore.setIsSuggestVisible(false);
    exploreStore.clearAuthorFilters();
    exploreStore.clearStepResults();
    if (!queryValue) {
        return;
    }

    // NOTE: initialSessionMode 现在由 SearchInput.submitQuery 在调用前设置

    // Set loading state and submitted query BEFORE route change to ensure UI shows correct query
    exploreStore.setExploreLoading(true);
    exploreStore.setSubmittedQuery(queryValue);
    let utilitySessionId = sessionId;
    if (setRoute) {
        if (!utilitySessionId) {
            chatStore.startNewChat();
            utilitySessionId = chatStore.currentSessionId;
        } else if (chatStore.currentSessionId !== utilitySessionId) {
            chatStore.startNewChat(utilitySessionId);
        }
    }

    if (setQuery) {
        queryStore.setQuery({ newQuery: queryValue, setRoute: false });
    }
    if (setRoute && utilitySessionId) {
        exploreStore.setRestoringSession(true);
        queryStore.setChatRoute(utilitySessionId);
        setTimeout(() => {
            exploreStore.setRestoringSession(false);
        }, 200);
    }
    try {
        toolCallAbortController.abort();
        toolCallAbortController = new AbortController();
        const signal = toolCallAbortController.signal;

        console.log(`> Utility: [${queryValue}]`);

        if (shouldUseUtilityStream(queryValue)) {
            let latestToolCall: ToolCall | null = null;
            latestToolCall = await executeUtilityStream(
                queryValue,
                signal,
                (toolCall) => {
                    latestToolCall = toolCall;
                    exploreStore.setToolCall(toolCall);
                    exploreStore.setStepResults(buildUtilityStepResults(toolCall));
                },
            );

            if (signal.aborted) {
                console.warn('[ABORTED_BY_USER]');
                return;
            }

            const stepResults = buildUtilityStepResults(latestToolCall);
            exploreStore.setStepResults(stepResults);
            exploreStore.setToolCall(latestToolCall);
            await cacheToolCallResults(queryValue, {
                stepResults,
                toolCall: latestToolCall,
            });

            const searchModeStore = useSearchModeStore();
            const currentMode = searchModeStore.initialSessionMode || searchModeStore.currentMode;
            if (currentMode === 'utility' && recordHistory) {
                const recordId = await searchHistoryStore.addRecord(
                    queryValue,
                    0,
                    currentMode,
                    undefined,
                    utilitySessionId
                );
                chatStore.setCurrentHistoryRecordId(recordId);
                saveToolHistorySelection(recordId, queryValue);
            }
            exploreStore.saveExploreSession();
            return;
        }

        const response = await api.post<ToolCallResponse>(
            '/utility',
            { command: queryValue },
            { signal: signal }
        );

        if (signal.aborted) {
            console.warn('[ABORTED_BY_USER]');
            return;
        }

        const exploreResult = response.data;
        const toolCall = normalizeToolCall(exploreResult);
        console.log('[TOOL_CALL_RESULT]:', exploreResult);

        if (exploreResult.data && Array.isArray(exploreResult.data)) {
            exploreStore.setStepResults(exploreResult.data);
            exploreStore.setToolCall(toolCall);
            console.log(`+ Got ${exploreResult.data.length} step results.`);

            // 缓存搜索结果到 IndexedDB
            cacheToolCallResults(queryValue, {
                stepResults: exploreResult.data,
                toolCall,
            }).catch(console.error);

            // 将搜索结果索引到智能补全服务
            const smartService = getSmartSuggestService();
            for (const step of exploreResult.data) {
                if (step.output?.hits && Array.isArray(step.output.hits)) {
                    smartService.addFromSearchResults(step.output.hits);
                }
            }

            // 记录搜索历史（仅限实用工具模式，chat 模式由 chat.ts 处理）
            const searchModeStore = useSearchModeStore();
            const currentMode = searchModeStore.initialSessionMode || searchModeStore.currentMode;
            const totalHits = exploreResult.data.reduce(
                (sum, step) => sum + (Array.isArray(step.output?.hits) ? step.output.hits.length : 0), 0
            );
            if (currentMode === 'utility' && recordHistory) {
                const recordId = await searchHistoryStore.addRecord(
                    queryValue,
                    totalHits,
                    currentMode,
                    undefined,
                    utilitySessionId
                );
                chatStore.setCurrentHistoryRecordId(recordId);
                saveToolHistorySelection(recordId, queryValue);
            }
        } else {
            console.warn('[EMPTY_DATA]: No step results in response');
            exploreStore.setStepResults([]);
            exploreStore.setToolCall(toolCall);
            // 即使无结果也记录搜索历史（仅限实用工具模式）
            const searchModeStore = useSearchModeStore();
            const currentMode = searchModeStore.initialSessionMode || searchModeStore.currentMode;
            if (currentMode === 'utility' && recordHistory) {
                const recordId = await searchHistoryStore.addRecord(
                    queryValue,
                    0,
                    currentMode,
                    undefined,
                    utilitySessionId
                );
                chatStore.setCurrentHistoryRecordId(recordId);
                saveToolHistorySelection(recordId, queryValue);
            }
        }

        exploreStore.saveExploreSession();
    } catch (error) {
        if (error instanceof Error && error.name !== 'CanceledError') {
            console.error('[ERROR]: ', error);
        }
    } finally {
        exploreStore.setExploreLoading(false);
        console.log('[FINAL]');
    }
};
