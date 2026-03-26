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

const searchOwnersCall: ToolCall = {
    type: 'search_owners',
    args: { text: '何同学', mode: 'name' },
    status: 'completed',
    result: {
        text: '何同学',
        total_owners: 2,
        owners: [
            {
                mid: 163637592,
                name: '老师好我叫何同学',
                score: 12.5,
                sample_title: '苹果为什么不做这 5 个功能？',
                sample_bvid: 'BV1xx411c7mD',
                sample_pic: 'https://i0.hdslb.com/bfs/archive/example-cover.jpg',
                face: 'https://i0.hdslb.com/bfs/face/example-face.jpg',
            },
            {
                mid: 946974,
                name: '何同学切片',
                score: 4.2,
                sample_title: '何同学高能片段合集',
            },
        ],
    },
};

const multiQuerySearchVideosCall: ToolCall = {
    type: 'search_videos',
    args: {
        queries: [':uid=1629347259 :date<=30d', ':uid=674510452 :date<=30d'],
    },
    status: 'completed',
    result: {
        results: [
            {
                query: ':uid=1629347259 :date<=30d',
                total_hits: 12,
                hits: [
                    {
                        bvid: 'BV108A',
                        title: '08 最近更新 1',
                        pic: 'https://example.com/BV108A.jpg',
                        owner: { name: '红警HBK08', mid: 1629347259 },
                        stat: { view: 12345 },
                    },
                ],
            },
            {
                query: ':uid=674510452 :date<=30d',
                total_hits: 7,
                hits: [
                    {
                        bvid: 'BVmoon3',
                        title: '月亮3 最近更新 1',
                        pic: 'https://example.com/BVmoon3.jpg',
                        owner: { name: '红警月亮3', mid: 674510452 },
                        stat: { view: 67890 },
                    },
                ],
            },
        ],
    },
};

describe('ToolCallDisplay component', () => {
    it('keeps completed multi-query search_videos collapsed by default while preserving results', async () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [multiQuerySearchVideosCall],
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

        expect(wrapper.text()).toContain('在新窗口中查看 2 条结果');
        expect(wrapper.find('.tool-call-results-wrapper').classes()).not.toContain('expanded');

        await wrapper.find('.tool-call-header').trigger('click');

        expect(wrapper.find('.tool-call-results-wrapper').classes()).toContain('expanded');
        expect(wrapper.text()).toContain('08 最近更新 1');
        expect(wrapper.text()).toContain('月亮3 最近更新 1');
    });

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

    it('renders search_owners with a friendly label and compact text items', async () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [searchOwnersCall],
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

        expect(wrapper.text()).toContain('搜索作者');
        expect(wrapper.text()).toContain('2 位作者');

        await wrapper.find('.tool-call-header').trigger('click');

        const ownerCards = wrapper.findAll('.tool-owner-result');
        expect(ownerCards).toHaveLength(2);
        expect(ownerCards[0]?.text()).toContain('老师好我叫何同学');
        expect(ownerCards[0]?.text()).toContain('UID 163637592');
        expect(ownerCards[0]?.text()).not.toContain('代表作');
        expect(ownerCards[0]?.find('.tool-owner-mini-ref').attributes('href')).toBe(
            'https://space.bilibili.com/163637592'
        );
        expect(ownerCards[1]?.text()).toContain('何同学切片');
        expect(ownerCards[1]?.find('.tool-owner-mini-ref').exists()).toBe(true);
        expect(ownerCards[0]?.text()).not.toContain('粉丝');
    });
});