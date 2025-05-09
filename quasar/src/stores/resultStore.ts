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

export const resultsSortMethods: ResultsSortMethod[] = [
    {
        field: 'sort_score',
        order: 'desc',
        label: '综合排序',
        icon: 'fa-solid fa-line-chart',
    },
    {
        field: 'score',
        order: 'desc',
        label: '最高相关',
        icon: 'fa-solid fa-text-height',
    },
    {
        field: 'pubdate',
        order: 'desc',
        label: '最新发布',
        icon: 'fa-regular fa-clock',
    },
    {
        field: 'stat.view',
        order: 'desc',
        label: '最高播放',
        icon: 'fa-regular fa-play-circle',
    },
    {
        field: 'stat.danmaku',
        order: 'desc',
        label: '最多弹幕',
        icon: 'fa-solid fa-align-left',
    },
    {
        field: 'stat.favorite',
        order: 'desc',
        label: '最多收藏',
        icon: 'fa-solid fa-star',
    },
    {
        field: 'title',
        order: 'asc',
        label: '标题文本',
        icon: 'fa-solid fa-sort-alpha-asc',
    },
]

export function defaultResultsSortMethod(): ResultsSortMethod {
    return resultsSortMethods[0];
}

export interface ExploreStepResult {
    step: number;
    name: string;
    name_zh: string;
    status: string;
    input: Dict;
    output: Dict;
    output_type: string;
    comment: string;
}

export function defaultExploreStepResult(): ExploreStepResult {
    return {
        step: 0,
        name: '',
        name_zh: '',
        status: '',
        input: {},
        output_type: '',
        output: {
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
        },
        comment: '',
    }
}

export interface ExploreSession {
    stepResults: ExploreStepResult[];
    latestHitsResult: ExploreStepResult;
    latestAuthorsResult: ExploreStepResult;
    authorFilters: DictList;
}

export function defaultExploreSession(): ExploreSession {
    return {
        stepResults: [],
        latestHitsResult: defaultExploreStepResult(),
        latestAuthorsResult: defaultExploreStepResult(),
        authorFilters: [],
    }
}

export function isNonEmptyArray(array: DictList): boolean {
    return Array.isArray(array) && array.length > 0;
}

export function isNonEmptyDict(dict: Dict): boolean {
    return dict && Object.keys(dict).length > 0;
}

export { };
