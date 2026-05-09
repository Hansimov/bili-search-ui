import { defineStore } from 'pinia';
import {
    SEARCH_MODE_PLACEHOLDERS,
    SEARCH_MODES,
    getSearchMode,
    type SearchMode,
    type SearchModeOption,
} from 'src/config/searchModes';

export {
    SEARCH_MODE_PLACEHOLDERS,
    SEARCH_MODES,
    getSearchMode,
    type SearchMode,
    type SearchModeOption,
};

export const normalizeSearchMode = (mode: string | null | undefined): SearchMode => {
    if (mode === 'tool') return 'utility';
    if (mode === 'utility' || mode === 'smart' || mode === 'think' || mode === 'research') {
        return mode;
    }
    return 'smart';
};

export const useSearchModeStore = defineStore('searchMode', {
    state: () => ({
        /** 当前搜索模式 */
        currentMode: normalizeSearchMode(localStorage.getItem('searchMode')),
        /** 首次会话提交时的模式（用于决定布局方式） */
        initialSessionMode: null as SearchMode | null,
    }),

    getters: {
        /** 当前模式选项 */
        currentModeOption(): SearchModeOption {
            return getSearchMode(this.currentMode);
        },

        /** 是否为实用工具模式 */
        isToolMode(): boolean {
            return this.currentMode === 'utility';
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
            const normalized = normalizeSearchMode(mode);
            this.currentMode = normalized;
            localStorage.setItem('searchMode', normalized);
        },

        /** 记录首次会话的模式 */
        setInitialSessionMode(mode: SearchMode) {
            if (this.initialSessionMode === null) {
                this.initialSessionMode = normalizeSearchMode(mode);
            }
        },

        /**
         * 强制设置首次会话模式（用于历史记录恢复时覆盖）
         * 与 setInitialSessionMode 不同，此方法总是覆盖当前值
         */
        forceInitialSessionMode(mode: SearchMode) {
            this.initialSessionMode = normalizeSearchMode(mode);
        },

        /** 重置首次会话模式（开始新对话时调用） */
        resetInitialSessionMode() {
            this.initialSessionMode = null;
        },
    },
});
