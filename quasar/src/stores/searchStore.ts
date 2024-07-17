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
    suggestions: string[];
    results: ResultsResponse;
    isSuggestionsVisible: boolean;
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
        suggestions: [],
        results: {
            hits: [],
            total_hits: 0,
            return_hits: 0,
            detail_level: 1,
        },
        isEnableAISearch: false,
        isSearchOptionsBarVisible: true,
        activeTab: 'titles',
        resultsSortMethod: {
            field: 'score', order: 'desc', label: '最为匹配', icon: 'fa-solid fa-check'
        }
    }),
    actions: {
        setSuggestions(newSuggestions: string[]) {
            this.suggestions = newSuggestions;
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
