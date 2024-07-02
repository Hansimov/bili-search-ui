import { defineStore } from 'pinia';

interface SearchState {
    query: string;
    isMouseInSuggestionList: boolean;
    suggestions: string[];
    results: string[];
    isSuggestionsVisible: boolean;
    isEnableAISearch: boolean;
}

export const useSearchStore = defineStore('search', {
    state: (): SearchState => ({
        query: '',
        isMouseInSuggestionList: false,
        isSuggestionsVisible: true,
        suggestions: [],
        results: [],
        isEnableAISearch: false,
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
        setResults(newResults: string[]) {
            this.results = newResults;
        },
        setEnableAISearch(newIsEnableAISearch: boolean) {
            this.isEnableAISearch = newIsEnableAISearch;
        }
    },
});
