// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Dict = Record<string, any>;
export type DictList = Dict[];
export type StringList = string[];

export interface QueryInfo {
    query: string;
    words_expr: string;
    keywords_body: StringList;
    keywords_date: StringList;
}

export interface RelatedAuthor {
    uid: number;
    count: number;
    highlighted?: boolean;
}
export interface RelatedAuthors {
    [authorName: string]: RelatedAuthor;
}
export interface RelatedAuthorsListItem {
    authorName: string;
    authorInfo: RelatedAuthor;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RelatedAuthorsList extends Array<RelatedAuthorsListItem> { }

export interface SuggestInfo {
    qword_hword_count: {
        [qword: string]: {
            [hword: string]: number;
        }
    };
    hword_count_qword: {
        [hword: string]: [number, string];
    };
    group_replaces_count: [StringList, number][];
    related_authors: RelatedAuthors
}

export interface RewriteInfo {
    rewrited: boolean;
    is_original_in_rewrites: boolean;
    rewrited_word_exprs: StringList;
}

export interface SuggestResultResponse {
    detail_level: number;
    return_hits: number;
    total_hits: number;
    hits: DictList;
    suggest_info: SuggestInfo;
    query_info: QueryInfo;
    rewrite_info: RewriteInfo;
}
export interface SuggestResultCache {
    [key: string]: SuggestResultResponse;
}

export interface AiSuggestResultResponse {
    choices: DictList;
}
export interface AiSuggestResultCache {
    [key: string]: AiSuggestResultResponse;
}

export interface SearchResultResponse {
    detail_level: number;
    return_hits: number;
    total_hits: number;
    hits: DictList;
    suggest_info: SuggestInfo;
    query_info: QueryInfo;
    rewrite_info: RewriteInfo;
}

export function defaultSearchResultResponse(): SearchResultResponse {
    return {
        detail_level: 0,
        return_hits: 0,
        total_hits: 0,
        hits: [] as DictList,
        suggest_info: {
            qword_hword_count: {},
            hword_count_qword: {},
            group_replaces_count: [],
            related_authors: {} as RelatedAuthors,
        } as SuggestInfo,
        query_info: {
            query: '',
            words_expr: '',
            keywords_body: [] as StringList,
            keywords_date: [] as StringList,
        } as QueryInfo,
        rewrite_info: {
            rewrited: false,
            is_original_in_rewrites: false,
            rewrited_word_exprs: [] as StringList,
        } as RewriteInfo,
    }
}

export interface ResultsSortMethod {
    field: string;
    order: string;
    label: string;
    icon: string;
}

export function defaultResultsSortMethod(): ResultsSortMethod {
    return {
        field: 'score',
        order: 'desc',
        label: '综合排序',
        icon: 'fa-solid fa-check',
    }
}

export { };
