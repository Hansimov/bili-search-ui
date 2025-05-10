import { defineStore, storeToRefs } from 'pinia'
import {
    type DictList,
    RewriteInfo,
    RelatedAuthorsList,
    RelatedAuthorsListItem,
    SearchResultResponse,
    defaultSearchResultResponse,
    SuggestResultResponse,
    SuggestResultCache,
    AiSuggestResultResponse,
    AiSuggestResultCache,
    ResultsSortMethod,
    defaultResultsSortMethod,
} from 'src/stores/resultStore';
import { useQueryStore } from './queryStore';

const queryStore = useQueryStore();
const { query } = storeToRefs(queryStore);

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
        aiQuery: '',
        suggestQuery: '',
        suggestResultCache: {} as SuggestResultCache,
        aiSuggestResultCache: {} as AiSuggestResultCache,
        suggestions: [] as DictList,
        aiSuggestions: [] as DictList,
        searchResultDict: defaultSearchResultResponse(),
        isEnableAiSearch: JSON.parse(localStorage.getItem('isEnableAiSearch') || 'true'),
        resultsSortMethod: defaultResultsSortMethod(),
    }),
    getters: {
        isQueryEmpty(): boolean {
            return !query.value || query.value.trim() === '';
        },
        rewrite_info(): RewriteInfo {
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
            return (!!query.value && query.value.trim() !== '');
        },
        relatedAuthorsList(): RelatedAuthorsList {
            const relatedAuthors = this.suggestResultCache[query.value]?.suggest_info?.related_authors;
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
            return query.value.trim() !== '' && this.relatedAuthorsList.length > 0;
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
        setAiSuggestResultCache(query: string, newAiSuggestResult: AiSuggestResultResponse) {
            this.aiSuggestResultCache[query] = newAiSuggestResult;
            console.log('Ai suggest result:', newAiSuggestResult);
        },
        setSuggestions(newSuggestions: DictList) {
            this.suggestions = newSuggestions;
        },
        setAiSuggestions(newAiSuggestions: DictList) {
            this.aiSuggestions = newAiSuggestions;
        },
        setAiQuery(newAiQuery: string) {
            this.aiQuery = newAiQuery;
        },
        setSearchResult(newSearchResult: SearchResultResponse) {
            this.searchResultDict = newSearchResult;
            console.log('Search results:', newSearchResult);
        },
        setIsEnableAiSearch(newIsEnableAiSearch: boolean) {
            this.isEnableAiSearch = newIsEnableAiSearch;
            localStorage.setItem('isEnableAiSearch', JSON.stringify(newIsEnableAiSearch));
        },
        setResultsSortMethod(newResultsSortMethod: ResultsSortMethod) {
            this.resultsSortMethod = newResultsSortMethod;
        }
    },
});
