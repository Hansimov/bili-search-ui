/**
 * CacheService - 通用浏览器缓存服务
 *
 * 基于 IndexedDB 实现，支持：
 * - 键值对存储（含 TTL 过期管理）
 * - Blob 数据存储（用于图片等二进制资源）
 * - 命名空间隔离
 * - 存储容量管理（LRU 淘汰策略）
 * - 批量操作
 */

const DB_NAME = 'bili-search-cache';
const DB_VERSION = 1;

/** 缓存存储的名称常量 */
export const STORE_NAMES = {
    /** 通用数据缓存 */
    DATA: 'data-cache',
    /** 图片 Blob 缓存 */
    IMAGE: 'image-cache',
    /** 搜索历史记录 */
    HISTORY: 'search-history',
} as const;

/** 缓存条目的元数据 */
interface CacheEntry<T = unknown> {
    /** 缓存键 */
    key: string;
    /** 缓存值 */
    value: T;
    /** 创建时间戳 (ms) */
    createdAt: number;
    /** 最后访问时间戳 (ms) */
    lastAccessedAt: number;
    /** 过期时间戳 (ms)，0 表示永不过期 */
    expiresAt: number;
    /** 数据大小（字节），用于容量管理 */
    size: number;
    /** 命名空间 */
    namespace: string;
}

/** 缓存配置选项 */
export interface CacheOptions {
    /** TTL（毫秒），默认 24 小时 */
    ttl?: number;
    /** 命名空间，默认 'default' */
    namespace?: string;
}

/** 默认 TTL: 24 小时 */
const DEFAULT_TTL = 24 * 60 * 60 * 1000;
/** 图片缓存 TTL: 7 天 */
export const IMAGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
/** 搜索历史 TTL: 30 天 */
export const HISTORY_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
/** 搜索结果缓存 TTL: 7 天 */
export const EXPLORE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
/** 最大图片缓存条目数 */
const MAX_IMAGE_ENTRIES = 2000;
/** 最大数据缓存条目数 */
const MAX_DATA_ENTRIES = 500;

class CacheService {
    private db: IDBDatabase | null = null;
    private dbPromise: Promise<IDBDatabase> | null = null;

    /**
     * 打开/获取数据库连接
     */
    private async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // 创建数据缓存存储
                if (!db.objectStoreNames.contains(STORE_NAMES.DATA)) {
                    const dataStore = db.createObjectStore(STORE_NAMES.DATA, { keyPath: 'key' });
                    dataStore.createIndex('namespace', 'namespace', { unique: false });
                    dataStore.createIndex('expiresAt', 'expiresAt', { unique: false });
                    dataStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
                }

                // 创建图片缓存存储
                if (!db.objectStoreNames.contains(STORE_NAMES.IMAGE)) {
                    const imageStore = db.createObjectStore(STORE_NAMES.IMAGE, { keyPath: 'key' });
                    imageStore.createIndex('namespace', 'namespace', { unique: false });
                    imageStore.createIndex('expiresAt', 'expiresAt', { unique: false });
                    imageStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
                }

                // 创建搜索历史存储
                if (!db.objectStoreNames.contains(STORE_NAMES.HISTORY)) {
                    const historyStore = db.createObjectStore(STORE_NAMES.HISTORY, { keyPath: 'key' });
                    historyStore.createIndex('createdAt', 'createdAt', { unique: false });
                    historyStore.createIndex('namespace', 'namespace', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
                reject((event.target as IDBOpenDBRequest).error);
            };
        });

        return this.dbPromise;
    }

    /**
     * 存储数据到指定的 object store
     */
    async set<T>(
        storeName: string,
        key: string,
        value: T,
        options: CacheOptions = {}
    ): Promise<void> {
        const db = await this.getDB();
        const { ttl = DEFAULT_TTL, namespace = 'default' } = options;

        const now = Date.now();
        const entry: CacheEntry<T> = {
            key,
            value,
            createdAt: now,
            lastAccessedAt: now,
            expiresAt: ttl > 0 ? now + ttl : 0,
            size: this.estimateSize(value),
            namespace,
        };

        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(entry);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 从指定的 object store 获取数据
     */
    async get<T>(
        storeName: string,
        key: string,
        updateAccess = true
    ): Promise<T | null> {
        const db = await this.getDB();

        return new Promise<T | null>((resolve, reject) => {
            const tx = db.transaction(storeName, updateAccess ? 'readwrite' : 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                const entry = request.result as CacheEntry<T> | undefined;

                if (!entry) {
                    resolve(null);
                    return;
                }

                // 检查是否过期
                if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
                    // 异步删除过期条目
                    this.delete(storeName, key).catch(console.error);
                    resolve(null);
                    return;
                }

                // 更新最后访问时间
                if (updateAccess) {
                    entry.lastAccessedAt = Date.now();
                    store.put(entry);
                }

                resolve(entry.value);
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 检查缓存中是否存在指定的键
     */
    async has(storeName: string, key: string): Promise<boolean> {
        const value = await this.get(storeName, key, false);
        return value !== null;
    }

    /**
     * 从指定的 object store 删除数据
     */
    async delete(storeName: string, key: string): Promise<void> {
        const db = await this.getDB();

        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取 object store 中的所有键
     */
    async keys(storeName: string): Promise<string[]> {
        const db = await this.getDB();

        return new Promise<string[]>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAllKeys();

            request.onsuccess = () => resolve(request.result as string[]);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取所有条目（含元数据）
     */
    async getAll<T>(storeName: string): Promise<CacheEntry<T>[]> {
        const db = await this.getDB();

        return new Promise<CacheEntry<T>[]>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result as CacheEntry<T>[]);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 获取 object store 中的条目数量
     */
    async count(storeName: string): Promise<number> {
        const db = await this.getDB();

        return new Promise<number>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 清除指定 object store 中的所有数据
     */
    async clear(storeName: string): Promise<void> {
        const db = await this.getDB();

        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 清除所有过期条目
     */
    async clearExpired(storeName: string): Promise<number> {
        const db = await this.getDB();
        const now = Date.now();
        let deletedCount = 0;

        return new Promise<number>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const index = store.index('expiresAt');

            // 获取所有 expiresAt > 0 且 < now 的条目
            const range = IDBKeyRange.bound(1, now);
            const request = index.openCursor(range);

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    resolve(deletedCount);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * LRU 淘汰：当条目数超过上限时，删除最久未访问的条目
     */
    async evictLRU(storeName: string, maxEntries: number): Promise<number> {
        const currentCount = await this.count(storeName);
        if (currentCount <= maxEntries) return 0;

        const db = await this.getDB();
        const deleteCount = currentCount - maxEntries;
        let deletedCount = 0;

        return new Promise<number>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const index = store.index('lastAccessedAt');
            const request = index.openCursor();

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if (cursor && deletedCount < deleteCount) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    resolve(deletedCount);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 执行缓存维护：清除过期 + LRU 淘汰
     */
    async maintain(): Promise<void> {
        try {
            // 清除过期条目
            const expiredImages = await this.clearExpired(STORE_NAMES.IMAGE);
            const expiredData = await this.clearExpired(STORE_NAMES.DATA);

            // LRU 淘汰
            const evictedImages = await this.evictLRU(STORE_NAMES.IMAGE, MAX_IMAGE_ENTRIES);
            const evictedData = await this.evictLRU(STORE_NAMES.DATA, MAX_DATA_ENTRIES);

            if (expiredImages + expiredData + evictedImages + evictedData > 0) {
                console.log(
                    `[CacheService] Maintenance: expired(img=${expiredImages}, data=${expiredData}), evicted(img=${evictedImages}, data=${evictedData})`
                );
            }
        } catch (error) {
            console.error('[CacheService] Maintenance error:', error);
        }
    }

    /**
     * 估算数据大小（粗略）
     */
    private estimateSize(value: unknown): number {
        if (value instanceof Blob) {
            return value.size;
        }
        if (typeof value === 'string') {
            return value.length * 2; // UTF-16
        }
        try {
            return JSON.stringify(value).length * 2;
        } catch {
            return 0;
        }
    }

    /**
     * 获取缓存统计信息
     */
    async getStats(): Promise<Record<string, { count: number }>> {
        const stats: Record<string, { count: number }> = {};
        for (const storeName of Object.values(STORE_NAMES)) {
            try {
                stats[storeName] = {
                    count: await this.count(storeName),
                };
            } catch {
                stats[storeName] = { count: 0 };
            }
        }
        return stats;
    }
}

/** 全局单例 */
export const cacheService = new CacheService();

// 启动时执行维护任务
if (typeof window !== 'undefined') {
    setTimeout(() => {
        cacheService.maintain().catch(console.error);
    }, 5000);

    // 每小时执行一次维护
    setInterval(() => {
        cacheService.maintain().catch(console.error);
    }, 60 * 60 * 1000);
}
