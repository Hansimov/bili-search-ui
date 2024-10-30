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

interface AiSuggestResultResponse {
    choices: string[];
}

interface SearchState {
    query: string;
    aiQuery: string;
    isMouseInSearchBar: boolean;
    isMouseInAiSearchToggle: boolean;
    suggestQuery: string;
    suggestResultCache: { [key: string]: SuggestResultResponse };
    aiSuggestResultCache: { [key: string]: AiSuggestResultResponse };
    suggestions: string[];
    aiSuggestions: string[];
    isSuggestVisible: boolean;
    isAiSuggestVisible: boolean;
    isAiChatVisible: boolean;
    results: SearchResultResponse;
    isEnableAiSearch: boolean;
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
        aiQuery: '',
        isMouseInSearchBar: false,
        isMouseInAiSearchToggle: false,
        isSuggestVisible: false,
        isAiSuggestVisible: false,
        isAiChatVisible: false,
        suggestQuery: '',
        suggestResultCache: {},
        aiSuggestResultCache: {},
        suggestions: [],
        aiSuggestions: [],
        results: {
            hits: [],
            total_hits: 0,
            return_hits: 0,
            detail_level: 1,
        },
        isEnableAiSearch: JSON.parse(localStorage.getItem('isEnableAiSearch') || 'true'),
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
        setAiSuggestResultCache(query: string, newAiSuggestResult: AiSuggestResultResponse) {
            this.aiSuggestResultCache[query] = newAiSuggestResult;
            console.log('Ai suggest result:', newAiSuggestResult);
        },
        setSuggestions(newSuggestions: string[]) {
            this.suggestions = newSuggestions;
        },
        setAiSuggestions(newAiSuggestions: string[]) {
            this.aiSuggestions = newAiSuggestions;
        },
        setIsSuggestVisible(newVisibility: boolean) {
            this.isSuggestVisible = newVisibility;
        },
        setIsAiSuggestVisible(newVisibility: boolean) {
            this.isAiSuggestVisible = newVisibility;
        },
        setIsAiChatVisible(newVisibility: boolean) {
            this.isAiChatVisible = newVisibility;
        },
        setIsMouseInSearchBar(newIsMouseInSearchBar: boolean) {
            this.isMouseInSearchBar = newIsMouseInSearchBar;
        },
        setIsMouseInAiSearchToggle(newIsMouseInAiSearchToggle: boolean) {
            this.isMouseInAiSearchToggle = newIsMouseInAiSearchToggle;
        },
        setQuery(newQuery: string) {
            this.query = newQuery;
        },
        setAiQuery(newAiQuery: string) {
            this.aiQuery = newAiQuery;
        },
        setSearchResult(newSearchResult: SearchResultResponse) {
            this.results = newSearchResult;
            console.log('Search results:', newSearchResult);
        },
        setIsEnableAiSearch(newIsEnableAiSearch: boolean) {
            this.isEnableAiSearch = newIsEnableAiSearch;
            localStorage.setItem('isEnableAiSearch', JSON.stringify(newIsEnableAiSearch));
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
