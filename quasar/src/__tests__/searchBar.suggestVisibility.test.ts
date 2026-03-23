// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SearchBar from 'src/components/SearchBar.vue';

const { mockSuggest, mockSuggestIndexVersion } = vi.hoisted(() => ({
    mockSuggest: vi.fn(() => []),
    mockSuggestIndexVersion: { value: 0 },
}));

vi.mock('vue-router', () => ({
    useRoute: () => ({
        path: '/',
        query: {},
        params: {},
    }),
}));

vi.mock('src/router', () => ({
    getRouter: () => ({
        currentRoute: { value: { fullPath: '/' } },
        replace: vi.fn(),
    }),
}));

const mockSearchStore = {
    isQueryEmpty: false,
    isSuggestionsListVisible: false,
    isSuggestReplaceVisible: false,
    isSuggestAuthorsListVisible: false,
    suggestResultCache: {} as Record<string, { hits?: unknown[]; rewrite_info?: { rewrited_word_exprs?: string[] }; suggest_info?: { related_authors?: Record<string, unknown> } }>,
};

const mockQueryStore = {
    query: 'hello',
};

const mockLayoutStore = {
    isSuggestVisible: true,
    setIsMouseInSearchBar: vi.fn(),
};

const mockInputHistoryStore = {
    sortedItems: [] as Array<{ id: string; query: string }>,
};

vi.mock('src/stores/searchStore', () => ({
    useSearchStore: () => mockSearchStore,
}));

vi.mock('src/stores/queryStore', () => ({
    useQueryStore: () => mockQueryStore,
}));

vi.mock('src/stores/layoutStore', () => ({
    useLayoutStore: () => mockLayoutStore,
}));

vi.mock('src/stores/inputHistoryStore', () => ({
    useInputHistoryStore: () => mockInputHistoryStore,
}));

vi.mock('src/services/smartSuggestService', () => ({
    getSmartSuggestService: () => ({
        suggest: mockSuggest,
    }),
    suggestIndexVersion: mockSuggestIndexVersion,
}));

const mountSearchBar = () =>
    mount(SearchBar, {
        global: {
            stubs: {
                SearchInput: true,
                SmartSuggestions: true,
                SuggestReplace: true,
                SuggestAuthorsList: true,
                SuggestionsList: true,
                SearchHistoryPanel: true,
                'q-separator': true,
            },
        },
    });

describe('SearchBar suggestion visibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchStore.isQueryEmpty = false;
        mockSearchStore.isSuggestionsListVisible = false;
        mockSearchStore.isSuggestReplaceVisible = false;
        mockSearchStore.isSuggestAuthorsListVisible = false;
        mockSearchStore.suggestResultCache = {};
        mockQueryStore.query = 'hello';
        mockLayoutStore.isSuggestVisible = true;
        mockInputHistoryStore.sortedItems = [];
        mockSuggest.mockReturnValue([]);
        mockSuggestIndexVersion.value++;
    });

    it('无任何建议内容时不应渲染建议容器', () => {
        const wrapper = mountSearchBar();

        expect(wrapper.find('.search-sub-container').exists()).toBe(false);
    });

    it('有智能建议时应渲染建议容器', () => {
        mockSuggest.mockReturnValue([{ text: 'hello', type: 'phrase' } as never]);

        const wrapper = mountSearchBar();

        expect(wrapper.find('.search-sub-container').exists()).toBe(true);
    });

    it('旧 query 的缓存结果不应让当前空 query 建议壳继续显示', () => {
        mockSearchStore.suggestResultCache = {
            old: {
                hits: [{ title: 'old result' }],
            },
        };
        mockQueryStore.query = 'new-query';

        const wrapper = mountSearchBar();

        expect(wrapper.find('.search-sub-container').exists()).toBe(false);
    });
});