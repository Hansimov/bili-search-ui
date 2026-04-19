import { defineStore } from 'pinia';
import { getSmartSuggestService } from 'src/services/smartSuggestService';

export interface InputHistoryItem {
    id: string;
    query: string;
    timestamp: number;
}

const INPUT_HISTORY_KEY = 'input-history.v1';
const MAX_INPUT_HISTORY_ITEMS = 200;

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeQuery(query: string): string {
    return (query || '').trim().replace(/\s+/g, ' ');
}

function queryKey(query: string): string {
    return normalizeQuery(query).toLowerCase();
}

function dedupeHistoryItems(items: InputHistoryItem[]): InputHistoryItem[] {
    const seen = new Set<string>();
    const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);

    return sorted.filter((item) => {
        const key = queryKey(item.query);
        if (!key || seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function syncSuggestHistoryIndex(items: InputHistoryItem[]): void {
    const smartService = getSmartSuggestService();
    smartService.clearHistoryEntries();
    if (items.length > 0) {
        smartService.addFromHistory(items);
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
                        return {
                            id: typeof item.id === 'string' && item.id ? item.id : generateId(),
                            query,
                            timestamp,
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

        addRecord(query: string): void {
            this.loadHistory();
            const trimmedQuery = normalizeQuery(query);
            if (!trimmedQuery) return;

            const now = Date.now();
            const existingIndex = this.items.findIndex(
                (item) => queryKey(item.query) === queryKey(trimmedQuery)
            );

            if (existingIndex >= 0) {
                const existingItem = this.items[existingIndex];
                this.items.splice(existingIndex, 1);
                this.items.unshift({
                    ...existingItem,
                    query: trimmedQuery,
                    timestamp: now,
                });
            } else {
                this.items.unshift({
                    id: generateId(),
                    query: trimmedQuery,
                    timestamp: now,
                });
            }

            if (this.items.length > MAX_INPUT_HISTORY_ITEMS) {
                this.items = this.items.slice(0, MAX_INPUT_HISTORY_ITEMS);
            }

            this.persistHistory();
            syncSuggestHistoryIndex(this.items);
        },

        removeRecord(id: string): void {
            this.loadHistory();
            const next = this.items.filter((item) => item.id !== id);
            if (next.length === this.items.length) return;
            this.items = next;
            this.persistHistory();
            syncSuggestHistoryIndex(this.items);
        },

        clearAll(): void {
            this.loadHistory();
            this.items = [];
            this.persistHistory();
            syncSuggestHistoryIndex(this.items);
        },
    },
});
