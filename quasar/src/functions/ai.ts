import { useSearchStore } from '../stores/searchStore';
import { Router } from 'vue-router';

let aiSuggestAbortController = new AbortController();
const AI_SUGGEST_DEBOUNCE_INTERVAL = 150; // milliseconds

export const aiSuggest = async (newVal: string, showAiSuggestions = true, setSearchStoreAiQuery = true): Promise<void> => {
    const searchStore = useSearchStore();
    if (setSearchStoreAiQuery) {
        searchStore.setAiQuery(newVal);
    }

    if (showAiSuggestions && !searchStore.isAiSuggestVisible) {
        searchStore.setIsAiSuggestVisible(true);
    }

    aiSuggestAbortController.abort();
    aiSuggestAbortController = new AbortController();

    const cachedAiSuggest = searchStore.aiSuggestResultCache[newVal];
    if (cachedAiSuggest) {
        searchStore.setAiSuggestions(cachedAiSuggest.choices);
        console.log(`+ Cached aiQuery: [${newVal}]`);
        console.log('Cached ai suggest results:', cachedAiSuggest);
        return;
    }

    return new Promise<void>((resolve) => {
        setTimeout(async () => {
            if (newVal) {
                try {
                    console.log(`> aiQuery: [${newVal}]`);
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
        }, AI_SUGGEST_DEBOUNCE_INTERVAL);
    });
};

const WS_URL = '/ws';


export const submitAiQuery = async (aiQueryValue: string, router: Router, isFromURL = false, setSearchStoreAiQuery = true) => {
    const searchStore = useSearchStore();
    searchStore.setIsSuggestVisible(false);
    if (aiQueryValue) {
        if (setSearchStoreAiQuery) {
            searchStore.setAiQuery(aiQueryValue);
        }
        if (!isFromURL) {
            const newRoute = `/search?ai=${aiQueryValue}`;
            if (router.currentRoute.value.path !== newRoute) {
                await router.push(newRoute);
            }
        }
        try {
            console.log('> submit ai query:', aiQueryValue);
            const ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                console.log('+ ws connected');
                const sent_msg = JSON.stringify({ type: 'chat', info: [{ 'role': 'user', 'content': aiQueryValue }] });
                ws.send(sent_msg);
                console.log(`+ sent ai query: ${aiQueryValue}`);
            };

            ws.onmessage = (event) => {
                const response = JSON.parse(event.data);
                console.log(`recv: [${response.info}]`);
                // searchStore.setAiSuggestions(response.choices);
            };

            ws.onerror = (error) => {
                console.error('x ws error:', error);
            };

            ws.onclose = () => {
                console.log('* ws closed');
            };

        } catch (error) {
            console.error(error);
        }
    }
};