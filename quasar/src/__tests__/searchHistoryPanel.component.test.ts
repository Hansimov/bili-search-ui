// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { InputHistoryItem } from 'src/stores/inputHistoryStore';
import SearchHistoryPanel from 'src/components/SearchHistoryPanel.vue';

const {
    mockInputHistoryStore,
    mockLayoutStore,
    mockQueryStore,
    mockSearchModeStore,
    mockSubmitByMode,
} = vi.hoisted(() => ({
    mockInputHistoryStore: {
        loadHistory: vi.fn(),
        sortedItems: [] as InputHistoryItem[],
        removeRecord: vi.fn(),
        clearAll: vi.fn(),
    },
    mockLayoutStore: {
        setIsSuggestVisible: vi.fn(),
        setCurrentPage: vi.fn(),
    },
    mockQueryStore: {
        setQuery: vi.fn(),
    },
    mockSearchModeStore: {
        currentMode: 'direct' as 'direct' | 'smart' | 'think' | 'research',
        setInitialSessionMode: vi.fn(),
    },
    mockSubmitByMode: vi.fn(),
}));

vi.mock('src/stores/inputHistoryStore', () => ({
    useInputHistoryStore: () => mockInputHistoryStore,
}));

vi.mock('src/stores/layoutStore', () => ({
    useLayoutStore: () => mockLayoutStore,
}));

vi.mock('src/stores/queryStore', () => ({
    useQueryStore: () => mockQueryStore,
}));

vi.mock('src/stores/searchModeStore', () => ({
    useSearchModeStore: () => mockSearchModeStore,
    getSearchMode: (mode: 'direct' | 'smart' | 'think' | 'research') => ({
        apiType: mode === 'direct' ? 'explore' : 'chat',
    }),
}));

vi.mock('src/functions/chat', () => ({
    submitByMode: mockSubmitByMode,
}));

const mountPanel = () =>
    mount(SearchHistoryPanel, {
        global: {
            stubs: {
                'q-btn': true,
                'q-chip': true,
                'q-icon': true,
            },
        },
    });

describe('SearchHistoryPanel component logic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockInputHistoryStore.sortedItems = [];
        mockSearchModeStore.currentMode = 'direct';
    });

    it('挂载时应加载输入记录', () => {
        mountPanel();
        expect(mockInputHistoryStore.loadHistory).toHaveBeenCalledTimes(1);
    });

    it('removeItem 应删除输入记录，clearInputHistory 应清空输入记录', () => {
        const wrapper = mountPanel();
        const vm = wrapper.vm as unknown as {
            removeItem: (item: InputHistoryItem) => void;
            clearInputHistory: () => void;
        };

        const item: InputHistoryItem = {
            id: 'id-1',
            query: 'foo',
            timestamp: Date.now(),
        };

        vm.removeItem(item);
        vm.clearInputHistory();

        expect(mockInputHistoryStore.removeRecord).toHaveBeenCalledWith('id-1');
        expect(mockInputHistoryStore.clearAll).toHaveBeenCalledTimes(1);
    });

    it('searchFromHistory 在 direct 模式应按当前模式提交并更新分页', async () => {
        const wrapper = mountPanel();
        const vm = wrapper.vm as unknown as {
            searchFromHistory: (item: InputHistoryItem) => Promise<void>;
        };

        const item: InputHistoryItem = {
            id: 'id-2',
            query: 'hello world',
            timestamp: Date.now(),
        };

        await vm.searchFromHistory(item);

        expect(mockSearchModeStore.setInitialSessionMode).toHaveBeenCalledWith(
            'direct'
        );
        expect(mockLayoutStore.setIsSuggestVisible).toHaveBeenCalledWith(false);
        expect(mockSubmitByMode).toHaveBeenCalledWith({
            queryValue: 'hello world',
            mode: 'direct',
            setQuery: true,
            setRoute: true,
        });
        expect(mockLayoutStore.setCurrentPage).toHaveBeenCalledWith(1);
    });

    it('searchFromHistory 在 smart/think/research 模式只填充输入框，不直接提交', async () => {
        const wrapper = mountPanel();
        const vm = wrapper.vm as unknown as {
            searchFromHistory: (item: InputHistoryItem) => Promise<void>;
        };
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

        const item: InputHistoryItem = {
            id: 'id-3',
            query: 'who are you',
            timestamp: Date.now(),
        };

        for (const mode of ['smart', 'think', 'research'] as const) {
            mockSearchModeStore.currentMode = mode;
            await vm.searchFromHistory(item);
        }

        expect(mockQueryStore.setQuery).toHaveBeenCalledTimes(3);
        expect(mockQueryStore.setQuery).toHaveBeenNthCalledWith(1, {
            newQuery: 'who are you',
            setRoute: false,
        });
        expect(mockQueryStore.setQuery).toHaveBeenNthCalledWith(2, {
            newQuery: 'who are you',
            setRoute: false,
        });
        expect(mockQueryStore.setQuery).toHaveBeenNthCalledWith(3, {
            newQuery: 'who are you',
            setRoute: false,
        });
        expect(dispatchEventSpy).toHaveBeenCalledTimes(3);
        expect(mockSearchModeStore.setInitialSessionMode).not.toHaveBeenCalled();
        expect(mockSubmitByMode).not.toHaveBeenCalled();
        expect(mockLayoutStore.setCurrentPage).not.toHaveBeenCalled();
    });

    it('recentItems 应按 query 去重并保留最新记录', () => {
        const now = Date.now();
        mockInputHistoryStore.sortedItems = [
            { id: 'new-a', query: 'dup', timestamp: now },
            { id: 'b', query: 'other', timestamp: now - 10 },
            { id: 'old-a', query: 'dup', timestamp: now - 20 },
        ];

        const wrapper = mountPanel();
        const vm = wrapper.vm as unknown as {
            hasHistory: boolean;
            recentItems: InputHistoryItem[];
        };

        expect(vm.hasHistory).toBe(true);
        expect(vm.recentItems.map((x) => x.id)).toEqual(['new-a', 'b']);
    });
});
