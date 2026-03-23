// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import ResultsPage from 'src/pages/ResultsPage.vue';

vi.mock('src/router', () => ({
    getRouter: () => ({
        currentRoute: { value: { fullPath: '/' } },
        replace: vi.fn(),
    }),
}));

vi.mock('src/components/ResultsList.vue', () => ({
    default: {
        name: 'ResultsList',
        template: '<div class="results-list-stub" />',
    },
}));

const mockLayoutStore = {
    activeTab: 'videos',
    resetLoadedPages: vi.fn(),
};

const mockSearchModeStore = {
    currentMode: 'smart',
    shouldUseInlineLayout: false,
};

const mockChatStore = {
    conversationHistory: [] as unknown[],
    currentSession: {
        query: '',
        mode: 'smart',
        content: '',
        thinkingContent: '',
        toolEvents: [] as unknown[],
        isLoading: false,
        isAborted: false,
    },
    isLoading: false,
    hasContent: false,
    hasError: false,
    isDone: false,
    isAborted: false,
};

const mockExploreStore = {
    latestHitsResult: null,
};

vi.mock('src/stores/layoutStore', () => ({
    useLayoutStore: () => mockLayoutStore,
}));

vi.mock('src/stores/searchModeStore', () => ({
    useSearchModeStore: () => mockSearchModeStore,
}));

vi.mock('src/stores/chatStore', () => ({
    useChatStore: () => mockChatStore,
}));

vi.mock('src/stores/exploreStore', () => ({
    useExploreStore: () => mockExploreStore,
}));

vi.mock('src/functions/chat', () => ({
    chat: vi.fn(),
}));

const mountResultsPage = () =>
    shallowMount(ResultsPage, {
        global: {
            stubs: {
                ChatResponsePanel: true,
                ResultsList: true,
                'q-card': true,
                'q-btn': true,
                'q-dialog': true,
                'q-toolbar': true,
                'q-icon': true,
                'q-toolbar-title': true,
                'q-card-section': true,
                'q-tab-panels': true,
                'q-tab-panel': true,
            },
        },
    });

describe('ResultsPage chat landing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchModeStore.currentMode = 'smart';
        mockSearchModeStore.shouldUseInlineLayout = false;
        mockChatStore.conversationHistory = [];
        mockChatStore.currentSession.query = '';
        mockChatStore.currentSession.toolEvents = [];
        mockChatStore.isLoading = false;
        mockChatStore.hasContent = false;
        mockChatStore.hasError = false;
        mockChatStore.isDone = false;
        mockChatStore.isAborted = false;
    });

    it('smart 空会话时应显示 chat 面板', () => {
        const wrapper = mountResultsPage();

        expect((wrapper.vm as unknown as { showChatPanel: boolean }).showChatPanel).toBe(true);
    });

    it('direct 空状态时不应显示 chat 面板', () => {
        mockSearchModeStore.currentMode = 'direct';

        const wrapper = mountResultsPage();

        expect((wrapper.vm as unknown as { showChatPanel: boolean }).showChatPanel).toBe(false);
    });
});