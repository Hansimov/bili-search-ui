// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import IndexPage from 'src/pages/IndexPage.vue';

const mockSearchModeStore = {
    isToolMode: false,
    currentMode: 'smart',
};

vi.mock('src/stores/searchModeStore', () => ({
    useSearchModeStore: () => mockSearchModeStore,
    SEARCH_MODE_PLACEHOLDERS: {
        tool: '工具调用 · 输入 / 选择工具，或直接输入关键词搜索视频',
        smart: '快速问答 · 输入问题，AI 快速回答',
        think: '智能思考 · 输入问题，返回 AI 思考过程和回答',
        research: '深度研究 · 输入研究计划，返回 AI 深度研究报告',
    },
}));

describe('IndexPage chat landing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchModeStore.isToolMode = false;
        mockSearchModeStore.currentMode = 'smart';
    });

    it('smart 模式首页应显示标题与副标题', () => {
        const wrapper = mount(IndexPage, {
            global: {
                stubs: {
                    'q-card': { template: '<div><slot /></div>' },
                    'q-icon': { template: '<i />' },
                },
            },
        });

        expect(wrapper.text()).toContain('快速问答');
        expect(wrapper.text()).toContain('输入问题，AI 快速回答');
    });

    it('tool 模式首页也应显示标题与副标题', () => {
        mockSearchModeStore.isToolMode = true;
        mockSearchModeStore.currentMode = 'tool';

        const wrapper = mount(IndexPage, {
            global: {
                stubs: {
                    'q-card': { template: '<div><slot /></div>' },
                    'q-icon': { template: '<i />' },
                },
            },
        });

        expect(wrapper.text()).toContain('工具调用');
        expect(wrapper.text()).toContain('输入 / 选择工具');
    });
});
