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

/** 所有可用模式 */
export const SEARCH_MODES: SearchModeOption[] = [
    {
        value: 'direct',
        label: '直接查找',
        icon: 'search',
        description: '直接查找，返回匹配视频',
        apiType: 'explore',
    },
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
        currentMode: (localStorage.getItem('searchMode') as SearchMode) || 'direct' as SearchMode,
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
    },

    actions: {
        /** 设置搜索模式 */
        setMode(mode: SearchMode) {
            this.currentMode = mode;
            localStorage.setItem('searchMode', mode);
        },
    },
});
