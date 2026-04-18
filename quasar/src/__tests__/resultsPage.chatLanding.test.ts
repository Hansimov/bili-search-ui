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

const mockQueryStore = {
    query: '',
};

const mockChatStore = {
    conversationHistory: [] as unknown[],
    exportSessionBundle: vi.fn(() => ({
        rounds: [
            { index: 1 },
            { index: 2 },
            { index: 3 },
        ],
        session: { sessionId: 'session-export' },
    })),
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
    hasResults: false,
    isExploreLoading: false,
    submittedQuery: '',
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

vi.mock('src/stores/queryStore', () => ({
    useQueryStore: () => mockQueryStore,
}));

vi.mock('src/functions/chat', () => ({
    chat: vi.fn(),
}));

const mountResultsPage = () =>
    shallowMount(ResultsPage, {
        global: {
            stubs: {
                ChatResponsePanel: true,
                ChatExportDialog: true,
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
        mockQueryStore.query = '';
        mockExploreStore.hasResults = false;
        mockExploreStore.isExploreLoading = false;
        mockExploreStore.submittedQuery = '';
    });

    it('smart 空会话时应显示 chat 面板', () => {
        const wrapper = mountResultsPage();

        expect((wrapper.vm as unknown as { showChatPanel: boolean }).showChatPanel).toBe(true);
    });

    it('direct 空状态时不应显示 chat 面板', () => {
        mockSearchModeStore.currentMode = 'direct';

        const wrapper = mountResultsPage();

        expect((wrapper.vm as unknown as { showChatPanel: boolean }).showChatPanel).toBe(false);
        expect((wrapper.vm as unknown as { showDirectEmptyLanding: boolean }).showDirectEmptyLanding).toBe(true);
    });

    it('opens export dialog with prefix round selection by default', () => {
        const wrapper = mountResultsPage();
        const vm = wrapper.vm as unknown as {
            openExportDialog: (payload?: { maxRoundIndex?: number; selectedRoundIndexes?: number[] }) => void;
            showExportDialog: boolean;
            exportDialogSelectedRounds: number[];
        };

        vm.openExportDialog({ maxRoundIndex: 2 });
        expect(vm.showExportDialog).toBe(true);
        expect(vm.exportDialogSelectedRounds).toEqual([1, 2]);

        vm.openExportDialog({ selectedRoundIndexes: [2, 3] });
        expect(vm.exportDialogSelectedRounds).toEqual([2, 3]);
    });
});