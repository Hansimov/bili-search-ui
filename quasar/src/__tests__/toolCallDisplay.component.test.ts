// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ToolCallDisplay from 'src/components/ToolCallDisplay.vue';
import type { ToolCall } from 'src/services/chatService';

const searchGoogleCall: ToolCall = {
    type: 'search_google',
    args: { query: 'Gemini 2.5 最近有哪些官方更新' },
    status: 'completed',
    result: {
        query: 'Gemini 2.5 最近有哪些官方更新',
        result_count: 2,
        results: [
            {
                title: 'Gemini 2.5 Release Notes',
                link: 'https://example.com/gemini-release',
                snippet: 'Official release notes for Gemini 2.5.',
                displayed_url: 'blog.google/gemini/release-notes',
            },
            {
                title: 'Gemini API Changelog',
                link: 'https://example.com/gemini-api',
                snippet: 'API updates and model improvements.',
                displayed_url: 'ai.google.dev/gemini-api/changelog',
            },
        ],
    },
};

describe('ToolCallDisplay component', () => {
    it('renders Google search results as expandable cards', async () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [searchGoogleCall],
            },
            global: {
                stubs: {
                    'q-btn': {
                        props: ['label'],
                        template: '<button>{{ label }}</button>',
                    },
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });

        expect(wrapper.text()).toContain('2 条结果');
        expect(wrapper.find('.tool-call-expand-icon').exists()).toBe(true);

        await wrapper.find('.tool-call-header').trigger('click');

        const links = wrapper.findAll('.tool-google-result');
        const sources = wrapper.findAll('.tool-google-result-source');
        expect(links).toHaveLength(2);
        expect(sources).toHaveLength(2);
        expect(links[0]?.text()).toContain('Gemini 2.5 Release Notes');
        expect(links[0]?.text()).toContain('blog.google/gemini/release-notes');
        expect(links[1]?.text()).toContain('Gemini API Changelog');
        expect(sources[0]?.text()).toBe('blog.google/gemini/release-notes');
        expect(sources[1]?.text()).toBe('ai.google.dev/gemini-api/changelog');
        expect(sources.some((source) => source.text() === 'Google')).toBe(false);
    });
});