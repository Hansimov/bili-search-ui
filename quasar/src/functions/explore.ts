import { api } from 'boot/axios';
import { useQueryStore } from 'src/stores/queryStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import type { ExploreResponse } from 'src/stores/resultStore';

let exploreAbortController = new AbortController();

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

    layoutStore.setIsSuggestVisible(false);
    exploreStore.clearAuthorFilters();
    if (!queryValue) {
        return;
    }

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

            // 记录搜索历史
            const totalHits = exploreResult.data.reduce(
                (sum, step) => sum + (Array.isArray(step.output?.hits) ? step.output.hits.length : 0), 0
            );
            searchHistoryStore.addRecord(queryValue, totalHits).catch(console.error);
        } else {
            console.warn('[EMPTY_DATA]: No step results in response');
            // 即使无结果也记录搜索历史
            searchHistoryStore.addRecord(queryValue, 0).catch(console.error);
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