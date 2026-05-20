// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
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

const truncatedSearchGoogleCall: ToolCall = {
    type: 'search_google',
    args: { query: '上海' },
    status: 'completed',
    result: {
        query: '上海',
        result_count: 6,
        results: [
            {
                title: '上海市人民政府',
                link: 'https://www.shanghai.gov.cn/',
                snippet: '上海市政府门户网站。',
                domain: 'shanghai.gov.cn',
            },
            {
                title: '上海 - 维基百科',
                link: 'https://zh.wikipedia.org/wiki/%E4%B8%8A%E6%B5%B7%E5%B8%82',
                snippet: '上海市，简称沪。',
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
        source_groups: [
            {
                source: 'name',
                label: '名字匹配',
                total_owners: 1,
                owners: [{ mid: 163637592, name: '老师好我叫何同学' }],
            },
            {
                source: 'topic',
                label: '主题发现',
                total_owners: 1,
                owners: [{ mid: 946974, name: '何同学切片' }],
            },
            {
                source: 'related_tokens',
                label: '全局相关作者',
                total_owners: 1,
                owners: [{ mid: 123, name: '旧版重复来源' }],
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

const summarizeCall: ToolCall = {
    type: 'summarize_transcript',
    args: {
        video_id: 'BV1YXZPB1Erc',
    },
    status: 'streaming',
    result: {
        task: '总结视频 BV1YXZPB1Erc',
        model_name: 'doubao-seed-2-0-mini',
        result: '# 视频总结\n\n- 第一条要点\n- 第二条要点\n\n[BV 链接](BV1YXZPB1Erc)',
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

const videoCommentsCall: ToolCall = {
    type: 'video_comments_full',
    args: { bvid: 'BV1comments', mode: 'full', limit: 1000 },
    status: 'completed',
    result: {
        status: 'ok',
        items: [
            {
                bvid: 'BV1comments',
                title: '评论测试视频',
                owner: { mid: 1, name: '测试UP主' },
                mode: 'full',
                summary: { comment_count: 3, root_count: 1, reply_count: 2 },
                pagination: { returned: 3, limit: 1000, max_depth: 2 },
                comments: [
                    {
                        rpid: 100,
                        ctime: 1779000000,
                        ctime_str: '2026-05-17 14:40:00',
                        parent: 0,
                        root: 0,
                        root_rpid: 100,
                        is_root: true,
                        depth: 1,
                        member: { mid: 1, uname: '根评论作者' },
                        content: {
                            message: '一级评论内容',
                            pictures: [
                                {
                                    url: '//i0.hdslb.com/bfs/new_dyn/root.jpg',
                                    width: 640,
                                    height: 360,
                                },
                                {
                                    url: '//i0.hdslb.com/bfs/new_dyn/root-2.jpg',
                                    width: 360,
                                    height: 900,
                                },
                            ],
                        },
                        like: 88,
                        is_hot: true,
                        is_top: true,
                    },
                    {
                        rpid: 101,
                        ctime: 1779000060,
                        ctime_str: '2026-05-17 14:41:00',
                        parent: 100,
                        root: 100,
                        root_rpid: 100,
                        is_root: false,
                        depth: 2,
                        member: { mid: 2, uname: '回复作者' },
                        content: {
                            message: '回复 @根评论作者: 回复一级评论',
                            pictures: [
                                {
                                    url: 'https://i0.hdslb.com/bfs/new_dyn/reply.jpg',
                                },
                            ],
                        },
                        like: 7,
                        is_hot: false,
                        is_top: false,
                    },
                    {
                        rpid: 102,
                        ctime: 1779000120,
                        ctime_str: '2026-05-17 14:42:00',
                        parent: 101,
                        root: 100,
                        root_rpid: 100,
                        is_root: false,
                        depth: 2,
                        member: { mid: 1, uname: '根评论作者' },
                        content: { message: '回复 @回复作者 ：回复楼中楼' },
                        like: 0,
                        is_hot: false,
                        is_top: false,
                    },
                ],
            },
        ],
    },
};

describe('ToolCallDisplay component', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

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

    it('keeps compact tool calls expandable and shows search result counts', async () => {
        vi.stubGlobal('matchMedia', vi.fn(() => ({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })));

        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [multiQuerySearchVideosCall],
            },
            global: {
                stubs: {
                    'q-btn': {
                        props: ['label', 'title'],
                        template: '<button :title="title">{{ label }}</button>',
                    },
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });
        await nextTick();

        expect(wrapper.find('.tool-query-list').exists()).toBe(false);
        expect(wrapper.find('.tool-call-results-wrapper').exists()).toBe(true);
        expect(wrapper.text()).toContain('搜索视频');
        expect(wrapper.text()).toContain('2 条结果');
        expect(wrapper.find('.tool-call-expand-icon').exists()).toBe(true);
        expect(wrapper.find('.tool-call-results-wrapper').classes()).not.toContain(
            'expanded'
        );

        await wrapper.find('.tool-call-header').trigger('click');

        expect(wrapper.find('.tool-call-results-wrapper').classes()).toContain(
            'expanded'
        );
        expect(wrapper.text()).toContain('08 最近更新 1');
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

    it('counts the visible Google result rows instead of the raw provider count', async () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [truncatedSearchGoogleCall],
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
        expect(wrapper.text()).not.toContain('6 条结果');

        await wrapper.find('.tool-call-header').trigger('click');

        const sources = wrapper.findAll('.tool-google-result-source');
        expect(sources[0]?.text()).toBe('shanghai.gov.cn');
        expect(sources[1]?.text()).toBe('zh.wikipedia.org');
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

        expect(wrapper.text()).toContain('综合');
        expect(wrapper.text()).toContain('名字匹配');
        expect(wrapper.text()).toContain('主题发现');
        expect(wrapper.text()).not.toContain('全局相关作者');
        expect(wrapper.text()).not.toContain('旧版重复来源');
        const ownerCards = wrapper.findAll('.tool-owner-result');
        expect(ownerCards).toHaveLength(4);
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

    it('renders video comments as a collapsible tree with JSON download', async () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [videoCommentsCall],
            },
            global: {
                stubs: {
                    'q-btn': {
                        props: ['label', 'icon'],
                        emits: ['click'],
                        template: '<button @click="$emit(\'click\', $event)">{{ icon }} {{ label }}</button>',
                    },
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });

        expect(wrapper.text()).toContain('完整评论');
        expect(wrapper.text()).toContain('3 条评论');
        expect(wrapper.find('.tool-call-status-completed').text()).toContain(
            '3 条评论'
        );

        await wrapper.find('.tool-call-header').trigger('click');

        expect(wrapper.find('.tool-comments-visual').exists()).toBe(true);
        expect(wrapper.find('.tool-comments-toolbar-meta').exists()).toBe(false);
        expect(wrapper.find('.tool-comments-video-header').text()).toContain(
            '评论测试视频'
        );
        expect(wrapper.find('.tool-comments-video-header').text()).toContain(
            '测试UP主'
        );
        expect(wrapper.find('.tool-comments-video-header').text()).not.toContain(
            'BV1comments'
        );
        expect(wrapper.text()).toContain('根评论作者');
        expect(wrapper.text()).not.toContain('根评论作者 · 1');
        expect(wrapper.text()).toContain('一级评论内容');
        expect(wrapper.text()).toContain('回复作者');
        expect(wrapper.text()).toContain('回复一级评论');
        expect(wrapper.text()).not.toContain('回复楼中楼');
        await wrapper.find('.tool-comment-replies-toggle').trigger('click');
        expect(wrapper.text()).toContain('回复作者');
        expect(wrapper.text()).toContain('回复一级评论');
        expect(wrapper.text()).toContain('回复楼中楼');
        expect(wrapper.text()).not.toContain('回复 @根评论作者');
        expect(wrapper.text()).not.toContain('回复 @回复作者');
        expect(wrapper.text()).toContain('05-17 14:40');
        expect(wrapper.text()).not.toContain('2026-05-17 14:40:00');
        expect(wrapper.text()).toContain('88');
        expect(wrapper.text()).toContain('7');
        expect(wrapper.text()).toContain('置顶');
        expect(wrapper.text()).toContain('热门');
        expect(wrapper.findAll('.tool-comment-like')).toHaveLength(2);
        expect(
            wrapper.findAll('.tool-comment-like').some((node) => /\b0\b/.test(node.text()))
        ).toBe(false);
        expect(wrapper.find('.tool-comment-author-tag').exists()).toBe(true);
        expect(wrapper.text()).toContain('层主');
        expect(wrapper.text()).toContain('视频作者');
        const authorLinks = wrapper.findAll('.tool-comment-author');
        expect(authorLinks[0]?.attributes('href')).toBe(
            'https://space.bilibili.com/1'
        );
        const thumbnails = wrapper.findAll('.tool-comment-image-thumb img');
        expect(thumbnails).toHaveLength(3);
        expect(thumbnails[0]?.attributes('src')).toContain(
            'i0.hdslb.com/bfs/new_dyn/root.jpg'
        );
        expect(thumbnails[0]?.attributes('src')).not.toContain(
            'web-space-upload-video'
        );
        await thumbnails[0]?.trigger('error');
        expect(thumbnails[0]?.attributes('src')).toContain(
            '/bili-img/i0.hdslb.com/bfs/new_dyn/root.jpg'
        );
        expect(wrapper.find('.tool-comments-sort span').exists()).toBe(false);
        const replyWords = wrapper.findAll('.tool-comment-reply-word');
        expect(replyWords.map((node) => node.text())).toEqual(
            expect.arrayContaining(['评论', '回复'])
        );

        await wrapper.find('.tool-comment-image-thumb').trigger('click');

        expect(wrapper.find('.tool-comment-image-overlay').exists()).toBe(true);
        expect(wrapper.find('.tool-comment-image-overlay').text()).toContain('1 / 3');
        expect(wrapper.find('.tool-comment-image-overlay').text()).toContain('本评论 1 / 2');
        expect(wrapper.find('.tool-comment-image-frame img').attributes('src')).toContain(
            'i0.hdslb.com/bfs/new_dyn/root.jpg'
        );
        expect(wrapper.find('.tool-comment-image-frame img').attributes('src')).not.toMatch(
            /^blob:/
        );
        await nextTick();
        expect(document.body.style.overflow).toBe('hidden');
        await wrapper.find('.tool-comment-image-zoom-in').trigger('click');
        expect(
            wrapper.find('.tool-comment-image-scale-select').element
        ).toHaveProperty('value', '1.1');
        expect(
            wrapper.find('.tool-comment-image-frame--zoomed').exists()
        ).toBe(true);
        await wrapper.find('.tool-comment-image-nav--next').trigger('click');
        expect(wrapper.find('.tool-comment-image-overlay').text()).toContain('2 / 3');
        expect(wrapper.find('.tool-comment-image-overlay').text()).toContain('本评论 2 / 2');
        expect(
            wrapper.find('.tool-comment-image-scale-select').element
        ).toHaveProperty('value', '1');
        expect(
            wrapper.find('.tool-comment-image-frame--zoomed').exists()
        ).toBe(false);
        await wrapper.find('.tool-comment-image-close').trigger('click');
        expect(wrapper.find('.tool-comment-image-overlay').exists()).toBe(false);
        expect(document.body.style.overflow).toBe('');

        const commentReplyWord = wrapper
            .findAll('.tool-comment-reply-word')
            .find((node) => node.text() === '评论');
        await commentReplyWord?.trigger('click');

        expect(wrapper.find('.tool-comment-reference').exists()).toBe(true);
        expect(wrapper.find('.tool-comment-reference').text()).toContain(
            '一级评论内容'
        );
        const originalScrollTo = HTMLElement.prototype.scrollTo;
        HTMLElement.prototype.scrollTo =
            vi.fn() as unknown as typeof HTMLElement.prototype.scrollTo;
        await wrapper.find('.tool-comment-reference .tool-comment-jump-button').trigger('click');
        await nextTick();
        expect(wrapper.find('.tool-comment-root.tool-comment--highlighted').exists()).toBe(
            false
        );
        expect(wrapper.find('.tool-comment-row.tool-comment--highlighted').exists()).toBe(
            true
        );
        if (originalScrollTo) {
            HTMLElement.prototype.scrollTo = originalScrollTo;
        } else {
            delete (HTMLElement.prototype as unknown as { scrollTo?: unknown }).scrollTo;
        }

        await wrapper.findAll('.tool-comments-chip')[0]?.trigger('click');
        expect(wrapper.text()).not.toContain('回复楼中楼');
        await wrapper.findAll('.tool-comments-chip')[0]?.trigger('click');

        await wrapper
            .findAll('button')
            .find((button) => button.text().includes('折叠楼层'))
            ?.trigger('click');
        expect(wrapper.text()).toContain('展开 2 条回复');
        expect(wrapper.text()).not.toContain('最高赞 7');

        expect(wrapper.find('.tool-comment-reply-list--preview').exists()).toBe(true);
        expect(wrapper.text()).toContain('回复一级评论');
        expect(wrapper.text()).not.toContain('回复楼中楼');
        const expandButton = wrapper
            .findAll('button')
            .find((button) => button.text().includes('展开 2 条回复'));
        await expandButton?.trigger('click');
        await nextTick();
        expect(wrapper.find('.tool-comment-reply-list').exists()).toBe(true);

        await expandButton?.trigger('click');
        await nextTick();
        expect(wrapper.find('.tool-comment-reply-list--preview').exists()).toBe(true);
        await wrapper
            .find('.tool-comment-replies-actions .tool-comments-chip')
            .trigger('click');
        await nextTick();
        expect(wrapper.find('.tool-comment-reply-list').exists()).toBe(true);
        expect(wrapper.find('.tool-comments-sort--small').exists()).toBe(true);

        const createObjectURL = vi.fn(() => 'blob:comments');
        const revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
        const anchorClick = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => undefined);

        await wrapper.find('.tool-comments-download-json').trigger('click');

        expect(wrapper.find('.tool-comments-visual').exists()).toBe(true);
        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(anchorClick).toHaveBeenCalledTimes(1);
        anchorClick.mockRestore();
    });

    it('advances stored comment pages when a load-more page only contains duplicates', async () => {
        const pageComment = (rpid: number, message: string) => ({
            rpid,
            ctime: 1779000000 + rpid,
            parent: 0,
            root: 0,
            root_rpid: rpid,
            is_root: true,
            depth: 1,
            member: { mid: rpid, uname: `作者${rpid}` },
            content: { message },
            like: 0,
        });
        const loadMoreCall: ToolCall = {
            type: 'video_comments_full',
            args: { bvid: 'BVloadmore', mode: 'full', limit: 2 },
            status: 'completed',
            result: {
                status: 'ok',
                items: [
                    {
                        bvid: 'BVloadmore',
                        title: '分页测试视频',
                        owner: { mid: 1, name: '测试UP主' },
                        mode: 'full',
                        summary: { comment_count: 5, estimated_total: 5 },
                        pagination: {
                            pn: 1,
                            ps: 2,
                            returned: 2,
                            loaded: 2,
                            has_more_stored: true,
                            next_pn: 2,
                        },
                        comments: [
                            pageComment(1, '第一页第一条'),
                            pageComment(2, '第一页第二条'),
                        ],
                    },
                ],
            },
        };
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    running: [],
                    items: [
                        {
                            bvid: 'BVloadmore',
                            mode: 'full',
                            summary: { comment_count: 5, estimated_total: 5 },
                            pagination: {
                                pn: 2,
                                ps: 2,
                                returned: 2,
                                loaded: 4,
                                has_more_stored: true,
                                next_pn: 3,
                            },
                            comments: [
                                pageComment(1, '第一页第一条'),
                                pageComment(2, '第一页第二条'),
                            ],
                        },
                    ],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    running: [],
                    items: [
                        {
                            bvid: 'BVloadmore',
                            mode: 'full',
                            summary: { comment_count: 5, estimated_total: 5 },
                            pagination: {
                                pn: 3,
                                ps: 2,
                                returned: 1,
                                loaded: 5,
                                has_more_stored: false,
                                next_pn: 4,
                            },
                            comments: [pageComment(3, '第三页新增评论')],
                        },
                    ],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    running: [],
                    items: [
                        {
                            bvid: 'BVloadmore',
                            mode: 'full',
                            summary: { comment_count: 5, estimated_total: 5 },
                            pagination: {
                                pn: 1,
                                ps: 2,
                                returned: 2,
                                loaded: 2,
                                has_more_stored: true,
                                next_pn: 2,
                            },
                            comments: [pageComment(4, '回扫新增评论')],
                        },
                    ],
                }),
            });
        vi.stubGlobal('fetch', fetchMock);

        const wrapper = mount(ToolCallDisplay, {
            props: { toolCalls: [loadMoreCall] },
            global: {
                stubs: {
                    'q-btn': true,
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });

        await wrapper.find('.tool-call-header').trigger('click');
        await wrapper.find('.tool-comments-load-more-button').trigger('click');
        await new Promise((resolve) => setTimeout(resolve, 0));
        await nextTick();

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls.map((call) => JSON.parse(call[1]?.body as string).pn)).toEqual([
            2,
            3,
            1,
        ]);
        expect(wrapper.text()).toContain('第三页新增评论');
        expect(wrapper.text()).toContain('回扫新增评论');
    });

    it('keeps loading stored comment pages until one requested window is filled', async () => {
        const pageComment = (rpid: number, message: string) => ({
            rpid,
            ctime: 1779000000 + rpid,
            parent: 0,
            root: 0,
            root_rpid: rpid,
            is_root: true,
            depth: 1,
            member: { mid: rpid, uname: `作者${rpid}` },
            content: { message },
            like: 0,
        });
        const loadMoreCall: ToolCall = {
            type: 'video_comments_full',
            args: { bvid: 'BVwindowfill', mode: 'full', limit: 4 },
            status: 'completed',
            result: {
                status: 'ok',
                items: [
                    {
                        bvid: 'BVwindowfill',
                        title: '窗口补齐测试视频',
                        owner: { mid: 1, name: '测试UP主' },
                        mode: 'full',
                        summary: { comment_count: 12, estimated_total: 12 },
                        pagination: {
                            pn: 1,
                            ps: 4,
                            returned: 4,
                            loaded: 4,
                            has_more_stored: true,
                            next_pn: 2,
                        },
                        comments: [1, 2, 3, 4].map((rpid) =>
                            pageComment(rpid, `已加载评论${rpid}`)
                        ),
                    },
                ],
            },
        };
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    running: [],
                    items: [
                        {
                            bvid: 'BVwindowfill',
                            mode: 'full',
                            summary: { comment_count: 12, estimated_total: 12 },
                            pagination: {
                                pn: 2,
                                ps: 4,
                                returned: 4,
                                loaded: 8,
                                has_more_stored: true,
                                next_pn: 3,
                            },
                            comments: [
                                pageComment(1, '已加载评论1'),
                                pageComment(2, '已加载评论2'),
                                pageComment(3, '已加载评论3'),
                                pageComment(5, '第二页少量新增评论5'),
                            ],
                        },
                    ],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    running: [],
                    items: [
                        {
                            bvid: 'BVwindowfill',
                            mode: 'full',
                            summary: { comment_count: 12, estimated_total: 12 },
                            pagination: {
                                pn: 3,
                                ps: 4,
                                returned: 4,
                                loaded: 12,
                                has_more_stored: false,
                                next_pn: 4,
                            },
                            comments: [6, 7, 8, 9].map((rpid) =>
                                pageComment(rpid, `第三页新增评论${rpid}`)
                            ),
                        },
                    ],
                }),
            });
        vi.stubGlobal('fetch', fetchMock);

        const wrapper = mount(ToolCallDisplay, {
            props: { toolCalls: [loadMoreCall] },
            global: {
                stubs: {
                    'q-btn': true,
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });

        await wrapper.find('.tool-call-header').trigger('click');
        await wrapper.find('.tool-comments-load-more-button').trigger('click');
        await new Promise((resolve) => setTimeout(resolve, 0));
        await nextTick();

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls.map((call) => JSON.parse(call[1]?.body as string).pn)).toEqual([
            2,
            3,
        ]);
        expect(wrapper.text()).toContain('第二页少量新增评论5');
        expect(wrapper.text()).toContain('第三页新增评论9');
    });

    it('backfills missing stored comment pages when cached pagination is ahead of loaded comments', async () => {
        const pageComment = (rpid: number, message: string) => ({
            rpid,
            ctime: 1779000000 + rpid,
            parent: 0,
            root: 0,
            root_rpid: rpid,
            is_root: true,
            depth: 1,
            member: { mid: rpid, uname: `作者${rpid}` },
            content: { message },
            like: 0,
        });
        const staleCursorCall: ToolCall = {
            type: 'video_comments_full',
            args: { bvid: 'BVstalecursor', mode: 'full', limit: 2 },
            status: 'completed',
            result: {
                status: 'ok',
                items: [
                    {
                        bvid: 'BVstalecursor',
                        title: '缺页缓存测试',
                        owner: { mid: 1, name: '测试UP主' },
                        mode: 'full',
                        summary: { comment_count: 6, estimated_total: 8 },
                        pagination: {
                            pn: 4,
                            ps: 2,
                            returned: 1,
                            loaded: 5,
                            has_more_stored: true,
                            next_pn: 5,
                        },
                        comments: [1, 2, 3, 4, 5].map((rpid) =>
                            pageComment(rpid, `已加载评论${rpid}`)
                        ),
                    },
                ],
            },
        };
        const fetchMock = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                running: [],
                items: [
                    {
                        bvid: 'BVstalecursor',
                        mode: 'full',
                        summary: { comment_count: 6, estimated_total: 8 },
                        pagination: {
                            pn: 3,
                            ps: 2,
                            returned: 2,
                            loaded: 6,
                            has_more_stored: true,
                            next_pn: 4,
                        },
                        comments: [
                            pageComment(5, '已加载评论5'),
                            pageComment(6, '补齐缺失评论6'),
                        ],
                    },
                ],
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const wrapper = mount(ToolCallDisplay, {
            props: { toolCalls: [staleCursorCall] },
            global: {
                stubs: {
                    'q-btn': true,
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });

        await wrapper.find('.tool-call-header').trigger('click');
        await wrapper.find('.tool-comments-load-more-button').trigger('click');
        await new Promise((resolve) => setTimeout(resolve, 0));
        await nextTick();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string).pn).toBe(3);
        expect(wrapper.text()).toContain('补齐缺失评论6');
    });

    it('rescans earlier stored pages when running comment sync shifts page boundaries', async () => {
        const pageComment = (rpid: number, message: string) => ({
            rpid,
            ctime: 1779000000 + rpid,
            parent: 0,
            root: 0,
            root_rpid: rpid,
            is_root: true,
            depth: 1,
            member: { mid: rpid, uname: `作者${rpid}` },
            content: { message },
            like: 0,
        });
        const driftingCall: ToolCall = {
            type: 'video_comments_full',
            args: { bvid: 'BVdrifting', mode: 'full', limit: 2 },
            status: 'completed',
            result: {
                status: 'partial',
                running: ['BVdrifting'],
                items: [
                    {
                        bvid: 'BVdrifting',
                        title: '动态分页漂移测试',
                        owner: { mid: 1, name: '测试UP主' },
                        mode: 'full',
                        status: 'running',
                        refresh_status: 'running',
                        summary: {
                            stored_count: 3,
                            estimated_total: 5,
                            is_complete: false,
                        },
                        pagination: {
                            pn: 2,
                            ps: 2,
                            returned: 1,
                            loaded: 3,
                            has_more_stored: true,
                            next_pn: 3,
                        },
                        comments: [
                            pageComment(1, '已有评论1'),
                            pageComment(2, '已有评论2'),
                            pageComment(3, '已有评论3'),
                        ],
                    },
                ],
            },
        };
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    running: ['BVdrifting'],
                    items: [
                        {
                            bvid: 'BVdrifting',
                            mode: 'full',
                            status: 'running',
                            refresh_status: 'running',
                            summary: {
                                stored_count: 5,
                                estimated_total: 5,
                                is_complete: false,
                            },
                            pagination: {
                                pn: 2,
                                ps: 2,
                                returned: 2,
                                loaded: 4,
                                has_more_stored: true,
                                next_pn: 3,
                            },
                            comments: [
                                pageComment(2, '已有评论2'),
                                pageComment(3, '已有评论3'),
                            ],
                        },
                    ],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    running: ['BVdrifting'],
                    items: [
                        {
                            bvid: 'BVdrifting',
                            mode: 'full',
                            status: 'running',
                            refresh_status: 'running',
                            summary: {
                                stored_count: 5,
                                estimated_total: 5,
                                is_complete: false,
                            },
                            pagination: {
                                pn: 3,
                                ps: 2,
                                returned: 0,
                                loaded: 4,
                                has_more_stored: true,
                                next_pn: 4,
                            },
                            comments: [],
                        },
                    ],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    running: ['BVdrifting'],
                    items: [
                        {
                            bvid: 'BVdrifting',
                            mode: 'full',
                            status: 'running',
                            refresh_status: 'running',
                            summary: {
                                stored_count: 5,
                                estimated_total: 5,
                                is_complete: false,
                            },
                            pagination: {
                                pn: 1,
                                ps: 2,
                                returned: 2,
                                loaded: 2,
                                has_more_stored: true,
                                next_pn: 2,
                            },
                            comments: [
                                pageComment(4, '新插入热评4'),
                                pageComment(5, '新插入热评5'),
                            ],
                        },
                    ],
                }),
            });
        vi.stubGlobal('fetch', fetchMock);

        const wrapper = mount(ToolCallDisplay, {
            props: { toolCalls: [driftingCall] },
            global: {
                stubs: {
                    'q-btn': true,
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });

        await wrapper.find('.tool-call-header').trigger('click');
        await wrapper.find('.tool-comments-load-more-button').trigger('click');
        await new Promise((resolve) => setTimeout(resolve, 0));
        await nextTick();

        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls.map((call) => JSON.parse(call[1]?.body as string).pn)).toEqual([
            2,
            3,
            1,
        ]);
        expect(wrapper.text()).toContain('新插入热评4');
        expect(wrapper.text()).toContain('新插入热评5');
    });

    it('clears stale running flags so incomplete comments can be force-resynced', async () => {
        const pageComment = (rpid: number, message: string) => ({
            rpid,
            ctime: 1779000000 + rpid,
            parent: 0,
            root: 0,
            root_rpid: rpid,
            is_root: true,
            depth: 1,
            member: { mid: rpid, uname: `作者${rpid}` },
            content: { message },
            like: 0,
        });
        const staleRunningCall: ToolCall = {
            type: 'video_comments_full',
            args: { bvid: 'BVstalerunning', mode: 'full', limit: 2 },
            status: 'completed',
            result: {
                status: 'partial',
                running: ['BVstalerunning'],
                items: [
                    {
                        bvid: 'BVstalerunning',
                        title: '过期 running 测试',
                        owner: { mid: 1, name: '测试UP主' },
                        mode: 'full',
                        status: 'completed',
                        summary: {
                            stored_count: 3,
                            estimated_total: 5,
                            is_complete: false,
                        },
                        pagination: {
                            pn: 2,
                            ps: 2,
                            returned: 1,
                            loaded: 3,
                            has_more_stored: false,
                            next_pn: 3,
                        },
                        comments: [1, 2, 3].map((rpid) =>
                            pageComment(rpid, `已有评论${rpid}`)
                        ),
                    },
                ],
            },
        };
        const responseItem = {
            bvid: 'BVstalerunning',
            mode: 'full',
            status: 'completed',
            summary: {
                stored_count: 3,
                estimated_total: 5,
                is_complete: false,
            },
            pagination: {
                pn: 1,
                ps: 2,
                returned: 2,
                loaded: 3,
                has_more_stored: false,
                next_pn: 2,
            },
            comments: [1, 2, 3].map((rpid) =>
                pageComment(rpid, `已有评论${rpid}`)
            ),
        };
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'ok',
                    running: [],
                    scheduled: [],
                    items: [responseItem],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'partial',
                    running: ['BVstalerunning'],
                    scheduled: ['BVstalerunning'],
                    items: [
                        {
                            ...responseItem,
                            status: 'running',
                            refresh_status: 'running',
                        },
                    ],
                }),
            });
        vi.stubGlobal('fetch', fetchMock);

        const wrapper = mount(ToolCallDisplay, {
            props: { toolCalls: [staleRunningCall] },
            global: {
                stubs: {
                    'q-btn': true,
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });

        await wrapper.find('.tool-call-header').trigger('click');
        await wrapper.find('.tool-comments-load-more-button').trigger('click');
        await new Promise((resolve) => setTimeout(resolve, 0));
        await nextTick();
        await wrapper.find('.tool-comments-load-more-button').trigger('click');
        await new Promise((resolve) => setTimeout(resolve, 0));
        await nextTick();

        const requestBodies = fetchMock.mock.calls.map((call) =>
            JSON.parse(call[1]?.body as string)
        );
        expect(requestBodies[0]?.force).toBe(false);
        expect(requestBodies[1]?.force).toBe(true);
    });

    it('shows running cold-cache comments as syncing instead of empty', async () => {
        const coldCall: ToolCall = {
            type: 'video_comments_full',
            args: { bvid: 'BV1cold', mode: 'full', limit: 1000 },
            status: 'completed',
            result: {
                status: 'partial',
                items: [
                    {
                        bvid: 'BV1cold',
                        title: '冷缓存视频',
                        owner: { mid: 1, name: '测试UP主' },
                        mode: 'full',
                        status: 'running',
                        summary: { stored_count: 0, estimated_total: 120 },
                        pagination: { returned: 0, loaded: 0, limit: 1000 },
                        comments: [],
                    },
                ],
                scheduled: ['BV1cold'],
                running: ['BV1cold'],
            },
        };
        const wrapper = mount(ToolCallDisplay, {
            props: { toolCalls: [coldCall], forceExpanded: true },
            global: {
                stubs: {
                    'q-btn': true,
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });

        expect(wrapper.text()).toContain('后台同步中，正在加载首批评论');
        expect(wrapper.text()).not.toContain('当前没有可展示的评论');
        expect(wrapper.find('.tool-comments-toolbar-meta').exists()).toBe(false);
        wrapper.unmount();
    });

    it('uses loaded over total comment counts and collapses very long comments', async () => {
        const longMessage = `${Array.from({ length: 12 }, (_, idx) => `第${idx + 1}行`).join('\n')}`;
        const largeCall: ToolCall = {
            ...videoCommentsCall,
            result: {
                ...(videoCommentsCall.result as Record<string, unknown>),
                items: [
                    {
                        ...((videoCommentsCall.result as { items: Record<string, unknown>[] })
                            .items[0] || {}),
                        summary: {
                            stored_count: 3443,
                            estimated_total: 3456,
                            root_count: 1155,
                            reply_count: 2288,
                        },
                        pagination: {
                            returned: 1000,
                            loaded: 1000,
                            limit: 1000,
                            has_more_stored: true,
                        },
                        comments: [
                            {
                                rpid: 900,
                                ctime: 1779000000,
                                parent: 0,
                                root: 0,
                                root_rpid: 900,
                                is_root: true,
                                depth: 1,
                                member: { mid: 3, uname: '长评论作者' },
                                content: { message: longMessage },
                                like: 0,
                            },
                        ],
                    },
                ],
            },
        };
        const wrapper = mount(ToolCallDisplay, {
            props: { toolCalls: [largeCall] },
            global: {
                stubs: {
                    'q-btn': true,
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });

        expect(wrapper.find('.tool-call-status-completed').text()).toContain(
            '1000/3456 条评论'
        );
        await wrapper.find('.tool-call-header').trigger('click');
        expect(wrapper.find('.tool-comments-video-meta').text()).toContain(
            '加载 1000 / 存储 3443 / 总计 3456'
        );
        expect(wrapper.text()).toContain('查看全文');
        expect(wrapper.text()).not.toContain('点击查看全文');
        expect(wrapper.text()).toContain('第8行');
        expect(wrapper.text()).not.toContain('第12行');
        await wrapper.find('.tool-comment-read-more').trigger('click');
        expect(wrapper.text()).toContain('第12行');
    });

    it('uses a hybrid heat and recency score for default comment sorting', async () => {
        const hybridCall: ToolCall = {
            type: 'video_comments_full',
            args: { bvid: 'BV1hybrid', mode: 'full', limit: 1000 },
            status: 'completed',
            result: {
                status: 'ok',
                items: [
                    {
                        bvid: 'BV1hybrid',
                        title: '混合排序测试',
                        owner: { mid: 1, name: '测试UP主' },
                        mode: 'full',
                        summary: { comment_count: 4 },
                        pagination: { returned: 4, loaded: 4, limit: 1000 },
                        comments: [
                            {
                                rpid: 4,
                                ctime: 500,
                                parent: 0,
                                root: 0,
                                root_rpid: 4,
                                is_root: true,
                                depth: 1,
                                member: { mid: 14, uname: '置顶低赞' },
                                content: { message: '置顶内容' },
                                like: 0,
                                is_top: true,
                            },
                            {
                                rpid: 1,
                                ctime: 1000,
                                parent: 0,
                                root: 0,
                                root_rpid: 1,
                                is_root: true,
                                depth: 1,
                                member: { mid: 11, uname: '旧低赞' },
                                content: { message: '旧低赞内容' },
                                like: 0,
                            },
                            {
                                rpid: 2,
                                ctime: 2000,
                                parent: 0,
                                root: 0,
                                root_rpid: 2,
                                is_root: true,
                                depth: 1,
                                member: { mid: 12, uname: '较久热评' },
                                content: { message: '较久热评内容' },
                                like: 40,
                            },
                            {
                                rpid: 3,
                                ctime: 3000,
                                parent: 0,
                                root: 0,
                                root_rpid: 3,
                                is_root: true,
                                depth: 1,
                                member: { mid: 13, uname: '最新低赞' },
                                content: { message: '最新低赞内容' },
                                like: 1,
                            },
                        ],
                    },
                ],
            },
        };
        const wrapper = mount(ToolCallDisplay, {
            props: { toolCalls: [hybridCall], forceExpanded: true },
            global: {
                stubs: {
                    'q-btn': true,
                    'q-icon': true,
                    'q-spinner-dots': true,
                },
            },
        });

        const contents = wrapper
            .findAll('.tool-comment-content')
            .map((node) => node.text());
        expect(contents).toEqual([
            '置顶内容',
            '较久热评内容',
            '最新低赞内容',
            '旧低赞内容',
        ]);
    });

    it('renders transcript results with full text', async () => {
        const transcriptResult = transcriptCall.result as {
            transcript: Record<string, unknown>;
        };
        const fullTranscriptCall = {
            ...transcriptCall,
            result: {
                ...(transcriptCall.result as Record<string, unknown>),
                transcript: {
                    ...transcriptResult.transcript,
                    text: `${'完整转写内容。'.repeat(40)}最后一句保留。`,
                },
            },
        };
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [fullTranscriptCall],
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

        expect(wrapper.text()).toContain('最后一句保留。');
        expect(wrapper.find('.tool-text-result-meta').exists()).toBe(false);
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

        expect(wrapper.text()).toContain('小模型');
        expect(wrapper.text()).toContain('生成中...');
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

        expect(wrapper.text()).toContain('小模型');
        expect(wrapper.text()).toContain('生成中...');
        expect(wrapper.text()).toContain('小模型已开始处理，等待首批内容...');
        expect(wrapper.find('.tool-text-result').exists()).toBe(true);
    });

    it('renders summarize_transcript output as restrained markdown instead of pre text', () => {
        const wrapper = mount(ToolCallDisplay, {
            props: {
                toolCalls: [summarizeCall],
                forceExpanded: true,
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

        expect(wrapper.text()).toContain('视频总结');
        expect(wrapper.text()).toContain('总结中...');
        expect(wrapper.find('.tool-markdown-result').exists()).toBe(true);
        expect(wrapper.find('pre.tool-text-result').exists()).toBe(false);
        expect(wrapper.find('.tool-markdown-result h2').text()).toBe('视频总结');
        expect(wrapper.findAll('.tool-markdown-result li')).toHaveLength(2);
        expect(wrapper.find('.tool-markdown-result a').attributes('href')).toBe(
            'https://www.bilibili.com/video/BV1YXZPB1Erc'
        );
        expect(wrapper.find('.tool-text-result--small-task-streaming').exists()).toBe(
            true
        );
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
