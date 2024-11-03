import { useSearchStore } from '../stores/searchStore';
import { useAiChatStore } from '../stores/aiChatStore';
import { Router } from 'vue-router';
import { sendMessageToWebsocket } from './websocket';

const searchStore = useSearchStore();
const aiChatStore = useAiChatStore();

let aiSuggestAbortController = new AbortController();
const AI_SUGGEST_DEBOUNCE_INTERVAL = 150; // milliseconds

export const aiSuggest = async (newVal: string, showAiSuggestions = true, setSearchStoreAiQuery = true): Promise<void> => {
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
    searchStore.setIsAiSuggestVisible(false);
    searchStore.setIsAiChatVisible(true);
    aiChatStore.addMessage('user', aiQueryValue);
    aiChatStore.addMessage('assistant', '');
    if (aiQueryValue) {
        if (setSearchStoreAiQuery) {
            searchStore.setAiQuery(aiQueryValue);
        }
        aiChatStore.setIsUserScrollAiChat(false);
        if (!isFromURL) {
            const newRoute = `/search?ai=${aiQueryValue}`;
            if (router.currentRoute.value.path !== newRoute) {
                await router.push(newRoute);
            }
        }
        try {
            console.log('> submit ai query:', aiQueryValue);
            const combinedMessages = [
                ...aiChatStore.aiChatMessages,
                { role: 'user', content: aiQueryValue }
            ];
            const sentMessage = JSON.stringify({ type: 'chat', info: combinedMessages });
            sendMessageToWebsocket(sentMessage);
            console.log(`+ sent ai query: ${aiQueryValue}`);
        } catch (error) {
            console.error(error);
        }
    }
};

export const terminateGeneration = () => {
    const ws = aiChatStore.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
        const terminateMessage = JSON.stringify({ type: 'terminate', info: [] });
        ws.send(terminateMessage);
        console.log('+ sent terminate message');
    } else {
        console.warn('× ws not open. Skip terminate.');
    }
};