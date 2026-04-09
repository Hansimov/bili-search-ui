/**
 * Markdown 渲染工具
 *
 * 使用 Showdown 将 Markdown 文本转换为安全的 HTML。
 * 用于 ChatResponsePanel 中渲染 LLM 的流式 Markdown 回答。
 */

import Showdown from 'showdown';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ShowdownLib = (Showdown as any).default || Showdown;

/** Showdown 单例 converter，配置一次复用 */
const converter = new ShowdownLib.Converter({
    // 启用常用扩展
    tables: true,
    strikethrough: true,
    tasklists: true,
    ghCodeBlocks: true,
    smoothLivePreview: true,
    openLinksInNewWindow: true,
    emoji: true,
    // 输出安全设置
    headerLevelStart: 2,
    simpleLineBreaks: true,
});

// Set output flavor to GitHub
converter.setFlavor('github');

/**
 * BV号链接正则：匹配 href="BV..." 的 <a> 标签。
 * LLM 输出 [标题](BVxxx) 格式，Showdown 将其渲染为 <a href="BVxxx">标题</a>。
 * 此正则将其扩展为完整的 bilibili 视频链接。
 */
const BV_LINK_RE = /<a\s+href="(BV[A-Za-z0-9]+)"([^>]*)>(.*?)<\/a>/g;
const FULL_BILI_VIDEO_LINK_RE =
    /<a\s+href="https?:\/\/(?:www\.)?bilibili\.com\/video\/(BV[A-Za-z0-9]+)(?:[/?#][^"]*)?"([^>]*)>(.*?)<\/a>/g;
const CLASS_ATTR_RE = /\sclass="([^"]*)"/;

/**
 * Inline SVG for the bilibili TV icon (simplified path, inherits currentColor).
 */
const BILI_TV_ICON = '<svg class="bili-tv-inline" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.747v7.5a3.75 3.75 0 0 1-3.75 3.75H5.75A3.75 3.75 0 0 1 2 17.247v-7.5a3.75 3.75 0 0 1 3.75-3.75h1.166L5.775 4.855a1.25 1.25 0 1 1 1.767-1.768l2.652 2.652c.079.079.145.165.198.257h3.213c.053-.092.12-.18.199-.258l2.651-2.652a1.25 1.25 0 0 1 1.768 0zm.027 5.42H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.094v7.5c0 .659.51 1.199 1.157 1.246l.093.004h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5c0-.69-.56-1.25-1.25-1.25zm-10 2.5c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25zm7.5 0c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25z"/></svg>';

/**
 * 将 BV 号链接扩展为完整的 bilibili 视频链接
 */
function expandBvLinks(html: string): string {
    const decorate = (_match: string, bvid: string, attrs: string, text: string) => {
        const fullUrl = `https://www.bilibili.com/video/${bvid}`;
        let nextAttrs = attrs || '';

        if (CLASS_ATTR_RE.test(nextAttrs)) {
            nextAttrs = nextAttrs.replace(CLASS_ATTR_RE, (_classMatch, classes) => {
                const mergedClasses = /\bbili-video-ref\b/.test(classes)
                    ? classes
                    : `${classes} bili-video-ref`.trim();
                return ` class="${mergedClasses}"`;
            });
        } else {
            nextAttrs = ` class="bili-video-ref"${nextAttrs}`;
        }

        if (!/\sdata-bvid=/.test(nextAttrs)) {
            nextAttrs = ` data-bvid="${bvid}"${nextAttrs}`;
        }
        if (!/\starget=/.test(nextAttrs)) {
            nextAttrs = `${nextAttrs} target="_blank"`;
        }
        if (!/\srel=/.test(nextAttrs)) {
            nextAttrs = `${nextAttrs} rel="noopener"`;
        }

        const innerHtml = text.includes('bili-tv-inline')
            ? text
            : `${BILI_TV_ICON}${text}`;

        return `<a href="${fullUrl}"${nextAttrs}>${innerHtml}</a>`;
    };

    return html
        .replace(FULL_BILI_VIDEO_LINK_RE, decorate)
        .replace(BV_LINK_RE, decorate);
}

/**
 * 将 Markdown 文本渲染为 HTML 字符串
 *
 * @param markdown - 原始 Markdown 文本（可以是不完整的流式内容）
 * @returns 渲染后的 HTML 字符串
 */
export function renderMarkdown(markdown: string): string {
    if (!markdown) return '';

    try {
        // Showdown 可以处理不完整的 Markdown（流式场景）
        let html = converter.makeHtml(markdown);
        // 将 BV 号链接扩展为完整 bilibili URL
        html = expandBvLinks(html);
        return html;
    } catch (error) {
        console.warn('[Markdown] Render error:', error);
        // 降级：将换行符转为 <br>，保持基本可读性
        return markdown
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }
}
