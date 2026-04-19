import { exportFile } from 'quasar';

import type {
    ChatExportRound,
    ChatExportSessionBundle,
    ConversationMessage,
} from 'src/stores/chatStore';

export type ChatExportFormat = 'markdown' | 'json';

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
    sections: ChatExportSections;
}

export interface GeneratedChatExport {
    fileName: string;
    mimeType: string;
    content: string;
}

export const DEFAULT_CHAT_EXPORT_OPTIONS: ChatExportOptions = {
    format: 'markdown',
    prettyJson: true,
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
    const extension = format === 'markdown' ? 'md' : 'json';
    return `${query}-${timestamp}.${extension}`;
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

    return {
        fileName,
        mimeType: 'text/markdown;charset=utf-8',
        content: buildMarkdownExport(bundle, normalized),
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

    const objectUrl = URL.createObjectURL(
        new Blob([generated.content], { type: generated.mimeType })
    );
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