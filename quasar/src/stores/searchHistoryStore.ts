/**
 * SearchHistoryStore - 搜索历史记录管理
 *
 * 功能：
 * - 记录每次搜索查询（去重，更新时间戳）
 * - 持久化存储到 IndexedDB
 * - 支持固定（置顶）记录
 * - 按时间倒序排列，固定记录优先
 * - 导出/清除历史
 */

import { defineStore } from 'pinia';
import { cacheService, STORE_NAMES, HISTORY_CACHE_TTL } from 'src/services/cacheService';

/** 搜索历史记录条目 */
export interface SearchHistoryItem {
    /** 搜索关键词 */
    query: string;
    /** 最后搜索时间戳 (ms) */
    timestamp: number;
    /** 搜索次数 */
    count: number;
    /** 是否置顶 */
    pinned: boolean;
    /** 搜索结果数量（可选） */
    resultCount?: number;
}

/** 最大历史记录数 */
const MAX_HISTORY_ITEMS = 200;

export const useSearchHistoryStore = defineStore('searchHistory', {
    state: () => ({
        /** 历史记录列表 */
        items: [] as SearchHistoryItem[],
        /** 是否已从持久化存储加载 */
        isLoaded: false,
        /** 是否显示历史列表面板 */
        isHistoryPanelVisible: false,
    }),

    getters: {
        /** 按置顶优先、时间倒序排列的记录 */
        sortedItems(): SearchHistoryItem[] {
            return [...this.items].sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return b.timestamp - a.timestamp;
            });
        },

        /** 置顶的记录 */
        pinnedItems(): SearchHistoryItem[] {
            return this.sortedItems.filter((item) => item.pinned);
        },

        /** 非置顶的记录（最近搜索） */
        recentItems(): SearchHistoryItem[] {
            return this.sortedItems.filter((item) => !item.pinned);
        },

        /** 历史记录总数 */
        totalCount(): number {
            return this.items.length;
        },
    },

    actions: {
        /**
         * 从 IndexedDB 加载历史记录
         */
        async loadHistory(): Promise<void> {
            if (this.isLoaded) return;

            try {
                const entries = await cacheService.getAll<SearchHistoryItem>(STORE_NAMES.HISTORY);
                this.items = entries
                    .map((entry) => entry.value)
                    .filter((item) => item && item.query);
                this.isLoaded = true;
                console.log(`[SearchHistory] Loaded ${this.items.length} history items`);
            } catch (error) {
                console.error('[SearchHistory] Failed to load history:', error);
                this.items = [];
                this.isLoaded = true;
            }
        },

        /**
         * 添加搜索记录
         * 如果查询已存在，更新时间戳和计数
         */
        async addRecord(query: string, resultCount?: number): Promise<void> {
            if (!query || query.trim() === '') return;

            const trimmedQuery = query.trim();
            const existingIndex = this.items.findIndex(
                (item) => item.query === trimmedQuery
            );

            const now = Date.now();
            let item: SearchHistoryItem;

            if (existingIndex >= 0) {
                // 更新已有记录
                item = {
                    ...this.items[existingIndex],
                    timestamp: now,
                    count: this.items[existingIndex].count + 1,
                    resultCount: resultCount ?? this.items[existingIndex].resultCount,
                };
                this.items[existingIndex] = item;
            } else {
                // 添加新记录
                item = {
                    query: trimmedQuery,
                    timestamp: now,
                    count: 1,
                    pinned: false,
                    resultCount,
                };
                this.items.push(item);

                // 超出上限时移除最旧的非置顶记录
                if (this.items.length > MAX_HISTORY_ITEMS) {
                    this.trimHistory();
                }
            }

            // 持久化到 IndexedDB
            await this.persistItem(item);
        },

        /**
         * 切换记录的置顶状态
         */
        async togglePin(query: string): Promise<void> {
            const item = this.items.find((item) => item.query === query);
            if (!item) return;

            item.pinned = !item.pinned;
            await this.persistItem(item);
        },

        /**
         * 删除单条记录
         */
        async removeRecord(query: string): Promise<void> {
            const index = this.items.findIndex((item) => item.query === query);
            if (index >= 0) {
                this.items.splice(index, 1);
                await cacheService.delete(STORE_NAMES.HISTORY, `history:${query}`);
            }
        },

        /**
         * 清除所有历史记录
         */
        async clearAll(): Promise<void> {
            this.items = [];
            await cacheService.clear(STORE_NAMES.HISTORY);
        },

        /**
         * 清除非置顶的历史记录
         */
        async clearUnpinned(): Promise<void> {
            const unpinnedQueries = this.items
                .filter((item) => !item.pinned)
                .map((item) => item.query);

            this.items = this.items.filter((item) => item.pinned);

            // 批量删除
            for (const query of unpinnedQueries) {
                await cacheService.delete(STORE_NAMES.HISTORY, `history:${query}`);
            }
        },

        /**
         * 搜索历史记录（模糊匹配）
         */
        searchHistory(keyword: string): SearchHistoryItem[] {
            if (!keyword || keyword.trim() === '') return this.sortedItems;
            const lower = keyword.toLowerCase();
            return this.sortedItems.filter((item) =>
                item.query.toLowerCase().includes(lower)
            );
        },

        /**
         * 切换历史面板可见性
         */
        toggleHistoryPanel(): void {
            this.isHistoryPanelVisible = !this.isHistoryPanelVisible;
        },

        /**
         * 持久化单个记录到 IndexedDB
         */
        async persistItem(item: SearchHistoryItem): Promise<void> {
            try {
                // 创建纯对象副本，避免 Vue 响应式代理导致 IndexedDB 的 DataCloneError
                const plainItem: SearchHistoryItem = {
                    query: item.query,
                    timestamp: item.timestamp,
                    count: item.count,
                    pinned: item.pinned,
                    resultCount: item.resultCount,
                };
                await cacheService.set(
                    STORE_NAMES.HISTORY,
                    `history:${item.query}`,
                    plainItem,
                    { ttl: HISTORY_CACHE_TTL, namespace: 'search-history' }
                );
            } catch (error) {
                console.error('[SearchHistory] Failed to persist item:', error);
            }
        },

        /**
         * 修剪历史记录，保持在最大数量内
         */
        trimHistory(): void {
            // 按置顶优先、时间倒序排列
            const sorted = [...this.items].sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                return b.timestamp - a.timestamp;
            });

            this.items = sorted.slice(0, MAX_HISTORY_ITEMS);
        },
    },
});
