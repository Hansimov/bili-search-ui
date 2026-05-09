import { exportFile } from 'quasar';

import type {
    ChatExportRound,
    ChatExportSessionBundle,
    ConversationMessage,
} from 'src/stores/chatStore';
import { renderMarkdown } from 'src/utils/markdown';

export type ChatExportFormat = 'markdown' | 'json' | 'png';
export type ChatExportPngTheme = 'light' | 'dark';

export interface ChatExportSections {
    sessionMeta: boolean;
    userInputs: boolean;
    thinking: boolean;
    toolInputs: boolean;
    toolResults: boolean;
    finalAnswers: boolean;
    perfStats: boolean;
    modelTrace: boolean;
    rawTimeline: boolean;
}

export interface ChatExportOptions {
    format: ChatExportFormat;
    prettyJson: boolean;
    pngTheme: ChatExportPngTheme;
    sections: ChatExportSections;
}

export interface GeneratedChatExport {
    fileName: string;
    mimeType: string;
    content: string | Blob;
}

export const DEFAULT_CHAT_EXPORT_OPTIONS: ChatExportOptions = {
    format: 'markdown',
    prettyJson: true,
    pngTheme: 'light',
    sections: {
        sessionMeta: true,
        userInputs: true,
        thinking: true,
        toolInputs: true,
        toolResults: true,
        finalAnswers: true,
        perfStats: true,
        modelTrace: true,
        rawTimeline: false,
    },
};

interface FilteredToolCall {
    type: string;
    status: string;
    visibility?: string;
    result_id?: string;
    summary?: unknown;
    args?: Record<string, unknown>;
    result?: unknown;
}

interface FilteredToolEvent {
    iteration: number;
    tools: string[];
    calls?: FilteredToolCall[];
}

const CHAT_EXPORT_BLOB_URL_CLEANUP_DELAY_MS = 30_000;
const CHAT_EXPORT_FALLBACK_FILE_NAME = 'chat-session';
const CHAT_EXPORT_MAX_SUMMARY_LENGTH = 42;

function cloneSerializable<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneChatExportOptions(
    options: ChatExportOptions = DEFAULT_CHAT_EXPORT_OPTIONS,
): ChatExportOptions {
    return cloneSerializable(options);
}

export function getAvailableExportRoundIndexes(
    bundle: ChatExportSessionBundle,
): number[] {
    return bundle.rounds.map((round) => round.index);
}

export function normalizeSelectedRoundIndexes(
    bundle: ChatExportSessionBundle,
    selectedRoundIndexes?: number[] | null,
): number[] {
    const availableIndexes = getAvailableExportRoundIndexes(bundle);
    if (selectedRoundIndexes == null) {
        return availableIndexes;
    }

    const availableSet = new Set(availableIndexes);
    return Array.from(
        new Set(
            selectedRoundIndexes.filter((index) => availableSet.has(index))
        )
    ).sort((left, right) => left - right);
}

export function buildPrefixExportRoundSelection(
    bundle: ChatExportSessionBundle,
    maxRoundIndex?: number | null,
): number[] {
    const availableIndexes = getAvailableExportRoundIndexes(bundle);
    if (!availableIndexes.length) {
        return [];
    }

    if (maxRoundIndex == null) {
        return availableIndexes;
    }

    return availableIndexes.filter((index) => index <= maxRoundIndex);
}

export function filterChatExportBundle(
    bundle: ChatExportSessionBundle,
    selectedRoundIndexes?: number[] | null,
): ChatExportSessionBundle {
    const normalizedIndexes = normalizeSelectedRoundIndexes(
        bundle,
        selectedRoundIndexes,
    );
    const selectedSet = new Set(normalizedIndexes);

    return {
        ...cloneSerializable(bundle),
        rounds: bundle.rounds
            .filter((round) => selectedSet.has(round.index))
            .map((round) => cloneSerializable(round)),
    };
}

function toIso(timestamp?: number): string | undefined {
    if (!timestamp) {
        return undefined;
    }
    return new Date(timestamp).toISOString();
}

function sanitizeFileComponent(text: string): string {
    const normalized = text
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!normalized) {
        return CHAT_EXPORT_FALLBACK_FILE_NAME;
    }
    return normalized
        .slice(0, CHAT_EXPORT_MAX_SUMMARY_LENGTH)
        .replace(/\s+/g, '-');
}

function stripQueryNoise(text: string): string {
    const leadingPatterns = [
        /^\s*(请你|请|帮我|帮忙|麻烦你|麻烦|能否|能不能|可以|可否)\s*/u,
        /^\s*(给我|帮我|我想知道|我想了解|想知道|想了解)\s*/u,
        /^\s*(总结|概括|概述|分析|解释|说明|说说|看看|看下|梳理|归纳)[:：\s]*/u,
    ];

    let normalized = text.trim();
    let changed = true;

    while (changed && normalized) {
        changed = false;
        for (const pattern of leadingPatterns) {
            const stripped = normalized.replace(pattern, '').trim();
            if (stripped !== normalized) {
                normalized = stripped;
                changed = true;
            }
        }
    }

    return normalized.replace(/[。！？!?,，、；;：:]+$/u, '').trim();
}

function summarizeQueryForFileName(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return '';
    }

    const firstLine = normalized.split(/\n+/u)[0] || normalized;
    const firstSentence =
        firstLine.split(/[。！？!?；;]+/u, 1)[0]?.trim() || firstLine;
    const stripped = stripQueryNoise(firstSentence) || stripQueryNoise(firstLine);
    return stripped.slice(0, CHAT_EXPORT_MAX_SUMMARY_LENGTH).trim();
}

function buildTimestampTag(timestamp: number): string {
    const date = new Date(timestamp);
    const pad = (value: number) => String(value).padStart(2, '0');
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
    ].join('') +
        '-' +
        [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('');
}

function getLatestQuery(bundle: ChatExportSessionBundle): string {
    for (let index = bundle.rounds.length - 1; index >= 0; index -= 1) {
        const query = bundle.rounds[index]?.user?.content?.trim();
        if (query) {
            return query;
        }
    }
    return bundle.session.query || bundle.session.sessionId;
}

function stringifyJson(value: unknown, pretty = true): string {
    return JSON.stringify(value, null, pretty ? 2 : 0);
}

function collapseExtraBlankLines(text: string): string {
    const normalized = text.replace(/\r\n?/g, '\n');
    const lines = normalized.split('\n');
    const collapsed: string[] = [];
    let consecutiveBlankLines = 0;

    for (const line of lines) {
        if (line.trim() === '') {
            consecutiveBlankLines += 1;
            if (consecutiveBlankLines <= 2) {
                collapsed.push('');
            }
            continue;
        }

        consecutiveBlankLines = 0;
        collapsed.push(line);
    }

    return collapsed.join('\n');
}

function normalizeExportTextContent(text?: string | null): string {
    if (!text) {
        return '';
    }

    return collapseExtraBlankLines(text);
}

function getThinkingSegments(message?: ConversationMessage): string[] {
    if (!message) {
        return [];
    }
    if (message.streamSegments?.length) {
        return message.streamSegments
            .filter((segment) => segment.type === 'thinking')
            .map((segment) => normalizeExportTextContent(segment.content || ''))
            .filter((segment) => !!segment.trim());
    }
    const content = normalizeExportTextContent(message.thinkingContent);
    return content ? [content] : [];
}

function getThinkingText(message?: ConversationMessage): string {
    return normalizeExportTextContent(getThinkingSegments(message).join('\n\n'));
}

function filterToolEvents(
    round: ChatExportRound,
    options: ChatExportOptions,
): FilteredToolEvent[] {
    if (!round.assistant?.toolEvents?.length) {
        return [];
    }
    if (!options.sections.toolInputs && !options.sections.toolResults) {
        return [];
    }

    return round.assistant.toolEvents.map((event) => ({
        iteration: event.iteration,
        tools: [...(event.tools || [])],
        calls: (event.calls || []).map((call) => {
            const filteredCall: FilteredToolCall = {
                type: call.type,
                status: call.status,
            };
            if (call.visibility) {
                filteredCall.visibility = call.visibility;
            }
            if (call.result_id) {
                filteredCall.result_id = call.result_id;
            }
            if (call.summary !== undefined) {
                filteredCall.summary = cloneSerializable(call.summary);
            }
            if (options.sections.toolInputs) {
                filteredCall.args = cloneSerializable(call.args || {});
            }
            if (options.sections.toolResults && call.result !== undefined) {
                filteredCall.result = cloneSerializable(call.result);
            }
            return filteredCall;
        }),
    }));
}

function hasAnyContent(round: Record<string, unknown>): boolean {
    return Object.keys(round).some(
        (key) => !['index', 'phase', 'status'].includes(key)
    );
}

function buildJsonRound(
    round: ChatExportRound,
    options: ChatExportOptions,
): Record<string, unknown> | null {
    const result: Record<string, unknown> = {
        index: round.index,
        phase: round.phase,
        status: round.status,
    };
    const userContent = normalizeExportTextContent(round.user?.content);
    const answerContent = normalizeExportTextContent(round.assistant?.content);

    if (round.error) {
        result.error = round.error;
    }

    if (options.sections.userInputs) {
        if (userContent) {
            result.user = {
                id: round.user?.id,
                createdAt: toIso(round.user?.createdAt),
                content: userContent,
            };
        }
    }

    if (options.sections.thinking) {
        const thinkingText = getThinkingText(round.assistant);
        const segments = getThinkingSegments(round.assistant);
        if (thinkingText) {
            result.thinking = {
                content: thinkingText,
                segmentCount: segments.length,
            };
        }
    }

    const toolEvents = filterToolEvents(round, options);
    if (toolEvents.length > 0) {
        result.toolEvents = toolEvents;
    }

    if (options.sections.finalAnswers) {
        if (answerContent) {
            result.answer = {
                id: round.assistant?.id,
                createdAt: toIso(round.assistant?.createdAt),
                content: answerContent,
            };
        }
    }

    if (options.sections.perfStats) {
        if (round.assistant?.perfStats || round.assistant?.usage) {
            result.performance = {
                perfStats: round.assistant?.perfStats || null,
                usage: round.assistant?.usage || null,
            };
        }
    }

    if (options.sections.modelTrace) {
        if (round.assistant?.usageTrace) {
            result.modelTrace = round.assistant?.usageTrace || null;
        }
    }

    if (options.sections.rawTimeline) {
        if (round.assistant?.streamSegments?.length) {
            result.rawTimeline = cloneSerializable(
                round.assistant?.streamSegments || []
            );
        }
    }

    return hasAnyContent(result) ? result : null;
}

function buildJsonExport(
    bundle: ChatExportSessionBundle,
    options: ChatExportOptions,
): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        schemaVersion: bundle.schemaVersion,
        capturedAt: toIso(bundle.capturedAt),
        exportedAt: toIso(bundle.exportedAt),
    };

    if (options.sections.sessionMeta) {
        payload.session = {
            sessionId: bundle.session.sessionId,
            historyRecordId: bundle.currentHistoryRecordId,
            mode: bundle.session.mode,
            createdAt: toIso(bundle.session.createdAt),
            currentState: {
                isLoading: bundle.session.isLoading,
                isDone: bundle.session.isDone,
                isAborted: bundle.session.isAborted,
                error: bundle.session.error,
            },
            roundCount: bundle.rounds.length,
        };
    }

    payload.rounds = bundle.rounds
        .map((round) => buildJsonRound(round, options))
        .filter(Boolean);

    return payload;
}

function appendCodeBlock(lines: string[], language: string, content: string) {
    lines.push(`\`\`\`${language}`);
    lines.push(content || '');
    lines.push('```');
    lines.push('');
}

function appendMarkdownToolEvents(
    lines: string[],
    round: ChatExportRound,
    options: ChatExportOptions,
) {
    const toolEvents = filterToolEvents(round, options);
    if (!toolEvents.length) {
        return;
    }

    lines.push('### 工具调用');
    lines.push('');

    for (const event of toolEvents) {
        lines.push(`#### Iteration ${event.iteration}`);
        lines.push('');
        if (!event.calls?.length) {
            lines.push(`- 工具: ${(event.tools || []).join(', ') || '无'}`);
            lines.push('');
            continue;
        }
        event.calls.forEach((call, index) => {
            lines.push(`##### ${index + 1}. ${call.type} (${call.status})`);
            lines.push('');
            if (options.sections.toolInputs && call.args !== undefined) {
                lines.push('输入:');
                appendCodeBlock(lines, 'json', stringifyJson(call.args, true));
            }
            if (options.sections.toolResults && call.result !== undefined) {
                lines.push('结果:');
                appendCodeBlock(lines, 'json', stringifyJson(call.result, true));
            }
        });
    }
}

function buildMarkdownExport(
    bundle: ChatExportSessionBundle,
    options: ChatExportOptions,
): string {
    const lines: string[] = ['# Chat Session Export', ''];

    if (options.sections.sessionMeta) {
        lines.push('## Session');
        lines.push(`- Session ID: ${bundle.session.sessionId}`);
        lines.push(`- Mode: ${bundle.session.mode}`);
        lines.push(`- Captured At: ${toIso(bundle.capturedAt) || ''}`);
        lines.push(`- Exported At: ${toIso(bundle.exportedAt) || ''}`);
        lines.push(`- Rounds: ${bundle.rounds.length}`);
        lines.push(`- Current Status: ${bundle.session.isLoading ? 'in-progress' : bundle.session.isAborted ? 'aborted' : bundle.session.error ? 'error' : bundle.session.isDone ? 'completed' : 'idle'}`);
        if (bundle.currentHistoryRecordId) {
            lines.push(`- History Record ID: ${bundle.currentHistoryRecordId}`);
        }
        if (bundle.session.error) {
            lines.push(`- Current Error: ${bundle.session.error}`);
        }
        lines.push('');
    }

    bundle.rounds.forEach((round) => {
        const userContent = normalizeExportTextContent(round.user?.content);
        const answerContent = normalizeExportTextContent(round.assistant?.content);

        lines.push(`## Round ${round.index}${round.phase === 'current' ? ' (current)' : ''}`);
        lines.push(`- Status: ${round.status}`);
        if (round.error) {
            lines.push(`- Error: ${round.error}`);
        }
        lines.push('');

        if (options.sections.userInputs && userContent) {
            lines.push('### 用户输入');
            lines.push('');
            appendCodeBlock(lines, 'text', userContent);
        }

        if (options.sections.thinking) {
            const thinkingSegments = getThinkingSegments(round.assistant);
            if (thinkingSegments.length) {
                lines.push('### 思考过程');
                lines.push('');
                if (thinkingSegments.length === 1) {
                    appendCodeBlock(lines, 'text', thinkingSegments[0] || '');
                } else {
                    thinkingSegments.forEach((segment, index) => {
                        lines.push(`#### Segment ${index + 1}`);
                        lines.push('');
                        appendCodeBlock(lines, 'text', segment);
                    });
                }
            }
        }

        if (options.sections.toolInputs || options.sections.toolResults) {
            appendMarkdownToolEvents(lines, round, options);
        }

        if (options.sections.finalAnswers && answerContent) {
            lines.push('### 最终回答');
            lines.push('');
            appendCodeBlock(lines, 'markdown', answerContent);
        }

        if (options.sections.perfStats) {
            if (round.assistant?.perfStats || round.assistant?.usage) {
                lines.push('### 性能与用量');
                lines.push('');
                appendCodeBlock(
                    lines,
                    'json',
                    stringifyJson(
                        {
                            perfStats: round.assistant?.perfStats || null,
                            usage: round.assistant?.usage || null,
                        },
                        true,
                    ),
                );
            }
        }

        if (options.sections.modelTrace && round.assistant?.usageTrace) {
            lines.push('### 模型轨迹');
            lines.push('');
            appendCodeBlock(
                lines,
                'json',
                stringifyJson(round.assistant?.usageTrace || null, true),
            );
        }

        if (options.sections.rawTimeline && round.assistant?.streamSegments?.length) {
            lines.push('### 原始时间线');
            lines.push('');
            appendCodeBlock(
                lines,
                'json',
                stringifyJson(round.assistant?.streamSegments || [], true),
            );
        }
    });

    return lines.join('\n').trimEnd() + '\n';
}

function buildChatExportSummary(bundle: ChatExportSessionBundle): string {
    const candidates = [
        getLatestQuery(bundle),
        bundle.session.query,
        bundle.rounds[0]?.user?.content || '',
        bundle.session.sessionId,
    ];

    for (const candidate of candidates) {
        const summary = summarizeQueryForFileName(candidate || '');
        if (summary) {
            return sanitizeFileComponent(summary);
        }
    }

    return CHAT_EXPORT_FALLBACK_FILE_NAME;
}

export function buildChatExportFileName(
    bundle: ChatExportSessionBundle,
    format: ChatExportFormat,
): string {
    const query = buildChatExportSummary(bundle);
    const timestamp = buildTimestampTag(bundle.exportedAt);
    const extension =
        format === 'markdown' ? 'md' : format === 'json' ? 'json' : 'png';
    return `${query}-${timestamp}.${extension}`;
}

const PNG_EXPORT_WIDTH = 920;
const PNG_EXPORT_PADDING_X = 36;
const PNG_EXPORT_PADDING_Y = 34;
const PNG_EXPORT_MAX_HEIGHT = 32767;

const PNG_EXPORT_THEME: Record<ChatExportPngTheme, Record<string, string>> = {
    light: {
        background: '#f6f8fb',
        panel: '#ffffff',
        subtlePanel: '#f8fafc',
        foreground: '#202939',
        muted: '#667085',
        heading: '#111827',
        border: 'rgba(15, 23, 42, 0.10)',
        accent: '#0f8fb8',
        userBackground: 'rgba(128, 128, 128, 0.042)',
        codeBackground: 'rgba(15, 23, 42, 0.055)',
    },
    dark: {
        background: '#0f141d',
        panel: '#161c27',
        subtlePanel: 'rgba(255, 255, 255, 0.035)',
        foreground: 'rgba(245, 247, 250, 0.92)',
        muted: 'rgba(245, 247, 250, 0.58)',
        heading: '#f8fafc',
        border: 'rgba(255, 255, 255, 0.10)',
        accent: '#23ade5',
        userBackground: 'rgba(255, 255, 255, 0.055)',
        codeBackground: 'rgba(255, 255, 255, 0.08)',
    },
};

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
                return;
            }
            reject(new Error('PNG 生成失败'));
        }, 'image/png');
    });
}

function escapeExportHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function summarizeToolResult(call: FilteredToolCall): string {
    const result = call.result as Record<string, unknown> | undefined;
    if (!result) {
        return call.status;
    }

    if (Array.isArray(result.hits)) {
        return `${result.hits.length} 条视频结果`;
    }
    if (Array.isArray(result.owners)) {
        return `${result.owners.length} 位作者`;
    }
    if (Array.isArray(result.results)) {
        const total = result.results.reduce((count, item) => {
            const hits = (item as { hits?: unknown[] }).hits;
            return count + (Array.isArray(hits) ? hits.length : 0);
        }, 0);
        return `${total} 条视频结果`;
    }
    const transcript = result.transcript as { text_length?: number; text?: string } | undefined;
    if (transcript?.text_length || transcript?.text) {
        return `转写 ${transcript.text_length || transcript.text?.length || 0} 字`;
    }
    if (typeof result.result === 'string') {
        return result.result.slice(0, 80);
    }
    return call.status;
}

function appendExportToolHtml(
    parts: string[],
    round: ChatExportRound,
    options: ChatExportOptions,
) {
    const toolEvents = filterToolEvents(round, options);
    if (!toolEvents.length) {
        return;
    }

    parts.push('<div class="export-tool-stack">');
    for (const event of toolEvents) {
        for (const call of event.calls || []) {
            const args = options.sections.toolInputs
                ? formatToolArgsForExport(call.args || {})
                : '';
            parts.push(
                `<div class="export-tool-card"><div class="export-tool-head"><span class="export-tool-icon">◆</span><span class="export-tool-name">${escapeExportHtml(call.type)}</span><span class="export-tool-status">${escapeExportHtml(call.status)}</span></div>`
            );
            if (args) {
                parts.push(`<div class="export-tool-args">${escapeExportHtml(args)}</div>`);
            }
            if (options.sections.toolResults) {
                parts.push(`<div class="export-tool-result">${escapeExportHtml(summarizeToolResult(call))}</div>`);
            }
            parts.push('</div>');
        }
    }
    parts.push('</div>');
}

function formatToolArgsForExport(args: Record<string, unknown>): string {
    const entries = Object.entries(args)
        .filter(([, value]) => value != null && value !== '')
        .slice(0, 4)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`);
    return entries.join(' · ');
}

function renderExportMarkdown(content: string): string {
    return renderMarkdown(normalizeExportTextContent(content || ''));
}

function buildPngExportHtml(
    bundle: ChatExportSessionBundle,
    options: ChatExportOptions,
    theme: ChatExportPngTheme,
): string {
    const palette = PNG_EXPORT_THEME[theme];
    const parts: string[] = [];
    parts.push(
        `<div class="chat-export-image chat-export-image--${theme}" xmlns="http://www.w3.org/1999/xhtml">`
    );
    parts.push(`<style>
      * { box-sizing: border-box; }
      .chat-export-image {
        width: ${PNG_EXPORT_WIDTH}px;
        padding: ${PNG_EXPORT_PADDING_Y}px ${PNG_EXPORT_PADDING_X}px;
        background: ${palette.background};
        color: ${palette.foreground};
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 16px;
        line-height: 1.65;
      }
      .export-session-title {
        margin: 0 0 18px;
        color: ${palette.heading};
        font-size: 18px;
        font-weight: 650;
      }
      .export-round { margin: 0 0 24px; }
      .export-user-query {
        margin: 0 0 12px;
        padding: 10px 14px;
        border: 1px solid ${palette.border};
        border-radius: 10px;
        background: ${palette.userBackground};
        color: ${palette.foreground};
        font-weight: 560;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .export-answer-card,
      .export-thinking-card,
      .export-tool-card {
        border: 1px solid ${palette.border};
        border-radius: 10px;
        background: ${palette.panel};
      }
      .export-answer-card { padding: 14px 16px; }
      .export-thinking-card {
        margin: 0 0 10px;
        padding: 10px 12px;
        background: ${palette.subtlePanel};
        color: ${palette.muted};
        font-size: 14px;
      }
      .export-tool-stack {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 0 0 12px;
      }
      .export-tool-card {
        padding: 9px 11px;
        background: ${palette.subtlePanel};
        font-size: 13px;
      }
      .export-tool-head {
        display: flex;
        align-items: center;
        gap: 8px;
        color: ${palette.foreground};
        font-weight: 600;
      }
      .export-tool-icon { color: ${palette.accent}; font-size: 10px; }
      .export-tool-status {
        margin-left: auto;
        color: ${palette.muted};
        font-weight: 500;
      }
      .export-tool-args,
      .export-tool-result {
        margin-top: 4px;
        color: ${palette.muted};
        word-break: break-word;
      }
      .export-perf {
        margin-top: 8px;
        color: ${palette.muted};
        font-size: 12px;
      }
      .markdown-body { color: ${palette.foreground}; }
      .markdown-body :first-child { margin-top: 0; }
      .markdown-body :last-child { margin-bottom: 0; }
      .markdown-body p { margin: 0 0 10px; }
      .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 {
        margin: 16px 0 8px;
        color: ${palette.heading};
        line-height: 1.35;
      }
      .markdown-body h1 { font-size: 24px; }
      .markdown-body h2 { font-size: 21px; }
      .markdown-body h3 { font-size: 18px; }
      .markdown-body h4 { font-size: 16px; }
      .markdown-body ul, .markdown-body ol { margin: 8px 0 12px; padding-left: 24px; }
      .markdown-body li { margin: 4px 0; }
      .markdown-body a { color: ${palette.accent}; text-decoration: none; }
      .markdown-body code {
        padding: 2px 5px;
        border-radius: 5px;
        background: ${palette.codeBackground};
        color: ${palette.accent};
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      .markdown-body pre {
        overflow-wrap: anywhere;
        white-space: pre-wrap;
        padding: 10px 12px;
        border-radius: 8px;
        background: ${palette.codeBackground};
      }
      .markdown-body blockquote {
        margin: 8px 0;
        padding: 6px 12px;
        border-left: 3px solid ${palette.border};
        color: ${palette.muted};
      }
    </style>`);

    if (options.sections.sessionMeta) {
        parts.push(
            `<div class="export-session-title">${escapeExportHtml(getLatestQuery(bundle))}</div>`
        );
    }

    bundle.rounds.forEach((round) => {
        const userContent = normalizeExportTextContent(round.user?.content);
        const answerContent = normalizeExportTextContent(round.assistant?.content);
        parts.push('<section class="export-round">');
        if (options.sections.userInputs && userContent) {
            parts.push(`<div class="export-user-query">${escapeExportHtml(userContent)}</div>`);
        }
        if (options.sections.thinking) {
            const thinkingText = getThinkingText(round.assistant);
            if (thinkingText) {
                parts.push(`<div class="export-thinking-card">${escapeExportHtml(thinkingText.slice(0, 900))}</div>`);
            }
        }
        if (options.sections.toolInputs || options.sections.toolResults) {
            appendExportToolHtml(parts, round, options);
        }
        if (options.sections.finalAnswers && answerContent) {
            parts.push(`<div class="export-answer-card markdown-body">${renderExportMarkdown(answerContent)}</div>`);
        }
        if (options.sections.perfStats && (round.assistant?.perfStats || round.assistant?.usage)) {
            const stats = round.assistant?.perfStats;
            const usage = round.assistant?.usage;
            parts.push(
                `<div class="export-perf">${escapeExportHtml([
                    stats?.total_elapsed ? `用时 ${stats.total_elapsed}` : '',
                    usage?.prompt_tokens ? `输入 ${usage.prompt_tokens} tokens` : '',
                    usage?.completion_tokens ? `输出 ${usage.completion_tokens} tokens` : '',
                ].filter(Boolean).join(' · '))}</div>`
            );
        }
        parts.push('</section>');
    });

    parts.push('</div>');
    return parts.join('');
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('PNG 渲染失败'));
        image.src = src;
    });
}

function drawRoundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: string,
    stroke?: string,
) {
    context.beginPath();
    if (typeof context.roundRect === 'function') {
        context.roundRect(x, y, width, height, radius);
    } else {
        const r = Math.min(radius, width / 2, height / 2);
        context.moveTo(x + r, y);
        context.arcTo(x + width, y, x + width, y + height, r);
        context.arcTo(x + width, y + height, x, y + height, r);
        context.arcTo(x, y + height, x, y, r);
        context.arcTo(x, y, x + width, y, r);
    }
    context.fillStyle = fill;
    context.fill();
    if (stroke) {
        context.strokeStyle = stroke;
        context.lineWidth = 1;
        context.stroke();
    }
}

function stripMarkdownForPng(text: string): string {
    return text
        .replace(/^#{1,6}\s+/u, '')
        .replace(/^[-*+]\s+/u, '• ')
        .replace(/\*\*([^*]+)\*\*/gu, '$1')
        .replace(/`([^`]+)`/gu, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1');
}

function wrapCanvasText(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
): string[] {
    const normalized = text || '';
    if (!normalized) return [''];
    const rows: string[] = [];
    let current = '';
    for (const char of normalized) {
        const candidate = current + char;
        if (current && context.measureText(candidate).width > maxWidth) {
            rows.push(current.trimEnd());
            current = char.trimStart();
            continue;
        }
        current = candidate;
    }
    if (current) rows.push(current.trimEnd());
    return rows.length ? rows : [''];
}

function drawWrappedText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
): number {
    const paragraphs = text.split('\n');
    let currentY = y;
    paragraphs.forEach((paragraph, index) => {
        const line = stripMarkdownForPng(paragraph);
        const rows = wrapCanvasText(context, line, maxWidth);
        rows.forEach((row) => {
            if (row) context.fillText(row, x, currentY);
            currentY += lineHeight;
        });
        if (index < paragraphs.length - 1) {
            currentY += Math.round(lineHeight * 0.35);
        }
    });
    return currentY;
}

function measureWrappedTextHeight(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    lineHeight: number,
): number {
    return text.split('\n').reduce((height, paragraph, index, list) => {
        const rows = wrapCanvasText(context, stripMarkdownForPng(paragraph), maxWidth);
        return height + rows.length * lineHeight + (index < list.length - 1 ? Math.round(lineHeight * 0.35) : 0);
    }, 0);
}

function buildPngRoundCanvasRows(
    bundle: ChatExportSessionBundle,
    options: ChatExportOptions,
): Array<{ kind: 'user' | 'thinking' | 'tool' | 'answer' | 'meta'; text: string }> {
    const rows: Array<{ kind: 'user' | 'thinking' | 'tool' | 'answer' | 'meta'; text: string }> = [];
    if (options.sections.sessionMeta) {
        rows.push({ kind: 'meta', text: getLatestQuery(bundle) });
    }
    bundle.rounds.forEach((round) => {
        const userContent = normalizeExportTextContent(round.user?.content);
        const answerContent = normalizeExportTextContent(round.assistant?.content);
        if (options.sections.userInputs && userContent) {
            rows.push({ kind: 'user', text: userContent });
        }
        if (options.sections.thinking) {
            const thinkingText = getThinkingText(round.assistant);
            if (thinkingText) {
                rows.push({ kind: 'thinking', text: thinkingText.slice(0, 900) });
            }
        }
        if (options.sections.toolInputs || options.sections.toolResults) {
            filterToolEvents(round, options).forEach((event) => {
                (event.calls || []).forEach((call) => {
                    const args = options.sections.toolInputs ? formatToolArgsForExport(call.args || {}) : '';
                    const result = options.sections.toolResults ? summarizeToolResult(call) : '';
                    rows.push({
                        kind: 'tool',
                        text: [call.type, args, result].filter(Boolean).join('\n'),
                    });
                });
            });
        }
        if (options.sections.finalAnswers && answerContent) {
            rows.push({ kind: 'answer', text: answerContent });
        }
    });
    return rows;
}

async function buildCanvasPngExport(
    bundle: ChatExportSessionBundle,
    options: ChatExportOptions,
): Promise<Blob> {
    const theme = options.pngTheme === 'dark' ? 'dark' : 'light';
    const palette = PNG_EXPORT_THEME[theme];
    const measureCanvas = document.createElement('canvas');
    const measureContext = measureCanvas.getContext('2d');
    if (!measureContext) throw new Error('当前浏览器不支持 Canvas 导出');
    const rows = buildPngRoundCanvasRows(bundle, options);
    const contentWidth = PNG_EXPORT_WIDTH - PNG_EXPORT_PADDING_X * 2;
    const cardPadding = 16;
    const textWidth = contentWidth - cardPadding * 2;
    const lineHeight = 27;
    let totalHeight = PNG_EXPORT_PADDING_Y * 2;

    rows.forEach((row) => {
        measureContext.font =
            row.kind === 'meta'
                ? '650 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                : '400 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const height = measureWrappedTextHeight(measureContext, row.text, textWidth, lineHeight);
        totalHeight += row.kind === 'meta' ? height + 18 : height + cardPadding * 2 + 12;
    });

    const canvas = document.createElement('canvas');
    canvas.width = PNG_EXPORT_WIDTH;
    canvas.height = Math.min(PNG_EXPORT_MAX_HEIGHT, Math.max(240, Math.ceil(totalHeight)));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器不支持 Canvas 导出');
    context.fillStyle = palette.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textBaseline = 'top';

    let y = PNG_EXPORT_PADDING_Y;
    rows.forEach((row) => {
        const isMeta = row.kind === 'meta';
        const fill =
            row.kind === 'user'
                ? palette.userBackground
                : row.kind === 'thinking' || row.kind === 'tool'
                    ? palette.subtlePanel
                    : palette.panel;
        context.font = isMeta
            ? '650 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            : row.kind === 'tool'
                ? '400 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
                : '400 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        context.fillStyle = isMeta ? palette.heading : palette.foreground;
        const height = measureWrappedTextHeight(
            context,
            row.text,
            textWidth,
            row.kind === 'tool' ? 23 : lineHeight
        );
        if (isMeta) {
            drawWrappedText(context, row.text, PNG_EXPORT_PADDING_X, y, contentWidth, lineHeight + 2);
            y += height + 18;
            return;
        }
        drawRoundedRect(
            context,
            PNG_EXPORT_PADDING_X,
            y,
            contentWidth,
            height + cardPadding * 2,
            10,
            fill,
            palette.border
        );
        context.fillStyle =
            row.kind === 'thinking' || row.kind === 'tool' ? palette.muted : palette.foreground;
        drawWrappedText(
            context,
            row.text,
            PNG_EXPORT_PADDING_X + cardPadding,
            y + cardPadding,
            textWidth,
            row.kind === 'tool' ? 23 : lineHeight
        );
        y += height + cardPadding * 2 + 12;
    });

    return canvasToPngBlob(canvas);
}

async function buildPngExport(
    bundle: ChatExportSessionBundle,
    options: ChatExportOptions,
): Promise<Blob> {
    if (
        typeof document === 'undefined' ||
        typeof XMLSerializer === 'undefined' ||
        typeof Image === 'undefined' ||
        typeof URL === 'undefined' ||
        typeof Blob === 'undefined'
    ) {
        throw new Error('当前环境不支持 PNG 导出');
    }

    const theme = options.pngTheme === 'dark' ? 'dark' : 'light';
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-10000px';
    host.style.top = '0';
    host.style.width = `${PNG_EXPORT_WIDTH}px`;
    host.style.pointerEvents = 'none';
    host.innerHTML = buildPngExportHtml(bundle, options, theme);
    document.body.append(host);
    const exportNode = host.firstElementChild as HTMLElement | null;
    if (!exportNode) {
        host.remove();
        throw new Error('PNG 导出内容为空');
    }
    const measuredHeight = Math.ceil(
        Math.max(exportNode.scrollHeight, exportNode.getBoundingClientRect().height)
    );
    const height = Math.min(PNG_EXPORT_MAX_HEIGHT, Math.max(240, measuredHeight));
    const xhtml = new XMLSerializer().serializeToString(exportNode);
    host.remove();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PNG_EXPORT_WIDTH}" height="${height}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
    const objectUrl = URL.createObjectURL(
        new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    );
    try {
        const image = await loadImage(objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = PNG_EXPORT_WIDTH;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('当前浏览器不支持 Canvas 导出');
        }
        context.drawImage(image, 0, 0);
        return await canvasToPngBlob(canvas);
    } catch {
        return buildCanvasPngExport(bundle, options);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export function generateChatExport(
    bundle: ChatExportSessionBundle,
    options: ChatExportOptions,
): GeneratedChatExport {
    const normalized = cloneChatExportOptions(options);
    const fileName = buildChatExportFileName(bundle, normalized.format);

    if (normalized.format === 'json') {
        const payload = buildJsonExport(bundle, normalized);
        return {
            fileName,
            mimeType: 'application/json;charset=utf-8',
            content: stringifyJson(payload, normalized.prettyJson),
        };
    }

    if (normalized.format === 'png') {
        throw new Error('PNG 导出需要使用异步生成流程');
    }

    return {
        fileName,
        mimeType: 'text/markdown;charset=utf-8',
        content: buildMarkdownExport(bundle, normalized),
    };
}

export async function generateChatExportFile(
    bundle: ChatExportSessionBundle,
    options: ChatExportOptions,
): Promise<GeneratedChatExport> {
    const normalized = cloneChatExportOptions(options);
    const fileName = buildChatExportFileName(bundle, normalized.format);

    if (normalized.format !== 'png') {
        return generateChatExport(bundle, normalized);
    }

    return {
        fileName,
        mimeType: 'image/png',
        content: await buildPngExport(bundle, normalized),
    };
}

function downloadChatExportWithBlobUrl(generated: GeneratedChatExport): boolean {
    if (
        typeof window === 'undefined' ||
        typeof document === 'undefined' ||
        !document.body ||
        typeof Blob === 'undefined' ||
        typeof URL === 'undefined' ||
        typeof URL.createObjectURL !== 'function'
    ) {
        return false;
    }

    const contentBlob =
        generated.content instanceof Blob
            ? generated.content
            : new Blob([generated.content], { type: generated.mimeType });
    const objectUrl = URL.createObjectURL(contentBlob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = generated.fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';

    document.body.append(anchor);

    try {
        anchor.click();
        window.setTimeout(() => {
            anchor.remove();
            URL.revokeObjectURL(objectUrl);
        }, CHAT_EXPORT_BLOB_URL_CLEANUP_DELAY_MS);
        return true;
    } catch {
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
        return false;
    }
}

export function triggerChatExportDownload(
    generated: GeneratedChatExport,
): GeneratedChatExport {
    if (typeof document === 'undefined') {
        return generated;
    }

    if (downloadChatExportWithBlobUrl(generated)) {
        return generated;
    }

    if (generated.content instanceof Blob) {
        throw new Error('当前浏览器无法下载 PNG 导出文件');
    }

    const exportResult = exportFile(generated.fileName, generated.content, {
        mimeType: generated.mimeType,
    });
    if (exportResult !== true) {
        throw exportResult instanceof Error
            ? exportResult
            : new Error(String(exportResult));
    }

    return generated;
}

export function countExportToolCalls(bundle: ChatExportSessionBundle): number {
    return bundle.rounds.reduce((count, round) => {
        const toolCallCount = round.assistant?.toolEvents?.reduce(
            (innerCount, event) => innerCount + (event.calls?.length || 0),
            0,
        ) || 0;
        return count + toolCallCount;
    }, 0);
}
