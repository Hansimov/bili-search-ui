import { defineStore } from 'pinia';

// interface QueryInfoV1 {
//     query: string;
//     keywords: string[];
//     keywords_body: string[];
//     keywords_date: string[];
//     filters: string[];
//     filters_stat: string[];
//     filters_date: string[];
//     filters_uid: string[];
//     filters_user: string[];
// }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dict = Record<string, any>;
type DictList = Dict[];

interface QueryInfo {
    query: string;
    words_expr: string;
    keywords_body: string[];
    keywords_date: string[];
}

interface RelatedAuthor {
    uid: number;
    count: number;
    highlighted?: boolean;
}

interface RelatedAuthors {
    [authorName: string]: RelatedAuthor;
}

interface RelatedAuthorsListItem {
    authorName: string;
    authorInfo: RelatedAuthor;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RelatedAuthorsList extends Array<RelatedAuthorsListItem> { }

// interface SuggestInfoV1 {
//     qword_hword_count: {
//         [qword: string]: {
//             [hword: string]: number;
//         }
//     };
//     hword_qword_count: {
//         [hwords_str: string]: number;
//     };
//     related_authors: RelatedAuthors
// }

interface SuggestInfo {
    qword_hword_count: {
        [qword: string]: {
            [hword: string]: number;
        }
    };
    hword_count_qword: {
        [hword: string]: [number, string];
    };
    group_replaces_count: [string[], number][];
    related_authors: RelatedAuthors
}

// interface RewriteInfoV1 {
//     list: string[];
//     tuples: [string, number][];
//     dict: { [key: string]: string };
//     query: string;
//     rewrited: boolean;
// }

interface RewriteInfo {
    rewrited: boolean;
    is_original_in_rewrites: boolean;
    rewrited_word_exprs: string[];
}


interface SuggestResultResponse {
    detail_level: number;
    return_hits: number;
    total_hits: number;
    hits: DictList;
    suggest_info: SuggestInfo;
    query_info: QueryInfo;
    rewrite_info: RewriteInfo;
}

interface SearchResultResponse {
    detail_level: number;
    return_hits: number;
    total_hits: number;
    hits: DictList;
    suggest_info: SuggestInfo;
    query_info: QueryInfo;
    rewrite_info: RewriteInfo;
}

interface AiSuggestResultResponse {
    choices: DictList;
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
    rewrite_info: RewriteInfo;
    suggestions: DictList;
    relatedAuthorsList: RelatedAuthorsList;
    aiSuggestions: DictList;
    isSuggestVisible: boolean;
    isAiSuggestVisible: boolean;
    isAiChatVisible: boolean;
    searchResultDict: SearchResultResponse;
    isEnableAiSearch: boolean;
    isSearchOptionsBarVisible: boolean;
    activeTab: string;
    resultsSortMethod: ResultsSortMethod;
}

export const sortAuthors = (a: RelatedAuthorsListItem, b: RelatedAuthorsListItem) => {
    const highlightedA = a.authorInfo.highlighted || false;
    const highlightedB = b.authorInfo.highlighted || false;
    // sort by highlighted, true is first
    if (highlightedA !== highlightedB) {
        return highlightedA ? -1 : 1;
    }
    // sort by count, larger is higher
    return b.authorInfo.count - a.authorInfo.count;
};

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
        rewrite_info: {} as RewriteInfo,
        relatedAuthorsList: [] as RelatedAuthorsList,
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
    getters: {
        isQueryEmpty: (state) => {
            return !state.query || state.query.trim() === '';
        },
        rewrite_info: (state) => {
            return state.suggestResultCache[state.query]?.rewrite_info || {
                rewrited: false,
                is_original_in_rewrites: false,
                rewrited_word_exprs: [],
            };
        },
        isSuggestionsListVisible: (state) => {
            return state.suggestions?.length;
        },
        isSuggestReplaceVisible: (state) => {
            return (state.query && state.query.trim() !== '')
        },
        isSuggestAuthorsListVisible: (state) => {
            return (state.query && state.query.trim() !== '') && state.relatedAuthorsList?.length > 0;
        },
        relatedAuthorsList: (state) => {
            const relatedAuthors =
                state.suggestResultCache[state.query]?.suggest_info
                    ?.related_authors || {};
            const authorsList = Object.entries(relatedAuthors).map(
                ([authorName, authorInfo]) => ({
                    authorName,
                    authorInfo,
                })
            );
            return authorsList.sort(sortAuthors);
        }
    },
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
        setSuggestions(newSuggestions: DictList) {
            this.suggestions = newSuggestions;
        },
        setAiSuggestions(newAiSuggestions: DictList) {
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
