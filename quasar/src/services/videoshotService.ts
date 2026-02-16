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
    /** 拼版图 URL 列表 */
    images: string[];
    /** 每帧对应的时间戳数组（秒），与帧一一对应 */
    timestamps: number[];
    /** 每张拼版图包含的帧数 */
    framesPerSheet: number;
    /** 帧总数 */
    totalFrames: number;
}

/** 单帧在拼版图中的定位信息 */
export interface FrameInfo {
    /** 帧的全局索引 */
    index: number;
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
// API
// ============================================================================

/**
 * 从 Bilibili API 获取视频快照数据
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

    const response = await axios.get('/bili-api/x/player/videoshot', { params });
    const { code, message, data } = response.data;

    if (code !== 0) {
        throw new Error(`获取视频快照失败 (${code}): ${message}`);
    }

    const images: string[] = (data.image || []).map((url: string) =>
        url.startsWith('//') ? `https:${url}` : url
    );
    const timestamps: number[] = data.index || [];

    return {
        imgXLen: data.img_x_len,
        imgYLen: data.img_y_len,
        imgXSize: data.img_x_size,
        imgYSize: data.img_y_size,
        images,
        timestamps,
        framesPerSheet: data.img_x_len * data.img_y_len,
        totalFrames: timestamps.length,
    };
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
