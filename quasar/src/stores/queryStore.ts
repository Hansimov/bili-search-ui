import { defineStore } from 'pinia';
import { getRouter } from 'src/router';

export const useQueryStore = defineStore('query', {
    state: () => ({
        query: '' as string,
    }),
    actions: {
        /**
         * 设置聊天模式的路由: /chat/<sessionId>
         * 用于快速问答/智能思考/实用工具，URL 中不暴露具体查询文本
         */
        setChatRoute(sessionId: string) {
            const router = getRouter();
            const newRoute = `/chat/${sessionId}`;
            const currentPath = router.currentRoute.value.fullPath;
            if (currentPath !== newRoute) {
                router.replace(newRoute);
            }
        },
        setQuery({
            newQuery = '',
            setRoute = false,
            chatSessionId,
        }: { newQuery: string, setRoute?: boolean, mode?: string, chatSessionId?: string }) {
            this.query = newQuery;
            if (setRoute) {
                // 新会话路由统一使用 /chat/<sessionId>
                if (chatSessionId) {
                    this.setChatRoute(chatSessionId);
                }
            }
        },
    },
});
