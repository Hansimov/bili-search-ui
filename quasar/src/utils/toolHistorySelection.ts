const TOOL_HISTORY_SELECTION_KEY = 'tool-history-selection.v1';

interface ToolHistorySelection {
    recordId: string;
    query: string;
}

const getSessionStorage = (): Storage | null => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return null;
    }
    return window.sessionStorage;
};

export const saveToolHistorySelection = (
    recordId: string,
    query: string
): void => {
    const storage = getSessionStorage();
    const trimmedQuery = query.trim();

    if (!storage || !recordId || !trimmedQuery) {
        return;
    }

    const selection: ToolHistorySelection = {
        recordId,
        query: trimmedQuery,
    };

    storage.setItem(
        TOOL_HISTORY_SELECTION_KEY,
        JSON.stringify(selection)
    );
};

export const readToolHistorySelection = (): ToolHistorySelection | null => {
    const storage = getSessionStorage();
    if (!storage) {
        return null;
    }

    const raw = storage.getItem(TOOL_HISTORY_SELECTION_KEY);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<ToolHistorySelection>;
        if (
            typeof parsed.recordId === 'string' &&
            parsed.recordId &&
            typeof parsed.query === 'string' &&
            parsed.query.trim()
        ) {
            return {
                recordId: parsed.recordId,
                query: parsed.query.trim(),
            };
        }
    } catch {
        // Ignore malformed persisted data and clear it below.
    }

    storage.removeItem(TOOL_HISTORY_SELECTION_KEY);
    return null;
};

export const getToolHistorySelectionRecordId = (
    query?: string | null
): string | null => {
    const selection = readToolHistorySelection();
    const trimmedQuery = query?.trim();

    if (!selection) {
        return null;
    }

    if (trimmedQuery && selection.query !== trimmedQuery) {
        return null;
    }

    return selection.recordId;
};

export const clearToolHistorySelection = (): void => {
    const storage = getSessionStorage();
    storage?.removeItem(TOOL_HISTORY_SELECTION_KEY);
};
