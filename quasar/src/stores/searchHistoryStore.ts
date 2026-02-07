/**
 * SearchHistoryStore - 搜索历史记录管理
 *
 * 功能：
 * - 记录每次搜索查询（允许重复，每次搜索都会创建新记录）
 * - 持久化存储到 IndexedDB
 * - 支持固定（置顶）记录
 * - 按时间倒序排列，固定记录优先
 * - 导出/清除历史
 */

import { defineStore } from 'pinia';
import { cacheService, STORE_NAMES, HISTORY_CACHE_TTL } from 'src/services/cacheService';

/** 搜索历史记录条目 */
export interface SearchHistoryItem {
    /** 唯一标识符 */
    id: string;
    /** 搜索关键词 */
    query: string;
    /** 搜索时间戳 (ms) */
    timestamp: number;
    /** 是否置顶 */
    pinned: boolean;
    /** 搜索结果数量（可选） */
    resultCount?: number;
}

/** 生成唯一 ID */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
                    .filter((item) => item && item.query)
                    .map((item) => ({
                        ...item,
                        // 兼容旧数据：如果没有 id 则根据 query+timestamp 生成
                        id: item.id || `${item.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
                    }));
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
         * 每次搜索都会创建新记录，允许重复 query
         */
        async addRecord(query: string, resultCount?: number): Promise<void> {
            if (!query || query.trim() === '') return;

            const trimmedQuery = query.trim();
            const now = Date.now();
            const item: SearchHistoryItem = {
                id: generateId(),
                query: trimmedQuery,
                timestamp: now,
                pinned: false,
                resultCount,
            };
            this.items.push(item);

            // 超出上限时移除最旧的非置顶记录
            if (this.items.length > MAX_HISTORY_ITEMS) {
                this.trimHistory();
            }

            // 持久化到 IndexedDB
            await this.persistItem(item);
        },

        /**
         * 切换记录的置顶状态
         */
        async togglePin(id: string): Promise<void> {
            const item = this.items.find((item) => item.id === id);
            if (!item) return;

            item.pinned = !item.pinned;
            await this.persistItem(item);
        },

        /**
         * 删除单条记录
         */
        async removeRecord(id: string): Promise<void> {
            const index = this.items.findIndex((item) => item.id === id);
            if (index >= 0) {
                const item = this.items[index];
                this.items.splice(index, 1);
                await cacheService.delete(STORE_NAMES.HISTORY, `history:${item.id}`);
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
            const unpinnedIds = this.items
                .filter((item) => !item.pinned)
                .map((item) => item.id);

            this.items = this.items.filter((item) => item.pinned);

            // 批量删除
            for (const id of unpinnedIds) {
                await cacheService.delete(STORE_NAMES.HISTORY, `history:${id}`);
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
                    id: item.id,
                    query: item.query,
                    timestamp: item.timestamp,
                    pinned: item.pinned,
                    resultCount: item.resultCount,
                };
                await cacheService.set(
                    STORE_NAMES.HISTORY,
                    `history:${item.id}`,
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
