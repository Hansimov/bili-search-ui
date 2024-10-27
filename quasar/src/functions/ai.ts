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

export const submitAiQuery = async (aiQueryValue: string, router: Router, isFromURL = false, setSearchStoreAiQuery = true) => {
    const searchStore = useSearchStore();
    searchStore.setIsSuggestVisible(false);
    if (aiQueryValue) {
        if (setSearchStoreAiQuery) {
            searchStore.setAiQuery(aiQueryValue);
        }
        if (!isFromURL) {
        }
        try {
            console.log('> submit ai query:', aiQueryValue);

        } catch (error) {
            console.error(error);
        }
    }
};