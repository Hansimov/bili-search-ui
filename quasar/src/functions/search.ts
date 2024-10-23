import { api } from 'boot/axios';
import { useSearchStore } from '../stores/searchStore';
import { Router } from 'vue-router';

let suggestAbortController = new AbortController();
let searchAbortController = new AbortController();
const SUGGEST_DEBOUNCE_INTERVAL = 150; // milliseconds

export const suggest = async (newVal: string, showSuggestions = true, setSearchStoreQuery = true): Promise<void> => {
    const searchStore = useSearchStore();
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

    return new Promise<void>((resolve) => {
        setTimeout(async () => {
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
                    resolve();
                } catch (error) {
                    if (error instanceof Error && error.name !== 'CanceledError') {
                        console.error(error);
                    }
                    resolve();
                }
            } else {
                resolve();
            }
        }, SUGGEST_DEBOUNCE_INTERVAL);
    });
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

export const submitQuery = async (queryValue: string, router: Router, isFromURL = false, setSearchStoreQuery = true) => {
    const searchStore = useSearchStore();
    searchStore.setIsSuggestVisible(false);
    if (queryValue) {
        if (setSearchStoreQuery) {
            searchStore.setQuery(queryValue);
        }
        if (!isFromURL) {
            const newRoute = `/search?q=${queryValue}`;
            if (router.currentRoute.value.path !== newRoute) {
                await router.push(newRoute);
            }
        }
        try {
            console.log('> Getting search results ...');
            searchAbortController.abort();
            searchAbortController = new AbortController();

            let cachedSuggest = searchStore.suggestResultCache[queryValue];
            if (!cachedSuggest) {
                await suggest(queryValue, false, setSearchStoreQuery);
                cachedSuggest = searchStore.suggestResultCache[queryValue];
            }

            let suggestInfo = {};
            if (cachedSuggest && Object.keys(cachedSuggest).length > 0) {
                suggestInfo = {
                    highlighted_keywords: cachedSuggest.highlighted_keywords || {},
                    related_authors: cachedSuggest.related_authors || [],
                };
            }

            const response = await api.post(
                '/search',
                {
                    query: queryValue,
                    suggest_info: suggestInfo,
                    limit: 200,
                },
                { signal: searchAbortController.signal }
            );

            if (!searchAbortController.signal.aborted) {
                searchStore.setSearchResult(response.data);
                console.log(`+ Got ${searchStore.results.hits.length} search results.`);
            }
        } catch (error) {
            console.error(error);
        }
    }
};
