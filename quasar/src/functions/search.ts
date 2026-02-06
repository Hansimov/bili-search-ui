import { api } from 'boot/axios';
import { useQueryStore } from 'src/stores/queryStore';
import { useSearchStore } from 'src/stores/searchStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { debounce } from 'src/utils/time';

let suggestAbortController = new AbortController();
const SUGGEST_DEBOUNCE_INTERVAL = 150; // milliseconds

export const suggestRequest = async (newVal: string, suggestAbortController: AbortController) => {
    if (newVal) {
        const searchStore = useSearchStore();
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

export const suggest = async (newVal: string, showSuggestions = true, setQuery = true): Promise<void> => {
    const queryStore = useQueryStore();
    const searchStore = useSearchStore();
    const layoutStore = useLayoutStore();

    if (setQuery) {
        queryStore.setQuery({ newQuery: newVal });
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
