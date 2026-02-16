/**
 * videoshotService - 视频快照（截图）服务
 *
 * 负责调用 Bilibili 视频快照 API，解析返回数据，
 * 提供帧位置计算、时间戳格式化和 URL 构建等纯函数。
 *
 * API 文档参考：bilibili-API-collect/docs/video/snapshot.md
 *
 * 快照以拼版图（sprite sheet）形式存储：
 * - 每张拼版图包含 img_x_len × img_y_len 个帧（通常 10×10 = 100 帧）
 * - 每个帧尺寸为 img_x_size × img_y_size（通常 160×90 像素）
 * - 帧按从左到右、从上到下顺序排列
 * - 超出一张拼版图时会使用多张拼版图
 */

import { axios } from 'boot/axios';

// ============================================================================
// Types
// ============================================================================

/** 视频快照数据（API 返回经解析后的结构） */
export interface VideoshotData {
    /** 每行帧数（通常为 10） */
    imgXLen: number;
    /** 每列帧数（通常为 10） */
    imgYLen: number;
    /** 单帧宽度（像素，通常为 160） */
    imgXSize: number;
    /** 单帧高度（像素，通常为 90） */
    imgYSize: number;
    /** 拼版图 URL 列表（全部） */
    images: string[];
    /** 已加载的拼版图索引集合 */
    loadedSheetIndices: Set<number>;
    /** 每帧对应的时间戳数组（秒），与帧一一对应 */
    timestamps: number[];
    /** 每张拼版图包含的帧数 */
    framesPerSheet: number;
    /** 帧总数 */
    totalFrames: number;
    /** 总拼版图数 */
    totalSheets: number;
}

/** 单帧在拼版图中的定位信息 */
export interface FrameInfo {
    /** 帧的全局索引 */
    index: number;
    /** 所在拼版图的索引 */
    sheetIndex: number;
    /** 所在拼版图的 URL */
    sheetUrl: string;
    /** 帧在拼版图中的 X 偏移（像素） */
    offsetX: number;
    /** 帧在拼版图中的 Y 偏移（像素） */
    offsetY: number;
    /** 帧宽度（像素） */
    width: number;
    /** 帧高度（像素） */
    height: number;
    /** 帧对应的视频时间戳（秒） */
    timestamp: number;
    /** 拼版图总宽度（像素） */
    sheetWidth: number;
    /** 拼版图总高度（像素） */
    sheetHeight: number;
}

// ============================================================================
// Constants
// ============================================================================

/** 首次加载的最大拼版图数量 */
export const INITIAL_SHEETS_LIMIT = 3;

/** 自动重试次数（不含首次请求） */
export const MAX_RETRIES = 2;

/** 重试间隔（毫秒） */
export const RETRY_DELAY_MS = 3000;

// ============================================================================
// Image URL Utilities
// ============================================================================

/**
 * 将 Bilibili CDN 图片 URL 重写为本地代理路径
 *
 * 避免浏览器直接请求 CDN 时被防盗链拦截。
 * 将主机名编码在路径中，以支持不同 CDN 源（i0.hdslb.com、bimp.hdslb.com 等）。
 * 例如：`//bimp.hdslb.com/videoshotpvhdboss/xxx.jpg`
 *     → `/bili-img/bimp.hdslb.com/videoshotpvhdboss/xxx.jpg`
 *
 * @param url 原始图片 URL（可能带 `//` 前缀或完整 `https://`）
 * @returns 本地代理路径（含 CDN 主机名）
 */
export function rewriteImageUrl(url: string): string {
    if (url.startsWith('//')) url = `https:${url}`;
    try {
        const parsed = new URL(url);
        return `/bili-img/${parsed.host}${parsed.pathname}`;
    } catch {
        return url;
    }
}

// ============================================================================
// API
// ============================================================================

/**
 * 延迟指定毫秒数
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 从 Bilibili API 获取视频快照元数据（带自动重试）
 *
 * 最多尝试 MAX_RETRIES + 1 次，每次间隔 RETRY_DELAY_MS。
 *
 * @param bvid 视频 BV 号
 * @param cid  分P的 cid（可选，默认为第 1P）
 * @returns 解析后的快照数据
 */
export async function fetchVideoshot(
    bvid: string,
    cid?: number
): Promise<VideoshotData> {
    const params: Record<string, string | number> = { bvid, index: 1 };
    if (cid) params.cid = cid;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            if (attempt > 0) {
                await delay(RETRY_DELAY_MS);
            }

            const response = await axios.get('/bili-api/x/player/videoshot', { params });
            const { code, message, data } = response.data;

            if (code !== 0) {
                throw new Error(`获取视频快照失败 (${code}): ${message}`);
            }

            const images: string[] = (data.image || []).map((url: string) =>
                rewriteImageUrl(url)
            );
            const timestamps: number[] = data.index || [];

            if (timestamps.length === 0) {
                // 空快照数据可能是暂时的，允许重试
                throw new Error('该视频没有可用的快照数据');
            }

            const framesPerSheet = data.img_x_len * data.img_y_len;

            return {
                imgXLen: data.img_x_len,
                imgYLen: data.img_y_len,
                imgXSize: data.img_x_size,
                imgYSize: data.img_y_size,
                images,
                loadedSheetIndices: new Set<number>(),
                timestamps,
                framesPerSheet,
                totalFrames: timestamps.length,
                totalSheets: images.length,
            };
        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            if (attempt < MAX_RETRIES) {
                console.warn(
                    `快照加载失败 (第${attempt + 1}次), ${RETRY_DELAY_MS / 1000}秒后重试...`,
                    lastError.message
                );
            }
        }
    }

    throw lastError ?? new Error('获取视频快照失败：未知错误');
}

/**
 * 获取指定拼版图范围内的帧范围
 *
 * @param data         快照数据
 * @param sheetIndex   拼版图索引（0-based）
 * @returns [startFrame, endFrame) 的帧索引范围
 */
export function getSheetFrameRange(
    data: VideoshotData,
    sheetIndex: number
): [number, number] {
    const start = sheetIndex * data.framesPerSheet;
    const end = Math.min(start + data.framesPerSheet, data.totalFrames);
    return [start, end];
}

/**
 * 获取指定帧所在的拼版图索引
 */
export function getSheetIndexForFrame(
    data: VideoshotData,
    frameIndex: number
): number {
    return Math.floor(frameIndex / data.framesPerSheet);
}

// ============================================================================
// Frame Calculation
// ============================================================================

/**
 * 计算指定帧在拼版图中的位置信息
 *
 * 帧按从左到右、从上到下的顺序排布于拼版图中：
 *   globalIndex → sheetIndex, row, col → offsetX, offsetY
 *
 * @param data       快照数据
 * @param frameIndex 帧的全局索引（0-based）
 * @returns 帧定位信息
 */
export function getFrameInfo(
    data: VideoshotData,
    frameIndex: number
): FrameInfo {
    const {
        imgXLen,
        imgYLen,
        imgXSize,
        imgYSize,
        framesPerSheet,
        images,
        timestamps,
    } = data;

    const sheetIndex = Math.floor(frameIndex / framesPerSheet);
    const localIndex = frameIndex % framesPerSheet;
    const col = localIndex % imgXLen;
    const row = Math.floor(localIndex / imgXLen);

    return {
        index: frameIndex,
        sheetIndex,
        sheetUrl: images[sheetIndex] || '',
        offsetX: col * imgXSize,
        offsetY: row * imgYSize,
        width: imgXSize,
        height: imgYSize,
        timestamp: timestamps[frameIndex] ?? 0,
        sheetWidth: imgXLen * imgXSize,
        sheetHeight: imgYLen * imgYSize,
    };
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * 将秒数格式化为时间字符串
 *
 * @param seconds 秒数
 * @returns 格式化字符串（mm:ss 或 h:mm:ss）
 */
export function formatTimestamp(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 构建 Bilibili 视频跳转链接（含时间戳和分P参数）
 *
 * @param bvid      视频 BV 号
 * @param timestamp 跳转时间点（秒）
 * @param page      分P序号（1-based，可选）
 * @returns 完整的 Bilibili 视频 URL
 */
export function buildBilibiliUrl(
    bvid: string,
    timestamp: number,
    page?: number
): string {
    const t = Math.floor(timestamp);
    if (page && page > 1) {
        return `https://www.bilibili.com/video/${bvid}/?p=${page}&t=${t}`;
    }
    return `https://www.bilibili.com/video/${bvid}/?t=${t}`;
}

/**
 * 将文本复制到剪贴板（兼容 HTTPS 和 HTTP 环境）
 *
 * 优先使用 Clipboard API，失败时回退到 textarea + execCommand。
 *
 * @param text 需要复制的文本
 * @returns 是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    // 优先使用 Clipboard API (需 HTTPS 或 localhost)
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // fall through to fallback
        }
    }

    // 回退方案：textarea + execCommand
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    } catch {
        return false;
    }
}

// ============================================================================
// UI Utilities
// ============================================================================

/**
 * 在鼠标点击位置附近显示轻量级浮动提示
 *
 * 创建一个小气泡，显示在点击位置上方，1.2 秒后自动淡出并移除。
 *
 * @param message 提示文本
 * @param event   鼠标事件（用于定位）
 * @param isError 是否为错误样式
 */
export function showCopyToast(
    message: string,
    event: MouseEvent,
    isError = false
): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed',
        left: `${event.clientX}px`,
        top: `${event.clientY - 36}px`,
        transform: 'translateX(-50%)',
        padding: '4px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '500',
        color: '#fff',
        background: isError
            ? 'rgba(239, 68, 68, 0.88)'
            : 'rgba(30, 30, 46, 0.88)',
        backdropFilter: 'blur(6px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
        zIndex: '9999',
        whiteSpace: 'nowrap',
        opacity: '0',
        transition: 'opacity 0.15s ease, top 0.15s ease',
    });
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.top = `${event.clientY - 42}px`;
    });

    // Fade out & remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.top = `${event.clientY - 52}px`;
        setTimeout(() => toast.remove(), 200);
    }, 1200);
}
