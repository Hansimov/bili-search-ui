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

    it('direct 模式 setQuery(setRoute=true) 应写入 /search?q=', () => {
        const store = useQueryStore();

        store.setQuery({
            newQuery: 'hello world',
            setRoute: true,
            mode: 'direct',
        });

        expect(mockRouter.replace).toHaveBeenCalledWith('/search?q=hello+world');
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

    it('非 direct 且无 chatSessionId 时应回落到 /search?q=...&mode=...', () => {
        const store = useQueryStore();

        store.setQuery({
            newQuery: 'fallback route',
            setRoute: true,
            mode: 'think',
        });

        expect(mockRouter.replace).toHaveBeenCalledWith(
            '/search?q=fallback+route&mode=think'
        );
    });

    it('目标路由与当前 fullPath 相同则不应重复 replace', () => {
        const store = useQueryStore();
        mockRouter.currentRoute.value.fullPath = '/search?q=same';

        store.setQuery({
            newQuery: 'same',
            setRoute: true,
            mode: 'direct',
        });

        expect(mockRouter.replace).not.toHaveBeenCalled();
    });
});
