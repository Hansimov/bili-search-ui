import { defineStore } from 'pinia';

interface SearchState {
    query: string;
    isMouseInSuggestionList: boolean;
    suggestions: string[];
    results: string[];
    isSuggestionsVisible: boolean;
}

export const useSearchStore = defineStore('search', {
    state: (): SearchState => ({
        query: '',
        isMouseInSuggestionList: false,
        isSuggestionsVisible: true,
        suggestions: [],
        results: [],
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
    },
});
