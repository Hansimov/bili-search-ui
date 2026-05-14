import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useQueryStore } from 'src/stores/queryStore';

const mockRouter = {
    currentRoute: {
        value: {
            fullPath: '/',
        },
    },
    replace: vi.fn(),
};

vi.mock('src/router', () => ({
    getRouter: () => mockRouter,
}));

describe('QueryStore route flow', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        mockRouter.currentRoute.value.fullPath = '/';
    });

    it('没有 chatSessionId 时 setQuery(setRoute=true) 不再生成 q 路由', () => {
        const store = useQueryStore();

        store.setQuery({
            newQuery: 'hello world',
            setRoute: true,
            mode: 'tool',
        });

        expect(store.query).toBe('hello world');
        expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('chat 模式且有 chatSessionId 应写入 /chat/<sessionId>', () => {
        const store = useQueryStore();

        store.setQuery({
            newQuery: 'who are you',
            setRoute: true,
            mode: 'smart',
            chatSessionId: 'session-abc',
        });

        expect(mockRouter.replace).toHaveBeenCalledWith('/chat/session-abc');
    });

    it('非 tool 且无 chatSessionId 时也不再回落到 q 路由', () => {
        const store = useQueryStore();

        store.setQuery({
            newQuery: 'fallback route',
            setRoute: true,
            mode: 'think',
        });

        expect(store.query).toBe('fallback route');
        expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('目标路由与当前 fullPath 相同则不应重复 replace', () => {
        const store = useQueryStore();
        mockRouter.currentRoute.value.fullPath = '/chat/session-same';

        store.setQuery({
            newQuery: 'same',
            setRoute: true,
            chatSessionId: 'session-same',
        });

        expect(mockRouter.replace).not.toHaveBeenCalled();
    });
});
