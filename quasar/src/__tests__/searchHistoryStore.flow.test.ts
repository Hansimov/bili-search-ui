import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';

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
            ensureStore(storeName).set(key, { key, value });
        },
        async getAll(storeName: string) {
            return Array.from(ensureStore(storeName).values());
        },
        async delete(storeName: string, key: string) {
            ensureStore(storeName).delete(key);
        },
        async clear(storeName: string) {
            ensureStore(storeName).clear();
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

describe('SearchHistoryStore flow', () => {
    beforeEach(async () => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        const cacheModule = (await import('src/services/cacheService')) as {
            __resetMockCache?: () => void;
        };
        cacheModule.__resetMockCache?.();
    });

    it('clearSearchOnly 应保留 smart/think/research，会删除 direct', async () => {
        const store = useSearchHistoryStore();

        await store.addRecord('d', 1, 'direct');
        await store.addRecord('s', 1, 'smart');
        await store.addRecord('t', 1, 'think');
        await store.addRecord('r', 1, 'research');

        await store.clearSearchOnly();

        expect(store.items.some((item) => item.mode === 'direct')).toBe(false);
        expect(store.items.some((item) => item.mode === 'smart')).toBe(true);
        expect(store.items.some((item) => item.mode === 'think')).toBe(true);
        expect(store.items.some((item) => item.mode === 'research')).toBe(true);
    });

    it('updateSessionId + findBySessionId 应形成可恢复链路', async () => {
        const store = useSearchHistoryStore();
        const id = await store.addRecord('chat query', 1, 'smart');

        expect(store.findBySessionId('session-777')).toBeUndefined();

        await store.updateSessionId(id, 'session-777');
        const found = store.findBySessionId('session-777');

        expect(found).toBeTruthy();
        expect(found?.id).toBe(id);
        expect(found?.sessionId).toBe('session-777');
    });

    it('findLatestRecord 应按最新时间返回匹配 query/mode 记录', async () => {
        const store = useSearchHistoryStore();
        const firstDirectId = await store.addRecord('same', 0, 'direct');
        const smartId = await store.addRecord('same', 0, 'smart');
        const latestDirectId = await store.addRecord('same', 0, 'direct');

        // 手动设置明确时间戳，避免同毫秒写入导致排序不稳定
        const firstDirect = store.items.find((item) => item.id === firstDirectId);
        const smart = store.items.find((item) => item.id === smartId);
        const latestDirect = store.items.find((item) => item.id === latestDirectId);
        if (!firstDirect || !smart || !latestDirect) {
            throw new Error('expected created records to exist');
        }
        firstDirect.timestamp = 1000;
        smart.timestamp = 2000;
        latestDirect.timestamp = 3000;

        const resolvedDirect = store.findLatestRecord('same', 'direct');
        const resolvedSmart = store.findLatestRecord('same', 'smart');

        expect(resolvedDirect?.id).toBe(latestDirectId);
        expect(resolvedDirect?.id).not.toBe(firstDirectId);
        expect(resolvedSmart?.id).toBe(smartId);
    });
});
