import { humanReadableNumber, secondsToDuration } from 'src/utils/convert';
import { renderMarkdown } from 'src/utils/markdown';
import {
    formatOwnerFans,
    getOwnerAvatarUrl,
    getOwnerStatLine,
    type OwnerRichInfo,
} from 'src/utils/ownerRichView';
import type { NormalizedVideoHit } from 'src/utils/videoHit';
import { normalizeVideoPicUrl } from 'src/utils/videoHit';

const RENDERED_BV_LINK_RE =
    /<a\s+href="https:\/\/www\.bilibili\.com\/video\/(BV[A-Za-z0-9]+)"[^>]*class="bili-video-ref"[^>]*>(.*?)<\/a>/g;
const RENDERED_BV_LINK_DETECT_RE =
    /<a\s+href="https:\/\/www\.bilibili\.com\/video\/(BV[A-Za-z0-9]+)"[^>]*class="bili-video-ref"[^>]*>/;
const RENDERED_SPACE_LINK_RE =
    /<a\s+href="(https:\/\/space\.bilibili\.com\/(\d+)(?:\/[^"#?]*)?(?:\?[^"#]*)?(?:#[^"]*)?)"[^>]*>(.*?)<\/a>/g;
const RENDERED_SPACE_LINK_DETECT_RE =
    /<a\s+href="https:\/\/space\.bilibili\.com\/(\d+)(?:\/[^"#?]*)?(?:\?[^"#]*)?(?:#[^"]*)?"[^>]*>/;
const RAW_SPACE_LINK_RE = /https?:\/\/space\.bilibili\.com\/(\d+)(?:[/?#][^\s)]*)?/g;
const VIDEO_LINK_VIEW_STORAGE_KEY = 'chat-response-video-link-view';
const VIDEO_LINK_VIEW_SESSION_KEY_PREFIX = 'chat-response-video-link-view:';

export type VideoLinkViewMode = 'text' | 'card' | 'compact';
export type VideoHit = NormalizedVideoHit;

export type OwnerLinkInfo = OwnerRichInfo;

type RenderAnswerOptions = {
    disableInlineOwnerAvatar?: boolean;
};

type OwnerMentionCandidate = {
    mid: string;
    name: string;
};

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
        return `<a href="https://www.bilibili.com/video/${bvid}" class="bili-video-compact-ref bili-rich-compact-ref" data-bvid="${bvid}" data-inline-label="${inlineLabel}" target="_blank" rel="noopener"><span class="bili-video-compact-cover-wrap bili-rich-compact-cover-wrap">${coverUrl
            ? `<img src="${escapeHtml(
                coverUrl
            )}" class="bili-video-compact-cover bili-rich-compact-cover" loading="lazy" referrerpolicy="no-referrer" />`
            : '<span class="bili-video-compact-cover bili-video-compact-cover-placeholder bili-rich-compact-cover bili-rich-compact-cover-placeholder"></span>'
            }${duration
                ? `<span class="bili-video-compact-duration">${duration}</span>`
                : ''
            }</span><span class="bili-video-compact-meta bili-rich-compact-meta"><span class="bili-video-compact-title bili-rich-compact-title">${title}</span>${compactStats
                ? `<span class="bili-video-compact-stats">${compactStats}</span>`
                : ''
            }</span></a>`;
    }

    return `<a href="https://www.bilibili.com/video/${bvid}" class="bili-video-card-ref bili-rich-card-ref" data-bvid="${bvid}" target="_blank" rel="noopener"><span class="bili-video-card-cover-wrap bili-rich-card-cover-wrap">${coverUrl
        ? `<img src="${escapeHtml(
            coverUrl
        )}" class="bili-video-card-cover bili-rich-card-cover" loading="lazy" referrerpolicy="no-referrer" />`
        : '<span class="bili-video-card-cover bili-video-card-cover-placeholder bili-rich-card-cover bili-rich-card-cover-placeholder"></span>'
        }${duration ? `<span class="bili-video-card-duration">${duration}</span>` : ''
        }</span><span class="bili-video-card-meta bili-rich-card-meta"><span class="bili-video-card-title bili-rich-card-title">${title}</span><span class="bili-video-card-subline bili-rich-card-subline">${author ? `<span class="bili-video-card-author">${author}</span>` : ''
        }${viewText ? `<span class="bili-video-card-views">${viewText}</span>` : ''}</span></span></a>`;
};

const buildRenderedOwnerLink = (
    href: string,
    mid: string,
    innerHtml: string,
    viewMode: VideoLinkViewMode,
    ownerMap: Map<string, OwnerLinkInfo>,
    options: RenderAnswerOptions = {}
): string => {
    const owner = ownerMap.get(mid);
    const innerText = stripHtml(innerHtml);
    const fallbackName = /^https?:\/\/space\.bilibili\.com\//.test(innerText)
        ? `UP 主 ${mid}`
        : innerText || `UP 主 ${mid}`;
    const name = escapeHtml(owner?.name || fallbackName);
    const avatarUrl = getOwnerAvatarUrl(owner || { mid });
    const sign = escapeHtml(owner?.sign || '');
    const fansText = escapeHtml(formatOwnerFans(owner?.fans));
    const inlineLabel = escapeHtml(owner?.name || fallbackName);
    const uidText = escapeHtml(`UID ${mid}`);
    const statLine = escapeHtml(getOwnerStatLine({ ...owner, mid })) || uidText;
    const compactTitle = escapeHtml(
        [owner?.name || fallbackName, getOwnerStatLine({ ...owner, mid }), owner?.sign]
            .filter((value): value is string => Boolean(value && value.trim()))
            .join('\n')
    );

    if (viewMode === 'compact') {
        return `<a href="${escapeHtml(href)}" class="bili-owner-compact-ref bili-rich-compact-ref" data-mid="${mid}" data-inline-label="${inlineLabel}" title="${compactTitle}" target="_blank" rel="noopener"><span class="bili-owner-compact-cover-wrap bili-rich-compact-cover-wrap">${avatarUrl
            ? `<img src="${escapeHtml(avatarUrl)}" class="bili-owner-compact-cover bili-rich-compact-cover" loading="lazy" referrerpolicy="no-referrer" />`
            : '<span class="bili-owner-compact-cover bili-owner-compact-cover-placeholder bili-rich-compact-cover bili-rich-compact-cover-placeholder"></span>'
            }</span><span class="bili-owner-compact-meta bili-rich-compact-meta"><span class="bili-owner-compact-title bili-rich-compact-title">${name}</span>${fansText
                ? `<span class="bili-owner-compact-stats">${fansText}</span>`
                : ''
            }</span></a>`;
    }

    if (viewMode === 'card') {
        return `<a href="${escapeHtml(href)}" class="bili-owner-card-ref bili-rich-card-ref" data-mid="${mid}" data-inline-label="${inlineLabel}" target="_blank" rel="noopener"><span class="bili-owner-card-main"><span class="bili-owner-card-cover-wrap bili-rich-card-cover-wrap bili-rich-card-cover-wrap--owner">${avatarUrl
            ? `<img src="${escapeHtml(avatarUrl)}" class="bili-owner-card-cover bili-rich-card-cover" loading="lazy" referrerpolicy="no-referrer" />`
            : '<span class="bili-owner-card-cover bili-owner-card-cover-placeholder bili-rich-card-cover bili-rich-card-cover-placeholder"></span>'
            }</span><span class="bili-owner-card-meta bili-rich-card-meta"><span class="bili-owner-card-title bili-rich-card-title">${name}</span><span class="bili-owner-card-subline bili-rich-card-subline">${statLine}</span>${sign ? `<span class="bili-owner-card-sign">${sign}</span>` : ''}</span></span></a>`;
    }

    return `<a href="${escapeHtml(href)}" class="bili-owner-ref bili-rich-inline-ref" data-mid="${mid}" target="_blank" rel="noopener">${options.disableInlineOwnerAvatar
        ? ''
        : avatarUrl
            ? `<img src="${escapeHtml(avatarUrl)}" class="bili-owner-inline-avatar" loading="lazy" referrerpolicy="no-referrer" />`
            : '<span class="bili-owner-inline-avatar bili-owner-inline-avatar--placeholder"></span>'
        }<span class="bili-owner-inline-meta"><span class="bili-owner-inline-name">${name}</span>${fansText ? `<span class="bili-owner-inline-stats">${fansText}</span>` : ''}</span></a>`;
};

const getCompactAnchorLabel = (anchor: HTMLAnchorElement): string => {
    return (
        anchor.dataset.inlineLabel ||
        anchor.textContent ||
        anchor.dataset.mid ||
        anchor.dataset.bvid ||
        '视频'
    ).trim();
};

const getRenderedAnchorKind = (
    anchor: HTMLAnchorElement
): 'video' | 'owner' | 'other' => {
    if (
        anchor.classList.contains('bili-owner-card-ref') ||
        anchor.classList.contains('bili-owner-compact-ref')
    ) {
        return 'owner';
    }
    if (
        anchor.classList.contains('bili-video-card-ref') ||
        anchor.classList.contains('bili-video-compact-ref')
    ) {
        return 'video';
    }
    return 'other';
};

export const extractOwnerMidsFromText = (text: string): string[] => {
    if (!text) return [];
    const mids = new Set<string>();
    for (const match of text.matchAll(RAW_SPACE_LINK_RE)) {
        const mid = match[1]?.trim();
        if (mid) mids.add(mid);
    }
    return Array.from(mids);
};

const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const buildOwnerMentionCandidates = (
    ownerMap: Map<string, OwnerLinkInfo>
): OwnerMentionCandidate[] => {
    const candidates: OwnerMentionCandidate[] = [];
    const seen = new Set<string>();

    for (const [mid, owner] of ownerMap.entries()) {
        const name = (owner.name || '').trim();
        if (!mid || name.length < 2) {
            continue;
        }
        const key = `${mid}:${name}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        candidates.push({ mid, name });
    }

    candidates.sort((left, right) => right.name.length - left.name.length);
    return candidates;
};

const replaceTextNodeOwnerMentions = (
    textNode: Text,
    candidates: OwnerMentionCandidate[]
) => {
    const text = textNode.textContent || '';
    if (!text.trim()) {
        return;
    }

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let matched = false;

    while (cursor < text.length) {
        let nextCandidate: OwnerMentionCandidate | null = null;
        let nextIndex = -1;

        for (const candidate of candidates) {
            const index = text.indexOf(candidate.name, cursor);
            if (index < 0) {
                continue;
            }
            if (nextIndex < 0 || index < nextIndex) {
                nextIndex = index;
                nextCandidate = candidate;
            }
        }

        if (!nextCandidate || nextIndex < 0) {
            break;
        }

        if (nextIndex > cursor) {
            fragment.append(text.slice(cursor, nextIndex));
        }

        const anchor = document.createElement('a');
        anchor.href = `https://space.bilibili.com/${nextCandidate.mid}`;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.textContent = nextCandidate.name;
        fragment.append(anchor);

        cursor = nextIndex + nextCandidate.name.length;
        matched = true;
    }

    if (!matched) {
        return;
    }

    if (cursor < text.length) {
        fragment.append(text.slice(cursor));
    }

    textNode.replaceWith(fragment);
};

const linkifyOwnerMentionsInRenderedHtml = (
    html: string,
    ownerMap: Map<string, OwnerLinkInfo>
): string => {
    if (typeof document === 'undefined' || !html || !ownerMap.size) {
        return html;
    }

    const candidates = buildOwnerMentionCandidates(ownerMap);
    if (!candidates.length) {
        return html;
    }

    const template = document.createElement('template');
    template.innerHTML = html;
    const walker = document.createTreeWalker(
        template.content,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.closest('a, code, pre, script, style')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return (node.textContent || '').trim()
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            },
        }
    );

    const textNodes: Text[] = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
        if (currentNode instanceof Text) {
            textNodes.push(currentNode);
        }
        currentNode = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
        replaceTextNodeOwnerMentions(textNode, candidates);
    });

    return template.innerHTML;
};

const normalizeCompactText = (value: string): string => {
    return value
        .replace(/\s+/g, ' ')
        .replace(/\s+([，。！？；：,.;:!?])/g, '$1')
        .trim();
};

const COMPACT_DECORATION_RE =
    /^[\s\-•*·:："“”'‘’()（）\[\]【】,，.。!?！？;；]+/;

const replaceAnchorsWithInlineLabels = (
    root: HTMLElement,
    selector: string
): string[] => {
    const anchors = Array.from(root.querySelectorAll(selector)) as HTMLAnchorElement[];
    const labels = anchors.map((anchor) => getCompactAnchorLabel(anchor));

    anchors.forEach((anchor, index) => {
        anchor.replaceWith(document.createTextNode(labels[index] || ''));
    });

    return labels;
};

const removeEmptyCompactWrappers = (root: HTMLElement) => {
    Array.from(root.querySelectorAll('*'))
        .reverse()
        .forEach((node) => {
            if (!(node instanceof HTMLElement)) {
                return;
            }
            if (node.childNodes.length > 0) {
                return;
            }
            if ((node.textContent || '').trim()) {
                return;
            }
            node.remove();
        });
};

const stripLeadingTextAcrossNodes = (
    root: HTMLElement,
    text: string
): boolean => {
    if (!text) {
        return true;
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = text;
    let started = false;
    let currentNode = walker.nextNode();

    while (currentNode && remaining.length > 0) {
        const textNode = currentNode as Text;
        let value = textNode.textContent || '';

        if (!started) {
            const trimmedStart = value.replace(/^\s+/, '');
            if (!trimmedStart) {
                currentNode = walker.nextNode();
                continue;
            }
            if (trimmedStart !== value) {
                textNode.textContent = trimmedStart;
                value = trimmedStart;
            }
            started = true;
        }

        if (!value) {
            currentNode = walker.nextNode();
            continue;
        }

        const expectedSlice = remaining.slice(0, value.length);
        if (value.slice(0, expectedSlice.length) !== expectedSlice) {
            return false;
        }

        const consumedLength = expectedSlice.length;
        textNode.textContent = value.slice(consumedLength);
        remaining = remaining.slice(consumedLength);
        currentNode = walker.nextNode();
    }

    if (remaining.length > 0) {
        return false;
    }

    removeEmptyCompactWrappers(root);
    return true;
};

const stripLeadingDecorations = (root: HTMLElement) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();

    while (currentNode) {
        const textNode = currentNode as Text;
        const value = textNode.textContent || '';
        if (!value.trim()) {
            currentNode = walker.nextNode();
            continue;
        }

        textNode.textContent = value.replace(COMPACT_DECORATION_RE, '');
        break;
    }

    removeEmptyCompactWrappers(root);
};

const buildCompactMarkupHtml = (
    source: HTMLElement,
    labels: string[]
): string => {
    const clone = source.cloneNode(true) as HTMLElement;

    replaceAnchorsWithInlineLabels(clone, 'a.bili-rich-compact-ref');
    clone
        .querySelectorAll(
            'ul, ol, .bili-video-compact-gallery, .bili-video-compact-fallback-list'
        )
        .forEach((node) => node.remove());

    if (labels.length === 1) {
        stripLeadingTextAcrossNodes(clone, labels[0]);
        stripLeadingDecorations(clone);
    }

    removeEmptyCompactWrappers(clone);
    return clone.innerHTML.trim();
};

const hasStandaloneOwnerOnlyContent = (
    container: HTMLElement,
    ownerAnchors: HTMLAnchorElement[]
): boolean => {
    if (!ownerAnchors.length) {
        return false;
    }

    const clone = container.cloneNode(true) as HTMLElement;
    const labels = replaceAnchorsWithInlineLabels(clone, 'a.bili-owner-card-ref');

    let residual = normalizeCompactText(clone.textContent || '');
    labels
        .slice()
        .sort((left, right) => right.length - left.length)
        .forEach((label) => {
            residual = normalizeCompactText(residual.replace(label, ' '));
        });

    residual = residual.replace(
        /^[\s\-•*·:："“”'‘’()（）\[\]【】,，.。!?！？;；]+|[\s\-•*·:："“”'‘’()（）\[\]【】,，.。!?！？;；]+$/g,
        ''
    );

    return residual.length === 0;
};

type CompactGroup = {
    entries: Array<{
        element: HTMLDivElement;
        kind: 'video' | 'owner' | 'other';
    }>;
    noteText: string;
    noteHtml: string;
};

const createCompactCardEntry = (anchor: HTMLAnchorElement) => {
    const cardsWrap = document.createElement('div');
    cardsWrap.className =
        'bili-video-compact-entry-cards bili-video-compact-entry-cards--single';

    const entry = document.createElement('div');
    entry.className = 'bili-video-compact-entry bili-video-compact-entry--single';
    cardsWrap.append(anchor.cloneNode(true));
    entry.append(cardsWrap);
    return {
        element: entry,
        kind: getRenderedAnchorKind(anchor),
    };
};

const buildCompactGroup = (source: HTMLElement): CompactGroup | null => {
    const clone = source.cloneNode(true) as HTMLElement;

    const anchors = Array.from(
        clone.querySelectorAll('a.bili-rich-compact-ref')
    ) as HTMLAnchorElement[];

    if (!anchors.length) {
        return null;
    }

    const labels = replaceAnchorsWithInlineLabels(clone, 'a.bili-rich-compact-ref');

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
    const noteHtml = noteText ? buildCompactMarkupHtml(source, labels) : '';
    if (!noteText || noteText === combinedLabels) {
        noteText = '';
    }

    if (anchors.length === 1) {
        return {
            entries: [createCompactCardEntry(anchors[0])],
            noteText,
            noteHtml: noteText ? noteHtml : '',
        };
    }

    return {
        entries: anchors.map((anchor) => createCompactCardEntry(anchor)),
        noteText,
        noteHtml: noteText ? noteHtml : '',
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
    source: HTMLElement,
    variant: 'body' | 'heading' = 'body',
    headingTag?: string
): HTMLElement => {
    const block = source.cloneNode(true) as HTMLElement;
    block.classList.add('bili-video-compact-context-block');
    if (variant === 'heading') {
        block.classList.add('bili-video-compact-context-block--heading');
    }
    if (headingTag) {
        block.classList.add(`bili-video-compact-context-block--${headingTag}`);
    }
    return block;
};

const createCompactNoteBlock = (noteHtml: string): HTMLDivElement => {
    const note = document.createElement('div');
    note.className = 'bili-video-compact-note-block';
    note.innerHTML = noteHtml;
    return note;
};

const createCompactGalleryGroup = (group: CompactGroup): HTMLDivElement => {
    const wrapper = document.createElement('div');
    wrapper.className = 'bili-video-compact-group';
    wrapper.style.setProperty(
        '--compact-group-columns',
        String(Math.max(1, group.entries.length))
    );

    const cards = document.createElement('div');
    cards.className = 'bili-video-compact-group-cards';
    let currentSection: HTMLDivElement | null = null;
    let currentKind: 'video' | 'owner' | 'other' | null = null;
    let currentSectionCount = 0;

    group.entries.forEach((entry) => {
        if (
            !currentSection ||
            currentKind !== entry.kind ||
            currentSectionCount >= 5
        ) {
            currentSection = document.createElement('div');
            currentSection.className = 'bili-video-compact-group-cards-section';
            if (entry.kind !== 'other') {
                currentSection.classList.add(
                    `bili-video-compact-group-cards-section--${entry.kind}`
                );
            }
            cards.append(currentSection);
            currentKind = entry.kind;
            currentSectionCount = 0;
        }

        currentSection.append(entry.element);
        currentSectionCount += 1;
    });
    wrapper.append(cards);

    return wrapper;
};

const createCompactGallery = (groups: CompactGroup[]): HTMLDivElement => {
    const gallery = document.createElement('div');
    gallery.className = 'bili-video-compact-gallery';
    groups.forEach((group) => {
        if (group.noteText && group.noteHtml) {
            gallery.append(createCompactNoteBlock(group.noteHtml));
        }
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
            createCompactContextBlock(
                heading,
                'heading',
                heading.tagName.toLowerCase()
            )
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

        block.replaceWith(createCompactContextBlock(block));
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
            if (group.noteText && group.noteHtml) {
                gallery.append(createCompactNoteBlock(group.noteHtml));
            }
            gallery.append(createCompactGalleryGroup(group));
            block.replaceWith(gallery);
        });

        compactifyHeadingsAndContext(template);
        return template.innerHTML;
    }

    template.content
        .querySelectorAll('a.bili-rich-card-ref, a.bili-rich-compact-ref')
        .forEach((anchor) => {
            const listItem = anchor.closest('li');
            if (listItem) {
                listItem.classList.add('bili-rich-item');
                listItem.classList.add('bili-video-rich-item');
            }
        });

    const containers = new Set<HTMLElement>();
    template.content
        .querySelectorAll('a.bili-rich-card-ref, a.bili-rich-compact-ref')
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
            (node.classList.contains('bili-rich-card-ref') ||
                node.classList.contains('bili-rich-compact-ref'))
        );
    };

    containers.forEach((container) => {
        const trailingOwnerCards: HTMLAnchorElement[] = [];

        if (viewMode === 'card') {
            const ownerAnchors = Array.from(
                container.querySelectorAll('a.bili-owner-card-ref')
            ) as HTMLAnchorElement[];

            const ownerOnlyBlock = hasStandaloneOwnerOnlyContent(
                container,
                ownerAnchors
            );

            if (!ownerOnlyBlock) {
                ownerAnchors.forEach((anchor) => {
                    trailingOwnerCards.push(anchor.cloneNode(true) as HTMLAnchorElement);
                    anchor.replaceWith(
                        document.createTextNode(getCompactAnchorLabel(anchor))
                    );
                });
            }
        }

        const flow = document.createElement('span');
        flow.className = `bili-video-rich-flow bili-video-rich-flow--${viewMode}`;

        let textSegment: HTMLSpanElement | null = null;
        let cardsSegment: HTMLSpanElement | null = null;
        let cardsSegmentKind: 'video' | 'owner' | 'other' | null = null;

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
            cardsSegmentKind = null;
        };

        for (const child of Array.from(container.childNodes)) {
            if (isRenderedVideoAnchor(child)) {
                const anchorKind = getRenderedAnchorKind(child);
                flushTextSegment();
                if (cardsSegment && cardsSegmentKind && cardsSegmentKind !== anchorKind) {
                    flushCardsSegment();
                }
                cardsSegmentKind = anchorKind;
                const segment = ensureCardsSegment();
                segment.classList.toggle('bili-video-rich-cards--owner', anchorKind === 'owner');
                segment.classList.toggle('bili-video-rich-cards--video', anchorKind === 'video');
                segment.append(child.cloneNode(true));
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

        if (trailingOwnerCards.length) {
            const trailingCards = document.createElement('span');
            trailingCards.className =
                `bili-video-rich-cards bili-video-rich-cards--${viewMode} ` +
                'bili-video-rich-cards--owner bili-video-rich-cards--owner-trailing';
            trailingOwnerCards.forEach((card) => trailingCards.append(card));
            flow.append(trailingCards);
        }

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

export const hasRenderableRichLinks = (
    text: string,
    ownerMap: Map<string, OwnerLinkInfo> = new Map()
): boolean => {
    if (!text) return false;
    const html = linkifyOwnerMentionsInRenderedHtml(renderMarkdown(text), ownerMap);
    return (
        RENDERED_BV_LINK_DETECT_RE.test(html) ||
        RENDERED_SPACE_LINK_DETECT_RE.test(html)
    );
};

export const renderAnswerMarkdownWithVideoView = (
    text: string,
    viewMode: VideoLinkViewMode,
    videoMap: Map<string, VideoHit>,
    ownerMap: Map<string, OwnerLinkInfo> = new Map(),
    options: RenderAnswerOptions = {}
): string => {
    const html = linkifyOwnerMentionsInRenderedHtml(
        renderMarkdown(text),
        ownerMap
    );
    if (!html) {
        return html;
    }

    let replacedHtml = html.replace(
        RENDERED_SPACE_LINK_RE,
        (_match, href, mid, innerHtml) =>
            buildRenderedOwnerLink(href, mid, innerHtml, viewMode, ownerMap, options)
    );

    if (viewMode !== 'text') {
        replacedHtml = replacedHtml.replace(
            RENDERED_BV_LINK_RE,
            (match, bvid, innerHtml) => {
                return (
                    buildRenderedVideoLink(bvid, innerHtml, viewMode, videoMap) ||
                    match
                );
            }
        );
    }

    if (viewMode === 'text') {
        return replacedHtml;
    }

    if (replacedHtml === html) {
        return html;
    }

    return enhanceRenderedVideoLayout(replacedHtml, viewMode);
};