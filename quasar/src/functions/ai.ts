import { useSearchStore } from 'src/stores/searchStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useAiChatStore } from 'src/stores/aiChatStore';
import { Router } from 'vue-router';
import { sendMessageToWebsocket } from './websocket';

let aiSuggestAbortController = new AbortController();
const AI_SUGGEST_DEBOUNCE_INTERVAL = 150; // milliseconds

export const aiSuggest = async (newVal: string, showAiSuggestions = true, setSearchStoreAiQuery = true): Promise<void> => {
    const searchStore = useSearchStore();
    const layoutStore = useLayoutStore();

    if (setSearchStoreAiQuery) {
        searchStore.setAiQuery(newVal);
    }

    if (showAiSuggestions && !layoutStore.isAiSuggestVisible) {
        layoutStore.setIsAiSuggestVisible(true);
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
    const layoutStore = useLayoutStore();
    const aiChatStore = useAiChatStore();

    layoutStore.setIsAiSuggestVisible(false);
    layoutStore.setIsAiChatVisible(true);
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
    const aiChatStore = useAiChatStore();
    const ws = aiChatStore.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
        const terminateMessage = JSON.stringify({ type: 'terminate', info: [] });
        ws.send(terminateMessage);
        console.log('+ sent terminate message');
    } else {
        console.warn('× ws not open. Skip terminate.');
    }
};