import type { ToolCall } from 'src/services/chatService';

const formatScalarArg = (value: string | number | boolean): string => {
    if (typeof value === 'string') {
        return JSON.stringify(value);
    }
    return String(value);
};

const formatArgValue = (value: unknown): string => {
    if (value == null) {
        return 'null';
    }
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return formatScalarArg(value);
    }
    if (Array.isArray(value)) {
        return JSON.stringify(value);
    }
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

export const formatToolCallArgs = (call: Pick<ToolCall, 'type' | 'args'>): string => {
    if (call.type === 'search_videos') {
        return '';
    }

    const entries = Object.entries(call.args || {}).filter(([, value]) => value != null);
    if (entries.length === 0) {
        return '';
    }

    if (entries.length === 1 && typeof entries[0][1] === 'string') {
        return formatScalarArg(entries[0][1]);
    }

    return entries
        .map(([key, value]) => `${key}=${formatArgValue(value)}`)
        .join(', ');
};