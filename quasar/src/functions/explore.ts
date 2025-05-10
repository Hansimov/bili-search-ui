import { api } from 'boot/axios';
import { useQueryStore } from 'src/stores/queryStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useLayoutStore } from 'src/stores/layoutStore';

const queryStore = useQueryStore();
const exploreStore = useExploreStore();
const layoutStore = useLayoutStore();

let exploreAbortController = new AbortController();

const extractMessagesFromBuffer = (buffer: string): { messages: string[], remainBuffer: string } => {
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
    queryValue, setQuery = true, setRoute = false,
}: {
    queryValue: string,
    setQuery?: boolean,
    setRoute?: boolean,
}) => {
    layoutStore.setIsSuggestVisible(false);
    exploreStore.clearAuthorFilters();
    if (!queryValue) {
        return;
    }
    if (setQuery) {
        queryStore.setQuery({ newQuery: queryValue, setRoute: setRoute });
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
        // exploreStore.clearFlowNodes();
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
                        exploreStore.pushNewStepResult(dataDict);
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
        exploreStore.saveExploreSession();
    } catch (error) {
        console.error('[ERROR]: ', error);
    } finally {
        console.log('[FINAL]');
    }
};