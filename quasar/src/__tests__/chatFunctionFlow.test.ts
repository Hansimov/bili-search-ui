import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockQueryStore = {
    setQuery: vi.fn(),
};

const mockLayoutStore = {
    setIsSuggestVisible: vi.fn(),
};

const mockChatStore = {
    currentSessionId: 'session-123',
    conversationHistory: [] as Array<{ role: string; content: string }>,
    currentHistoryRecordId: null as string | null,
    setCurrentHistoryRecordId: vi.fn(),
    sendChat: vi.fn(async () => undefined),
};

const mockExploreStore = {
    setSubmittedQuery: vi.fn(),
};

const mockSearchHistoryStore = {
    addRecord: vi.fn(async () => 'record-1'),
};

const mockExplore = vi.fn(async () => undefined);

vi.mock('src/stores/queryStore', () => ({
    useQueryStore: () => mockQueryStore,
}));

vi.mock('src/stores/layoutStore', () => ({
    useLayoutStore: () => mockLayoutStore,
}));

vi.mock('src/stores/chatStore', () => ({
    useChatStore: () => mockChatStore,
}));

vi.mock('src/stores/exploreStore', () => ({
    useExploreStore: () => mockExploreStore,
}));

vi.mock('src/stores/searchHistoryStore', () => ({
    useSearchHistoryStore: () => mockSearchHistoryStore,
}));

vi.mock('src/functions/explore', () => ({
    explore: mockExplore,
}));

describe('chat.ts flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockChatStore.currentSessionId = 'session-123';
        mockChatStore.conversationHistory = [];
        mockChatStore.currentHistoryRecordId = null;
    });

    it('chat 首次提交应写入 chat 路由参数并创建会话历史记录', async () => {
        const { chat } = await import('src/functions/chat');

        await chat({
            queryValue: '测试问题',
            mode: 'smart',
            setQuery: true,
            setRoute: true,
        });

        expect(mockLayoutStore.setIsSuggestVisible).toHaveBeenCalledWith(false);
        expect(mockExploreStore.setSubmittedQuery).toHaveBeenCalledWith('测试问题');
        expect(mockQueryStore.setQuery).toHaveBeenCalledWith({
            newQuery: '测试问题',
            setRoute: true,
            mode: 'smart',
            chatSessionId: 'session-123',
        });

        expect(mockSearchHistoryStore.addRecord).toHaveBeenCalledWith(
            '测试问题',
            undefined,
            'smart',
            undefined,
            'session-123'
        );
        expect(mockChatStore.setCurrentHistoryRecordId).toHaveBeenCalledWith(
            'record-1'
        );
        expect(mockChatStore.sendChat).toHaveBeenCalledWith('测试问题', 'smart');
    });

    it('chat 在续接对话时不应重复写入会话历史', async () => {
        const { chat } = await import('src/functions/chat');

        mockChatStore.conversationHistory = [{ role: 'user', content: 'old' }];

        await chat({
            queryValue: '继续追问',
            mode: 'think',
            setQuery: false,
            setRoute: false,
        });

        expect(mockQueryStore.setQuery).not.toHaveBeenCalled();
        expect(mockSearchHistoryStore.addRecord).not.toHaveBeenCalled();
        expect(mockChatStore.sendChat).toHaveBeenCalledWith('继续追问', 'think');
    });

    it('submitByMode 应将 direct 分流到 explore，将 smart 分流到 chat', async () => {
        const { submitByMode } = await import('src/functions/chat');

        await submitByMode({
            queryValue: 'direct query',
            mode: 'direct',
            setQuery: true,
            setRoute: true,
        });

        expect(mockExplore).toHaveBeenCalledWith({
            queryValue: 'direct query',
            setQuery: true,
            setRoute: true,
        });

        await submitByMode({
            queryValue: 'smart query',
            mode: 'smart',
            setQuery: true,
            setRoute: true,
        });

        expect(mockChatStore.sendChat).toHaveBeenCalledWith('smart query', 'smart');
    });
});
