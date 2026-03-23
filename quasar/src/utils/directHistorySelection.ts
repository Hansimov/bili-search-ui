const DIRECT_HISTORY_SELECTION_KEY = 'direct-history-selection.v1';

interface DirectHistorySelection {
    recordId: string;
    query: string;
}

const getSessionStorage = (): Storage | null => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return null;
    }
    return window.sessionStorage;
};

export const saveDirectHistorySelection = (
    recordId: string,
    query: string
): void => {
    const storage = getSessionStorage();
    const trimmedQuery = query.trim();

    if (!storage || !recordId || !trimmedQuery) {
        return;
    }

    const selection: DirectHistorySelection = {
        recordId,
        query: trimmedQuery,
    };

    storage.setItem(
        DIRECT_HISTORY_SELECTION_KEY,
        JSON.stringify(selection)
    );
};

export const readDirectHistorySelection = (): DirectHistorySelection | null => {
    const storage = getSessionStorage();
    if (!storage) {
        return null;
    }

    const raw = storage.getItem(DIRECT_HISTORY_SELECTION_KEY);
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<DirectHistorySelection>;
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

    storage.removeItem(DIRECT_HISTORY_SELECTION_KEY);
    return null;
};

export const getDirectHistorySelectionRecordId = (
    query?: string | null
): string | null => {
    const selection = readDirectHistorySelection();
    const trimmedQuery = query?.trim();

    if (!selection) {
        return null;
    }

    if (trimmedQuery && selection.query !== trimmedQuery) {
        return null;
    }

    return selection.recordId;
};

export const clearDirectHistorySelection = (): void => {
    const storage = getSessionStorage();
    storage?.removeItem(DIRECT_HISTORY_SELECTION_KEY);
};