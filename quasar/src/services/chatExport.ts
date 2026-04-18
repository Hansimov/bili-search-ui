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
    includeEmptySections: boolean;
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
    includeEmptySections: false,
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

function cloneSerializable<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

export function cloneChatExportOptions(
    options: ChatExportOptions = DEFAULT_CHAT_EXPORT_OPTIONS,
): ChatExportOptions {
    return cloneSerializable(options);
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
        return 'chat-session';
    }
    return normalized.slice(0, 36).replace(/\s+/g, '-');
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

function getThinkingSegments(message?: ConversationMessage): string[] {
    if (!message) {
        return [];
    }
    if (message.streamSegments?.length) {
        return message.streamSegments
            .filter((segment) => segment.type === 'thinking' && !!segment.content?.trim())
            .map((segment) => segment.content?.trim() || '');
    }
    const content = message.thinkingContent?.trim();
    return content ? [content] : [];
}

function getThinkingText(message?: ConversationMessage): string {
    return getThinkingSegments(message).join('\n\n');
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
        (key) => !['index', 'phase', 'status', 'error'].includes(key)
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

    if (round.error) {
        result.error = round.error;
    }

    if (options.sections.userInputs) {
        if (round.user?.content || options.includeEmptySections) {
            result.user = {
                id: round.user?.id,
                createdAt: toIso(round.user?.createdAt),
                content: round.user?.content || '',
            };
        }
    }

    if (options.sections.thinking) {
        const thinkingText = getThinkingText(round.assistant);
        const segments = getThinkingSegments(round.assistant);
        if (thinkingText || options.includeEmptySections) {
            result.thinking = {
                content: thinkingText,
                segmentCount: segments.length,
            };
        }
    }

    const toolEvents = filterToolEvents(round, options);
    if (toolEvents.length > 0 || options.includeEmptySections) {
        if (toolEvents.length > 0 || options.sections.toolInputs || options.sections.toolResults) {
            result.toolEvents = toolEvents;
        }
    }

    if (options.sections.finalAnswers) {
        if (round.assistant?.content || options.includeEmptySections) {
            result.answer = {
                id: round.assistant?.id,
                createdAt: toIso(round.assistant?.createdAt),
                content: round.assistant?.content || '',
            };
        }
    }

    if (options.sections.perfStats) {
        if (
            round.assistant?.perfStats ||
            round.assistant?.usage ||
            options.includeEmptySections
        ) {
            result.performance = {
                perfStats: round.assistant?.perfStats || null,
                usage: round.assistant?.usage || null,
            };
        }
    }

    if (options.sections.modelTrace) {
        if (round.assistant?.usageTrace || options.includeEmptySections) {
            result.modelTrace = round.assistant?.usageTrace || null;
        }
    }

    if (options.sections.rawTimeline) {
        if (round.assistant?.streamSegments || options.includeEmptySections) {
            result.rawTimeline = cloneSerializable(
                round.assistant?.streamSegments || []
            );
        }
    }

    return hasAnyContent(result) || options.includeEmptySections ? result : null;
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
    if (!toolEvents.length && !options.includeEmptySections) {
        return;
    }

    lines.push('### 工具调用');
    lines.push('');

    if (!toolEvents.length) {
        lines.push('_无_');
        lines.push('');
        return;
    }

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
        lines.push(`## Round ${round.index}${round.phase === 'current' ? ' (current)' : ''}`);
        lines.push(`- Status: ${round.status}`);
        if (round.error) {
            lines.push(`- Error: ${round.error}`);
        }
        lines.push('');

        if (options.sections.userInputs && (round.user?.content || options.includeEmptySections)) {
            lines.push('### 用户输入');
            lines.push('');
            appendCodeBlock(lines, 'text', round.user?.content || '');
        }

        if (options.sections.thinking) {
            const thinkingSegments = getThinkingSegments(round.assistant);
            if (thinkingSegments.length || options.includeEmptySections) {
                lines.push('### 思考过程');
                lines.push('');
                if (!thinkingSegments.length) {
                    lines.push('_无_');
                    lines.push('');
                } else if (thinkingSegments.length === 1) {
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

        if (options.sections.finalAnswers && (round.assistant?.content || options.includeEmptySections)) {
            lines.push('### 最终回答');
            lines.push('');
            appendCodeBlock(lines, 'markdown', round.assistant?.content || '');
        }

        if (options.sections.perfStats) {
            if (round.assistant?.perfStats || round.assistant?.usage || options.includeEmptySections) {
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

        if (options.sections.modelTrace && (round.assistant?.usageTrace || options.includeEmptySections)) {
            lines.push('### 模型轨迹');
            lines.push('');
            appendCodeBlock(
                lines,
                'json',
                stringifyJson(round.assistant?.usageTrace || null, true),
            );
        }

        if (options.sections.rawTimeline && (round.assistant?.streamSegments || options.includeEmptySections)) {
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

export function buildChatExportFileName(
    bundle: ChatExportSessionBundle,
    format: ChatExportFormat,
): string {
    const query = sanitizeFileComponent(getLatestQuery(bundle));
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

export function triggerChatExportDownload(
    generated: GeneratedChatExport,
): GeneratedChatExport {
    if (typeof document === 'undefined') {
        return generated;
    }

    const blob = new Blob([generated.content], { type: generated.mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = generated.fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
    }, 0);
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