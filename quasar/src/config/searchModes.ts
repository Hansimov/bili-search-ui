export type SearchMode = 'tool' | 'smart' | 'think' | 'research';

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
    apiType: 'tool' | 'chat';
    theme: SearchModeTheme;
    helpSummary: string[];
    chatParams?: {
        thinking?: boolean;
        researchMode?: boolean;
    };
}

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
        chatParams: { thinking: true },
    },
    tool: {
        value: 'tool',
        label: '工具调用',
        icon: 'handyman',
        description: '工具调用，输入 /videos /owners /explore 等命令',
        placeholder: '工具调用 · 输入 / 选择工具，或直接输入关键词搜索视频',
        subtitle: '输入 / 选择工具：/videos /owners /explore /google /transcript /llm',
        apiType: 'tool',
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
        helpSummary: ['支持显式工具命令', '默认无命令时等价 /videos', '适合快速查看工具原始结果'],
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
        chatParams: { researchMode: true },
    },
};

export const SEARCH_MODES: SearchModeOption[] = [
    SEARCH_MODE_META.smart,
    SEARCH_MODE_META.think,
    SEARCH_MODE_META.tool,
    SEARCH_MODE_META.research,
];

export const SEARCH_MODE_PLACEHOLDERS: Record<SearchMode, string> = {
    tool: SEARCH_MODE_META.tool.placeholder,
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
