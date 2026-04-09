// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import ChatResponsePanel from 'src/components/ChatResponsePanel.vue';
import { BiliApiClient } from 'src/stores/account/apiClient';
import { renderMarkdown } from 'src/utils/markdown';
import {
    hasRenderableRichLinks,
    renderAnswerMarkdownWithVideoView,
} from 'src/utils/chatVideoLinkView';

const {
    mockChatStore,
    mockExploreStore,
    mockLayoutStore,
    mockSearchModeStore,
} = vi.hoisted(() => ({
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
            query: '',
        },
        currentSessionId: 'session-video-layout',
        content: '',
        thinkingContent: '',
        streamSegments: [],
        historyMessages: [],
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

const mountPanel = async (content: string) => {
    mockChatStore.content = content;

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

const makeVideoSearchEvent = (...bvids: string[]) => ({
    calls: [
        {
            type: 'search_videos',
            args: { query: 'video layout test' },
            result: {
                hits: bvids.map((bvid, index) => ({
                    bvid,
                    title: `视频 ${index + 1}`,
                    pic: `https://example.com/${bvid}.jpg`,
                    duration: 360 + index * 10,
                    owner: { name: `作者 ${index + 1}` },
                    stat: { view: 10000 + index * 500 },
                })),
            },
        },
    ],
});

const makeOwnerSearchEvent = (...owners: Array<Record<string, unknown>>) => ({
    calls: [
        {
            type: 'search_owners',
            args: { text: '红警', mode: 'topic' },
            result: {
                text: '红警',
                total_owners: owners.length,
                owners,
            },
        },
    ],
});

describe('ChatResponsePanel video layout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        vi.spyOn(BiliApiClient, 'fetchMidCard').mockResolvedValue(null);
        mockChatStore.isLoading = false;
        mockChatStore.hasContent = true;
        mockChatStore.hasThinkingContent = false;
        mockChatStore.isThinkingPhase = false;
        mockChatStore.isDone = true;
        mockChatStore.isAborted = false;
        mockChatStore.hasError = false;
        mockChatStore.toolEvents = [
            makeVideoSearchEvent('BV1AA411c7mD', 'BV1BB411c7mE', 'BV1CC411c7mF'),
        ];
        mockChatStore.currentSessionId = 'session-video-layout';
        mockChatStore.currentSession.query = '';
        mockChatStore.historyMessages = [];
    });

    it('groups sibling video list items into one compact gallery without inline text links', async () => {
        const wrapper = await mountPanel(
            '- [主视频](BV1AA411c7mD) - 第一条解释。\n- [补充视频](BV1BB411c7mE) - 第二条解释。'
        );

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'compact'
        );
        await nextTick();

        const gallery = wrapper.find('.bili-video-compact-gallery');
        expect(gallery.exists()).toBe(true);
        expect(wrapper.findAll('.bili-video-compact-gallery')).toHaveLength(1);
        expect(wrapper.findAll('.bili-video-compact-entry')).toHaveLength(2);
        expect(gallery.findAll('a.bili-video-compact-ref')).toHaveLength(2);
        expect(wrapper.findAll('a.bili-video-inline-ref')).toHaveLength(0);
        expect(wrapper.findAll('.bili-video-compact-note-block')).toHaveLength(2);
        expect(wrapper.text()).toContain('第一条解释');
        expect(wrapper.text()).toContain('第二条解释');
    });

    it('renders paragraph explanations as a standalone compact gallery block', async () => {
        const wrapper = await mountPanel(
            '推荐顺序：[视频甲](BV1AA411c7mD) 与 [视频乙](BV1BB411c7mE) 适合先看，另外 [视频丙](BV1CC411c7mF) 可作为补充。'
        );

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'compact'
        );
        await nextTick();

        expect(wrapper.findAll('.bili-video-compact-gallery')).toHaveLength(1);
        expect(wrapper.findAll('.bili-video-compact-gallery--standalone')).toHaveLength(1);
        expect(wrapper.findAll('.bili-video-compact-entry')).toHaveLength(3);
        expect(wrapper.findAll('a.bili-video-compact-ref')).toHaveLength(3);
        expect(wrapper.findAll('a.bili-video-inline-ref')).toHaveLength(0);

        const note = wrapper.find('.bili-video-compact-note-block');
        expect(note.exists()).toBe(true);
        expect(note.text()).toContain('视频甲');
        expect(note.text()).toContain('视频乙');
        expect(note.text()).toContain('视频丙');
        expect(note.text()).toContain('适合先看');
    });

    it('keeps compact cards continuous when prose splits links in the same paragraph', async () => {
        const wrapper = await mountPanel(
            '先看 [主视频](BV1AA411c7mD) 的开头，读完这一句后再看 [补充视频](BV1BB411c7mE)，最后用 [总结视频](BV1CC411c7mF) 收尾。'
        );

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'compact'
        );
        await nextTick();

        expect(wrapper.findAll('.bili-video-compact-gallery')).toHaveLength(1);

        const compactBlock = wrapper.find('.bili-video-compact-gallery');
        expect(compactBlock.findAll('a.bili-video-compact-ref')).toHaveLength(3);
        expect(wrapper.findAll('.bili-video-compact-entry')).toHaveLength(3);

        const note = wrapper.find('.bili-video-compact-note-block');
        expect(note.text()).toContain('主视频');
        expect(note.text()).toContain('补充视频');
        expect(note.text()).toContain('总结视频');
        expect(note.text()).toContain('读完这一句后再看');
    });

    it('suppresses list bullets in card view while preserving surrounding prose', async () => {
        const wrapper = await mountPanel(
            '- 重点参考 [主视频](BV1AA411c7mD) 的前半部分，再结合后面的总结。'
        );

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'card'
        );
        await nextTick();

        expect(wrapper.find('li.bili-video-rich-item').exists()).toBe(true);
        expect(wrapper.find('a.bili-video-card-ref').exists()).toBe(true);

        const preservedText = wrapper
            .findAll('.bili-video-rich-text')
            .map((node) => node.text())
            .join(' ');

        expect(preservedText).toContain('重点参考');
        expect(preservedText).toContain('后面的总结');
    });

    it('caps single compact cards when only one link resolves to a real video', async () => {
        mockChatStore.toolEvents = [makeVideoSearchEvent('BV1c1PfzaEsD')];

        const wrapper = await mountPanel(
            '- [真实视频](BV1c1PfzaEsD) (官方音乐，13天前发布)\n- [幻觉视频](BV1LxYxJpE7K) (活动预告，8天前发布)'
        );

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'compact'
        );
        await nextTick();

        expect(wrapper.findAll('.bili-video-compact-gallery')).toHaveLength(1);
        expect(wrapper.findAll('.bili-video-compact-entry')).toHaveLength(1);
        expect(wrapper.find('.bili-video-compact-entry--single').exists()).toBe(true);
        expect(wrapper.findAll('a.bili-video-compact-ref')).toHaveLength(1);

        const fallbackList = wrapper.find('.bili-video-compact-fallback-list');
        expect(fallbackList.exists()).toBe(true);
        expect(fallbackList.text()).toContain('幻觉视频');
    });

    it('keeps nested reaction lists as compact cards instead of fallback text blocks', async () => {
        mockChatStore.toolEvents = [
            makeVideoSearchEvent('BV1wxwsz8EXW', 'BV15LwdzqEQz', 'BV1t5wiziE2E'),
        ];

        const wrapper = await mountPanel(
            '- **桑桑1022** 的连续Reaction系列，正在更新94版《三国演义》：\n  - [reaction【三国演义03】](BV1wxwsz8EXW)\n  - [reaction【三国演义07】](BV15LwdzqEQz)\n- **拟态海星-v-** 的Reaction系列：\n  - [【三国演义reaction-34】](BV1t5wiziE2E)'
        );

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'compact'
        );
        await nextTick();

        const galleries = wrapper.findAll('.bili-video-compact-gallery');
        expect(galleries).toHaveLength(1);
        expect(wrapper.findAll('.bili-video-compact-entry')).toHaveLength(3);
        expect(wrapper.findAll('a.bili-video-compact-ref')).toHaveLength(3);
        expect(wrapper.find('.bili-video-compact-fallback-list').exists()).toBe(false);
        expect(wrapper.find('.bili-video-compact-note-block').exists()).toBe(true);

        const notes = wrapper
            .findAll('.bili-video-compact-note-block')
            .map((node) => node.text());
        expect(notes.join(' ')).toContain('桑桑1022');
        expect(notes.join(' ')).toContain('拟态海星-v-');
    });

    it('keeps every compact card at the same width for multi-card groups', async () => {
        mockChatStore.toolEvents = [
            makeVideoSearchEvent('BV1wxwsz8EXW', 'BV15LwdzqEQz', 'BV1t5wiziE2E', 'BV1nGckzuESu'),
        ];

        const wrapper = await mountPanel(
            '- **桑桑1022** 的连续Reaction系列，正在更新94版《三国演义》：\n  - [reaction【三国演义03】](BV1wxwsz8EXW)\n  - [reaction【三国演义07】](BV15LwdzqEQz)\n- [露出鸡脚！](BV1nGckzuESu)\n- **拟态海星-v-** 的Reaction系列：\n  - [【三国演义reaction-34】](BV1t5wiziE2E)'
        );

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'compact'
        );
        await nextTick();

        expect(wrapper.findAll('.bili-video-compact-entry')).toHaveLength(4);
        expect(wrapper.findAll('.bili-video-compact-entry-cards')).toHaveLength(4);
        expect(wrapper.findAll('.bili-video-compact-note-block')).toHaveLength(2);
        expect(wrapper.findAll('.bili-video-compact-entry-cards a.bili-video-compact-ref')).toHaveLength(4);
    });

    it('splits long compact video groups into sections of at most five cards', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '推荐：[视频1](BV1AA411c7mD) [视频2](BV1BB411c7mE) [视频3](BV1CC411c7mF) [视频4](BV1DD411c7mG) [视频5](BV1EE411c7mH) [视频6](BV1FF411c7mI)',
            'compact',
            new Map([
                ['BV1AA411c7mD', { bvid: 'BV1AA411c7mD', title: '视频1', pic: 'https://example.com/1.jpg', duration: 60, owner: { name: '作者1' }, stat: { view: 1 } }],
                ['BV1BB411c7mE', { bvid: 'BV1BB411c7mE', title: '视频2', pic: 'https://example.com/2.jpg', duration: 60, owner: { name: '作者2' }, stat: { view: 2 } }],
                ['BV1CC411c7mF', { bvid: 'BV1CC411c7mF', title: '视频3', pic: 'https://example.com/3.jpg', duration: 60, owner: { name: '作者3' }, stat: { view: 3 } }],
                ['BV1DD411c7mG', { bvid: 'BV1DD411c7mG', title: '视频4', pic: 'https://example.com/4.jpg', duration: 60, owner: { name: '作者4' }, stat: { view: 4 } }],
                ['BV1EE411c7mH', { bvid: 'BV1EE411c7mH', title: '视频5', pic: 'https://example.com/5.jpg', duration: 60, owner: { name: '作者5' }, stat: { view: 5 } }],
                ['BV1FF411c7mI', { bvid: 'BV1FF411c7mI', title: '视频6', pic: 'https://example.com/6.jpg', duration: 60, owner: { name: '作者6' }, stat: { view: 6 } }],
            ])
        );

        expect(html.match(/bili-video-compact-group-cards-section--video/g)?.length).toBe(2);
    });

    it('turns headings into ordered compact context blocks', async () => {
        mockChatStore.toolEvents = [makeVideoSearchEvent('BV1nGckzuESu')];

        const wrapper = await mountPanel(
            '## 历史解说\n\n推荐先看这条。\n\n- [露出鸡脚！](BV1nGckzuESu)'
        );

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'compact'
        );
        await nextTick();

        expect(wrapper.find('h2').exists()).toBe(false);
        expect(wrapper.find('.bili-video-compact-section').exists()).toBe(true);
        expect(wrapper.find('.bili-video-compact-context-block--heading').text()).toContain('历史解说');

        const contextText = wrapper
            .findAll('.bili-video-compact-context-block')
            .map((node) => node.text())
            .join(' ');

        expect(contextText).toContain('推荐先看这条');
    });

    it('keeps normal markdown output in compact mode when no video cards are produced', () => {
        const source = '普通段落一\n\n- 普通列表项';
        const compactHtml = renderAnswerMarkdownWithVideoView(
            source,
            'compact',
            new Map()
        );

        expect(compactHtml).toBe(renderMarkdown(source));
        expect(compactHtml.includes('bili-video-compact-context-block')).toBe(false);
        expect(compactHtml.includes('bili-video-compact-gallery')).toBe(false);
    });

    it('detects author space links as renderable rich links', () => {
        expect(hasRenderableRichLinks('作者主页：https://space.bilibili.com/946974')).toBe(true);
    });

    it('detects full bilibili video links as renderable rich links', () => {
        expect(
            hasRenderableRichLinks('推荐：https://www.bilibili.com/video/BV1AA411c7mD?p=2')
        ).toBe(true);
    });

    it('detects plain owner-name mentions as renderable rich links when owner results exist', () => {
        expect(
            hasRenderableRichLinks(
                '推荐关注影视飓风和飓多多StormCrew。',
                new Map([
                    ['946974', { mid: '946974', name: '影视飓风' }],
                    ['1780480185', { mid: '1780480185', name: '飓多多StormCrew' }],
                ])
            )
        ).toBe(true);
    });

    it('renders author space links as owner cards through the shared rich-link pipeline', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '推荐关注 https://space.bilibili.com/946974',
            'card',
            new Map(),
            new Map([
                [
                    '946974',
                    {
                        mid: '946974',
                        name: '影视飓风',
                        face: 'https://example.com/owner-face.jpg',
                        sign: '用影像记录世界',
                        fans: 2230000,
                        sample_title: '影视飓风年度混剪',
                        sample_pic: 'https://example.com/sample-cover.jpg',
                    },
                ],
            ])
        );

        expect(html).toContain('bili-owner-card-ref');
        expect(html).toContain('推荐关注 影视飓风');
        expect(html).toContain('bili-video-rich-cards--owner-trailing');
        expect(html).toContain('影视飓风');
        expect(html).toContain('用影像记录世界');
        expect(html).toContain('https://example.com/owner-face.jpg');
        expect(html).not.toContain('bili-owner-card-work');
        expect(html).not.toContain('影视飓风年度混剪');
        expect(html).not.toContain('代表作');
    });

    it('renders plain owner-name mentions as owner cards through the shared rich-link pipeline', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '推荐关注影视飓风，也可以看看飓多多StormCrew。',
            'card',
            new Map(),
            new Map([
                [
                    '946974',
                    {
                        mid: '946974',
                        name: '影视飓风',
                        face: 'https://example.com/owner-face.jpg',
                        sign: '用影像记录世界',
                        fans: 2230000,
                    },
                ],
                [
                    '1780480185',
                    {
                        mid: '1780480185',
                        name: '飓多多StormCrew',
                        face: 'https://example.com/stormcrew-face.jpg',
                    },
                ],
            ])
        );

        expect(html).toContain('bili-owner-card-ref');
        expect(html).toContain('https://space.bilibili.com/946974');
        expect(html).toContain('https://space.bilibili.com/1780480185');
        expect(html).toContain('影视飓风');
        expect(html).toContain('飓多多StormCrew');
    });

    it('shows the shared view switch for author links in chat content', async () => {
        mockChatStore.toolEvents = [];

        const wrapper = await mountPanel('作者主页：https://space.bilibili.com/946974');

        expect(wrapper.find('.chat-content-toolbar').exists()).toBe(true);
        const options = wrapper.findAll('.chat-content-view-option');
        expect(options).toHaveLength(3);
        expect(options.map((node) => node.text())).toEqual(
            expect.arrayContaining(['文本', '卡片', '紧凑'])
        );
    });

    it('shows the shared view switch for full bilibili video links in chat content', async () => {
        const wrapper = await mountPanel(
            '推荐：https://www.bilibili.com/video/BV1AA411c7mD?p=2'
        );

        expect(wrapper.find('.chat-content-toolbar').exists()).toBe(true);
        expect(wrapper.html()).toContain('bili-video-ref');
        expect(wrapper.html()).toContain('data-bvid="BV1AA411c7mD"');
    });

    it('shows the shared view switch for plain owner-name mentions when search_owners returned candidates', async () => {
        mockChatStore.toolEvents = [
            makeOwnerSearchEvent({
                mid: 946974,
                name: '影视飓风',
                face: 'https://example.com/owner-face.jpg',
            }),
        ];

        const wrapper = await mountPanel('推荐几个红警的up主：影视飓风。');

        expect(wrapper.find('.chat-content-toolbar').exists()).toBe(true);
        expect(wrapper.html()).toContain('bili-owner-ref');
        expect(wrapper.html()).toContain('https://space.bilibili.com/946974');
        expect(wrapper.html()).toContain('bili-owner-inline-avatar');
    });

    it('keeps the current streaming answer in text mode to avoid rich-card image flicker', async () => {
        mockChatStore.isLoading = true;
        mockChatStore.isDone = false;
        mockChatStore.isAborted = false;

        const wrapper = await mountPanel('推荐看 [主视频](BV1AA411c7mD)');

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'compact'
        );
        await nextTick();

        const html = wrapper.find('.chat-content').html();
        expect(html).not.toContain('bili-video-compact-ref');
        expect(html).not.toContain('bili-video-card-ref');
        expect(html).toContain('bili-video-ref');
        expect(html).not.toContain('bili-owner-inline-avatar');
    });

    it('renders full bilibili video links as rich cards with proxied cover URLs', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '[主视频](https://www.bilibili.com/video/BV1AA411c7mD?p=2)',
            'card',
            new Map([
                [
                    'BV1AA411c7mD',
                    {
                        bvid: 'BV1AA411c7mD',
                        title: '主视频',
                        pic: '//i0.hdslb.com/bfs/archive/sample-cover.jpg',
                        duration: 360,
                        owner: { name: '作者 1' },
                        stat: { view: 10000 },
                    },
                ],
            ])
        );

        expect(html).toContain('bili-video-card-ref');
        expect(html).toContain(
            '/bili-img/i0.hdslb.com/bfs/archive/sample-cover.jpg@320w_200h_1c_!web-space-upload-video.webp'
        );
    });

    it('renders compact owner links with native title details', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '推荐关注 https://space.bilibili.com/946974',
            'compact',
            new Map(),
            new Map([
                [
                    '946974',
                    {
                        mid: '946974',
                        name: '影视飓风',
                        face: 'https://example.com/owner-face.jpg',
                        sign: '用影像记录世界',
                        fans: 2230000,
                    },
                ],
            ])
        );

        expect(html).toContain('bili-owner-compact-ref');
        expect(html).toContain('影视飓风');
        expect(html).toContain('title="影视飓风');
        expect(html).toContain('UID 946974');
        expect(html).toContain('223');
        expect(html).toContain('粉丝');
        expect(html).toContain('用影像记录世界');
        expect(html).not.toContain('bili-owner-compact-hover-card');
    });

    it('keeps mixed owner and video links clean in card mode without owner work preview', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '先看 [主视频](BV1AA411c7mD)，再关注 [影视飓风](https://space.bilibili.com/946974)。',
            'card',
            new Map([
                [
                    'BV1AA411c7mD',
                    {
                        bvid: 'BV1AA411c7mD',
                        title: '主视频',
                        pic: 'https://example.com/BV1AA411c7mD.jpg',
                        duration: 360,
                        owner: { name: '作者 1' },
                        stat: { view: 10000 },
                    },
                ],
            ]),
            new Map([
                [
                    '946974',
                    {
                        mid: '946974',
                        name: '影视飓风',
                        face: 'https://example.com/owner-face.jpg',
                        sign: '用影像记录世界',
                        fans: 2230000,
                        sample_title: '影视飓风年度混剪',
                    },
                ],
            ])
        );

        expect(html).toContain('bili-video-card-ref');
        expect(html).toContain('bili-owner-card-ref');
        expect(html).toContain('再关注 影视飓风');
        expect(html).toContain('bili-video-rich-cards--owner-trailing');
        expect(html).not.toContain('代表作');
    });

    it('keeps emphasized owner names inline in card mode and moves the owner card below', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '**[红警HBK08](https://space.bilibili.com/1629347259)**：已找到对应的UP主。',
            'card',
            new Map(),
            new Map([
                [
                    '1629347259',
                    {
                        mid: '1629347259',
                        name: '红警HBK08',
                        face: 'https://example.com/hbk08-face.jpg',
                        sign: '红色警戒原版全国全能王冠军',
                        fans: 2207000,
                    },
                ],
            ])
        );

        expect(html).toContain('<strong>红警HBK08</strong>：已找到对应的UP主。');
        expect(html).toContain('bili-video-rich-cards--owner-trailing');
        expect(html).toContain('bili-owner-card-ref');
    });

    it('keeps standalone owner-only list items as direct cards in card mode', async () => {
        mockChatStore.toolEvents = [];

        const wrapper = await mountPanel(
            '- [红警HBK08](https://space.bilibili.com/1629347259)'
        );

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'card'
        );
        await nextTick();

        const html = wrapper.find('.chat-content').html();
        expect(html).toContain('bili-owner-card-ref');
        expect(html).not.toContain('bili-video-rich-cards--owner-trailing');
        expect(html).not.toContain('bili-video-rich-text');
    });

    it('keeps plain owner-only list items as direct cards in card mode', async () => {
        mockChatStore.toolEvents = [
            makeOwnerSearchEvent({
                mid: 1629347259,
                name: '红警HBK08',
                face: 'https://example.com/hbk08-face.jpg',
            }),
        ];

        const wrapper = await mountPanel('- 红警HBK08');

        (wrapper.vm as unknown as { setVideoLinkView: (mode: string) => void }).setVideoLinkView(
            'card'
        );
        await nextTick();

        const html = wrapper.find('.chat-content').html();
        expect(html).toContain('bili-owner-card-ref');
        expect(html).not.toContain('bili-video-rich-cards--owner-trailing');
        expect(html).not.toContain('bili-video-rich-text');
    });

    it('preserves inline markdown styling in compact note and context blocks', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '## **红警专题**\n\n**系列说明**：先看 [主视频](BV1AA411c7mD)，再读 `战术分析`。',
            'compact',
            new Map([
                [
                    'BV1AA411c7mD',
                    {
                        bvid: 'BV1AA411c7mD',
                        title: '主视频',
                        pic: 'https://example.com/BV1AA411c7mD.jpg',
                        duration: 360,
                        owner: { name: '作者 1' },
                        stat: { view: 10000 },
                    },
                ],
            ])
        );

        expect(html).toContain('bili-video-compact-context-block--heading');
        expect(html).toContain('<strong>红警专题</strong>');
        expect(html).toContain('bili-video-compact-note-block');
        expect(html).toContain('<strong>系列说明</strong>');
        expect(html).toContain('<code>战术分析</code>');
    });

    it('attaches short single-line compact notes above single video cards for multi-column layout', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '#### [红警HBK08](https://space.bilibili.com/1629347259)\n\n- [红警全油田一排排！](BV1QywoziEqj) 15.6万播放，7天前，9分21秒\n- [红警2v2中间富的流油！](BV1h2wozNEop) 12.8万播放，7天前，6分50秒',
            'compact',
            new Map([
                [
                    'BV1QywoziEqj',
                    {
                        bvid: 'BV1QywoziEqj',
                        title: '红警全油田一排排！',
                        pic: 'https://example.com/BV1QywoziEqj.jpg',
                        duration: 561,
                        owner: { name: '红警HBK08' },
                        stat: { view: 157000 },
                    },
                ],
                [
                    'BV1h2wozNEop',
                    {
                        bvid: 'BV1h2wozNEop',
                        title: '红警2v2中间富的流油！',
                        pic: 'https://example.com/BV1h2wozNEop.jpg',
                        duration: 410,
                        owner: { name: '红警HBK08' },
                        stat: { view: 129000 },
                    },
                ],
            ]),
            new Map([
                [
                    '1629347259',
                    {
                        mid: '1629347259',
                        name: '红警HBK08',
                        face: 'https://example.com/hbk08-face.jpg',
                        fans: 2207000,
                    },
                ],
            ])
        );

        const host = document.createElement('div');
        host.innerHTML = html;

        expect(host.querySelectorAll('.bili-video-compact-entry--with-note')).toHaveLength(2);
        expect(host.querySelectorAll('.bili-video-compact-note-block--attached')).toHaveLength(2);
        expect(host.querySelectorAll('.bili-video-compact-gallery > .bili-video-compact-note-block')).toHaveLength(0);
        expect(host.querySelector('.bili-video-compact-context-block--heading')).not.toBeNull();
    });

    it('keeps long single-video compact notes as full-width prose blocks', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '- [主视频](BV1AA411c7mD) 这条视频详细解释了开局思路、运营路径和对抗节奏，适合作为完整入门说明。',
            'compact',
            new Map([
                [
                    'BV1AA411c7mD',
                    {
                        bvid: 'BV1AA411c7mD',
                        title: '主视频',
                        pic: 'https://example.com/BV1AA411c7mD.jpg',
                        duration: 360,
                        owner: { name: '作者 1' },
                        stat: { view: 10000 },
                    },
                ],
            ])
        );

        const host = document.createElement('div');
        host.innerHTML = html;

        expect(host.querySelectorAll('.bili-video-compact-note-block--attached')).toHaveLength(0);
        expect(host.querySelectorAll('.bili-video-compact-gallery > .bili-video-compact-note-block')).toHaveLength(1);
    });

    it('separates mixed owner and video links into distinct compact sections', () => {
        const html = renderAnswerMarkdownWithVideoView(
            '先看 [主视频](BV1AA411c7mD)，再关注 [影视飓风](https://space.bilibili.com/946974)。',
            'compact',
            new Map([
                [
                    'BV1AA411c7mD',
                    {
                        bvid: 'BV1AA411c7mD',
                        title: '主视频',
                        pic: 'https://example.com/BV1AA411c7mD.jpg',
                        duration: 360,
                        owner: { name: '作者 1' },
                        stat: { view: 10000 },
                    },
                ],
            ]),
            new Map([
                [
                    '946974',
                    {
                        mid: '946974',
                        name: '影视飓风',
                        face: 'https://example.com/owner-face.jpg',
                        sign: '用影像记录世界',
                        fans: 2230000,
                    },
                ],
            ])
        );

        expect(html).toContain('bili-video-compact-group-cards-section--video');
        expect(html).toContain('bili-video-compact-group-cards-section--owner');
    });
});