import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockQueryStore = {
    setQuery: vi.fn(),
    setChatRoute: vi.fn(),
};

const mockLayoutStore = {
    setIsSuggestVisible: vi.fn(),
    resetSuggestNavigation: vi.fn(),
    setCurrentPage: vi.fn(),
};

const mockChatStore = {
    currentSessionId: 'session-123',
    conversationHistory: [] as Array<{ role: string; content: string }>,
    currentHistoryRecordId: null as string | null,
    setCurrentHistoryRecordId: vi.fn(),
    startNewChat: vi.fn(),
    sendChat: vi.fn(async () => undefined),
};

const mockInputHistoryStore = {
    addRecord: vi.fn(),
};

const mockSearchModeStore = {
    setInitialSessionMode: vi.fn(),
    shouldUseInlineLayout: false,
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

vi.mock('src/stores/inputHistoryStore', () => ({
    useInputHistoryStore: () => mockInputHistoryStore,
}));

vi.mock('src/stores/searchModeStore', () => ({
    useSearchModeStore: () => mockSearchModeStore,
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
        mockSearchModeStore.shouldUseInlineLayout = false;
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
            setRoute: false,
        });
        expect(mockQueryStore.setChatRoute).toHaveBeenCalledWith('session-123');

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

    it('submitCurrentModeQuery 在 direct 模式应统一走 explore 并记录输入历史', async () => {
        const { submitCurrentModeQuery } = await import('src/functions/chat');

        await submitCurrentModeQuery({
            queryValue: 'direct query',
            mode: 'direct',
            recordInputHistory: true,
            setRoute: true,
        });

        expect(mockLayoutStore.setIsSuggestVisible).toHaveBeenCalledWith(false);
        expect(mockLayoutStore.resetSuggestNavigation).toHaveBeenCalledTimes(1);
        expect(mockInputHistoryStore.addRecord).toHaveBeenCalledWith('direct query');
        expect(mockSearchModeStore.setInitialSessionMode).toHaveBeenCalledWith('direct');
        expect(mockExplore).toHaveBeenCalledWith({
            queryValue: 'direct query',
            setQuery: true,
            setRoute: true,
        });
        expect(mockLayoutStore.setCurrentPage).toHaveBeenCalledWith(1);
    });

    it('submitCurrentModeQuery 在 chat 续接时不应新开会话', async () => {
        const { submitCurrentModeQuery } = await import('src/functions/chat');

        mockChatStore.conversationHistory = [{ role: 'user', content: 'old' }];
        mockSearchModeStore.shouldUseInlineLayout = true;

        await submitCurrentModeQuery({
            queryValue: 'follow up',
            mode: 'smart',
            recordInputHistory: true,
            setRoute: true,
        });

        expect(mockInputHistoryStore.addRecord).toHaveBeenCalledWith('follow up');
        expect(mockChatStore.startNewChat).not.toHaveBeenCalled();
        expect(mockQueryStore.setQuery).not.toHaveBeenCalled();
        expect(mockQueryStore.setChatRoute).not.toHaveBeenCalled();
        expect(mockChatStore.sendChat).toHaveBeenCalledWith('follow up', 'smart');
    });

    it('submitSuggestionByMode 应按当前 chat 模式提交而不是强制 explore', async () => {
        const { submitSuggestionByMode } = await import('src/functions/chat');

        await submitSuggestionByMode({
            item: {
                text: '老番茄',
                type: 'author',
                meta: { uid: 546195 },
            },
            mode: 'think',
        });

        expect(mockInputHistoryStore.addRecord).toHaveBeenCalledWith('uid=546195');
        expect(mockSearchModeStore.setInitialSessionMode).toHaveBeenCalledWith('think');
        expect(mockChatStore.startNewChat).toHaveBeenCalledTimes(1);
        expect(mockQueryStore.setQuery).not.toHaveBeenCalled();
        expect(mockQueryStore.setChatRoute).toHaveBeenCalledWith('session-123');
        expect(mockChatStore.sendChat).toHaveBeenCalledWith('uid=546195', 'think');
        expect(mockExplore).not.toHaveBeenCalled();
    });
});
