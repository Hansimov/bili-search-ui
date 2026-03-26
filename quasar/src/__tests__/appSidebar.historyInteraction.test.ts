// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import type { SearchHistoryItem } from 'src/stores/searchHistoryStore';
import AppSidebar from 'src/components/AppSidebar.vue';

const {
    mockRouter,
    mockLayoutStore,
    mockAccountStore,
    mockAuthStore,
    mockSearchHistoryStore,
    mockChatStore,
    mockQueryStore,
    mockExploreStore,
    mockSearchModeStore,
    mockExplore,
    mockRestoreExploreFromCache,
    mockChatFn,
} = vi.hoisted(() => ({
    mockRouter: {
        push: vi.fn().mockResolvedValue(undefined),
        currentRoute: {
            value: {
                path: '/',
                query: {},
            },
        },
    },
    mockLayoutStore: {
        hasSidebar: vi.fn(() => true),
        isMobileMode: vi.fn(() => false),
        isTabletMode: vi.fn(() => false),
        isSidebarOverlayMode: vi.fn(() => false),
        isMobileSidebarOpen: false,
        isSidebarExpanded: true,
        toggleMobileSidebar: vi.fn(),
        closeMobileSidebar: vi.fn(),
        toggleSidebar: vi.fn(),
    },
    mockAccountStore: {
        isLoggedIn: false,
        userAvatar: '',
        userName: '',
        userMid: '',
        userAttention: 0,
        followingCount: 0,
        userFans: 0,
        userCoins: 0,
        userArchiveCount: 0,
        isUpdatingFollowings: false,
        handleUpdateFollowings: vi.fn(),
        handleLogout: vi.fn(),
    },
    mockAuthStore: {
        isLoading: false,
        canShowQRCode: false,
        qrCodeState: {
            qrCodeUrl: '',
            statusMessage: '',
            remainingTime: 0,
            error: '',
        },
        generateQrCode: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn(),
    },
    mockSearchHistoryStore: {
        items: [] as SearchHistoryItem[],
        pinnedItems: [] as SearchHistoryItem[],
        groupedRecentItems: [] as Array<{ label: string; items: SearchHistoryItem[] }>,
        recentItems: [] as SearchHistoryItem[],
        totalCount: 1,
        isLoaded: true,
        findLatestRecord: vi.fn(),
        loadHistory: vi.fn().mockResolvedValue(undefined),
        clearAll: vi.fn().mockResolvedValue(undefined),
        removeRecord: vi.fn().mockResolvedValue(undefined),
        togglePin: vi.fn().mockResolvedValue(undefined),
        renameRecord: vi.fn().mockResolvedValue(undefined),
        updateSessionId: vi.fn(),
    },
    mockChatStore: {
        currentHistoryRecordId: null as string | null,
        currentSessionId: 'session-current',
        currentSession: {
            sessionId: 'session-current',
            query: '',
            mode: 'smart',
            content: '',
            thinkingContent: '',
            isLoading: false,
            isThinkingPhase: false,
            isDone: false,
            isAborted: false,
            error: null,
            perfStats: null,
            usage: null,
            toolEvents: [],
            streamSegments: [],
            thinking: false,
            createdAt: 0,
        },
        restoreFromSnapshot: vi.fn(),
        setCurrentHistoryRecordId: vi.fn((id: string | null) => {
            mockChatStore.currentHistoryRecordId = id;
        }),
        startNewChat: vi.fn(() => {
            mockChatStore.currentSessionId = 'session-new';
            mockChatStore.currentHistoryRecordId = null;
        }),
        clearHistory: vi.fn(() => {
            mockChatStore.currentHistoryRecordId = null;
        }),
    },
    mockQueryStore: {
        setQuery: vi.fn(),
        setChatRoute: vi.fn(),
    },
    mockExploreStore: {
        clearStepResults: vi.fn(),
        setSubmittedQuery: vi.fn(),
        setRestoringSession: vi.fn(),
    },
    mockSearchModeStore: {
        dslHelpShakeFlag: 0,
        setMode: vi.fn(),
        forceInitialSessionMode: vi.fn(),
        resetInitialSessionMode: vi.fn(),
    },
    mockExplore: vi.fn().mockResolvedValue(undefined),
    mockRestoreExploreFromCache: vi.fn().mockResolvedValue(false),
    mockChatFn: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('vue-router', () => ({
    useRouter: () => mockRouter,
}));

vi.mock('quasar', () => ({
    Dark: {
        set: vi.fn(),
    },
    copyToClipboard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('src/stores/layoutStore', () => ({
    useLayoutStore: () => mockLayoutStore,
}));

vi.mock('src/stores/accountStore', () => ({
    useAccountStore: () => mockAccountStore,
}));

vi.mock('src/stores/authStore', () => ({
    useAuthStore: () => mockAuthStore,
}));

vi.mock('src/stores/searchHistoryStore', () => ({
    useSearchHistoryStore: () => mockSearchHistoryStore,
    formatFullTime: () => '2026-03-22 12:00:00',
}));

vi.mock('src/stores/chatStore', () => ({
    useChatStore: () => mockChatStore,
}));

vi.mock('src/stores/queryStore', () => ({
    useQueryStore: () => mockQueryStore,
}));

vi.mock('src/stores/exploreStore', () => ({
    useExploreStore: () => mockExploreStore,
}));

vi.mock('src/stores/searchModeStore', () => ({
    useSearchModeStore: () => mockSearchModeStore,
}));

vi.mock('src/functions/explore', () => ({
    explore: mockExplore,
    restoreExploreFromCache: mockRestoreExploreFromCache,
}));

vi.mock('src/functions/chat', () => ({
    chat: mockChatFn,
}));

vi.mock('src/utils/zoom', () => ({
    getDocumentZoom: () => 1,
    viewportPxToCssPx: (value: number) => value,
}));

vi.mock('src/utils/schedule', () => ({
    scheduleAfterInitialRender: (callback: () => void) => callback(),
}));

const QBtnStub = defineComponent({
    inheritAttrs: false,
    emits: ['click'],
    template:
        '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
});

const mountSidebar = () =>
    shallowMount(AppSidebar, {
        global: {
            directives: {
                closePopup: {},
            },
            stubs: {
                transition: false,
                teleport: true,
                'router-link': true,
                DslHelpDialog: true,
                VueQrcode: true,
                'q-btn': QBtnStub,
                'q-icon': true,
                'q-space': true,
                'q-scroll-area': true,
                'q-dialog': true,
                'q-card': true,
                'q-card-section': true,
                'q-card-actions': true,
                'q-input': true,
                'q-avatar': true,
                'q-menu': true,
                'q-list': true,
                'q-item': true,
                'q-item-section': true,
                'q-item-label': true,
                'q-separator': true,
                'q-spinner': true,
            },
        },
    });

type SidebarSetupState = {
    clearHistory: () => Promise<void>;
    isHistoryItemActive: (item: SearchHistoryItem) => boolean;
    showClearHistoryDialog: boolean;
};

describe('AppSidebar history interactions', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockRouter.currentRoute.value = {
            path: '/',
            query: {},
        };
        mockLayoutStore.isMobileSidebarOpen = false;
        mockLayoutStore.isSidebarExpanded = true;
        mockSearchHistoryStore.items = [];
        mockSearchHistoryStore.pinnedItems = [];
        mockSearchHistoryStore.groupedRecentItems = [];
        mockSearchHistoryStore.recentItems = [];
        mockSearchHistoryStore.totalCount = 1;
        mockSearchHistoryStore.isLoaded = true;
        mockSearchHistoryStore.findLatestRecord.mockReturnValue(undefined);
        mockChatStore.currentHistoryRecordId = null;
        mockChatStore.currentSessionId = 'session-current';
        localStorage.clear();
        sessionStorage.clear();
    });

    it('清除历史按钮应使用原生 title 属性', () => {
        const wrapper = mountSidebar();

        const clearButton = wrapper.find('.history-clear-btn');
        expect(clearButton.exists()).toBe(true);
        expect(clearButton.attributes('title')).toBe('清除历史');
        expect(wrapper.html()).not.toContain('q-tooltip');
    });

    it('clearHistory 应重置当前视图状态与路由', async () => {
        const wrapper = mountSidebar();
        const setupState = wrapper.vm as unknown as SidebarSetupState;

        setupState.showClearHistoryDialog = true;
        await setupState.clearHistory();

        expect(mockSearchHistoryStore.clearAll).toHaveBeenCalledTimes(1);
        expect(mockChatStore.clearHistory).toHaveBeenCalledTimes(1);
        expect(mockChatStore.startNewChat).toHaveBeenCalledTimes(1);
        expect(mockQueryStore.setQuery).toHaveBeenCalledWith({ newQuery: '' });
        expect(mockExploreStore.clearStepResults).toHaveBeenCalledTimes(1);
        expect(mockExploreStore.setSubmittedQuery).toHaveBeenCalledWith('');
        expect(mockSearchModeStore.resetInitialSessionMode).toHaveBeenCalledTimes(1);
        expect(mockRouter.push).toHaveBeenCalledWith('/');
        expect(setupState.showClearHistoryDialog).toBe(false);
    });

    it('isHistoryItemActive 应稳定识别当前查看项', () => {
        const wrapper = mountSidebar();
        const setupState = wrapper.vm as unknown as SidebarSetupState;

        const smartItem: SearchHistoryItem = {
            id: 'smart-1',
            query: 'chat query',
            timestamp: Date.now(),
            pinned: false,
            mode: 'smart',
            sessionId: 'session-1',
        };
        const directItem: SearchHistoryItem = {
            id: 'direct-1',
            query: 'direct query',
            timestamp: Date.now(),
            pinned: false,
            mode: 'direct',
        };

        mockChatStore.currentHistoryRecordId = 'smart-1';
        expect(setupState.isHistoryItemActive(smartItem)).toBe(true);

        mockChatStore.currentHistoryRecordId = null;
        mockRouter.currentRoute.value = {
            path: '/chat/session-1',
            query: {},
        };
        expect(setupState.isHistoryItemActive(smartItem)).toBe(true);

        mockRouter.currentRoute.value = {
            path: '/chat',
            query: { q: 'direct query' },
        };
        expect(setupState.isHistoryItemActive(directItem)).toBe(true);

        mockRouter.currentRoute.value = {
            path: '/chat',
            query: { q: 'direct query', mode: 'smart' },
        };
        expect(setupState.isHistoryItemActive(directItem)).toBe(false);
    });

    it('direct 模式重复 query 只高亮当前记录', () => {
        const wrapper = mountSidebar();
        const setupState = wrapper.vm as unknown as SidebarSetupState;

        const olderDirect: SearchHistoryItem = {
            id: 'direct-old',
            query: '同一个查询',
            timestamp: Date.now() - 1000,
            pinned: false,
            mode: 'direct',
        };
        const currentDirect: SearchHistoryItem = {
            id: 'direct-current',
            query: '同一个查询',
            timestamp: Date.now(),
            pinned: false,
            mode: 'direct',
        };

        mockChatStore.currentHistoryRecordId = 'direct-current';
        mockRouter.currentRoute.value = {
            path: '/chat',
            query: { q: '同一个查询' },
        };

        expect(setupState.isHistoryItemActive(olderDirect)).toBe(false);
        expect(setupState.isHistoryItemActive(currentDirect)).toBe(true);
    });

    it('刷新后应优先按持久化的 direct 记录 ID 恢复高亮', () => {
        const wrapper = mountSidebar();
        const setupState = wrapper.vm as unknown as SidebarSetupState;

        const olderDirect: SearchHistoryItem = {
            id: 'direct-old',
            query: '同一个查询',
            timestamp: Date.now() - 1000,
            pinned: false,
            mode: 'direct',
        };
        const currentDirect: SearchHistoryItem = {
            id: 'direct-current',
            query: '同一个查询',
            timestamp: Date.now(),
            pinned: false,
            mode: 'direct',
        };

        sessionStorage.setItem(
            'direct-history-selection.v1',
            JSON.stringify({ recordId: 'direct-old', query: '同一个查询' })
        );
        mockRouter.currentRoute.value = {
            path: '/chat',
            query: { q: '同一个查询' },
        };
        mockSearchHistoryStore.findLatestRecord.mockReturnValue(currentDirect);

        expect(setupState.isHistoryItemActive(olderDirect)).toBe(true);
        expect(setupState.isHistoryItemActive(currentDirect)).toBe(false);
    });

    it('缺少 chatSnapshot 的 chat 历史应静态恢复而不是重新提交', async () => {
        const wrapper = mountSidebar();
        const setupState = wrapper.vm as unknown as SidebarSetupState & {
            searchFromHistory: (item: SearchHistoryItem) => Promise<void>;
        };

        const item: SearchHistoryItem = {
            id: 'smart-aborted',
            query: '中止问题',
            timestamp: Date.now(),
            pinned: false,
            mode: 'smart',
            sessionId: 'session-aborted',
        };

        await setupState.searchFromHistory(item);

        expect(mockChatStore.restoreFromSnapshot).toHaveBeenCalledWith(
            expect.objectContaining({
                session: expect.objectContaining({
                    sessionId: 'session-aborted',
                    query: '中止问题',
                    isAborted: true,
                    isDone: false,
                }),
                conversationHistory: [],
            })
        );
        expect(mockQueryStore.setChatRoute).toHaveBeenCalledWith('session-aborted');
        expect(mockChatFn).not.toHaveBeenCalled();
    });
});