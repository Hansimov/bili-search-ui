import { defineStore } from 'pinia';

interface SearchState {
    query: string;
    isMouseInSuggestionList: boolean;
    suggestions: string[];
    results: string[];
}

export const useSearchStore = defineStore('search', {
    state: (): SearchState => ({
        query: '',
        isMouseInSuggestionList: false,
        suggestions: [],
        results: [],
    }),
    actions: {
        setSuggestions(newSuggestions: string[]) {
            this.suggestions = newSuggestions;
        },
        setIsMouseInSuggestionList(newIsMouseInSuggestionList: boolean) {
            this.isMouseInSuggestionList = newIsMouseInSuggestionList;
        },
        setQuery(newQuery: string) {
            this.query = newQuery;
        },
        setResults(newResults: string[]) {
            this.results = newResults;
        }
    },
});
