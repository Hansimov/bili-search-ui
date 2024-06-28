import { defineStore } from 'pinia';

interface SearchState {
    suggestions: string[];
    isMouseInSuggestionList: boolean;
    query: string;
}

export const useSearchStore = defineStore('search', {
    state: (): SearchState => ({
        suggestions: [],
        isMouseInSuggestionList: false,
        query: '',
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
        }
    },
});
