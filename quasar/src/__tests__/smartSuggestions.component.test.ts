// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SmartSuggestions from 'src/components/SmartSuggestions.vue';

const sampleSuggestion = {
    text: '测试问题',
    highlightedText: '测试问题',
    type: 'history' as const,
    score: 100,
    meta: undefined,
};

const {
    mockQueryStore,
    mockLayoutStore,
    mockSearchModeStore,
    mockSmartService,
    mockSubmitSuggestionByMode,
    mockResolveSuggestionQuery,
} = vi.hoisted(() => ({
    mockQueryStore: {
        query: '测',
        setQuery: vi.fn(),
    },
    mockLayoutStore: {
        suggestSelectedIndex: -1,
        resetSuggestNavigation: vi.fn(),
        setIsSuggestVisible: vi.fn(),
    },
    mockSearchModeStore: {
        currentMode: 'smart' as 'direct' | 'smart' | 'think' | 'research',
    },
    mockSmartService: {
        suggest: vi.fn(() => [sampleSuggestion]),
    },
    mockSubmitSuggestionByMode: vi.fn(),
    mockResolveSuggestionQuery: vi.fn(() => '测试问题'),
}));

vi.mock('src/stores/queryStore', () => ({
    useQueryStore: () => mockQueryStore,
}));

vi.mock('src/stores/layoutStore', () => ({
    useLayoutStore: () => mockLayoutStore,
}));

vi.mock('src/stores/searchModeStore', () => ({
    useSearchModeStore: () => mockSearchModeStore,
    getSearchMode: (mode: 'direct' | 'smart' | 'think' | 'research') => ({
        apiType: mode === 'direct' ? 'explore' : 'chat',
    }),
}));

vi.mock('src/services/smartSuggestService', () => ({
    getSmartSuggestService: () => mockSmartService,
    suggestIndexVersion: {
        value: 0,
        __v_isRef: true,
    },
}));

vi.mock('src/functions/chat', () => ({
    submitSuggestionByMode: mockSubmitSuggestionByMode,
    resolveSuggestionQuery: mockResolveSuggestionQuery,
}));

const mountComponent = () =>
    mount(SmartSuggestions, {
        global: {
            stubs: {
                'q-list': true,
                'q-item': true,
                'q-item-section': true,
                'q-icon': true,
            },
            directives: {
                ripple: {},
            },
        },
    });

describe('SmartSuggestions click behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockQueryStore.query = '测';
        mockLayoutStore.suggestSelectedIndex = -1;
        mockSearchModeStore.currentMode = 'smart';
        mockSmartService.suggest.mockReturnValue([sampleSuggestion]);
        mockResolveSuggestionQuery.mockReturnValue('测试问题');
    });

    it('chat 模式点击建议只填充输入框，不直接提交', async () => {
        const wrapper = mountComponent();
        const vm = wrapper.vm as unknown as {
            selectSuggestion: (item: typeof sampleSuggestion) => Promise<void>;
        };
        const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

        for (const mode of ['smart', 'think', 'research'] as const) {
            mockSearchModeStore.currentMode = mode;
            await vm.selectSuggestion(sampleSuggestion);
        }

        expect(mockResolveSuggestionQuery).toHaveBeenCalledTimes(3);
        expect(mockQueryStore.setQuery).toHaveBeenCalledTimes(3);
        expect(mockQueryStore.setQuery).toHaveBeenNthCalledWith(1, {
            newQuery: '测试问题',
            setRoute: false,
        });
        expect(mockLayoutStore.resetSuggestNavigation).toHaveBeenCalledTimes(3);
        expect(mockLayoutStore.setIsSuggestVisible).toHaveBeenCalledTimes(3);
        expect(mockLayoutStore.setIsSuggestVisible).toHaveBeenNthCalledWith(1, false);
        expect(dispatchEventSpy).toHaveBeenCalledTimes(3);
        expect(mockSubmitSuggestionByMode).not.toHaveBeenCalled();
    });

    it('direct 模式点击建议应直接提交', async () => {
        const wrapper = mountComponent();
        const vm = wrapper.vm as unknown as {
            selectSuggestion: (item: typeof sampleSuggestion) => Promise<void>;
        };

        mockSearchModeStore.currentMode = 'direct';
        await vm.selectSuggestion(sampleSuggestion);

        expect(mockSubmitSuggestionByMode).toHaveBeenCalledWith({
            item: sampleSuggestion,
            mode: 'direct',
        });
        expect(mockQueryStore.setQuery).not.toHaveBeenCalled();
        expect(mockLayoutStore.resetSuggestNavigation).not.toHaveBeenCalled();
        expect(mockLayoutStore.setIsSuggestVisible).not.toHaveBeenCalled();
    });
});