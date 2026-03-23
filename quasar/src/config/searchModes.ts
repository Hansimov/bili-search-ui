export type SearchMode = 'direct' | 'smart' | 'think' | 'research';

export interface SearchModeQuickReferenceRow {
    codes: string[];
    description: string;
}

export interface SearchModeQuickReferenceColumn {
    heading: string;
    rows: SearchModeQuickReferenceRow[];
}

export interface SearchModeQuickReference {
    title: string;
    format: string;
    columns: SearchModeQuickReferenceColumn[];
    examples: string[];
}

export interface SearchModeHelpTable {
    columns: string[];
    rows: string[][];
}

export interface SearchModeHelpSection {
    title: string;
    description?: string;
    table?: SearchModeHelpTable;
    subSections?: Array<{
        title: string;
        description?: string;
        table?: SearchModeHelpTable;
    }>;
}

export interface SearchModeDetailedHelp {
    title: string;
    notice?: {
        icon: string;
        color: string;
        text: string;
    };
    format?: string;
    sections: SearchModeHelpSection[];
    examples?: string[];
}

export interface SearchModeTheme {
    quasarColor: string;
    light: {
        color: string;
        background: string;
        softBackground: string;
        hoverBackground: string;
        borderColor: string;
    };
    dark: {
        color: string;
        background: string;
        softBackground: string;
        hoverBackground: string;
        borderColor: string;
    };
}

export interface SearchModeOption {
    value: SearchMode;
    label: string;
    icon: string;
    description: string;
    placeholder: string;
    subtitle: string;
    apiType: 'explore' | 'chat';
    theme: SearchModeTheme;
    helpSummary: string[];
    quickReference?: SearchModeQuickReference;
    detailedHelp?: SearchModeDetailedHelp;
    chatParams?: {
        thinking?: boolean;
        researchMode?: boolean;
    };
}

const DIRECT_QUICK_REFERENCE: SearchModeQuickReference = {
    title: '直接查找 — 搜索语法速查',
    format: '<关键词> <过滤器>',
    columns: [
        {
            heading: '关键词',
            rows: [
                { codes: ['词1 词2'], description: '同时包含' },
                { codes: ['"短语"'], description: '精确匹配' },
                { codes: ['+词'], description: '必须包含' },
                { codes: ['-词'], description: '排除' },
            ],
        },
        {
            heading: '统计过滤器',
            rows: [
                { codes: [':view>=1w'], description: '播放≥1万' },
                { codes: [':like<500'], description: '点赞<500' },
                { codes: [':coin>1k'], description: '投币>1千' },
                { codes: [':danmaku', ':reply', ':favorite', ':share'], description: '统计字段' },
                { codes: [':view=[1w, 10w]'], description: '区间' },
            ],
        },
        {
            heading: '日期 / 时长 / UP主',
            rows: [
                { codes: [':date<=7d'], description: '7天内' },
                { codes: [':date>=2024-01'], description: '之后' },
                { codes: [':t>5m'], description: '时长>5分钟' },
                { codes: [':user=名字'], description: '指定UP主' },
                { codes: [':uid=946974'], description: '指定UID' },
            ],
        },
        {
            heading: '视频ID / 搜索模式',
            rows: [
                { codes: ['bv=BV1xx'], description: '按BV号查' },
                { codes: ['av=12345'], description: '按AV号查' },
                { codes: ['q=w', 'q=v', 'q=wv'], description: '文字 / 向量 / 混合' },
                { codes: ['q=vwr'], description: '混合+重排序' },
            ],
        },
    ],
    examples: [
        '黑神话 :view>=1w :date<=30d',
        ':user=影视飓风 :date<=7d',
        'Python 教程 -广告 :view>=1k',
    ],
};

const DIRECT_DETAILED_HELP: SearchModeDetailedHelp = {
    title: '直接查找模式 — 搜索语法帮助',
    notice: {
        icon: 'info',
        color: 'teal-5',
        text:
            '直接查找是一个高级搜索模式，更适合需要精确控制过滤条件的场景。一般提问场景更推荐使用快速问答，直接用自然语言描述即可。',
    },
    format: '<关键词> <过滤器>',
    sections: [
        {
            title: '一、关键词',
            description: '关键词之间用空格分隔，表示同时搜索多个词。',
            table: {
                columns: ['语法', '含义', '示例'],
                rows: [
                    ['词', '搜索包含该词的视频', '黑神话'],
                    ['词1 词2', '同时包含多个词', '黑神话 悟空'],
                    ['"短语"', '精确匹配完整短语', '"黑神话 悟空"'],
                    ['+词', '结果必须包含该词', '游戏实况 +黑神话'],
                    ['-词', '排除包含该词的结果', 'Python 教程 -广告'],
                ],
            },
        },
        {
            title: '二、过滤器',
            description: '过滤器以 : 开头，格式为 :<字段><操作符><值>。',
            subSections: [
                {
                    title: '1. 统计过滤器',
                    description:
                        '字段: view(播放), like(点赞), coin(投币), danmaku(弹幕), reply(评论), favorite(收藏), share(分享)。数值单位: k=千, w=万, m=百万。',
                    table: {
                        columns: ['语法', '含义'],
                        rows: [
                            [':view>=1w', '播放量 ≥ 1万'],
                            [':coin>1k', '投币 > 1千'],
                            [':like<500', '点赞 < 500'],
                            [':view=[1w, 10w]', '播放量在 1万 到 10万 之间（含边界）'],
                        ],
                    },
                },
                {
                    title: '2. 日期过滤器',
                    description:
                        '字段: date。相对时间: Nh, Nd, Nw, Nm, Ny。绝对日期支持 YYYY / YYYY-MM / YYYY-MM-DD。',
                    table: {
                        columns: ['语法', '含义'],
                        rows: [
                            [':date<=7d', '7天内'],
                            [':date<=3h', '3小时内'],
                            [':date>=2024-01', '2024年1月之后'],
                            [':date=2024', '2024年内'],
                        ],
                    },
                },
                {
                    title: '3. 视频时长过滤器',
                    description: '字段: t。时长格式支持 Ns / Nm / Nh。',
                    table: {
                        columns: ['语法', '含义'],
                        rows: [
                            [':t>5m', '时长大于5分钟'],
                            [':t<=30m', '时长不超过30分钟'],
                            [':t=[5m, 30m]', '时长在5到30分钟之间'],
                        ],
                    },
                },
                {
                    title: '4. UP主昵称过滤器',
                    description: '字段: user。',
                    table: {
                        columns: ['语法', '含义'],
                        rows: [
                            [':user=影视飓风', '指定UP主'],
                            [':user=["影视飓风", "飓多多StormCrew"]', '指定多个UP主'],
                            [':user!=某UP主', '排除该UP主'],
                        ],
                    },
                },
                {
                    title: '5. UP主UID过滤器',
                    description: '字段: uid。',
                    table: {
                        columns: ['语法', '含义'],
                        rows: [
                            [':uid=946974', '指定UP主UID'],
                            [':uid=[946974, 1780480185]', '指定多个UID'],
                        ],
                    },
                },
                {
                    title: '6. 搜索模式',
                    description: '字段: q。',
                    table: {
                        columns: ['值', '含义'],
                        rows: [
                            ['q=w', '仅文字搜索'],
                            ['q=v', '仅向量搜索'],
                            ['q=wv', '混合搜索（默认）'],
                            ['q=vwr', '混合搜索+重排序（相关性更高）'],
                        ],
                    },
                },
            ],
        },
        {
            title: '三、组合示例',
        },
    ],
    examples: [
        '黑神话 :view>=1w :date<=30d — 搜索“黑神话”，播放≥1万，30天内',
        ':user=影视飓风 :date<=7d — 影视飓风最近7天的视频',
        'Python 教程 -广告 :date<=1y :view>=1k — Python教程，排除广告，1年内，播放≥1千',
        ':user=["老番茄", "影视飓风"] :date<=30d — 两个UP主最近30天的视频',
        '游戏评测 +黑神话 :view>=5w — 游戏评测且必含“黑神话”，播放≥5万',
        ':user=何同学 :t>10m — 何同学时长超过10分钟的视频',
        '深度学习入门 q=vwr — 深度学习入门，启用重排序提高相关性',
    ],
};

export const SEARCH_MODE_META: Record<SearchMode, SearchModeOption> = {
    smart: {
        value: 'smart',
        label: '快速问答',
        icon: 'auto_awesome',
        description: '快速提问，AI 快速回答',
        placeholder: '快速问答 · 输入问题，AI 快速回答',
        subtitle: '输入问题，AI 快速回答',
        apiType: 'chat',
        theme: {
            quasarColor: 'blue-5',
            light: {
                color: '#1976d2',
                background: 'rgba(25, 118, 210, 0.12)',
                softBackground: 'rgba(25, 118, 210, 0.06)',
                hoverBackground: 'rgba(25, 118, 210, 0.09)',
                borderColor: 'rgba(25, 118, 210, 0.16)',
            },
            dark: {
                color: '#90caf9',
                background: 'rgba(144, 202, 249, 0.16)',
                softBackground: 'rgba(144, 202, 249, 0.09)',
                hoverBackground: 'rgba(144, 202, 249, 0.14)',
                borderColor: 'rgba(144, 202, 249, 0.18)',
            },
        },
        helpSummary: ['适合快速事实问答', '更强调简洁直接的回答', '适合作为默认聊天入口'],
        detailedHelp: {
            title: '快速问答模式说明',
            sections: [{ title: '适用场景', description: '适合直接提问、快速得到结论或简短建议。' }],
        },
        chatParams: {},
    },
    think: {
        value: 'think',
        label: '智能思考',
        icon: 'lightbulb',
        description: '智能思考，AI 先整理思路再回答',
        placeholder: '智能思考 · 输入问题，返回 AI 思考过程和回答',
        subtitle: '输入问题，返回 AI 思考过程和回答',
        apiType: 'chat',
        theme: {
            quasarColor: 'purple-5',
            light: {
                color: '#8e24aa',
                background: 'rgba(142, 36, 170, 0.12)',
                softBackground: 'rgba(142, 36, 170, 0.06)',
                hoverBackground: 'rgba(142, 36, 170, 0.09)',
                borderColor: 'rgba(142, 36, 170, 0.16)',
            },
            dark: {
                color: '#ce93d8',
                background: 'rgba(206, 147, 216, 0.16)',
                softBackground: 'rgba(206, 147, 216, 0.09)',
                hoverBackground: 'rgba(206, 147, 216, 0.14)',
                borderColor: 'rgba(206, 147, 216, 0.18)',
            },
        },
        helpSummary: ['适合复杂问题', '会先展示整理思路，再给出回答', '更偏分析型交互'],
        detailedHelp: {
            title: '智能思考模式说明',
            sections: [{ title: '适用场景', description: '适合需要推理、分步骤分析或解释过程的问题。' }],
        },
        chatParams: { thinking: true },
    },
    direct: {
        value: 'direct',
        label: '直接查找',
        icon: 'search',
        description: '直接查找，返回匹配视频',
        placeholder: '直接查找 · 输入关键词，直接返回匹配视频',
        subtitle: '输入关键词，直接返回匹配视频',
        apiType: 'explore',
        theme: {
            quasarColor: 'teal-5',
            light: {
                color: '#00897b',
                background: 'rgba(0, 137, 123, 0.12)',
                softBackground: 'rgba(0, 137, 123, 0.06)',
                hoverBackground: 'rgba(0, 137, 123, 0.09)',
                borderColor: 'rgba(0, 137, 123, 0.16)',
            },
            dark: {
                color: '#4db6ac',
                background: 'rgba(77, 182, 172, 0.18)',
                softBackground: 'rgba(77, 182, 172, 0.1)',
                hoverBackground: 'rgba(77, 182, 172, 0.14)',
                borderColor: 'rgba(77, 182, 172, 0.2)',
            },
        },
        helpSummary: ['适合精确控制搜索条件', '支持关键词、过滤器、时间和作者约束', '更偏高级检索模式'],
        quickReference: DIRECT_QUICK_REFERENCE,
        detailedHelp: DIRECT_DETAILED_HELP,
    },
    research: {
        value: 'research',
        label: '深度研究',
        icon: 'biotech',
        description: '深度研究，AI 生成深度研究报告',
        placeholder: '深度研究 · 输入研究计划，返回 AI 深度研究报告',
        subtitle: '输入研究计划，返回 AI 深度研究报告',
        apiType: 'chat',
        theme: {
            quasarColor: 'deep-orange-5',
            light: {
                color: '#e64a19',
                background: 'rgba(230, 74, 25, 0.12)',
                softBackground: 'rgba(230, 74, 25, 0.06)',
                hoverBackground: 'rgba(230, 74, 25, 0.09)',
                borderColor: 'rgba(230, 74, 25, 0.16)',
            },
            dark: {
                color: '#ff8a65',
                background: 'rgba(255, 138, 101, 0.16)',
                softBackground: 'rgba(255, 138, 101, 0.09)',
                hoverBackground: 'rgba(255, 138, 101, 0.14)',
                borderColor: 'rgba(255, 138, 101, 0.18)',
            },
        },
        helpSummary: ['适合研究型任务', '强调多步骤整理与较长篇输出', '更适合有明确研究目标时使用'],
        detailedHelp: {
            title: '深度研究模式说明',
            sections: [{ title: '适用场景', description: '适合明确的研究任务、综述整理或多角度分析。' }],
        },
        chatParams: { researchMode: true },
    },
};

export const SEARCH_MODES: SearchModeOption[] = [
    SEARCH_MODE_META.smart,
    SEARCH_MODE_META.think,
    SEARCH_MODE_META.direct,
    SEARCH_MODE_META.research,
];

export const SEARCH_MODE_PLACEHOLDERS: Record<SearchMode, string> = {
    direct: SEARCH_MODE_META.direct.placeholder,
    smart: SEARCH_MODE_META.smart.placeholder,
    think: SEARCH_MODE_META.think.placeholder,
    research: SEARCH_MODE_META.research.placeholder,
};

export function getSearchMode(mode: SearchMode): SearchModeOption {
    return SEARCH_MODE_META[mode] || SEARCH_MODE_META.smart;
}

export function getSearchModeThemeVars(mode: SearchMode | SearchModeOption): Record<string, string> {
    const modeMeta = typeof mode === 'string' ? getSearchMode(mode) : mode;
    return {
        '--mode-light-color': modeMeta.theme.light.color,
        '--mode-light-background': modeMeta.theme.light.background,
        '--mode-light-soft-background': modeMeta.theme.light.softBackground,
        '--mode-light-hover-background': modeMeta.theme.light.hoverBackground,
        '--mode-light-border-color': modeMeta.theme.light.borderColor,
        '--mode-dark-color': modeMeta.theme.dark.color,
        '--mode-dark-background': modeMeta.theme.dark.background,
        '--mode-dark-soft-background': modeMeta.theme.dark.softBackground,
        '--mode-dark-hover-background': modeMeta.theme.dark.hoverBackground,
        '--mode-dark-border-color': modeMeta.theme.dark.borderColor,
    };
}