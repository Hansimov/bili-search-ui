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
 * 将 Markdown 文本渲染为 HTML 字符串
 *
 * @param markdown - 原始 Markdown 文本（可以是不完整的流式内容）
 * @returns 渲染后的 HTML 字符串
 */
export function renderMarkdown(markdown: string): string {
    if (!markdown) return '';

    try {
        // Showdown 可以处理不完整的 Markdown（流式场景）
        const html = converter.makeHtml(markdown);
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
