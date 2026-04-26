/**
 * Chat function - 聊天模式的入口函数
 *
 * 处理 "快速问答" (smart) 和 "智能思考" (think) 模式的查询提交。
 * 类似于 explore.ts 对 "直接查找" 模式的处理。
 *
 * Chat 模式使用 session_id 标识会话，URL 格式为 /chat/<session_id>
 * 而非 /chat?q=<query>，因为自然语言查询不适合暴露在 URL 中。
 */

import { useQueryStore } from 'src/stores/queryStore';
import { useLayoutStore } from 'src/stores/layoutStore';
import { useChatStore } from 'src/stores/chatStore';
import { useExploreStore } from 'src/stores/exploreStore';
import { useSearchHistoryStore } from 'src/stores/searchHistoryStore';
import { useInputHistoryStore } from 'src/stores/inputHistoryStore';
import { useSearchModeStore } from 'src/stores/searchModeStore';
import type { SearchMode } from 'src/stores/searchModeStore';
import type { ConversationMessage } from 'src/stores/chatStore';
import type { SmartSuggestion } from 'src/services/smartSuggestService';

/**
 * 发起 LLM 聊天请求
 *
 * @param queryValue - 查询文本
 * @param mode - 'smart' (快速问答) 或 'think' (智能思考)
 * @param setQuery - 是否更新 queryStore
 * @param setRoute - 是否更新路由（使用 /chat/<sessionId>）
 */
export const chat = async ({
    queryValue,
    mode = 'smart',
    setQuery = true,
    setRoute = false,
    baseHistory,
}: {
    queryValue: string;
    mode?: 'smart' | 'think';
    setQuery?: boolean;
    setRoute?: boolean;
    baseHistory?: ConversationMessage[];
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

    // 聊天模式始终更新已提交问题，供标题栏和当前会话视图使用。
    exploreStore.setSubmittedQuery(queryValue);

    const sessionId = chatStore.currentSessionId;
    if (setQuery) {
        queryStore.setQuery({
            newQuery: queryValue,
            setRoute: false,
        });
    }

    if (setRoute && sessionId) {
        queryStore.setChatRoute(sessionId);
    }

    // 为 chat 模式记录搜索历史（仅首次，续接对话不重复记录）
    // 且不在历史恢复时重复记录（已预设 recordId）
    if (chatStore.conversationHistory.length === 0 && !chatStore.currentHistoryRecordId) {
        const sessionId = chatStore.currentSessionId;
        const initialSnapshot = chatStore.exportSnapshot();
        const recordId = await searchHistoryStore.addRecord(
            queryValue,
            undefined,
            mode,
            initialSnapshot,
            sessionId || undefined,
        );
        if (recordId) {
            chatStore.setCurrentHistoryRecordId(recordId);
        }
    }

    // 发送聊天请求（流式）
    await chatStore.sendChat(queryValue, mode, baseHistory);
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

export const resolveSuggestionQuery = (
    item: Pick<SmartSuggestion, 'text' | 'type' | 'meta'>
) => {
    if (item.type === 'title' && item.meta?.bvid) {
        return `bv=${item.meta.bvid}`;
    }
    if (item.type === 'author' && item.meta?.uid) {
        return `uid=${item.meta.uid}`;
    }
    return item.text;
};

export const submitCurrentModeQuery = async ({
    queryValue,
    mode,
    recordInputHistory = true,
    setRoute = true,
}: {
    queryValue: string;
    mode: SearchMode;
    recordInputHistory?: boolean;
    setRoute?: boolean;
}) => {
    const layoutStore = useLayoutStore();
    const chatStore = useChatStore();
    const searchModeStore = useSearchModeStore();
    const inputHistoryStore = useInputHistoryStore();

    const submittedQuery = queryValue.trim();
    if (!submittedQuery) {
        return false;
    }

    layoutStore.setIsSuggestVisible(false);
    layoutStore.resetSuggestNavigation();

    if (recordInputHistory) {
        inputHistoryStore.addRecord(submittedQuery);
    }

    searchModeStore.setInitialSessionMode(mode);

    if (mode === 'smart' || mode === 'think') {
        const isContinuation =
            chatStore.conversationHistory.length > 0 &&
            searchModeStore.shouldUseInlineLayout;

        if (isContinuation) {
            await chat({
                queryValue: submittedQuery,
                mode,
                setQuery: false,
                setRoute: false,
            });
        } else {
            searchModeStore.forceInitialSessionMode(mode);
            chatStore.startNewChat();
            await chat({
                queryValue: submittedQuery,
                mode,
                setQuery: false,
                setRoute,
            });
        }

        layoutStore.setCurrentPage(1);
        return true;
    }

    const { explore } = await import('src/functions/explore');
    await explore({
        queryValue: submittedQuery,
        setQuery: true,
        setRoute,
    });
    layoutStore.setCurrentPage(1);
    return true;
};

export const submitSuggestionByMode = async ({
    item,
    mode,
}: {
    item: Pick<SmartSuggestion, 'text' | 'type' | 'meta'>;
    mode: SearchMode;
}) => {
    return submitCurrentModeQuery({
        queryValue: resolveSuggestionQuery(item),
        mode,
        recordInputHistory: true,
        setRoute: true,
    });
};
