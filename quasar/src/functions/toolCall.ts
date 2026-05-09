import { api } from 'boot/axios';
import { useQueryStore } from 'src/stores/queryStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import { useChatStore } from 'src/stores/chatStore';
import { cacheService, STORE_NAMES, EXPLORE_CACHE_TTL } from 'src/services/cacheService';
import { getSmartSuggestService } from 'src/services/smartSuggestService';
import { saveToolHistorySelection } from 'src/utils/toolHistorySelection';
import { normalizeToolCommandInput } from 'src/config/toolCommands';
import type { ToolCallResponse, ExploreStepResult } from 'src/stores/resultStore';
import type { ToolCall } from 'src/services/chatService';

let toolCallAbortController = new AbortController();

/** 中止当前的工具调用请求 */
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

/** 缓存工具调用结果到 IndexedDB */
const cacheToolCallResults = async (
    query: string,
    payload: ToolCallCachePayload
): Promise<void> => {
    try {
        const plainResults = JSON.parse(JSON.stringify(payload));
        await cacheService.set(
            STORE_NAMES.DATA,
            `tool-call:${query}`,
            plainResults,
            { ttl: EXPLORE_CACHE_TTL, namespace: 'tool-call-results' }
        );
        console.log(`[ToolCallCache] Cached results for: ${query}`);
    } catch (error) {
        console.error('[ToolCallCache] Failed to cache results:', error);
    }
};

/** 从缓存恢复搜索结果，跳过网络请求 */
export const restoreToolCallFromCache = async (queryValue: string): Promise<boolean> => {
    const queryStore = useQueryStore();
    const exploreStore = useExploreStore();
    const layoutStore = useLayoutStore();

    queryValue = normalizeToolCommandInput(queryValue);
    if (!queryValue) return false;

    try {
        const cached = await cacheService.get<ToolCallCachePayload>(
            STORE_NAMES.DATA,
            `tool-call:${queryValue}`
        );

        if (cached && Array.isArray(cached.stepResults)) {
            console.log(`[ToolCallCache] Restoring cached results for: ${queryValue}`);

            layoutStore.setIsSuggestVisible(false);
            exploreStore.clearAuthorFilters();
            exploreStore.setSubmittedQuery(queryValue);
            exploreStore.setRestoringSession(true);

            queryStore.setQuery({ newQuery: queryValue, setRoute: true });
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
    queryValue, setQuery = true, setRoute = false,
}: {
    queryValue: string,
    setQuery?: boolean,
    setRoute?: boolean,
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

    if (setQuery) {
        queryStore.setQuery({ newQuery: queryValue, setRoute: setRoute });
    }
    try {
        toolCallAbortController.abort();
        toolCallAbortController = new AbortController();
        const signal = toolCallAbortController.signal;

        console.log(`> Tool call: [${queryValue}]`);

        const response = await api.post<ToolCallResponse>(
            '/tool_call',
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

            // 记录搜索历史（仅限工具调用模式，chat 模式由 chat.ts 处理）
            const searchModeStore = useSearchModeStore();
            const currentMode = searchModeStore.initialSessionMode || searchModeStore.currentMode;
            const totalHits = exploreResult.data.reduce(
                (sum, step) => sum + (Array.isArray(step.output?.hits) ? step.output.hits.length : 0), 0
            );
            if (currentMode === 'tool') {
                const recordId = await searchHistoryStore.addRecord(
                    queryValue,
                    totalHits,
                    currentMode,
                );
                chatStore.setCurrentHistoryRecordId(recordId);
                saveToolHistorySelection(recordId, queryValue);
            }
        } else {
            console.warn('[EMPTY_DATA]: No step results in response');
            exploreStore.setStepResults([]);
            exploreStore.setToolCall(toolCall);
            // 即使无结果也记录搜索历史（仅限工具调用模式）
            const searchModeStore = useSearchModeStore();
            const currentMode = searchModeStore.initialSessionMode || searchModeStore.currentMode;
            if (currentMode === 'tool') {
                const recordId = await searchHistoryStore.addRecord(
                    queryValue,
                    0,
                    currentMode,
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
