import { describe, it, expect } from 'vitest';
import {
    getFrameInfo,
    formatTimestamp,
    buildBilibiliUrl,
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
    timestamps: Array.from({ length: 150 }, (_, i) => i * 10),
    framesPerSheet: 100,
    totalFrames: 150,
};

// ============================================================================
// getFrameInfo
// ============================================================================

describe('getFrameInfo', () => {
    it('should return correct info for the first frame (index 0)', () => {
        const frame = getFrameInfo(mockData, 0);
        expect(frame.index).toBe(0);
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
        expect(frame.offsetX).toBe(3 * 160); // col=3
        expect(frame.offsetY).toBe(0); // row=0
        expect(frame.timestamp).toBe(30);
    });

    it('should wrap to next row after img_x_len frames', () => {
        const frame = getFrameInfo(mockData, 10);
        expect(frame.offsetX).toBe(0); // col=0 (10 % 10 = 0)
        expect(frame.offsetY).toBe(90); // row=1 (10 / 10 = 1)
    });

    it('should calculate arbitrary frame offset correctly', () => {
        // Frame 23: localIndex=23, col=3, row=2
        const frame = getFrameInfo(mockData, 23);
        expect(frame.offsetX).toBe(3 * 160);
        expect(frame.offsetY).toBe(2 * 90);
        expect(frame.timestamp).toBe(230);
    });

    it('should use second sheet for frames beyond framesPerSheet', () => {
        const frame = getFrameInfo(mockData, 100);
        expect(frame.sheetUrl).toBe(
            'https://i0.hdslb.com/bfs/videoshot/test2.jpg'
        );
        expect(frame.offsetX).toBe(0); // localIndex=0
        expect(frame.offsetY).toBe(0);
        expect(frame.timestamp).toBe(1000);
    });

    it('should handle last frame of first sheet correctly', () => {
        const frame = getFrameInfo(mockData, 99);
        expect(frame.sheetUrl).toBe(
            'https://i0.hdslb.com/bfs/videoshot/test1.jpg'
        );
        expect(frame.offsetX).toBe(9 * 160); // col=9
        expect(frame.offsetY).toBe(9 * 90); // row=9
    });

    it('should handle frame in second sheet with offset', () => {
        // Frame 115: sheetIndex=1, localIndex=15, col=5, row=1
        const frame = getFrameInfo(mockData, 115);
        expect(frame.sheetUrl).toBe(
            'https://i0.hdslb.com/bfs/videoshot/test2.jpg'
        );
        expect(frame.offsetX).toBe(5 * 160);
        expect(frame.offsetY).toBe(1 * 90);
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
});
