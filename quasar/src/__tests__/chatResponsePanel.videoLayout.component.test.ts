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
                    },
                ],
            ])
        );

        expect(html).toContain('bili-owner-card-ref');
        expect(html).toContain('影视飓风');
        expect(html).toContain('用影像记录世界');
        expect(html).toContain('https://example.com/owner-face.jpg');
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
    });
});