import { defineStore } from 'pinia';
import { getSmartSuggestService } from 'src/services/smartSuggestService';
import type { SearchMode } from 'src/config/searchModes';

export type InputHistoryKind = 'chat' | 'utility';

export interface InputHistoryItem {
    id: string;
    query: string;
    timestamp: number;
    kind: InputHistoryKind;
}

const INPUT_HISTORY_KEY = 'input-history.v1';
const MAX_INPUT_HISTORY_ITEMS = 200;

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeQuery(query: string): string {
    return (query || '').trim().replace(/\s+/g, ' ');
}

function normalizeInputHistoryKind(
    kindOrMode?: InputHistoryKind | SearchMode | string | null,
    query?: string
): InputHistoryKind {
    if (kindOrMode === 'utility' || kindOrMode === 'tool') return 'utility';
    if (kindOrMode === 'chat' || kindOrMode === 'smart' || kindOrMode === 'think' || kindOrMode === 'research') {
        return 'chat';
    }
    const normalizedQuery = normalizeQuery(query || '');
    return normalizedQuery.startsWith('/') || normalizedQuery.startsWith('、') || normalizedQuery.startsWith('\\')
        ? 'utility'
        : 'chat';
}

function queryKey(query: string, kind: InputHistoryKind): string {
    return `${kind}:${normalizeQuery(query).toLowerCase()}`;
}

function dedupeHistoryItems(items: InputHistoryItem[]): InputHistoryItem[] {
    const seen = new Set<string>();
    const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);

    return sorted.filter((item) => {
        const key = queryKey(item.query, item.kind);
        if (!key || seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function syncSuggestHistoryIndex(items: InputHistoryItem[], kind: InputHistoryKind): void {
    const smartService = getSmartSuggestService();
    smartService.clearHistoryEntries();
    const scopedItems = items.filter((item) => item.kind === kind);
    if (scopedItems.length > 0) {
        smartService.addFromHistory(scopedItems);
    }
}

export const useInputHistoryStore = defineStore('inputHistory', {
    state: () => ({
        items: [] as InputHistoryItem[],
        isLoaded: false,
    }),

    getters: {
        sortedItems(): InputHistoryItem[] {
            return [...this.items].sort((a, b) => b.timestamp - a.timestamp);
        },
        totalCount(): number {
            return this.items.length;
        },
    },

    actions: {
        loadHistory(): void {
            if (this.isLoaded) return;
            this.isLoaded = true;

            if (typeof window === 'undefined') {
                this.items = [];
                return;
            }

            try {
                const raw = window.localStorage.getItem(INPUT_HISTORY_KEY);
                if (!raw) {
                    this.items = [];
                    return;
                }
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) {
                    this.items = [];
                    return;
                }

                this.items = parsed
                    .map((item): InputHistoryItem | null => {
                        if (!item || typeof item !== 'object') return null;
                        const query = normalizeQuery(String(item.query || ''));
                        const timestamp = Number(item.timestamp || 0);
                        if (!query || !Number.isFinite(timestamp) || timestamp <= 0) return null;
                        const kind = normalizeInputHistoryKind(item.kind || item.mode, query);
                        return {
                            id: typeof item.id === 'string' && item.id ? item.id : generateId(),
                            query,
                            timestamp,
                            kind,
                        };
                    })
                    .filter((item): item is InputHistoryItem => Boolean(item));

                const dedupedItems = dedupeHistoryItems(this.items).slice(
                    0,
                    MAX_INPUT_HISTORY_ITEMS
                );
                const didChange =
                    dedupedItems.length !== this.items.length ||
                    dedupedItems.some((item, index) => {
                        const current = this.items[index];
                        return (
                            !current ||
                            current.id !== item.id ||
                            current.query !== item.query ||
                            current.timestamp !== item.timestamp
                        );
                    });

                this.items = dedupedItems;
                if (didChange) {
                    this.persistHistory();
                }
            } catch (error) {
                console.error('[InputHistory] Failed to load history:', error);
                this.items = [];
            }
        },

        persistHistory(): void {
            if (typeof window === 'undefined') return;
            try {
                window.localStorage.setItem(INPUT_HISTORY_KEY, JSON.stringify(this.items));
            } catch (error) {
                console.error('[InputHistory] Failed to persist history:', error);
            }
        },

        itemsForKind(kind: InputHistoryKind): InputHistoryItem[] {
            this.loadHistory();
            return this.sortedItems.filter((item) => item.kind === kind);
        },

        itemsForMode(mode: SearchMode | string): InputHistoryItem[] {
            return this.itemsForKind(normalizeInputHistoryKind(mode));
        },

        addRecord(
            query: string,
            kindOrMode?: InputHistoryKind | SearchMode | string | null
        ): void {
            this.loadHistory();
            const trimmedQuery = normalizeQuery(query);
            if (!trimmedQuery) return;
            const kind = normalizeInputHistoryKind(kindOrMode, trimmedQuery);

            const now = Date.now();
            const existingIndex = this.items.findIndex(
                (item) => queryKey(item.query, item.kind) === queryKey(trimmedQuery, kind)
            );

            if (existingIndex >= 0) {
                const existingItem = this.items[existingIndex];
                this.items.splice(existingIndex, 1);
                this.items.unshift({
                    ...existingItem,
                    query: trimmedQuery,
                    timestamp: now,
                    kind,
                });
            } else {
                this.items.unshift({
                    id: generateId(),
                    query: trimmedQuery,
                    timestamp: now,
                    kind,
                });
            }

            if (this.items.length > MAX_INPUT_HISTORY_ITEMS) {
                this.items = this.items.slice(0, MAX_INPUT_HISTORY_ITEMS);
            }

            this.persistHistory();
            syncSuggestHistoryIndex(this.items, kind);
        },

        removeRecord(id: string): void {
            this.loadHistory();
            const next = this.items.filter((item) => item.id !== id);
            if (next.length === this.items.length) return;
            const removedKind = this.items.find((item) => item.id === id)?.kind || 'chat';
            this.items = next;
            this.persistHistory();
            syncSuggestHistoryIndex(this.items, removedKind);
        },

        clearAll(kindOrMode?: InputHistoryKind | SearchMode | string | null): void {
            this.loadHistory();
            if (kindOrMode === undefined || kindOrMode === null) {
                this.items = [];
                this.persistHistory();
                getSmartSuggestService().clearHistoryEntries();
                return;
            }
            const kind = normalizeInputHistoryKind(kindOrMode);
            this.items = this.items.filter((item) => item.kind !== kind);
            this.persistHistory();
            syncSuggestHistoryIndex(this.items, kind);
        },
    },
});
