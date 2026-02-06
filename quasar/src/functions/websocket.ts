import { useAiChatStore } from '../stores/aiChatStore';

const getWsUrl = () => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws`;
    console.log(`+ ws url: ${wsUrl}`);
    return wsUrl;
}
const WS_URL = getWsUrl();

export const initWebSocket = (): WebSocket => {
    const aiChatStore = useAiChatStore();
    const ws = new WebSocket(WS_URL);
    aiChatStore.setWebsocket(ws);

    ws.onopen = () => {
        console.log('+ ws connected');
    };

    ws.onmessage = (event) => {
        const response = JSON.parse(event.data);
        const { type, info } = response;

        if (type === 'chat') {
            const { role, content } = info;
            if (role === 'stop') {
                console.log('x ws stopped');
                aiChatStore.appendToActiveMessage('\n');
            } else if (content) {
                aiChatStore.appendToActiveMessage(content);
            }
            if (!aiChatStore.isUserScrollAiChat) {
                aiChatStore.scrollAiChatToBottom();
            }
        }
    };

    ws.onerror = (error) => {
        console.error('x ws error:', error);
    };

    ws.onclose = () => {
        console.log('* ws closed');
    };

    return ws;
}

export const sendMessageToWebsocket = (message: string) => {
    const aiChatStore = useAiChatStore();
    let ws: WebSocket;

    if (aiChatStore.ws && aiChatStore.ws.readyState === WebSocket.OPEN) {
        ws = aiChatStore.ws;
    } else {
        ws = initWebSocket();
    }

    if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        console.log(`+ sent message: ${message}`);
    } else {
        ws.onopen = () => ws.send(message);
    }
}