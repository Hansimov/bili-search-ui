import { defineStore } from 'pinia';

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
    return (query || '').trim();
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

            this.items.push({
                id: generateId(),
                query: trimmedQuery,
                timestamp: Date.now(),
            });

            if (this.items.length > MAX_INPUT_HISTORY_ITEMS) {
                this.items = [...this.items]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, MAX_INPUT_HISTORY_ITEMS);
            }

            this.persistHistory();
        },

        removeRecord(id: string): void {
            this.loadHistory();
            const next = this.items.filter((item) => item.id !== id);
            if (next.length === this.items.length) return;
            this.items = next;
            this.persistHistory();
        },

        clearAll(): void {
            this.loadHistory();
            this.items = [];
            this.persistHistory();
        },
    },
});
