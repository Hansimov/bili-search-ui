import { useSearchStore } from '../stores/searchStore';
import { useAiChatStore } from '../stores/aiChatStore';
import { Router } from 'vue-router';

const searchStore = useSearchStore();
const aiChatStore = useAiChatStore();
const WS_URL = '/ws';

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
        if (!isFromURL) {
            const newRoute = `/search?ai=${aiQueryValue}`;
            if (router.currentRoute.value.path !== newRoute) {
                await router.push(newRoute);
            }
        }
        try {
            console.log('> submit ai query:', aiQueryValue);
            const sent_msg = JSON.stringify({ type: 'chat', info: [{ 'role': 'user', 'content': aiQueryValue }] });
            let ws: WebSocket;
            if (aiChatStore.ws) {
                ws = aiChatStore.ws;
                if (ws.readyState === WebSocket.CLOSED) {
                    ws = new WebSocket(WS_URL);
                    aiChatStore.setWebsocket(ws);
                }
            } else {
                ws = new WebSocket(WS_URL);
                ws.onopen = () => {
                    console.log('+ ws connected');
                    ws.send(sent_msg);
                };
                ws.onmessage = (event) => {
                    const response = JSON.parse(event.data);
                    const msg_type = response.type;
                    const msg_info = response.info;
                    if (msg_type === 'chat') {
                        const role = msg_info.role;
                        const content = msg_info.content;
                        if (role === 'stop') {
                            console.log('x ws stopped');
                            console.log(aiChatStore.aiChatMessages);
                        } else {
                            if (content) {
                                aiChatStore.appendToActiveMessage(content);
                            }
                        }
                    }
                };
                ws.onerror = (error) => {
                    console.error('x ws error:', error);
                };
                ws.onclose = () => {
                    console.log('* ws closed');
                };
                aiChatStore.setWebsocket(ws);
            }
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(sent_msg);
            }
            console.log(`+ sent ai query: ${aiQueryValue}`);
        } catch (error) {
            console.error(error);
        }
    }
};