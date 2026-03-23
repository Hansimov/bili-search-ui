import { api } from 'boot/axios';
import { useQueryStore } from 'src/stores/queryStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import { useChatStore } from 'src/stores/chatStore';
import { cacheService, STORE_NAMES, EXPLORE_CACHE_TTL } from 'src/services/cacheService';
import { getSmartSuggestService } from 'src/services/smartSuggestService';
import { saveDirectHistorySelection } from 'src/utils/directHistorySelection';
import type { ExploreResponse, ExploreStepResult } from 'src/stores/resultStore';

let exploreAbortController = new AbortController();

/** 中止当前的 explore 请求 */
export const abortExplore = () => {
    exploreAbortController.abort();
    const exploreStore = useExploreStore();
    exploreStore.setExploreLoading(false);
};

/** 缓存搜索结果到 IndexedDB */
const cacheExploreResults = async (query: string, stepResults: ExploreStepResult[]): Promise<void> => {
    try {
        const plainResults = JSON.parse(JSON.stringify(stepResults));
        await cacheService.set(
            STORE_NAMES.DATA,
            `explore:${query}`,
            plainResults,
            { ttl: EXPLORE_CACHE_TTL, namespace: 'explore-results' }
        );
        console.log(`[ExploreCache] Cached results for: ${query}`);
    } catch (error) {
        console.error('[ExploreCache] Failed to cache results:', error);
    }
};

/** 从缓存恢复搜索结果，跳过网络请求 */
export const restoreExploreFromCache = async (queryValue: string): Promise<boolean> => {
    const queryStore = useQueryStore();
    const exploreStore = useExploreStore();
    const layoutStore = useLayoutStore();

    if (!queryValue) return false;

    try {
        const cached = await cacheService.get<ExploreStepResult[]>(
            STORE_NAMES.DATA,
            `explore:${queryValue}`
        );

        if (cached && Array.isArray(cached) && cached.length > 0) {
            console.log(`[ExploreCache] Restoring cached results for: ${queryValue}`);

            layoutStore.setIsSuggestVisible(false);
            exploreStore.clearAuthorFilters();
            exploreStore.setSubmittedQuery(queryValue);
            exploreStore.setRestoringSession(true);

            queryStore.setQuery({ newQuery: queryValue, setRoute: true });
            exploreStore.setStepResults(cached);
            exploreStore.saveExploreSession();

            setTimeout(() => {
                exploreStore.setRestoringSession(false);
            }, 100);

            return true;
        }
    } catch (error) {
        console.error('[ExploreCache] Failed to restore from cache:', error);
    }

    return false;
};

export const explore = async ({
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

    layoutStore.setIsSuggestVisible(false);
    exploreStore.clearAuthorFilters();
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
        exploreAbortController.abort();
        exploreAbortController = new AbortController();
        const signal = exploreAbortController.signal;

        console.log(`> Explore: [${queryValue}]`);

        const response = await api.post<ExploreResponse>(
            '/explore',
            { query: queryValue },
            { signal: signal }
        );

        if (signal.aborted) {
            console.warn('[ABORTED_BY_USER]');
            return;
        }

        const exploreResult = response.data;
        console.log('[EXPLORE_RESULT]:', exploreResult);

        if (exploreResult.data && Array.isArray(exploreResult.data)) {
            exploreStore.setStepResults(exploreResult.data);
            console.log(`+ Got ${exploreResult.data.length} step results.`);

            // 缓存搜索结果到 IndexedDB
            cacheExploreResults(queryValue, exploreResult.data).catch(console.error);

            // 将搜索结果索引到智能补全服务
            const smartService = getSmartSuggestService();
            for (const step of exploreResult.data) {
                if (step.output?.hits && Array.isArray(step.output.hits)) {
                    smartService.addFromSearchResults(step.output.hits);
                }
            }

            // 记录搜索历史（仅限 direct 模式，chat 模式由 chat.ts 处理）
            const searchModeStore = useSearchModeStore();
            const currentMode = searchModeStore.initialSessionMode || searchModeStore.currentMode;
            const totalHits = exploreResult.data.reduce(
                (sum, step) => sum + (Array.isArray(step.output?.hits) ? step.output.hits.length : 0), 0
            );
            if (currentMode === 'direct') {
                const recordId = await searchHistoryStore.addRecord(
                    queryValue,
                    totalHits,
                    currentMode,
                );
                chatStore.setCurrentHistoryRecordId(recordId);
                saveDirectHistorySelection(recordId, queryValue);
            }
        } else {
            console.warn('[EMPTY_DATA]: No step results in response');
            // 即使无结果也记录搜索历史（仅限 direct 模式）
            const searchModeStore = useSearchModeStore();
            const currentMode = searchModeStore.initialSessionMode || searchModeStore.currentMode;
            if (currentMode === 'direct') {
                const recordId = await searchHistoryStore.addRecord(
                    queryValue,
                    0,
                    currentMode,
                );
                chatStore.setCurrentHistoryRecordId(recordId);
                saveDirectHistorySelection(recordId, queryValue);
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