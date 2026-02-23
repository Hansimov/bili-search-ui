import { defineStore } from 'pinia'
import {
    type DictList,
    RewriteInfo,
    RelatedAuthorsList,
    RelatedAuthorsListItem,
    SearchResultResponse,
    defaultSearchResultResponse,
    SuggestResultResponse,
    SuggestResultCache,
    ResultsSortMethod,
    defaultResultsSortMethod,
} from 'src/stores/resultStore';
import { useQueryStore } from './queryStore';


export const sortAuthors = (a: RelatedAuthorsListItem, b: RelatedAuthorsListItem) => {
    const highlightedA = a.authorInfo.highlighted || false;
    const highlightedB = b.authorInfo.highlighted || false;
    // sort by highlighted, true is first
    if (highlightedA !== highlightedB) {
        return highlightedA ? -1 : 1;
    }
    // sort by count, larger is higher
    return b.authorInfo.count - a.authorInfo.count;
};

export const useSearchStore = defineStore('search', {
    state: () => ({
        suggestQuery: '',
        suggestResultCache: {} as SuggestResultCache,
        suggestions: [] as DictList,
        searchResultDict: defaultSearchResultResponse(),
        resultsSortMethod: defaultResultsSortMethod(),
    }),
    getters: {
        isQueryEmpty(): boolean {
            const queryStore = useQueryStore();
            return !queryStore.query || queryStore.query.trim() === '';
        },
        rewrite_info(): RewriteInfo {
            const queryStore = useQueryStore();
            return this.suggestResultCache[queryStore.query]?.rewrite_info || {
                rewrited: false,
                is_original_in_rewrites: false,
                rewrited_word_exprs: [],
            };
        },
        isSuggestionsListVisible(): boolean {
            return this.suggestions.length > 0;
        },
        isSuggestReplaceVisible(): boolean {
            const queryStore = useQueryStore();
            return (!!queryStore.query && queryStore.query.trim() !== '');
        },
        relatedAuthorsList(): RelatedAuthorsList {
            const queryStore = useQueryStore();
            const relatedAuthors = this.suggestResultCache[queryStore.query]?.suggest_info?.related_authors;
            if (!relatedAuthors) {
                return [];
            }
            const authorsList: RelatedAuthorsList = Object.entries(relatedAuthors).map(
                ([authorName, authorInfo]) => ({
                    authorName,
                    authorInfo,
                })
            );
            return authorsList.sort(sortAuthors);
        },
        isSuggestAuthorsListVisible(): boolean {
            const queryStore = useQueryStore();
            return queryStore.query.trim() !== '' && this.relatedAuthorsList.length > 0;
        },
    },
    actions: {
        setSuggestQuery(newSuggestQuery: string) {
            this.suggestQuery = newSuggestQuery;
        },
        setSuggestResultCache(query: string, newSuggestResult: SuggestResultResponse) {
            this.suggestResultCache[query] = newSuggestResult;
            console.log('Suggest result:', newSuggestResult);
        },
        setSuggestions(newSuggestions: DictList) {
            this.suggestions = newSuggestions;
        },
        setSearchResult(newSearchResult: SearchResultResponse) {
            this.searchResultDict = newSearchResult;
            console.log('Search results:', newSearchResult);
        },
        setResultsSortMethod(newResultsSortMethod: ResultsSortMethod) {
            this.resultsSortMethod = newResultsSortMethod;
        }
    },
});
