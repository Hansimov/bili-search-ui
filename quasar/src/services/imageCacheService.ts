/**
 * ImageCacheService - 图片缓存服务
 *
 * 基于 CacheService (IndexedDB) 实现图片 Blob 缓存：
 * - 首次加载时通过 fetch 获取图片并存储为 Blob
 * - 后续加载直接从 IndexedDB 读取，生成 Blob URL
 * - 自动管理 Blob URL 的生命周期（revoke）
 * - 支持预加载和批量缓存
 */

import { cacheService, STORE_NAMES, IMAGE_CACHE_TTL } from './cacheService';

/** 内存中的 Blob URL 映射，用于快速访问和生命周期管理 */
const blobUrlMap = new Map<string, string>();

/** 正在加载中的请求，避免重复下载同一图片 */
const pendingRequests = new Map<string, Promise<string | null>>();

/**
 * 获取缓存的图片 URL
 *
 * 流程：
 * 1. 检查内存中的 Blob URL 映射
 * 2. 检查 IndexedDB 缓存
 * 3. 通过 fetch 下载并缓存到 IndexedDB
 *
 * @param imageUrl 原始图片 URL
 * @returns Blob URL 或在失败时返回原始 URL
 */
export async function getCachedImageUrl(imageUrl: string): Promise<string> {
    if (!imageUrl) return imageUrl;

    // 1. 检查内存中的 Blob URL
    const memCached = blobUrlMap.get(imageUrl);
    if (memCached) {
        return memCached;
    }

    // 2. 检查是否有正在进行的请求
    const pending = pendingRequests.get(imageUrl);
    if (pending) {
        const result = await pending;
        return result || imageUrl;
    }

    // 3. 创建新的加载请求
    const loadPromise = loadAndCacheImage(imageUrl);
    pendingRequests.set(imageUrl, loadPromise);

    try {
        const blobUrl = await loadPromise;
        return blobUrl || imageUrl;
    } finally {
        pendingRequests.delete(imageUrl);
    }
}

/**
 * 加载图片到缓存
 */
async function loadAndCacheImage(imageUrl: string): Promise<string | null> {
    try {
        // 先检查 IndexedDB
        const cachedBlob = await cacheService.get<Blob>(STORE_NAMES.IMAGE, imageUrl);
        if (cachedBlob && cachedBlob instanceof Blob) {
            const blobUrl = URL.createObjectURL(cachedBlob);
            blobUrlMap.set(imageUrl, blobUrl);
            return blobUrl;
        }

        // 通过 fetch 下载图片
        const response = await fetch(imageUrl, {
            mode: 'cors',
            referrerPolicy: 'no-referrer',
            credentials: 'omit',
        });

        if (!response.ok) {
            console.warn(`[ImageCache] Failed to fetch image: ${response.status} ${imageUrl}`);
            return null;
        }

        const blob = await response.blob();

        // 存储到 IndexedDB
        await cacheService.set(STORE_NAMES.IMAGE, imageUrl, blob, {
            ttl: IMAGE_CACHE_TTL,
            namespace: 'cover',
        });

        // 生成 Blob URL 并缓存到内存
        const blobUrl = URL.createObjectURL(blob);
        blobUrlMap.set(imageUrl, blobUrl);

        return blobUrl;
    } catch (error) {
        // CORS 或网络错误时静默失败，返回 null 使用原始 URL
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            // CORS 错误 - 无法通过 fetch 获取，回退到原始 URL
            return null;
        }
        console.warn('[ImageCache] Error caching image:', error);
        return null;
    }
}

/**
 * 预加载一组图片到缓存
 * 用于在结果列表加载时批量预缓存图片
 *
 * @param imageUrls 图片 URL 列表
 * @param concurrency 并发数，默认 4
 */
export async function preloadImages(
    imageUrls: string[],
    concurrency = 4
): Promise<void> {
    // 过滤掉已经缓存的 URL
    const uncached = imageUrls.filter((url) => !blobUrlMap.has(url));
    if (uncached.length === 0) return;

    // 分批并发加载
    for (let i = 0; i < uncached.length; i += concurrency) {
        const batch = uncached.slice(i, i + concurrency);
        await Promise.allSettled(
            batch.map((url) => getCachedImageUrl(url))
        );
    }
}

/**
 * 释放指定图片的 Blob URL（内存清理）
 */
export function revokeCachedImageUrl(imageUrl: string): void {
    const blobUrl = blobUrlMap.get(imageUrl);
    if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrlMap.delete(imageUrl);
    }
}

/**
 * 释放所有内存中的 Blob URL
 */
export function revokeAllCachedImageUrls(): void {
    blobUrlMap.forEach((blobUrl) => {
        URL.revokeObjectURL(blobUrl);
    });
    blobUrlMap.clear();
}

/**
 * 获取图片缓存统计信息
 */
export async function getImageCacheStats(): Promise<{
    indexedDBCount: number;
    memoryCount: number;
    pendingCount: number;
}> {
    const indexedDBCount = await cacheService.count(STORE_NAMES.IMAGE);
    return {
        indexedDBCount,
        memoryCount: blobUrlMap.size,
        pendingCount: pendingRequests.size,
    };
}

/**
 * 清除所有图片缓存
 */
export async function clearImageCache(): Promise<void> {
    revokeAllCachedImageUrls();
    await cacheService.clear(STORE_NAMES.IMAGE);
}
