import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInputHistoryStore } from 'src/stores/inputHistoryStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import { useChatStore } from 'src/stores/chatStore';
import { getSmartSuggestService } from 'src/services/smartSuggestService';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'window', {
    value: { localStorage: localStorageMock },
    writable: true,
});

// Mock cacheService for searchHistoryStore persistence
vi.mock('src/services/cacheService', () => {
    type MockEntry = { key: string; value: unknown };
    const stores = new Map<string, Map<string, MockEntry>>();

    const ensureStore = (storeName: string) => {
        let store = stores.get(storeName);
        if (!store) {
            store = new Map<string, MockEntry>();
            stores.set(storeName, store);
        }
        return store;
    };

    const cacheService = {
        async set(storeName: string, key: string, value: unknown) {
            const store = ensureStore(storeName);
            store.set(key, { key, value });
        },
        async getAll(storeName: string) {
            const store = ensureStore(storeName);
            return Array.from(store.values());
        },
        async delete(storeName: string, key: string) {
            const store = ensureStore(storeName);
            store.delete(key);
        },
        async clear(storeName: string) {
            const store = ensureStore(storeName);
            store.clear();
        },
    };

    return {
        cacheService,
        STORE_NAMES: {
            DATA: 'data-cache',
            IMAGE: 'image-cache',
            HISTORY: 'search-history',
        },
        HISTORY_CACHE_TTL: 30 * 24 * 60 * 60 * 1000,
        __resetMockCache: () => stores.clear(),
    };
});

describe('Input/Search interaction end-to-end flow', () => {
    beforeEach(async () => {
        setActivePinia(createPinia());
        localStorageMock.clear();
        vi.clearAllMocks();

        const suggest = getSmartSuggestService();
        suggest.clear();

        const cacheModule = (await import('src/services/cacheService')) as {
            __resetMockCache?: () => void;
        };
        cacheModule.__resetMockCache?.();
    });

    it('输入→建议输出→删除→建议消失→再次输入→建议恢复（history 类型）', () => {
        const inputStore = useInputHistoryStore();
        const suggest = getSmartSuggestService();

        inputStore.addRecord('原神角色');

        const firstSuggest = suggest.suggest('原神');
        expect(
            firstSuggest.some((item) => item.type === 'history' && item.text === '原神角色')
        ).toBe(true);

        const target = inputStore.items.find((item) => item.query === '原神角色');
        expect(target).toBeTruthy();
        if (!target) {
            throw new Error('expected target history item to exist');
        }
        inputStore.removeRecord(target.id);

        const afterRemove = suggest.suggest('原神');
        expect(
            afterRemove.some((item) => item.type === 'history' && item.text === '原神角色')
        ).toBe(false);

        inputStore.addRecord('原神角色');
        const afterReInput = suggest.suggest('原神');
        expect(
            afterReInput.some((item) => item.type === 'history' && item.text === '原神角色')
        ).toBe(true);
    });

    it('输入记录清空只移除 history 建议，不影响 title/author 等交互建议', () => {
        const inputStore = useInputHistoryStore();
        const suggest = getSmartSuggestService();

        suggest.addFromSearchResults([
            {
                title: '原神角色强度排行',
                owner: { name: '测试UP主', mid: 123 },
                tags: '原神,角色,攻略',
            },
        ]);

        inputStore.addRecord('原神角色');
        const beforeClear = suggest.suggest('原神');
        expect(beforeClear.some((item) => item.type === 'history')).toBe(true);
        expect(beforeClear.some((item) => item.type === 'title')).toBe(true);

        inputStore.clearAll();

        const afterClear = suggest.suggest('原神');
        expect(afterClear.some((item) => item.type === 'history')).toBe(false);
        expect(afterClear.some((item) => item.type === 'title')).toBe(true);
    });

    it('会话历史全链路：新增→置顶→删除→清空', async () => {
        const historyStore = useSearchHistoryStore();

        const id1 = await historyStore.addRecord('direct query', 3, 'direct');
        const id2 = await historyStore.addRecord('smart query', 1, 'smart');
        const id3 = await historyStore.addRecord('think query', 2, 'think');

        expect(historyStore.totalCount).toBe(3);

        await historyStore.togglePin(id2);
        expect(historyStore.pinnedItems.some((item) => item.id === id2)).toBe(true);
        expect(historyStore.sortedItems[0].id).toBe(id2);

        await historyStore.removeRecord(id1);
        expect(historyStore.items.some((item) => item.id === id1)).toBe(false);
        expect(historyStore.totalCount).toBe(2);

        await historyStore.clearAll();
        expect(historyStore.totalCount).toBe(0);

        expect(id3).toBeTruthy();
    });

    it('输入记录与会话历史存储隔离：管理会话不影响输入建议', async () => {
        const inputStore = useInputHistoryStore();
        const historyStore = useSearchHistoryStore();
        const suggest = getSmartSuggestService();

        inputStore.addRecord('独立输入记录');
        await historyStore.addRecord('会话记录A', 1, 'smart');
        await historyStore.addRecord('会话记录B', 2, 'think');

        await historyStore.clearAll();

        const suggestions = suggest.suggest('独立');
        expect(
            suggestions.some((item) => item.type === 'history' && item.text === '独立输入记录')
        ).toBe(true);
        expect(inputStore.totalCount).toBe(1);
        expect(historyStore.totalCount).toBe(0);
    });

    it('会话历史管理：置顶 + clearUnpinned 仅保留置顶记录', async () => {
        const historyStore = useSearchHistoryStore();

        const keepId = await historyStore.addRecord('keep pinned', 2, 'smart');
        const dropId1 = await historyStore.addRecord('drop one', 1, 'direct');
        const dropId2 = await historyStore.addRecord('drop two', 1, 'think');

        await historyStore.togglePin(keepId);
        await historyStore.clearUnpinned();

        expect(historyStore.totalCount).toBe(1);
        expect(historyStore.items[0].id).toBe(keepId);
        expect(historyStore.items[0].pinned).toBe(true);
        expect(historyStore.items.some((item) => item.id === dropId1)).toBe(false);
        expect(historyStore.items.some((item) => item.id === dropId2)).toBe(false);
    });

    it('chat 快照链路：存储 sessionId -> findBySessionId -> restoreFromSnapshot', async () => {
        const historyStore = useSearchHistoryStore();
        const chatStore = useChatStore();

        const snapshot = {
            session: {
                ...chatStore.currentSession,
                sessionId: 'session-e2e-1',
                query: '谁是测试up主',
                content: '这是测试回答',
                isDone: true,
            },
            conversationHistory: [
                {
                    id: 'm-1',
                    role: 'user' as const,
                    content: '谁是测试up主',
                },
                {
                    id: 'm-2',
                    role: 'assistant' as const,
                    content: '这是测试回答',
                },
            ],
        };

        const recordId = await historyStore.addRecord(
            '谁是测试up主',
            1,
            'smart',
            snapshot,
            'session-e2e-1'
        );

        const restoredItem = historyStore.findBySessionId('session-e2e-1');
        expect(restoredItem).toBeTruthy();
        if (!restoredItem || !restoredItem.chatSnapshot) {
            throw new Error('expected history item with chatSnapshot');
        }

        chatStore.restoreFromSnapshot(restoredItem.chatSnapshot);
        chatStore.setCurrentHistoryRecordId(recordId);

        expect(chatStore.currentSessionId).toBe('session-e2e-1');
        expect(chatStore.currentSession.query).toBe('谁是测试up主');
        expect(chatStore.currentSession.content).toContain('测试回答');
        expect(chatStore.currentHistoryRecordId).toBe(recordId);
    });
});
