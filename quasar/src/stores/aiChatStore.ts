import { defineStore } from 'pinia';

type Role = 'system' | 'user' | 'assistant' | 'tool' | 'stop';

interface AiChatMessage {
    role: Role;
    content: string;
}

interface AiChatState {
    aiChatMessages: AiChatMessage[];
    ws: WebSocket | null;
}

export const useAiChatStore = defineStore('aiChat', {
    state: (): AiChatState => ({
        aiChatMessages: [] as AiChatMessage[],
        ws: null,
    }),
    actions: {
        setWebsocket(ws: WebSocket) {
            this.ws = ws;
        },
        addMessage(role: Role, content: string) {
            this.aiChatMessages.push({ role: role, content: content });
        },
        appendToActiveMessage(content: string) {
            this.aiChatMessages[this.aiChatMessages.length - 1].content += content;
        },
    }
})
