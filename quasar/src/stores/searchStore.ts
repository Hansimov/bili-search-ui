import { defineStore } from 'pinia';

interface QueryInfo {
    query: string;
    keywords: string[];
    keywords_body: string[];
    keywords_date: string[];
    filters: string[];
    filters_stat: string[];
    filters_date: string[];
    filters_uid: string[];
    filters_user: string[];
}

interface RelatedAuthor {
    uid: number;
    count: number;
    highlighted?: boolean;
}

interface RelatedAuthors {
    [authorName: string]: RelatedAuthor;
}

interface SuggestInfo {
    qword_hword_count: {
        [qword: string]: {
            [hword: string]: number;
        }
    };
    hword_qword_count: {
        [hwords_str: string]: number;
    };
    related_authors: RelatedAuthors
}

interface RewriteInfo {
    list: string[];
    tuples: [string, number][];
}


interface SuggestResultResponse {
    detail_level: number;
    return_hits: number;
    total_hits: number;
    hits: string[];
    suggest_info: SuggestInfo;
    query_info: QueryInfo;
    rewrite_info: RewriteInfo;
}

interface SearchResultResponse {
    detail_level: number;
    return_hits: number;
    total_hits: number;
    hits: string[];
    suggest_info: SuggestInfo;
    query_info: QueryInfo;
    rewrite_info: RewriteInfo;
}

interface AiSuggestResultResponse {
    choices: string[];
}

interface SuggestResultCache {
    [key: string]: SuggestResultResponse;
}

interface AiSuggestResultCache {
    [key: string]: AiSuggestResultResponse;
}

interface ResultsSortMethod {
    field: string;
    order: string;
    label: string;
    icon: string;
}

interface SearchState {
    query: string;
    aiQuery: string;
    isMouseInSearchBar: boolean;
    isMouseInAiSearchToggle: boolean;
    suggestQuery: string;
    suggestResultCache: SuggestResultCache;
    aiSuggestResultCache: AiSuggestResultCache;
    suggestions: string[];
    aiSuggestions: string[];
    isSuggestVisible: boolean;
    isAiSuggestVisible: boolean;
    isAiChatVisible: boolean;
    searchResultDict: SearchResultResponse;
    isEnableAiSearch: boolean;
    isSearchOptionsBarVisible: boolean;
    activeTab: string;
    resultsSortMethod: ResultsSortMethod;
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
        suggestResultCache: {} as SuggestResultCache,
        aiSuggestResultCache: {} as AiSuggestResultCache,
        suggestions: [],
        aiSuggestions: [],
        searchResultDict: {
            detail_level: 0,
            hits: [],
            return_hits: 0,
            total_hits: 0,
            suggest_info: {} as SuggestInfo,
            query_info: {} as QueryInfo,
            rewrite_info: {} as RewriteInfo
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
            this.searchResultDict = newSearchResult;
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
        setResultsSortMethod(newResultsSortMethod: ResultsSortMethod) {
            this.resultsSortMethod = newResultsSortMethod;
        }
    },
});
