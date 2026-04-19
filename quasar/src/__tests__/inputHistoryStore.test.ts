import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInputHistoryStore } from 'src/stores/inputHistoryStore';

const mockSmartService = {
    clearHistoryEntries: vi.fn(),
    addFromHistory: vi.fn(),
};

vi.mock('src/services/smartSuggestService', () => ({
    getSmartSuggestService: () => mockSmartService,
}));

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

describe('InputHistoryStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it('addRecord 应 trim 并持久化到 localStorage', () => {
        const store = useInputHistoryStore();

        store.addRecord('  hello world  ');

        expect(store.totalCount).toBe(1);
        expect(store.items[0].query).toBe('hello world');
        expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('addRecord 对重复输入应去重并更新到最前面', () => {
        const store = useInputHistoryStore();
        const dateNowSpy = vi.spyOn(Date, 'now');

        dateNowSpy
            .mockReturnValueOnce(1000)
            .mockReturnValueOnce(2000)
            .mockReturnValueOnce(3000);

        store.addRecord('  Hello   World  ');
        const firstId = store.items[0].id;
        store.addRecord('other');
        store.addRecord('hello world');

        expect(store.totalCount).toBe(2);
        expect(store.items[0]).toMatchObject({
            id: firstId,
            query: 'hello world',
        });
        expect(store.items[0].timestamp).toBeGreaterThan(store.items[1].timestamp);
        expect(store.items[1].query).toBe('other');

        dateNowSpy.mockRestore();
    });

    it('removeRecord 应删除记录并保持持久化同步', () => {
        const store = useInputHistoryStore();
        store.addRecord('a');
        store.addRecord('b');

        const targetId = store.items[0].id;
        store.removeRecord(targetId);

        expect(store.items.some((item) => item.id === targetId)).toBe(false);
        expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('clearAll 应清空所有输入记录', () => {
        const store = useInputHistoryStore();
        store.addRecord('x');
        store.addRecord('y');

        store.clearAll();

        expect(store.totalCount).toBe(0);
        expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('loadHistory 应恢复有效记录并忽略非法数据', () => {
        localStorageMock.setItem(
            'input-history.v1',
            JSON.stringify([
                { id: 'ok1', query: 'foo', timestamp: 100 },
                { id: '', query: 'bar', timestamp: 200 },
                { id: 'bad1', query: '', timestamp: 1 },
                null,
            ])
        );

        const store = useInputHistoryStore();
        store.loadHistory();

        expect(store.totalCount).toBe(2);
        expect(store.sortedItems.map((item) => item.query)).toEqual(['bar', 'foo']);
    });

    it('loadHistory 应清理历史中的重复输入并保留最新记录', () => {
        localStorageMock.setItem(
            'input-history.v1',
            JSON.stringify([
                { id: 'old', query: '重复问题', timestamp: 100 },
                { id: 'new', query: '重复问题', timestamp: 200 },
                { id: 'space', query: '  重复问题  ', timestamp: 300 },
                { id: 'other', query: '另一个问题', timestamp: 150 },
            ])
        );

        const store = useInputHistoryStore();
        store.loadHistory();

        expect(store.sortedItems.map((item) => item.id)).toEqual(['space', 'other']);
        expect(store.sortedItems.map((item) => item.query)).toEqual([
            '重复问题',
            '另一个问题',
        ]);
        expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('add/remove/clear 应同步 smartSuggest history 索引', () => {
        const store = useInputHistoryStore();

        store.addRecord('sync-me');
        expect(mockSmartService.clearHistoryEntries).toHaveBeenCalledTimes(1);
        expect(mockSmartService.addFromHistory).toHaveBeenLastCalledWith(store.items);

        const id = store.items[0].id;
        store.removeRecord(id);
        expect(mockSmartService.clearHistoryEntries).toHaveBeenCalledTimes(2);
        expect(mockSmartService.addFromHistory).toHaveBeenCalledTimes(1);

        store.addRecord('a');
        store.addRecord('b');
        store.clearAll();
        expect(mockSmartService.clearHistoryEntries).toHaveBeenCalled();
    });
});
