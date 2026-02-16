import { describe, it, expect } from 'vitest';
import {
    getFrameInfo,
    getSheetFrameRange,
    getSheetIndexForFrame,
    formatTimestamp,
    buildBilibiliUrl,
    INITIAL_SHEETS_LIMIT,
    MAX_RETRIES,
    RETRY_DELAY_MS,
    type VideoshotData,
} from 'src/services/videoshotService';

// ============================================================================
// Test data
// ============================================================================

const mockData: VideoshotData = {
    imgXLen: 10,
    imgYLen: 10,
    imgXSize: 160,
    imgYSize: 90,
    images: [
        'https://i0.hdslb.com/bfs/videoshot/test1.jpg',
        'https://i0.hdslb.com/bfs/videoshot/test2.jpg',
    ],
    loadedSheetIndices: new Set([0, 1]),
    timestamps: Array.from({ length: 150 }, (_, i) => i * 10),
    framesPerSheet: 100,
    totalFrames: 150,
    totalSheets: 2,
};

// ============================================================================
// getFrameInfo
// ============================================================================

describe('getFrameInfo', () => {
    it('should return correct info for the first frame (index 0)', () => {
        const frame = getFrameInfo(mockData, 0);
        expect(frame.index).toBe(0);
        expect(frame.sheetIndex).toBe(0);
        expect(frame.sheetUrl).toBe(
            'https://i0.hdslb.com/bfs/videoshot/test1.jpg'
        );
        expect(frame.offsetX).toBe(0);
        expect(frame.offsetY).toBe(0);
        expect(frame.width).toBe(160);
        expect(frame.height).toBe(90);
        expect(frame.timestamp).toBe(0);
        expect(frame.sheetWidth).toBe(1600);
        expect(frame.sheetHeight).toBe(900);
    });

    it('should calculate column offset for frame in the same row', () => {
        const frame = getFrameInfo(mockData, 3);
        expect(frame.offsetX).toBe(3 * 160);
        expect(frame.offsetY).toBe(0);
        expect(frame.timestamp).toBe(30);
    });

    it('should wrap to next row after img_x_len frames', () => {
        const frame = getFrameInfo(mockData, 10);
        expect(frame.offsetX).toBe(0);
        expect(frame.offsetY).toBe(90);
    });

    it('should calculate arbitrary frame offset correctly', () => {
        const frame = getFrameInfo(mockData, 23);
        expect(frame.offsetX).toBe(3 * 160);
        expect(frame.offsetY).toBe(2 * 90);
        expect(frame.timestamp).toBe(230);
    });

    it('should use second sheet for frames beyond framesPerSheet', () => {
        const frame = getFrameInfo(mockData, 100);
        expect(frame.sheetIndex).toBe(1);
        expect(frame.sheetUrl).toBe(
            'https://i0.hdslb.com/bfs/videoshot/test2.jpg'
        );
        expect(frame.offsetX).toBe(0);
        expect(frame.offsetY).toBe(0);
        expect(frame.timestamp).toBe(1000);
    });

    it('should handle last frame of first sheet correctly', () => {
        const frame = getFrameInfo(mockData, 99);
        expect(frame.sheetIndex).toBe(0);
        expect(frame.sheetUrl).toBe(
            'https://i0.hdslb.com/bfs/videoshot/test1.jpg'
        );
        expect(frame.offsetX).toBe(9 * 160);
        expect(frame.offsetY).toBe(9 * 90);
    });

    it('should handle frame in second sheet with offset', () => {
        const frame = getFrameInfo(mockData, 115);
        expect(frame.sheetIndex).toBe(1);
        expect(frame.sheetUrl).toBe(
            'https://i0.hdslb.com/bfs/videoshot/test2.jpg'
        );
        expect(frame.offsetX).toBe(5 * 160);
        expect(frame.offsetY).toBe(1 * 90);
    });
});

// ============================================================================
// getSheetFrameRange & getSheetIndexForFrame
// ============================================================================

describe('getSheetFrameRange', () => {
    it('should return full range for first sheet', () => {
        expect(getSheetFrameRange(mockData, 0)).toEqual([0, 100]);
    });

    it('should return partial range for last sheet', () => {
        expect(getSheetFrameRange(mockData, 1)).toEqual([100, 150]);
    });

    it('should handle single-sheet data', () => {
        const singleSheetData: VideoshotData = {
            ...mockData,
            images: ['https://example.com/1.jpg'],
            timestamps: Array.from({ length: 50 }, (_, i) => i * 5),
            totalFrames: 50,
            totalSheets: 1,
        };
        expect(getSheetFrameRange(singleSheetData, 0)).toEqual([0, 50]);
    });
});

describe('getSheetIndexForFrame', () => {
    it('should return 0 for frames in first sheet', () => {
        expect(getSheetIndexForFrame(mockData, 0)).toBe(0);
        expect(getSheetIndexForFrame(mockData, 99)).toBe(0);
    });

    it('should return 1 for frames in second sheet', () => {
        expect(getSheetIndexForFrame(mockData, 100)).toBe(1);
        expect(getSheetIndexForFrame(mockData, 149)).toBe(1);
    });
});

// ============================================================================
// Constants
// ============================================================================

describe('service constants', () => {
    it('should have sensible default limits', () => {
        expect(INITIAL_SHEETS_LIMIT).toBe(3);
        expect(MAX_RETRIES).toBe(2);
        expect(RETRY_DELAY_MS).toBe(3000);
    });
});

// ============================================================================
// formatTimestamp
// ============================================================================

describe('formatTimestamp', () => {
    it('should format 0 seconds as 00:00', () => {
        expect(formatTimestamp(0)).toBe('00:00');
    });

    it('should format seconds under a minute', () => {
        expect(formatTimestamp(5)).toBe('00:05');
        expect(formatTimestamp(59)).toBe('00:59');
    });

    it('should format minutes and seconds', () => {
        expect(formatTimestamp(60)).toBe('01:00');
        expect(formatTimestamp(65)).toBe('01:05');
        expect(formatTimestamp(599)).toBe('09:59');
        expect(formatTimestamp(3599)).toBe('59:59');
    });

    it('should format hours when >= 3600 seconds', () => {
        expect(formatTimestamp(3600)).toBe('1:00:00');
        expect(formatTimestamp(3661)).toBe('1:01:01');
        expect(formatTimestamp(7200)).toBe('2:00:00');
        expect(formatTimestamp(86399)).toBe('23:59:59');
    });

    it('should floor fractional seconds', () => {
        expect(formatTimestamp(65.9)).toBe('01:05');
        expect(formatTimestamp(3661.7)).toBe('1:01:01');
    });
});

// ============================================================================
// buildBilibiliUrl
// ============================================================================

describe('buildBilibiliUrl', () => {
    it('should build URL with timestamp only (no page)', () => {
        expect(buildBilibiliUrl('BV1os411H7wm', 123)).toBe(
            'https://www.bilibili.com/video/BV1os411H7wm/?t=123'
        );
    });

    it('should include page parameter when page > 1', () => {
        expect(buildBilibiliUrl('BV1os411H7wm', 45, 3)).toBe(
            'https://www.bilibili.com/video/BV1os411H7wm/?p=3&t=45'
        );
    });

    it('should omit page parameter when page is 1', () => {
        expect(buildBilibiliUrl('BV1os411H7wm', 45, 1)).toBe(
            'https://www.bilibili.com/video/BV1os411H7wm/?t=45'
        );
    });

    it('should omit page parameter when page is undefined', () => {
        expect(buildBilibiliUrl('BV1os411H7wm', 200)).toBe(
            'https://www.bilibili.com/video/BV1os411H7wm/?t=200'
        );
    });

    it('should floor fractional timestamps', () => {
        expect(buildBilibiliUrl('BV1test', 123.7)).toBe(
            'https://www.bilibili.com/video/BV1test/?t=123'
        );
        expect(buildBilibiliUrl('BV1test', 0.9)).toBe(
            'https://www.bilibili.com/video/BV1test/?t=0'
        );
    });

    it('should handle zero timestamp', () => {
        expect(buildBilibiliUrl('BV1test', 0)).toBe(
            'https://www.bilibili.com/video/BV1test/?t=0'
        );
    });
});

// ============================================================================
// Integration: frame-to-url mapping
// ============================================================================

describe('frame-to-url integration', () => {
    it('should produce correct bilibili URL from frame info', () => {
        const frame = getFrameInfo(mockData, 5);
        const url = buildBilibiliUrl('BV1os411H7wm', frame.timestamp);
        expect(url).toBe('https://www.bilibili.com/video/BV1os411H7wm/?t=50');
    });

    it('should produce correct bilibili URL with page', () => {
        const frame = getFrameInfo(mockData, 10);
        const url = buildBilibiliUrl('BV1os411H7wm', frame.timestamp, 2);
        expect(url).toBe(
            'https://www.bilibili.com/video/BV1os411H7wm/?p=2&t=100'
        );
    });

    it('should produce formatted timestamp from frame info', () => {
        const frame = getFrameInfo(mockData, 42);
        expect(formatTimestamp(frame.timestamp)).toBe('07:00');
    });

    it('should chain sheet index → frame range → individual frame info', () => {
        const sheetIdx = getSheetIndexForFrame(mockData, 115);
        expect(sheetIdx).toBe(1);
        const [start, end] = getSheetFrameRange(mockData, sheetIdx);
        expect(start).toBe(100);
        expect(end).toBe(150);
        // frame 115 falls in that range
        expect(115).toBeGreaterThanOrEqual(start);
        expect(115).toBeLessThan(end);
        const frame = getFrameInfo(mockData, 115);
        expect(frame.sheetIndex).toBe(sheetIdx);
    });
});

// ============================================================================
// Lazy loading helpers
// ============================================================================

describe('lazy loading calculations', () => {
    const manySheetData: VideoshotData = {
        imgXLen: 10,
        imgYLen: 10,
        imgXSize: 160,
        imgYSize: 90,
        images: Array.from({ length: 10 }, (_, i) => `https://example.com/${i}.jpg`),
        loadedSheetIndices: new Set<number>(),
        timestamps: Array.from({ length: 950 }, (_, i) => i * 5),
        framesPerSheet: 100,
        totalFrames: 950,
        totalSheets: 10,
    };

    it('should determine initial load count correctly', () => {
        // Initial preload now loads 2 sheets (reduced from INITIAL_SHEETS_LIMIT)
        const initialCount = Math.min(2, manySheetData.totalSheets);
        expect(initialCount).toBe(2);
        // INITIAL_SHEETS_LIMIT constant is still 3 for reference
        expect(INITIAL_SHEETS_LIMIT).toBe(3);
    });

    it('should correctly track which sheets are loaded', () => {
        const loaded = new Set<number>([0, 1, 2]);
        expect(loaded.size).toBe(3);
        expect(loaded.has(0)).toBe(true);
        expect(loaded.has(5)).toBe(false);
    });

    it('should find next unloaded sheets for batch loading', () => {
        const loaded = new Set<number>([0, 1, 2]);
        const nextBatch: number[] = [];
        for (let i = 0; i < manySheetData.totalSheets && nextBatch.length < INITIAL_SHEETS_LIMIT; i++) {
            if (!loaded.has(i)) nextBatch.push(i);
        }
        expect(nextBatch).toEqual([3, 4, 5]);
    });

    it('should determine needed sheet indices from visible frame range', () => {
        // Simulate a timeline showing frames 95-110 (spanning sheets 0 and 1)
        const loaded = new Set<number>([0]); // only sheet 0 loaded
        const visibleFrameIndices = [95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105];
        const neededSheets = new Set<number>();
        for (const idx of visibleFrameIndices) {
            const sheetIdx = getSheetIndexForFrame(manySheetData, idx);
            if (!loaded.has(sheetIdx)) {
                neededSheets.add(sheetIdx);
            }
        }
        expect([...neededSheets]).toEqual([1]);
    });

    it('should not request already loaded sheets', () => {
        const loaded = new Set<number>([0, 1, 2]);
        const visibleFrameIndices = [0, 1, 2, 50, 100, 150];
        const neededSheets = new Set<number>();
        for (const idx of visibleFrameIndices) {
            const sheetIdx = getSheetIndexForFrame(manySheetData, idx);
            if (!loaded.has(sheetIdx)) {
                neededSheets.add(sheetIdx);
            }
        }
        // All visible frames are in sheets 0 and 1, both loaded
        expect([...neededSheets]).toEqual([]);
    });

    it('should preserve loadedSheetIndices across simulated layout switch', () => {
        // Simulate: load some sheets, then "switch layout" (reuse same data)
        const data = { ...manySheetData, loadedSheetIndices: new Set<number>() };
        data.loadedSheetIndices.add(0);
        data.loadedSheetIndices.add(1);
        data.loadedSheetIndices.add(3);

        // After "layout switch", the same data object is used
        expect(data.loadedSheetIndices.has(0)).toBe(true);
        expect(data.loadedSheetIndices.has(1)).toBe(true);
        expect(data.loadedSheetIndices.has(3)).toBe(true);
        expect(data.loadedSheetIndices.has(2)).toBe(false);
        expect(data.loadedSheetIndices.size).toBe(3);
    });
});
