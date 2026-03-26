import { humanReadableNumber, secondsToDuration } from 'src/utils/convert';
import { renderMarkdown } from 'src/utils/markdown';
import type { NormalizedVideoHit } from 'src/utils/videoHit';
import { normalizeVideoPicUrl } from 'src/utils/videoHit';

const RENDERED_BV_LINK_RE =
    /<a\s+href="https:\/\/www\.bilibili\.com\/video\/(BV[A-Za-z0-9]+)"[^>]*class="bili-video-ref"[^>]*>(.*?)<\/a>/g;
const RENDERED_BV_LINK_DETECT_RE =
    /<a\s+href="https:\/\/www\.bilibili\.com\/video\/(BV[A-Za-z0-9]+)"[^>]*class="bili-video-ref"[^>]*>/;
const VIDEO_LINK_VIEW_STORAGE_KEY = 'chat-response-video-link-view';
const VIDEO_LINK_VIEW_SESSION_KEY_PREFIX = 'chat-response-video-link-view:';

export type VideoLinkViewMode = 'text' | 'card' | 'compact';
export type VideoHit = NormalizedVideoHit;

export const VIDEO_VIEW_OPTIONS: Array<{
    value: VideoLinkViewMode;
    label: string;
    icon: string;
}> = [
        { value: 'text', label: '文本', icon: 'article' },
        { value: 'card', label: '卡片', icon: 'view_agenda' },
        { value: 'compact', label: '紧凑', icon: 'grid_view' },
    ];

const stripHtml = (value: string): string => {
    return value
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const escapeHtml = (value: string): string => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const formatVideoViews = (views?: number): string => {
    if (views == null) return '';
    return `${humanReadableNumber(views)} 播放`;
};

const formatVideoDuration = (duration?: number): string => {
    if (!duration) return '';
    return secondsToDuration(duration);
};

const formatVideoCompactStats = (video: VideoHit): string => {
    const author = escapeHtml(video.owner?.name || '');
    const views = escapeHtml(formatVideoViews(video.stat?.view));

    if (!author && !views) {
        return '';
    }

    if (!author) {
        return `<span class="bili-video-compact-views">${views}</span>`;
    }

    if (!views) {
        return `<span class="bili-video-compact-author">${author}</span>`;
    }

    return `<span class="bili-video-compact-author">${author}</span><span class="bili-video-compact-stat-separator">·</span><span class="bili-video-compact-views">${views}</span>`;
};

const buildRenderedVideoLink = (
    bvid: string,
    innerHtml: string,
    viewMode: Exclude<VideoLinkViewMode, 'text'>,
    videoMap: Map<string, VideoHit>
): string | null => {
    const video = videoMap.get(bvid);
    if (!video) {
        return null;
    }

    const coverUrl = normalizeVideoPicUrl(video.pic);
    const title = escapeHtml(video.title || stripHtml(innerHtml) || bvid);
    const inlineLabel = escapeHtml(stripHtml(innerHtml) || video.title || bvid);
    const author = escapeHtml(video.owner?.name || '');
    const viewText = escapeHtml(formatVideoViews(video.stat?.view));
    const duration = escapeHtml(formatVideoDuration(video.duration));
    const compactStats = formatVideoCompactStats(video);

    if (viewMode === 'compact') {
        return `<a href="https://www.bilibili.com/video/${bvid}" class="bili-video-compact-ref" data-bvid="${bvid}" data-inline-label="${inlineLabel}" target="_blank" rel="noopener"><span class="bili-video-compact-cover-wrap">${coverUrl
            ? `<img src="${escapeHtml(
                coverUrl
            )}" class="bili-video-compact-cover" loading="lazy" referrerpolicy="no-referrer" />`
            : '<span class="bili-video-compact-cover bili-video-compact-cover-placeholder"></span>'
            }${duration
                ? `<span class="bili-video-compact-duration">${duration}</span>`
                : ''
            }</span><span class="bili-video-compact-meta"><span class="bili-video-compact-title">${title}</span>${compactStats
                ? `<span class="bili-video-compact-stats">${compactStats}</span>`
                : ''
            }</span></a>`;
    }

    return `<a href="https://www.bilibili.com/video/${bvid}" class="bili-video-card-ref" data-bvid="${bvid}" target="_blank" rel="noopener"><span class="bili-video-card-cover-wrap">${coverUrl
        ? `<img src="${escapeHtml(
            coverUrl
        )}" class="bili-video-card-cover" loading="lazy" referrerpolicy="no-referrer" />`
        : '<span class="bili-video-card-cover bili-video-card-cover-placeholder"></span>'
        }${duration ? `<span class="bili-video-card-duration">${duration}</span>` : ''
        }</span><span class="bili-video-card-meta"><span class="bili-video-card-title">${title}</span><span class="bili-video-card-subline">${author ? `<span class="bili-video-card-author">${author}</span>` : ''
        }${viewText ? `<span class="bili-video-card-views">${viewText}</span>` : ''}</span></span></a>`;
};

const getCompactAnchorLabel = (anchor: HTMLAnchorElement): string => {
    return (
        anchor.dataset.inlineLabel ||
        anchor.textContent ||
        anchor.dataset.bvid ||
        '视频'
    ).trim();
};

const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const normalizeCompactText = (value: string): string => {
    return value
        .replace(/\s+/g, ' ')
        .replace(/\s+([，。！？；：,.;:!?])/g, '$1')
        .trim();
};

type CompactGroup = {
    entries: HTMLDivElement[];
    noteText: string;
};

const createCompactCardEntry = (
    anchor: HTMLAnchorElement
) => {
    const cardsWrap = document.createElement('div');
    cardsWrap.className =
        'bili-video-compact-entry-cards bili-video-compact-entry-cards--single';

    const entry = document.createElement('div');
    entry.className = 'bili-video-compact-entry bili-video-compact-entry--single';
    cardsWrap.append(anchor.cloneNode(true));
    entry.append(cardsWrap);
    return entry;
};

const buildCompactGroup = (source: HTMLElement): CompactGroup | null => {
    const clone = source.cloneNode(true) as HTMLElement;

    const anchors = Array.from(
        clone.querySelectorAll('a.bili-video-compact-ref')
    ) as HTMLAnchorElement[];

    if (!anchors.length) {
        return null;
    }

    const labels = anchors.map((anchor) => getCompactAnchorLabel(anchor));

    anchors.forEach((anchor, index) => {
        anchor.replaceWith(document.createTextNode(labels[index] || ''));
    });

    clone
        .querySelectorAll(
            'ul, ol, .bili-video-compact-gallery, .bili-video-compact-fallback-list'
        )
        .forEach((node) => node.remove());

    let noteText = normalizeCompactText(clone.textContent || '');
    if (labels.length === 1) {
        noteText = noteText.replace(
            new RegExp(`^${escapeRegExp(labels[0])}\\s*(?:[-—–:：,，]|\\s)*`),
            ''
        );
    }

    const combinedLabels = normalizeCompactText(labels.join(' '));
    noteText = noteText.replace(/^[-—–:：,，]\s*/, '').trim();
    if (!noteText || noteText === combinedLabels) {
        noteText = '';
    }

    if (anchors.length === 1) {
        return {
            entries: [createCompactCardEntry(anchors[0])],
            noteText,
        };
    }

    return {
        entries: anchors.map((anchor) => createCompactCardEntry(anchor)),
        noteText,
    };
};

const buildCompactFallbackItem = (source: HTMLLIElement): HTMLLIElement => {
    const clone = source.cloneNode(true) as HTMLLIElement;
    clone
        .querySelectorAll(
            '.bili-video-compact-gallery, .bili-video-compact-fallback-list'
        )
        .forEach((node) => node.remove());
    clone.querySelectorAll('a').forEach((anchor) => {
        anchor.replaceWith(document.createTextNode(anchor.textContent || ''));
    });
    clone.classList.add('bili-video-compact-fallback-item');
    return clone;
};

const createCompactContextBlock = (
    text: string,
    variant: 'body' | 'heading' = 'body',
    headingTag?: string
): HTMLDivElement => {
    const block = document.createElement('div');
    block.className = 'bili-video-compact-context-block';
    if (variant === 'heading') {
        block.classList.add('bili-video-compact-context-block--heading');
    }
    if (headingTag) {
        block.classList.add(`bili-video-compact-context-block--${headingTag}`);
    }
    block.textContent = text;
    return block;
};

const createCompactNoteBlock = (noteText: string): HTMLDivElement => {
    const note = document.createElement('div');
    note.className = 'bili-video-compact-note-block';
    note.textContent = noteText;
    return note;
};

const createCompactGalleryGroup = (group: CompactGroup): HTMLDivElement => {
    const wrapper = document.createElement('div');
    wrapper.className = 'bili-video-compact-group';
    wrapper.style.setProperty(
        '--compact-group-columns',
        String(Math.max(1, group.entries.length))
    );

    if (group.noteText) {
        wrapper.classList.add('bili-video-compact-group--with-note');
        wrapper.append(createCompactNoteBlock(group.noteText));
    }

    const cards = document.createElement('div');
    cards.className = 'bili-video-compact-group-cards';
    group.entries.forEach((entry) => cards.append(entry));
    wrapper.append(cards);

    return wrapper;
};

const createCompactGallery = (groups: CompactGroup[]): HTMLDivElement => {
    const gallery = document.createElement('div');
    gallery.className = 'bili-video-compact-gallery';
    groups.forEach((group) => {
        gallery.append(createCompactGalleryGroup(group));
    });
    return gallery;
};

const createCompactFallbackList = (
    items: HTMLLIElement[],
    ordered: boolean
): HTMLElement => {
    const list = document.createElement(ordered ? 'ol' : 'ul');
    list.className = 'bili-video-compact-fallback-list';
    items.forEach((item) => list.append(item));
    return list;
};

const compactifyHeadingsAndContext = (template: HTMLTemplateElement) => {
    const headings = Array.from(
        template.content.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ) as HTMLElement[];

    headings.forEach((heading) => {
        const text = normalizeCompactText(heading.textContent || '');
        if (!text) {
            heading.remove();
            return;
        }
        heading.replaceWith(
            createCompactContextBlock(text, 'heading', heading.tagName.toLowerCase())
        );
    });

    const bodyBlocks = Array.from(
        template.content.querySelectorAll('p, blockquote, td')
    ) as HTMLElement[];

    bodyBlocks.forEach((block) => {
        if (block.closest('.bili-video-compact-gallery')) {
            return;
        }

        const text = normalizeCompactText(block.textContent || '');
        if (!text) {
            block.remove();
            return;
        }

        block.replaceWith(createCompactContextBlock(text));
    });

    const topLevelNodes = Array.from(template.content.childNodes);
    const fragment = document.createDocumentFragment();
    let currentSection: HTMLDivElement | null = null;

    const isCompactFlowNode = (node: ChildNode): node is HTMLElement => {
        return (
            node instanceof HTMLElement &&
            (node.classList.contains('bili-video-compact-context-block') ||
                node.classList.contains('bili-video-compact-gallery') ||
                node.classList.contains('bili-video-compact-fallback-list'))
        );
    };

    topLevelNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            if (!(node.textContent || '').trim()) {
                return;
            }
            currentSection = null;
            fragment.append(node);
            return;
        }

        if (!isCompactFlowNode(node)) {
            currentSection = null;
            fragment.append(node);
            return;
        }

        if (node.classList.contains('bili-video-compact-context-block--heading')) {
            currentSection = document.createElement('div');
            currentSection.className = 'bili-video-compact-section';
            currentSection.append(node);
            fragment.append(currentSection);
            return;
        }

        if (currentSection) {
            currentSection.append(node);
            return;
        }

        fragment.append(node);
    });

    template.content.replaceChildren(fragment);
};

const enhanceRenderedVideoLayout = (
    html: string,
    viewMode: Exclude<VideoLinkViewMode, 'text'>
): string => {
    if (typeof document === 'undefined') {
        return html;
    }

    const template = document.createElement('template');
    template.innerHTML = html;

    if (viewMode === 'compact') {
        const lists = Array.from(
            template.content.querySelectorAll('ul, ol')
        ) as HTMLElement[];

        lists.reverse().forEach((list) => {
            const directItems = Array.from(list.children).filter(
                (child): child is HTMLLIElement => child instanceof HTMLLIElement
            );

            if (!directItems.length) {
                return;
            }

            const fragment = document.createDocumentFragment();
            const ordered = list.tagName.toLowerCase() === 'ol';
            let pendingGroups: CompactGroup[] = [];
            let pendingFallbackItems: HTMLLIElement[] = [];

            const flushGroups = () => {
                if (!pendingGroups.length) {
                    return;
                }

                fragment.append(createCompactGallery(pendingGroups));
                pendingGroups = [];
            };

            const flushFallbackItems = () => {
                if (!pendingFallbackItems.length) {
                    return;
                }

                fragment.append(createCompactFallbackList(pendingFallbackItems, ordered));
                pendingFallbackItems = [];
            };

            for (const item of directItems) {
                const group = buildCompactGroup(item);
                if (group) {
                    flushFallbackItems();
                    pendingGroups.push(group);
                    continue;
                }

                flushGroups();
                pendingFallbackItems.push(buildCompactFallbackItem(item));
            }

            flushGroups();
            flushFallbackItems();

            if (!fragment.childNodes.length) {
                return;
            }

            list.replaceWith(fragment);
        });

        const blocks = Array.from(
            template.content.querySelectorAll('p, blockquote, td')
        ) as HTMLElement[];

        blocks.forEach((block) => {
            if (block.closest('.bili-video-compact-gallery')) {
                return;
            }

            const group = buildCompactGroup(block);
            if (!group) {
                return;
            }

            const gallery = document.createElement('div');
            gallery.className =
                'bili-video-compact-gallery bili-video-compact-gallery--standalone';
            if (group.noteText) {
                gallery.append(createCompactNoteBlock(group.noteText));
            }
            group.entries.forEach((entry) => gallery.append(entry));
            block.replaceWith(gallery);
        });

        compactifyHeadingsAndContext(template);
        return template.innerHTML;
    }

    template.content
        .querySelectorAll('a.bili-video-card-ref, a.bili-video-compact-ref')
        .forEach((anchor) => {
            const listItem = anchor.closest('li');
            if (listItem) {
                listItem.classList.add('bili-video-rich-item');
            }
        });

    const containers = new Set<HTMLElement>();
    template.content
        .querySelectorAll('a.bili-video-card-ref, a.bili-video-compact-ref')
        .forEach((anchor) => {
            const container = anchor.closest('p, li, blockquote, td');
            if (container instanceof HTMLElement) {
                containers.add(container);
            }
        });

    const isRenderedVideoAnchor = (
        node: ChildNode
    ): node is HTMLAnchorElement => {
        return (
            node instanceof HTMLAnchorElement &&
            (node.classList.contains('bili-video-card-ref') ||
                node.classList.contains('bili-video-compact-ref'))
        );
    };

    containers.forEach((container) => {
        const flow = document.createElement('span');
        flow.className = `bili-video-rich-flow bili-video-rich-flow--${viewMode}`;

        let textSegment: HTMLSpanElement | null = null;
        let cardsSegment: HTMLSpanElement | null = null;

        const ensureTextSegment = () => {
            if (!textSegment) {
                textSegment = document.createElement('span');
                textSegment.className = 'bili-video-rich-text';
            }
            return textSegment;
        };

        const ensureCardsSegment = () => {
            if (!cardsSegment) {
                cardsSegment = document.createElement('span');
                cardsSegment.className = `bili-video-rich-cards bili-video-rich-cards--${viewMode}`;
            }
            return cardsSegment;
        };

        const flushTextSegment = () => {
            if (!textSegment) return;
            if (
                (textSegment.textContent || '').trim() ||
                textSegment.children.length > 0
            ) {
                flow.append(textSegment);
            }
            textSegment = null;
        };

        const flushCardsSegment = () => {
            if (!cardsSegment) return;
            if (cardsSegment.children.length > 0) {
                flow.append(cardsSegment);
            }
            cardsSegment = null;
        };

        for (const child of Array.from(container.childNodes)) {
            if (isRenderedVideoAnchor(child)) {
                flushTextSegment();
                ensureCardsSegment().append(child.cloneNode(true));
                continue;
            }

            const isWhitespaceText =
                child.nodeType === Node.TEXT_NODE && !(child.textContent || '').trim();

            if (cardsSegment && isWhitespaceText) {
                continue;
            }

            flushCardsSegment();
            ensureTextSegment().append(child.cloneNode(true));
        }

        flushTextSegment();
        flushCardsSegment();

        if (!flow.children.length) {
            return;
        }

        container.replaceChildren(flow);
    });

    return template.innerHTML;
};

export const readPersistedVideoLinkView = (
    sessionId?: string | null
): VideoLinkViewMode => {
    if (typeof window === 'undefined') return 'text';

    if (sessionId) {
        const storedForSession = window.localStorage.getItem(
            `${VIDEO_LINK_VIEW_SESSION_KEY_PREFIX}${sessionId}`
        );
        if (
            storedForSession === 'text' ||
            storedForSession === 'card' ||
            storedForSession === 'compact'
        ) {
            return storedForSession;
        }
    }

    const stored = window.localStorage.getItem(VIDEO_LINK_VIEW_STORAGE_KEY);
    if (stored === 'text' || stored === 'card' || stored === 'compact') {
        return stored;
    }
    return 'text';
};

export const persistVideoLinkView = (
    mode: VideoLinkViewMode,
    sessionId?: string | null
) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VIDEO_LINK_VIEW_STORAGE_KEY, mode);
    if (sessionId) {
        window.localStorage.setItem(
            `${VIDEO_LINK_VIEW_SESSION_KEY_PREFIX}${sessionId}`,
            mode
        );
    }
};

export const hasRenderableBvLinks = (text: string): boolean => {
    if (!text) return false;
    return RENDERED_BV_LINK_DETECT_RE.test(renderMarkdown(text));
};

export const renderAnswerMarkdownWithVideoView = (
    text: string,
    viewMode: VideoLinkViewMode,
    videoMap: Map<string, VideoHit>
): string => {
    const html = renderMarkdown(text);
    if (!html || viewMode === 'text') {
        return html;
    }

    const replacedHtml = html.replace(
        RENDERED_BV_LINK_RE,
        (match, bvid, innerHtml) => {
            return buildRenderedVideoLink(bvid, innerHtml, viewMode, videoMap) || match;
        }
    );

    if (replacedHtml === html) {
        return html;
    }

    return enhanceRenderedVideoLayout(replacedHtml, viewMode);
};