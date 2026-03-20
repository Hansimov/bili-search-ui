import { defineStore } from 'pinia';
import { getRouter } from 'src/router';

export const useQueryStore = defineStore('query', {
    state: () => ({
        query: '' as string,
    }),
    actions: {
        /**
         * 设置直接查找模式的路由: /chat?q=<query>
         */
        setRoute: (newQuery: string, mode?: string) => {
            const router = getRouter();
            const params = new URLSearchParams();
            params.set('q', newQuery);
            if (mode && mode !== 'direct') {
                params.set('mode', mode);
            }
            const newRoute = `/chat?${params.toString()}`;
            const currentPath = router.currentRoute.value.fullPath;
            if (currentPath !== newRoute) {
                router.replace(newRoute);
            }
        },
        /**
         * 设置聊天模式的路由: /chat/<sessionId>
         * 用于快速问答/智能思考模式，URL 中不暴露具体查询文本
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
            mode,
            chatSessionId,
        }: { newQuery: string, setRoute?: boolean, mode?: string, chatSessionId?: string }) {
            this.query = newQuery;
            if (setRoute) {
                // 聊天模式使用 chat=<sessionId> 路由
                if (chatSessionId && mode && mode !== 'direct') {
                    this.setChatRoute(chatSessionId);
                } else {
                    this.setRoute(newQuery, mode);
                }
            }
        },
    },
});
