import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInputHistoryStore } from 'src/stores/inputHistoryStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';

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

// Mock cacheService for search history persistence (IndexedDB replacement)
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
        async get(storeName: string, key: string) {
            const store = ensureStore(storeName);
            const entry = store.get(key);
            return entry?.value ?? null;
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

describe('History isolation', () => {
    beforeEach(async () => {
        setActivePinia(createPinia());
        localStorageMock.clear();
        vi.restoreAllMocks();

        const cacheModule = (await import('src/services/cacheService')) as {
            __resetMockCache?: () => void;
        };
        cacheModule.__resetMockCache?.();
    });

    it('输入记录单条删除后应持久生效（重新挂载不复活）', () => {
        const inputStore = useInputHistoryStore();

        inputStore.addRecord('  hello world  ');
        expect(inputStore.totalCount).toBe(1);

        const id = inputStore.sortedItems[0].id;
        inputStore.removeRecord(id);
        expect(inputStore.totalCount).toBe(0);

        // 模拟组件/页面重新挂载（新 Pinia 实例）
        setActivePinia(createPinia());
        const reloadedStore = useInputHistoryStore();
        reloadedStore.loadHistory();

        expect(reloadedStore.totalCount).toBe(0);
    });

    it('侧边栏清除历史（会话历史）不应影响输入记录', async () => {
        const inputStore = useInputHistoryStore();
        const searchHistoryStore = useSearchHistoryStore();

        inputStore.addRecord('input-only-query');
        await searchHistoryStore.addRecord('session-query', 1, 'smart');

        expect(inputStore.totalCount).toBe(1);
        expect(searchHistoryStore.totalCount).toBe(1);

        await searchHistoryStore.clearAll();

        expect(searchHistoryStore.totalCount).toBe(0);
        expect(inputStore.totalCount).toBe(1);

        // 持久化键仍存在：侧边栏清除不应触碰输入记录存储
        const persisted = localStorageMock.getItem('input-history.v1');
        expect(persisted).toBeTruthy();
        expect(persisted).toContain('input-only-query');
    });

    it('建议栏清除输入记录不应影响侧边栏会话历史', async () => {
        const inputStore = useInputHistoryStore();
        const searchHistoryStore = useSearchHistoryStore();

        inputStore.addRecord('first-input');
        inputStore.addRecord('second-input');
        await searchHistoryStore.addRecord('session-kept', 3, 'think');

        expect(inputStore.totalCount).toBe(2);
        expect(searchHistoryStore.totalCount).toBe(1);

        inputStore.clearAll();

        expect(inputStore.totalCount).toBe(0);
        expect(searchHistoryStore.totalCount).toBe(1);

        // 重载验证持久化隔离
        setActivePinia(createPinia());
        const reloadedInput = useInputHistoryStore();
        const reloadedSearch = useSearchHistoryStore();

        reloadedInput.loadHistory();
        await reloadedSearch.loadHistory();

        expect(reloadedInput.totalCount).toBe(0);
        expect(reloadedSearch.totalCount).toBe(1);
        expect(reloadedSearch.sortedItems[0].query).toBe('session-kept');
    });
});
