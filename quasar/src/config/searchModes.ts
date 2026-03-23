export type SearchMode = 'direct' | 'smart' | 'think' | 'research';

export interface SearchModeQuickReferenceTable {
    title: string;
    columns: string[];
    rows: string[][];
}

export interface SearchModeQuickReferenceExample {
    group?: string;
    query: string;
    summary: string;
}

export interface SearchModeQuickReference {
    title: string;
    format: string;
    philosophy: string[];
    tables: SearchModeQuickReferenceTable[];
    examples: SearchModeQuickReferenceExample[];
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
    examples?: SearchModeQuickReferenceExample[];
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
    philosophy: [
        '默认用空格做收敛检索，先写核心关键词，再逐步加过滤器。',
        '过滤器大多支持别名与列表 / 区间写法，目标是“少记忆、快表达”。',
        '默认检索模式是 q=wv；只有在你明确知道需求时，再切到 q=v 或 q=wvr。',
    ],
    tables: [
        {
            title: '关键词与布尔组合',
            columns: ['语法', '含义', '说明'],
            rows: [
                ['词1 词2', '空格并列', '默认是收敛检索，结果同时满足多个词'],
                ['"黑神话 悟空"', '精确短语', '适合固定标题、专有名词、连续片段'],
                ['+词 / -词 / !词', '强制包含 / 排除', '用于 token 级约束，适合快速加减条件'],
                ['A & B / A | B', '显式 AND / OR', '复杂条件推荐配合括号使用'],
                ['(A | B) C', '分组组合', '先算括号，再与外部关键词组合'],
            ],
        },
        {
            title: '常用字段过滤器',
            columns: ['字段 / 别名', '常见写法', '用途'],
            rows: [
                ['view / bf / vw / v', ':view>=1w  :view=[1w,10w)', '播放量过滤，支持 k / w / m / 亿'],
                ['like / dz / lk / l', ':like>=500', '点赞量过滤'],
                ['coin / tb / cn / c', ':coin>1k', '投币量过滤'],
                ['favorite / fav / sc / fv', ':favorite>=2w', '收藏量过滤'],
                ['reply / pl / rp  danmaku / dm  share / fx / sh', ':reply<500  :dm>=1k', '评论 / 弹幕 / 分享过滤'],
                ['date / rq / dt / d', ':date<=7d  :date>=2024-01', '相对时间与绝对日期都支持'],
                ['duration / dura / dr / time / t', ':t>5m  :t=[2m,15m]', '时长过滤，支持 dhms 组合'],
                ['user / up / u', ':u=影视飓风  @老番茄', '按昵称过滤，支持 = / != / @ / @!'],
                ['uid / mid / ud', ':uid=[946974,1780480185]', '按 UID 精确过滤'],
                ['bvid / bv / avid / av', 'bv=BV1xx  av=12345', '直接限定视频 ID'],
                ['qmod / qm / q', 'q=wv  q=v  q=wvr', '控制文字 / 向量 / 重排序策略'],
            ],
        },
        {
            title: '区间、列表与时间写法',
            columns: ['写法', '示例', '说明'],
            rows: [
                ['列表', ':uid=[1,2,3]  :u=["老番茄","影视飓风"]', '适合白名单 / 多作者批量过滤'],
                ['闭区间 / 开区间', ':view=[1w,10w]  :t=(2m,15m]', '[] 含边界，() 不含边界'],
                ['相对时间', ':date<=7d  :date<=3h', '常用单位 h / d / w / m / y'],
                ['自然时间段', ':date=tw  :date=lw  :date=pm', 'this / last / past 的缩写也支持'],
                ['绝对日期', ':date=2024  :date=2024-03  :date=2024-03-21', '年 / 月 / 日都可直接写'],
                ['组合写法', '黑神话 :u=老番茄 :view>=1w :date<=30d', '通常先写主题，再逐步收窄'],
            ],
        },
    ],
    examples: [
        {
            group: '近期热门',
            query: '黑神话 :view>=1w :date<=30d',
            summary: '30 天内、播放至少 1 万的黑神话相关视频',
        },
        {
            group: '作者定向',
            query: ':u=影视飓风 :date<=7d',
            summary: '指定 UP 主最近 7 天的视频',
        },
        {
            group: '内容清洗',
            query: 'Python 教程 -广告 :view>=1k',
            summary: '排除广告，并要求至少有基础播放量',
        },
        {
            group: '主题扩展',
            query: '(芯片 | 半导体) :date<=90d q=wvr',
            summary: '主题扩展 + 近 90 天范围 + 开启重排序',
        },
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
            title: '一、设计哲学',
            description: '直接查找不是聊天，而是面向检索任务的 DSL。它的设计目标是“先快写，再精修”：默认空格收敛、字段别名短、列表和区间统一、复杂条件可显式布尔组合。',
            table: {
                columns: ['原则', '说明', '推荐用法'],
                rows: [
                    ['默认收敛', '空格并列默认表示结果同时满足多个条件', '先写主题词，再追加过滤器'],
                    ['短别名优先', '常见字段都支持短别名，如 u / d / t / v', '熟练后直接写 :u=xx :d<=7d'],
                    ['统一容器', '列表与区间都可写成 [] / ()，便于记忆', '作者白名单、播放区间都用同一套路'],
                    ['显式布尔', '需要放宽或重组条件时用 |、&、()', '复杂检索场景用括号先组合'],
                    ['检索模式分层', 'q 用来决定文字、向量、混合、重排序的策略', '不确定时保持默认 q=wv'],
                ],
            },
        },
        {
            title: '二、关键词与布尔语法',
            description: '关键词和布尔组合决定“搜什么”；字段过滤器决定“筛什么”。两者可以同时出现。',
            table: {
                columns: ['语法', '含义', '备注'],
                rows: [
                    ['词1 词2', '默认 AND / 收敛检索', '空格连接即可，无需额外符号'],
                    ['"固定短语"', '按完整短语匹配', '适合标题片段、专有名词'],
                    ['+词', '强制包含该 token', '用于强化必要条件'],
                    ['-词 / !词', '排除该 token', '两个前缀等价'],
                    ['A & B', '显式 AND', '和空格类似，但结构更清晰'],
                    ['A | B', 'OR', '适合同义主题扩展'],
                    ['(A | B) C', '分组后组合', '括号优先级最高'],
                ],
            },
            subSections: [
                {
                    title: '1. 统计字段',
                    description:
                        '支持 view / like / coin / favorite / reply / danmaku / share 及其短别名。数值单位支持 k、w、m、亿。',
                    table: {
                        columns: ['字段 / 别名', '示例', '说明'],
                        rows: [
                            ['view / bf / vw / v', ':view>=1w', '播放量过滤'],
                            ['like / dz / lk / l', ':like<500', '点赞量过滤'],
                            ['coin / tb / cn / c', ':coin>1k', '投币量过滤'],
                            ['favorite / fav / sc / fv', ':favorite>=2w', '收藏量过滤'],
                            ['reply / pl / rp', ':reply=[100,1000)', '评论区间'],
                            ['danmaku / dm', ':dm>=1k', '弹幕量过滤'],
                            ['share / fx / sh', ':share>100', '分享量过滤'],
                        ],
                    },
                },
                {
                    title: '2. 日期与时间',
                    description:
                        '字段别名为 date / rq / dt / d。相对时间支持 h / d / w / m / y；还支持 this / last / past 语义。',
                    table: {
                        columns: ['语法', '含义', '说明'],
                        rows: [
                            [':date<=7d', '7 天内', '相对时间'],
                            [':date<=3h', '3 小时内', '小时级筛选'],
                            [':date>=2024-01', '2024 年 1 月之后', '绝对月份'],
                            [':date=2024', '2024 年内', '整年范围'],
                            [':date=tw / :date=this week', '本周', 'this / t'],
                            [':date=lw / :date=last week', '上周', 'last / l'],
                            [':date=pm / :date=past month', '过去 1 个月', 'past / p'],
                        ],
                    },
                },
                {
                    title: '3. 视频时长过滤器',
                    description: '字段别名为 duration / dura / dr / time / t。支持秒数，也支持 1h30m 这类组合写法。',
                    table: {
                        columns: ['语法', '含义', '说明'],
                        rows: [
                            [':t>5m', '时长大于 5 分钟', '快速过滤长视频'],
                            [':t<=30m', '时长不超过 30 分钟', '控制上限'],
                            [':t=[5m,30m]', '时长在 5 到 30 分钟之间', '[] 含边界'],
                            [':t=(90,600]', '90 秒到 10 分钟', '支持纯数字秒数'],
                        ],
                    },
                },
                {
                    title: '4. 作者过滤器',
                    description: '昵称字段别名为 user / up / u；UID 字段别名为 uid / mid / ud。',
                    table: {
                        columns: ['语法', '含义', '说明'],
                        rows: [
                            [':u=影视飓风', '指定昵称', '常规作者过滤'],
                            ['@老番茄', '指定昵称（快捷写法）', '@ 相当于 user='],
                            ['@!某UP主', '排除昵称（快捷写法）', '@! 相当于 user!='],
                            [':u=["影视飓风","飓多多StormCrew"]', '多个昵称', '列表白名单'],
                            [':uid=946974', '指定 UID', '适合精确作者定位'],
                            [':uid=[946974,1780480185]', '多个 UID', '多作者批量过滤'],
                        ],
                    },
                },
                {
                    title: '5. 视频 ID',
                    description: '视频 ID 支持 AV / BV，可用于精确定位单个视频。',
                    table: {
                        columns: ['语法', '含义', '说明'],
                        rows: [
                            ['bv=BV1xx / :bv=BV1xx', '指定 BV', '支持前导冒号，也支持直接写'],
                            ['av=12345', '指定 AV', '会自动识别 aid'],
                        ],
                    },
                },
                {
                    title: '6. 检索模式 q',
                    description: 'q 本身不产生过滤条件，而是控制底层检索策略。必须至少包含 w 或 v；r 表示在召回后追加重排序。',
                    table: {
                        columns: ['写法', '含义', '适用场景'],
                        rows: [
                            ['q=w', '仅文字检索', '关键词明确、追求可解释性'],
                            ['q=v', '仅向量检索', '语义检索、近义表达'],
                            ['q=wv', '混合检索（默认）', '大多数场景的首选'],
                            ['q=wr / q=vr', '单路检索 + 重排序', '单一路径结果再精排'],
                            ['q=wvr', '混合检索 + 重排序', '高相关性优先，代价稍高'],
                        ],
                    },
                },
            ],
        },
    ],
    examples: [
        {
            group: '近期热门',
            query: '黑神话 :view>=1w :date<=30d',
            summary: '搜索黑神话相关视频，并要求 30 天内、播放至少 1 万',
        },
        {
            group: '作者定向',
            query: ':u=影视飓风 :date<=7d',
            summary: '查看指定 UP 主最近 7 天的视频',
        },
        {
            group: '内容清洗',
            query: 'Python 教程 -广告 :date<=1y :view>=1k',
            summary: '查 Python 教程，排除广告，限定 1 年内且至少 1 千播放',
        },
        {
            group: '作者定向',
            query: ':u=["老番茄","影视飓风"] :date<=30d',
            summary: '同时看多个 UP 主最近 30 天的视频',
        },
        {
            group: '主题扩展',
            query: '(芯片 | 半导体) :date<=90d q=wvr',
            summary: '做主题扩展，同时限制近期内容并启用重排序',
        },
        {
            group: '内容清洗',
            query: '游戏评测 +黑神话 :view>=5w',
            summary: '游戏评测里强制包含黑神话，且播放至少 5 万',
        },
        {
            group: '作者定向',
            query: ':u=何同学 :t>10m',
            summary: '查看何同学时长超过 10 分钟的视频',
        },
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