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
