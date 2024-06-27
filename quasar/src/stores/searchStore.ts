import { defineStore } from 'pinia';

interface SearchState {
    suggestions: string[];
    isMouseInSuggestionList: boolean;
}

export const useSearchStore = defineStore('search', {
    state: (): SearchState => ({
        suggestions: [],
        isMouseInSuggestionList: false,
    }),
    actions: {
        setSuggestions(newSuggestions: string[]) {
            this.suggestions = newSuggestions;
        },
        setIsMouseInSuggestionList(newIsMouseInSuggestionList: boolean) {
            this.isMouseInSuggestionList = newIsMouseInSuggestionList;
        },
    },
});
