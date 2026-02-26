/**
 * Chat function - 聊天模式的入口函数
 *
 * 处理 "快速问答" (smart) 和 "智能思考" (think) 模式的查询提交。
 * 类似于 explore.ts 对 "直接查找" 模式的处理。
 */

import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useChatStore } from 'src/stores/chatStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import type { SearchMode } from 'src/stores/searchModeStore';

/**
 * 发起 LLM 聊天请求
 *
 * @param queryValue - 查询文本
 * @param mode - 'smart' (快速问答) 或 'think' (智能思考)
 * @param setQuery - 是否更新 queryStore
 * @param setRoute - 是否更新路由
 */
export const chat = async ({
    queryValue,
    mode = 'smart',
    setQuery = true,
    setRoute = false,
}: {
    queryValue: string;
    mode?: 'smart' | 'think';
    setQuery?: boolean;
    setRoute?: boolean;
}) => {
    const queryStore = useQueryStore();
    const layoutStore = useLayoutStore();
    const chatStore = useChatStore();
    const exploreStore = useExploreStore();
    const searchHistoryStore = useSearchHistoryStore();

    layoutStore.setIsSuggestVisible(false);

    if (!queryValue || !queryValue.trim()) {
        return;
    }

    // 设置 submittedQuery 给 TitleToolbar 显示（仅新会话/首次提交时，多轮续接保持原始查询）
    if (setQuery) {
        exploreStore.setSubmittedQuery(queryValue);
        queryStore.setQuery({ newQuery: queryValue, setRoute, mode });
    }

    // 为 chat 模式记录搜索历史（仅首次，续接对话不重复记录）
    // 且不在历史恢复时重复记录（已预设 recordId）
    if (chatStore.conversationHistory.length === 0 && !chatStore.currentHistoryRecordId) {
        const recordId = await searchHistoryStore.addRecord(queryValue, undefined, mode);
        if (recordId) {
            chatStore.setCurrentHistoryRecordId(recordId);
        }
    }

    // 发送聊天请求（流式）
    await chatStore.sendChat(queryValue, mode);
};

/**
 * 根据当前搜索模式提交查询的统一入口
 * 自动判断是使用 explore 还是 chat
 */
export const submitByMode = async ({
    queryValue,
    mode,
    setQuery = true,
    setRoute = false,
}: {
    queryValue: string;
    mode: SearchMode;
    setQuery?: boolean;
    setRoute?: boolean;
}) => {
    if (mode === 'smart' || mode === 'think') {
        await chat({ queryValue, mode, setQuery, setRoute });
    } else {
        // direct 和 research 使用 explore
        const { explore } = await import('src/functions/explore');
        await explore({ queryValue, setQuery, setRoute });
    }
};
