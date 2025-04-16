import { api } from 'boot/axios';
import { Router } from 'vue-router';
import { useSearchStore } from 'src/stores/searchStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { debounce } from 'src/utils/time';

let suggestAbortController = new AbortController();
let searchAbortController = new AbortController();
let exploreAbortController = new AbortController();
const SUGGEST_DEBOUNCE_INTERVAL = 150; // milliseconds
const searchStore = useSearchStore();
const layoutStore = useLayoutStore();

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

    if (showSuggestions && !layoutStore.isSuggestVisible) {
        layoutStore.setIsSuggestVisible(true);
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
}: {
    queryValue: string,
    router: Router,
    isFromURL?: boolean,
    setSearchStoreQuery?: boolean,
}) => {
    layoutStore.setIsSuggestVisible(false);
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

export const extractMessagesFromBuffer = (buffer: string): { messages: string[], remainBuffer: string } => {
    const sep = '\n\r';
    const parts = buffer.split(sep);
    let remainBuffer = '';
    if (!buffer.endsWith(sep)) {
        // last part is incomplete if buffer not ends with sep
        remainBuffer = parts.pop() || '';
    }
    // extract non-empty messages
    const messages = parts.map(message => message.trim()).filter(message => message !== '');
    return { messages, remainBuffer };
};

export const explore = async ({
    queryValue, router, isFromURL = false, setSearchStoreQuery = true,
}: {
    queryValue: string,
    router: Router,
    isFromURL?: boolean,
    setSearchStoreQuery?: boolean,
}) => {
    layoutStore.setIsSuggestVisible(false);
    if (!queryValue) {
        return;
    }
    if (setSearchStoreQuery) {
        searchStore.setQuery(queryValue);
    }
    if (!isFromURL) {
        const newRoute = `/search?q=${encodeURIComponent(queryValue)}`;
        if (router.currentRoute.value.path !== newRoute) {
            await router.replace(newRoute);
        }
    }
    try {
        exploreAbortController.abort();
        exploreAbortController = new AbortController();
        const signal = exploreAbortController.signal;
        const response = await fetch(`${api.defaults.baseURL}/explore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify({ query: queryValue }),
            signal: signal
        });
        if (!response.ok) {
            console.error(`[HTTP_ERROR]: <${response.status}>`);
            return;
        }
        if (!response.body) {
            console.error('[RESPONSE_EMPTY]');
            return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        while (true) {
            if (signal.aborted) {
                await reader.cancel('[ABORTED_BY_USER]');
                console.warn('[ABORTED_BY_USER]');
                break;
            }
            const { done, value } = await reader.read();
            if (done) {
                console.log('[FINISHED]');
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            const { messages, remainBuffer } = extractMessagesFromBuffer(buffer);
            buffer = remainBuffer;
            messages.forEach(message => {
                if (signal.aborted) return;
                if (message.startsWith('data:')) {
                    const dataString = message.substring(5).trim();
                    try {
                        const dataDict = JSON.parse(dataString);
                        console.log('[DATA]:', dataDict);
                    } catch (e) {
                        console.error('[JSON_PARSE_ERROR]:', dataString, e);
                    }
                } else {
                    console.warn('[NON_DATA_MESSAGE]:', message);
                }
            });
            if (signal.aborted) {
                await reader.cancel('[ABORTED_BY_USER]');
                break;
            }
        }
    } catch (error) {
        console.error('[ERROR]: ', error);
    } finally {
        console.log('[FINAL]');
    }
};