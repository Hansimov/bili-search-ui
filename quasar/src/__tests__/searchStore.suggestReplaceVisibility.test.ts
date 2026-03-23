import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSearchStore } from 'src/stores/searchStore';

const mockQueryStore = {
    query: '',
};

vi.mock('src/stores/queryStore', () => ({
    useQueryStore: () => mockQueryStore,
}));

describe('searchStore suggest replace visibility', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        mockQueryStore.query = '';
    });

    it('无重写信息时不应显示 SuggestReplace', () => {
        const store = useSearchStore();

        mockQueryStore.query = 'hello';

        expect(store.isSuggestReplaceVisible).toBe(false);
    });

    it('有 rewrite 候选时应显示 SuggestReplace', () => {
        const store = useSearchStore();

        mockQueryStore.query = 'hello';
        store.suggestResultCache.hello = {
            detail_level: 0,
            return_hits: 0,
            total_hits: 0,
            hits: [],
            suggest_info: {
                qword_hword_count: {},
                hword_count_qword: {},
                group_replaces_count: [],
                related_authors: {},
            },
            query_info: {
                query: 'hello',
                words_expr: 'hello',
                keywords_body: ['hello'],
                keywords_date: [],
            },
            rewrite_info: {
                rewrited: true,
                is_original_in_rewrites: false,
                rewrited_word_exprs: ['hello world'],
            },
        };

        expect(store.isSuggestReplaceVisible).toBe(true);
    });

    it('只有原始关键词但没有 rewrite 候选时不应显示 SuggestReplace', () => {
        const store = useSearchStore();

        mockQueryStore.query = 'hello';
        store.suggestResultCache.hello = {
            detail_level: 0,
            return_hits: 0,
            total_hits: 0,
            hits: [],
            suggest_info: {
                qword_hword_count: {},
                hword_count_qword: {},
                group_replaces_count: [],
                related_authors: {},
            },
            query_info: {
                query: 'hello',
                words_expr: 'hello',
                keywords_body: ['hello'],
                keywords_date: [],
            },
            rewrite_info: {
                rewrited: false,
                is_original_in_rewrites: false,
                rewrited_word_exprs: [],
            },
        };

        expect(store.isSuggestReplaceVisible).toBe(false);
    });
});