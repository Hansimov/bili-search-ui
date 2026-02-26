/**
 * Chat function - 聊天模式的入口函数
 *
 * 处理 "快速问答" (smart) 和 "智能思考" (think) 模式的查询提交。
 * 类似于 explore.ts 对 "直接查找" 模式的处理。
 */

import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import { useChatStore } from 'src/stores/chatStore';
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
    const searchHistoryStore = useSearchHistoryStore();
    const chatStore = useChatStore();

    layoutStore.setIsSuggestVisible(false);

    if (!queryValue || !queryValue.trim()) {
        return;
    }

    if (setQuery) {
        queryStore.setQuery({ newQuery: queryValue, setRoute, mode });
    }

    // 记录搜索历史
    searchHistoryStore.addRecord(queryValue, 0).catch(console.error);

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
