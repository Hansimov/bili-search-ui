import { api } from 'boot/axios';
import { Router } from 'vue-router';
import { useSearchStore } from '../stores/searchStore';
import { debounce } from '../utils/time';

let suggestAbortController = new AbortController();
let searchAbortController = new AbortController();
const SUGGEST_DEBOUNCE_INTERVAL = 150; // milliseconds
const searchStore = useSearchStore();

export const suggestRequest = async (newVal: string, suggestAbortController: AbortController) => {
    if (newVal) {
        try {
            console.log(`> Query: [${newVal}]`);
            const response = await api.post(
                '/suggest',
                { query: newVal, limit: 25 },
                { signal: suggestAbortController.signal }
            );

            if (!suggestAbortController.signal.aborted) {
                const suggestResult = response.data;
                searchStore.setSuggestResultCache(newVal, suggestResult);
                searchStore.setSuggestions(suggestResult.hits);
                console.log(`+ Got ${searchStore.suggestions.length} suggestions.`);
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'CanceledError') {
                console.error(error);
            }
        }
    }
};

export const suggest = async (newVal: string, showSuggestions = true, setSearchStoreQuery = true): Promise<void> => {
    if (setSearchStoreQuery) {
        searchStore.setQuery(newVal);
    }

    if (showSuggestions && !searchStore.isSuggestVisible) {
        searchStore.setIsSuggestVisible(true);
    }

    suggestAbortController.abort();
    suggestAbortController = new AbortController();

    const cachedSuggest = searchStore.suggestResultCache[newVal];
    if (cachedSuggest) {
        searchStore.setSuggestions(cachedSuggest.hits);
        console.log(`+ Cached Query: [${newVal}]`);
        console.log('Cached suggest results:', cachedSuggest);
        return;
    }

    debounce(suggestRequest, SUGGEST_DEBOUNCE_INTERVAL)(newVal, suggestAbortController);
};

export const randomSuggest = async () => {
    const searchStore = useSearchStore();
    try {
        console.log('> Getting random suggestions ...');
        const randomSuggestResponse = await api.post('/random', {
            seed_update_seconds: 10,
            limit: 10,
        });
        searchStore.setSuggestions([...randomSuggestResponse.data.hits]);
        console.log(`+ Got ${searchStore.suggestions.length} random suggestions.`);
    } catch (error) {
        console.error(error);
    }
};

export const submitQuery = async ({
    queryValue,
    router,
    isFromURL = false,
    setSearchStoreQuery = true,
    // isReplaceKeywords = true
}: {
    queryValue: string,
    router: Router,
    isFromURL?: boolean,
    setSearchStoreQuery?: boolean,
    isReplaceKeywords?: boolean
}) => {
    const searchStore = useSearchStore();
    searchStore.setIsSuggestVisible(false);
    if (queryValue) {
        if (setSearchStoreQuery) {
            searchStore.setQuery(queryValue);
        }
        if (!isFromURL) {
            const newRoute = `/search?q=${encodeURIComponent(queryValue)}`;
            if (router.currentRoute.value.path !== newRoute) {
                await router.push(newRoute);
            }
        }
        try {
            console.log('> Getting search results ...');
            searchAbortController.abort();
            searchAbortController = new AbortController();

            // let cachedSuggest = searchStore.suggestResultCache[queryValue];
            // if (!cachedSuggest) {
            //     await suggest(queryValue, false, setSearchStoreQuery);
            //     cachedSuggest = searchStore.suggestResultCache[queryValue];
            // }

            // let suggestInfo = {};
            // if (isReplaceKeywords && cachedSuggest && Object.keys(cachedSuggest).length > 0) {
            //     suggestInfo = cachedSuggest?.suggest_info || {};
            // }

            const response = await api.post(
                '/search',
                {
                    query: queryValue,
                    // suggest_info: suggestInfo,
                    limit: 200,
                },
                { signal: searchAbortController.signal }
            );

            if (!searchAbortController.signal.aborted) {
                searchStore.setSearchResult(response.data);
                console.log(`+ Got ${searchStore.searchResultDict.hits.length} search results.`);
            }
        } catch (error) {
            console.error(error);
        }
    }
};
