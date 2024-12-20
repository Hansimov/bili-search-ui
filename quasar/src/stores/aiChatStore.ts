import { defineStore } from 'pinia';

type Role = 'system' | 'user' | 'assistant' | 'tool' | 'stop';

interface AiChatMessage {
    role: Role;
    content: string;
}

interface AiChatState {
    aiChatMessages: AiChatMessage[];
    aiChatMessagesListRef: HTMLElement | null;
    aiChatMessagesCollection: AiChatMessage[][];
    isUserScrollAiChat: boolean;
    ws: WebSocket | null;
}

export const useAiChatStore = defineStore('aiChat', {
    state: (): AiChatState => ({
        aiChatMessages: [] as AiChatMessage[],
        aiChatMessagesListRef: null,
        aiChatMessagesCollection: [] as AiChatMessage[][],
        ws: null,
        isUserScrollAiChat: false,
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
        setAiChatMessagesListRef(ref: HTMLElement) {
            this.aiChatMessagesListRef = ref;
        },
        saveAndClearAiChatMessages() {
            this.aiChatMessagesCollection.push([...this.aiChatMessages]);
            this.aiChatMessages = [];
        },
        setIsUserScrollAiChat(isUserScrollAiChat: boolean) {
            this.isUserScrollAiChat = isUserScrollAiChat;
        },
        scrollAiChatToBottom() {
            if (this.aiChatMessagesListRef) {
                this.aiChatMessagesListRef.scrollTo({
                    top: this.aiChatMessagesListRef.scrollHeight,
                })
            }
        }
    }
})
