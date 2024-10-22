import { defineStore } from 'pinia';

interface SearchResultResponse {
    hits: string[];
    total_hits: number;
    return_hits: number;
    detail_level: number;
}

interface HighlightedKeywords {
    [qword: string]: { [new_qword: string]: number };
}

interface RelatedAuthor {
    uid: number;
    count: number;
    highlighted?: boolean;
}

interface RelatedAuthors {
    [authorName: string]: RelatedAuthor;
}

interface SuggestResultResponse {
    hits: string[];
    highlighted_keywords?: HighlightedKeywords;
    related_authors?: RelatedAuthors;
}

interface SearchState {
    query: string;
    isMouseInSearchBar: boolean;
    suggestQuery: string;
    suggestResultCache: { [key: string]: SuggestResultResponse };
    suggestions: string[];
    isSuggestVisible: boolean;
    results: SearchResultResponse;
    isEnableAISearch: boolean;
    isSearchOptionsBarVisible: boolean;
    activeTab: string;
    resultsSortMethod: {
        field: string,
        order: string,
        label: string,
        icon: string
    };
}

export const useSearchStore = defineStore('search', {
    state: (): SearchState => ({
        query: '',
        isMouseInSearchBar: false,
        isSuggestVisible: true,
        suggestQuery: '',
        suggestResultCache: {},
        suggestions: [],
        results: {
            hits: [],
            total_hits: 0,
            return_hits: 0,
            detail_level: 1,
        },
        isEnableAISearch: false,
        isSearchOptionsBarVisible: true,
        activeTab: 'videos',
        resultsSortMethod: {
            field: 'score', order: 'desc', label: '综合排序', icon: 'fa-solid fa-check'
        }
    }),
    actions: {
        setSuggestQuery(newSuggestQuery: string) {
            this.suggestQuery = newSuggestQuery;
        },
        setSuggestResultCache(query: string, newSuggestResult: SuggestResultResponse) {
            this.suggestResultCache[query] = newSuggestResult;
            console.log('Suggest result:', newSuggestResult);
        },
        setSuggestions(newSuggestions: string[]) {
            this.suggestions = newSuggestions;
        },
        setIsSuggestVisible(newVisibility: boolean) {
            this.isSuggestVisible = newVisibility;
        },
        setIsMouseInSearchBar(newIsMouseInSearchBar: boolean) {
            this.isMouseInSearchBar = newIsMouseInSearchBar;
        },
        setQuery(newQuery: string) {
            this.query = newQuery;
        },
        setSearchResult(newSearchResult: SearchResultResponse) {
            this.results = newSearchResult;
            console.log('Search results:', newSearchResult);
        },
        setIsEnableAISearch(newIsEnableAISearch: boolean) {
            this.isEnableAISearch = newIsEnableAISearch;
        },
        toggleSearchOptionsBarVisibility() {
            this.isSearchOptionsBarVisible = !this.isSearchOptionsBarVisible;
        },
        setActiveTab(newActiveTab: string) {
            this.activeTab = newActiveTab;
        },
        setResultsSortMethod(newResultsSortMethod: {
            field: string, order: string, label: string, icon: string
        }) {
            this.resultsSortMethod = newResultsSortMethod;
        }
    },
});
