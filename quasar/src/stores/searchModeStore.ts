/**
 * SearchModeStore - 搜索模式管理
 *
 * 管理搜索输入框的模式选择：
 * - direct: 直接查找（默认），使用 explore 接口
 * - smart: 快速问答，使用 LLM chat 接口
 * - think: 智能思考，使用 LLM chat + thinking 模式
 * - research: 深度研究，使用 LLM chat + research prompt
 */

import { defineStore } from 'pinia';

/** 搜索模式类型 */
export type SearchMode = 'direct' | 'smart' | 'think' | 'research';

/** 搜索模式定义 */
export interface SearchModeOption {
    /** 模式标识 */
    value: SearchMode;
    /** 中文标签 */
    label: string;
    /** 图标 */
    icon: string;
    /** 描述 */
    description: string;
    /** 对应的后端调用方式 */
    apiType: 'explore' | 'chat';
    /** LLM 参数（仅 chat 类型） */
    chatParams?: {
        thinking?: boolean;
        researchMode?: boolean;
    };
}

/** 所有可用模式（顺序：快速问答、智能思考、直接查找、深度研究） */
export const SEARCH_MODES: SearchModeOption[] = [
    {
        value: 'smart',
        label: '快速问答',
        icon: 'auto_awesome',
        description: '快速提问，AI 快速回答',
        apiType: 'chat',
        chatParams: {},
    },
    {
        value: 'think',
        label: '智能思考',
        icon: 'psychology',
        description: '智能思考，AI 先思考再回答',
        apiType: 'chat',
        chatParams: { thinking: true },
    },
    {
        value: 'direct',
        label: '直接查找',
        icon: 'search',
        description: '直接查找，返回匹配视频',
        apiType: 'explore',
    },
    {
        value: 'research',
        label: '深度研究',
        icon: 'biotech',
        description: '深度研究，AI 生成深度研究报告',
        apiType: 'chat',
        chatParams: { researchMode: true },
    },
];

/** 根据模式值查找模式选项 */
export function getSearchMode(mode: SearchMode): SearchModeOption {
    return SEARCH_MODES.find((m) => m.value === mode) || SEARCH_MODES[0];
}

export const useSearchModeStore = defineStore('searchMode', {
    state: () => ({
        /** 当前搜索模式 */
        currentMode: (localStorage.getItem('searchMode') as SearchMode) || 'smart' as SearchMode,
        /** 首次会话提交时的模式（用于决定布局方式） */
        initialSessionMode: null as SearchMode | null,
        /** DSL 帮助按钮抖动标记（用于提示用户查看搜索语法） */
        dslHelpShakeFlag: 0,
    }),

    getters: {
        /** 当前模式选项 */
        currentModeOption(): SearchModeOption {
            return getSearchMode(this.currentMode);
        },

        /** 是否为直接查找模式 */
        isDirectMode(): boolean {
            return this.currentMode === 'direct';
        },

        /** 是否为 LLM 聊天模式（快速问答/智能思考/深度研究） */
        isChatMode(): boolean {
            return this.currentModeOption.apiType === 'chat';
        },

        /** 所有模式选项列表 */
        modeOptions(): SearchModeOption[] {
            return SEARCH_MODES;
        },

        /** 布局是否应该使用 inline 模式（首次会话为 chat 模式时） */
        shouldUseInlineLayout(): boolean {
            if (this.initialSessionMode === null) return false;
            const initialOption = getSearchMode(this.initialSessionMode);
            return initialOption.apiType === 'chat';
        },
    },

    actions: {
        /** 设置搜索模式 */
        setMode(mode: SearchMode) {
            this.currentMode = mode;
            localStorage.setItem('searchMode', mode);
        },

        /** 记录首次会话的模式 */
        setInitialSessionMode(mode: SearchMode) {
            if (this.initialSessionMode === null) {
                this.initialSessionMode = mode;
            }
        },

        /**
         * 强制设置首次会话模式（用于历史记录恢复时覆盖）
         * 与 setInitialSessionMode 不同，此方法总是覆盖当前值
         */
        forceInitialSessionMode(mode: SearchMode) {
            this.initialSessionMode = mode;
        },

        /** 重置首次会话模式（开始新对话时调用） */
        resetInitialSessionMode() {
            this.initialSessionMode = null;
        },

        /** 触发 DSL 帮助按钮抖动动画 */
        triggerDslHelpShake() {
            this.dslHelpShakeFlag++;
        },
    },
});
