import { defineStore } from 'pinia';

interface ResultsResponse {
    hits: string[];
    total_hits: number;
    return_hits: number;
    detail_level: number;
}

interface SearchState {
    query: string;
    isMouseInSuggestionList: boolean;
    suggestQuery: string;
    suggestions: string[];
    isSuggestionsVisible: boolean;
    results: ResultsResponse;
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
        isMouseInSuggestionList: false,
        isSuggestionsVisible: true,
        suggestQuery: '',
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
        setSuggestions(newSuggestions: string[]) {
            this.suggestions = newSuggestions;
        },
        setSuggestQuery(newSuggestQuery: string) {
            this.suggestQuery = newSuggestQuery;
        },
        setIsSuggestionsVisible(newVisibility: boolean) {
            this.isSuggestionsVisible = newVisibility;
        },
        setIsMouseInSuggestionList(newIsMouseInSuggestionList: boolean) {
            this.isMouseInSuggestionList = newIsMouseInSuggestionList;
        },
        setQuery(newQuery: string) {
            this.query = newQuery;
        },
        setResults(newResults: ResultsResponse) {
            this.results = newResults;
            console.log('Results:', this.results);
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
