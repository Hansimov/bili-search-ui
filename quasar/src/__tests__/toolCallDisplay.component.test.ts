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

const transcriptCall: ToolCall = {
    type: 'get_video_transcript',
    args: { video_id: 'BV1YXZPB1Erc', head_chars: 6000 },
    status: 'completed',
    result: {
        bvid: 'BV1YXZPB1Erc',
        title: '示例视频',
        selection: {
            selected_text_length: 128,
            full_text_length: 512,
        },
        transcript: {
            text: '这是一个示例转写，用来验证前端是否可以展示转写预览。',
            text_length: 128,
            segment_count: 3,
        },
    },
};

const streamingSmallTaskCall: ToolCall = {
    type: 'run_small_llm_task',
    args: {
        task: '把转写整理成 4 条中文要点',
        result_ids: ['R1'],
    },
    status: 'streaming',
    visibility: 'internal',
    result: {
        task: '把转写整理成 4 条中文要点',
        model_name: 'doubao-seed-2-0-mini',
        result: '- 要点1\n- 要点2',
    },
};

const streamingSmallTaskPlaceholderCall: ToolCall = {
    type: 'run_small_llm_task',
    args: {
        task: '把转写整理成 4 条中文要点',
        result_ids: ['R1'],
    },
    status: 'streaming',
    visibility: 'internal',
    result: {
        task: '把转写整理成 4 条中文要点',
        model_name: 'doubao-seed-2-0-mini',
        result: '',
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

const lookupSearchVideosCall: ToolCall = {
    type: 'search_videos',
    args: {
        mode: 'lookup',
        mid: '1629347259',
        date_window: '30d',
    },
    status: 'completed',
    result: {
        hits: [
            {
                bvid: 'BV1f1d5BVEWB',
                title: '红警围攻之都团战！苏军挡在前，掩护盟军后方输出！',
                pic: 'https://example.com/BV1f1d5BVEWB.jpg',
                owner: { name: '红警HBK08', mid: 1629347259 },
                stat: { view: 12345 },
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

    it('shows lookup-mode search_videos seeds in the header', () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [lookupSearchVideosCall],
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

        expect(wrapper.text()).toContain(':uid=1629347259 :date<=30d');
        expect(wrapper.text()).toContain('在新窗口中查看 1 条结果');
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

    it('renders transcript results with a readable preview', async () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [transcriptCall],
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

        expect(wrapper.text()).toContain('读取转写');
        expect(wrapper.text()).toContain('3 段 / 128 字');

        await wrapper.find('.tool-call-header').trigger('click');

        expect(wrapper.text()).toContain('示例视频');
        expect(wrapper.text()).toContain('这是一个示例转写，用来验证前端是否可以展示转写预览。');
    });

    it('renders internal run_small_llm_task calls with live streaming text', () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [streamingSmallTaskCall],
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

        expect(wrapper.text()).toContain('小模型整理');
        expect(wrapper.text()).toContain('整理中...');
        expect(wrapper.text()).toContain('- 要点1');
        expect(wrapper.find('.tool-text-result').exists()).toBe(true);
        expect(wrapper.find('.tool-text-result-meta').exists()).toBe(false);
        expect(wrapper.find('.tool-model-badge').exists()).toBe(false);
        expect(wrapper.find('.tool-call-results-wrapper').classes()).toContain(
            'tool-call-results-wrapper--small-task'
        );
        expect(wrapper.find('.tool-call-results-wrapper').classes()).toContain(
            'expanded'
        );
        expect(
            wrapper.text().match(/把转写整理成 4 条中文要点/g)?.length || 0
        ).toBe(1);
    });

    it('shows a placeholder body for streaming run_small_llm_task before first text arrives', () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [streamingSmallTaskPlaceholderCall],
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

        expect(wrapper.text()).toContain('小模型整理');
        expect(wrapper.text()).toContain('整理中...');
        expect(wrapper.text()).toContain('小模型已开始整理，等待首批内容...');
        expect(wrapper.find('.tool-text-result').exists()).toBe(true);
    });

    it('allows collapsing a streaming run_small_llm_task panel', async () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [streamingSmallTaskCall],
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

        expect(wrapper.find('.tool-call-results-wrapper').classes()).toContain(
            'expanded'
        );

        await wrapper.find('.tool-call-header').trigger('click');

        expect(wrapper.find('.tool-call-results-wrapper').classes()).not.toContain(
            'expanded'
        );
    });

    it('auto-collapses run_small_llm_task after completion while remaining expandable', async () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [streamingSmallTaskCall],
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

        expect(wrapper.find('.tool-call-results-wrapper').classes()).toContain(
            'expanded'
        );

        await wrapper.setProps({
            toolCalls: [
                {
                    ...streamingSmallTaskCall,
                    status: 'completed',
                },
            ],
        });

        expect(wrapper.find('.tool-call-results-wrapper').classes()).not.toContain(
            'expanded'
        );
        expect(wrapper.text()).toContain('已生成');

        await wrapper.find('.tool-call-header').trigger('click');

        expect(wrapper.find('.tool-call-results-wrapper').classes()).toContain(
            'expanded'
        );
    });
});