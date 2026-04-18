// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import ChatResponsePanel from 'src/components/ChatResponsePanel.vue';

const quasarMocks = vi.hoisted(() => ({
    copyToClipboard: vi.fn().mockResolvedValue(undefined),
    notifyCreate: vi.fn(),
}));

vi.mock('quasar', () => ({
    copyToClipboard: quasarMocks.copyToClipboard,
    Notify: {
        create: quasarMocks.notifyCreate,
    },
}));

const { mockChatStore, mockExploreStore, mockLayoutStore, mockSearchModeStore } =
    vi.hoisted(() => ({
        mockChatStore: {
            isLoading: false,
            hasContent: true,
            hasThinkingContent: false,
            isThinkingPhase: false,
            isDone: true,
            isAborted: false,
            hasError: false,
            perfStats: null,
            usage: null,
            toolEvents: [] as Array<Record<string, unknown>>,
            currentSession: {
                thinking: false,
                error: '',
                query: '当前问题',
                content: '当前回答 markdown',
                mode: 'smart',
                usageTrace: null as Record<string, unknown> | null,
            },
            currentSessionId: 'session-actions',
            content: '当前回答 markdown',
            thinkingContent: '',
            streamSegments: [],
            historyMessages: [] as Array<Record<string, unknown>>,
        },
        mockExploreStore: {
            updateLatestHitsResult: vi.fn(),
        },
        mockLayoutStore: {
            resetLoadedPages: vi.fn(),
        },
        mockSearchModeStore: {
            currentMode: 'smart',
        },
    }));

vi.mock('src/stores/chatStore', () => ({
    useChatStore: () => mockChatStore,
}));

vi.mock('src/stores/exploreStore', () => ({
    useExploreStore: () => mockExploreStore,
}));

vi.mock('src/stores/layoutStore', () => ({
    useLayoutStore: () => mockLayoutStore,
}));

vi.mock('src/stores/searchModeStore', () => ({
    useSearchModeStore: () => mockSearchModeStore,
}));

const BiliVideoTooltipStub = defineComponent({
    name: 'BiliVideoTooltipStub',
    template: '<div class="bili-video-tooltip-stub"></div>',
});

const ToolCallDisplayStub = defineComponent({
    name: 'ToolCallDisplayStub',
    template: '<div class="tool-call-display-stub"></div>',
});

const SearchModeEmptyStateStub = defineComponent({
    name: 'SearchModeEmptyStateStub',
    template: '<div class="search-mode-empty-state-stub"></div>',
});

const mountPanel = async () => {
    const wrapper = mount(ChatResponsePanel, {
        global: {
            stubs: {
                BiliVideoTooltip: BiliVideoTooltipStub,
                ToolCallDisplay: ToolCallDisplayStub,
                SearchModeEmptyState: SearchModeEmptyStateStub,
                'q-icon': true,
                'q-btn': {
                    props: ['label'],
                    emits: ['click'],
                    template:
                        '<button @click="$emit(\'click\', $event)"><slot />{{ label }}</button>',
                },
                'q-spinner-dots': true,
            },
        },
    });

    await nextTick();
    return wrapper;
};

describe('ChatResponsePanel actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockChatStore.historyMessages = [];
        mockChatStore.currentSession.query = '当前问题';
        mockChatStore.currentSession.content = '当前回答 markdown';
        mockChatStore.currentSession.mode = 'smart';
        mockChatStore.currentSession.usageTrace = {
            models: {
                planner: { config: 'deepseek', model: 'deepseek-reasoner' },
                response: {
                    config: 'doubao-seed-2-0-mini',
                    model: 'doubao-seed-2-0-mini-260215',
                },
            },
        };
        mockChatStore.content = '当前回答 markdown';
        mockChatStore.hasContent = true;
        mockChatStore.isDone = true;
        mockChatStore.isAborted = false;
        mockChatStore.hasError = false;
    });

    it('edits the current query inline and still supports answer actions', async () => {
        const wrapper = await mountPanel();

        const currentQueryRow = wrapper.findAll('.chat-user-query')[0];
        expect(
            currentQueryRow.find('.chat-inline-action-btn--compact').exists()
        ).toBe(true);
        expect(
            currentQueryRow.find('.chat-round-toggle-bar-state--icon-only').exists()
        ).toBe(true);
        expect(
            currentQueryRow.find('.chat-round-toggle-bar-state--icon-only span').exists()
        ).toBe(false);

        const editButton = wrapper
            .findAll('.chat-user-query .chat-inline-action-btn')
            .find((node) => node.text().includes('编辑'));
        expect(editButton?.exists()).toBe(true);

        await editButton?.trigger('click');

        const editor = wrapper.find('.chat-query-editor-input');
        expect(editor.exists()).toBe(true);
        await editor.setValue('修改后的当前问题');

        const editorSubmitButton = wrapper
            .findAll('.chat-query-editor-actions .chat-inline-action-btn')
            .find((node) => node.text().includes('提交'));
        await editorSubmitButton?.trigger('click');

        expect(wrapper.emitted('retry')?.[0]?.[0]).toEqual({
            query: '修改后的当前问题',
            mode: 'smart',
            baseHistory: [],
        });

        const answerButtons = wrapper.findAll('.chat-answer-actions .chat-inline-action-btn');
        const copyButton = answerButtons.find((node) => node.text().includes('复制'));
        const exportButton = answerButtons.find((node) => node.text().includes('导出'));
        const continueButton = answerButtons.find((node) => node.text().includes('继续'));
        const retryButton = answerButtons.find((node) => node.text().includes('重试'));

        expect(copyButton?.exists()).toBe(true);
        expect(exportButton?.exists()).toBe(true);
        expect(continueButton?.exists()).toBe(true);
        expect(retryButton?.exists()).toBe(true);

        await copyButton?.trigger('click');
        await exportButton?.trigger('click');
        await continueButton?.trigger('click');
        await retryButton?.trigger('click');

        expect(quasarMocks.copyToClipboard).toHaveBeenCalledWith('当前回答 markdown');
        expect(wrapper.emitted('export')?.[0]?.[0]).toEqual({
            maxRoundIndex: 1,
            selectedRoundIndexes: [1],
        });
        expect(wrapper.emitted('continue')).toHaveLength(1);
        expect(wrapper.emitted('retry')).toHaveLength(2);
        expect(wrapper.text()).not.toContain('模型路由');
        expect(wrapper.text()).not.toContain('规划');
    });

    it('emits history retry, continue, and export payloads from historical assistant actions', async () => {
        mockChatStore.currentSession.query = '';
        mockChatStore.content = '';
        mockChatStore.hasContent = false;
        mockChatStore.historyMessages = [
            { id: 'user-1', role: 'user', content: '历史问题1' },
            { id: 'assistant-1', role: 'assistant', content: '历史回答1' },
            { id: 'user-2', role: 'user', content: '历史问题2' },
            { id: 'assistant-2', role: 'assistant', content: '历史回答2' },
        ];

        const wrapper = await mountPanel();
        const historyActionButtons = wrapper.findAll(
            '.chat-history-assistant .chat-answer-actions .chat-inline-action-btn'
        );
        const exportButton = historyActionButtons
            .filter((node) => node.text().includes('导出'))
            .at(-1);
        const continueButton = historyActionButtons
            .filter((node) => node.text().includes('继续'))
            .at(-1);
        const retryButton = historyActionButtons
            .filter((node) => node.text().includes('重试'))
            .at(-1);

        await exportButton?.trigger('click');
        await continueButton?.trigger('click');
        await retryButton?.trigger('click');

        expect(wrapper.emitted('export')?.[0]?.[0]).toEqual({
            maxRoundIndex: 2,
            selectedRoundIndexes: [1, 2],
        });

        expect(wrapper.emitted('continue')?.[0]?.[0]).toEqual({
            query: '继续',
            mode: 'smart',
            baseHistory: [
                { id: 'user-1', role: 'user', content: '历史问题1' },
                { id: 'assistant-1', role: 'assistant', content: '历史回答1' },
                { id: 'user-2', role: 'user', content: '历史问题2' },
                { id: 'assistant-2', role: 'assistant', content: '历史回答2' },
            ],
        });
        expect(wrapper.emitted('retry')?.[0]?.[0]).toEqual({
            query: '历史问题2',
            mode: 'smart',
            baseHistory: [
                { id: 'user-1', role: 'user', content: '历史问题1' },
                { id: 'assistant-1', role: 'assistant', content: '历史回答1' },
            ],
        });
    });

    it('shows continue and retry for an aborted current round with partial content', async () => {
        mockChatStore.currentSession.query = '中止问题';
        mockChatStore.currentSession.content = '中止前回答';
        mockChatStore.content = '中止前回答';
        mockChatStore.hasContent = true;
        mockChatStore.isDone = false;
        mockChatStore.isAborted = true;

        const wrapper = await mountPanel();
        const answerButtons = wrapper.findAll('.chat-answer-actions .chat-inline-action-btn');
        const continueButton = answerButtons.find((node) => node.text().includes('继续'));
        const retryButton = answerButtons.find((node) => node.text().includes('重试'));

        expect(continueButton?.exists()).toBe(true);
        expect(retryButton?.exists()).toBe(true);

        await continueButton?.trigger('click');
        await retryButton?.trigger('click');

        expect(wrapper.emitted('continue')).toHaveLength(1);
        expect(wrapper.emitted('retry')).toHaveLength(1);
    });

    it('does not show current answer actions for a done session without content', async () => {
        mockChatStore.currentSession.query = '当前问题';
        mockChatStore.currentSession.content = '';
        mockChatStore.content = '';
        mockChatStore.hasContent = false;
        mockChatStore.isDone = true;
        mockChatStore.isAborted = false;
        mockChatStore.hasError = false;

        const wrapper = await mountPanel();
        expect(wrapper.find('.chat-answer-actions').exists()).toBe(false);
    });

    it('edits a historical query inline and retries with the correct base history', async () => {
        mockChatStore.currentSession.query = '';
        mockChatStore.content = '';
        mockChatStore.hasContent = false;
        mockChatStore.historyMessages = [
            { id: 'user-1', role: 'user', content: '历史问题1' },
            { id: 'assistant-1', role: 'assistant', content: '历史回答1' },
            { id: 'user-2', role: 'user', content: '历史问题2' },
            { id: 'assistant-2', role: 'assistant', content: '历史回答2' },
        ];

        const wrapper = await mountPanel();
        const editButtons = wrapper
            .findAll('.chat-user-query .chat-inline-action-btn')
            .filter((node) => node.text().includes('编辑'));

        await editButtons[1]?.trigger('click');

        const editor = wrapper.find('.chat-query-editor-input');
        await editor.setValue('改写后的历史问题2');
        const submitButton = wrapper
            .findAll('.chat-query-editor-actions .chat-inline-action-btn')
            .find((node) => node.text().includes('提交'));
        await submitButton?.trigger('click');

        expect(wrapper.emitted('retry')?.[0]?.[0]).toEqual({
            query: '改写后的历史问题2',
            mode: 'smart',
            baseHistory: [
                { id: 'user-1', role: 'user', content: '历史问题1' },
                { id: 'assistant-1', role: 'assistant', content: '历史回答1' },
            ],
        });
    });
});