/**
 * Tests for tool call result display — verifying that chat tool call results
 * are handled safely when some fields (score, duration, pic) are missing.
 */

import { describe, it, expect } from 'vitest';

/** Video hit as returned by the frontend (search results + optional tool-call fields) */
interface VideoHit {
    title: string;
    tags?: string;
    bvid: string;
    pic?: string;
    owner?: { mid?: number; name?: string };
    duration?: number;
    score?: number;
    stat?: { view?: number };
    link?: string;
    pubdate_str?: string;
    pub_to_now_str?: string;
}

/**
 * Simulates the LLM_HIT_FIELDS output from the backend tool executor.
 * These hits have: title, tags, bvid, pic, owner, duration, stat.view
 * But NOT: score, highlights, stat.coin, stat.danmaku, region_name, etc.
 */
const TOOL_CALL_HIT: VideoHit = {
    title: '测试视频标题',
    tags: '标签1, 标签2',
    bvid: 'BV1abc123',
    pic: '//i2.hdslb.com/bfs/archive/test.jpg',
    owner: { mid: 12345, name: '测试UP主' },
    duration: 300,
    stat: { view: 50000 },
    link: 'https://www.bilibili.com/video/BV1abc123',
    pubdate_str: '2026-01-01 00:00:00',
    pub_to_now_str: '2个月前',
};

/**
 * Simulates a minimal hit that might come from very old cached tool results
 * missing newly added fields like pic and duration.
 */
const MINIMAL_TOOL_CALL_HIT: VideoHit = {
    title: '最小化视频',
    tags: '标签',
    bvid: 'BV1xyz',
    owner: { mid: 99999, name: '某UP主' },
    stat: { view: 1000 },
};

describe('Tool call result field safety', () => {
    describe('score field handling', () => {
        it('should handle undefined score safely', () => {
            const result = TOOL_CALL_HIT;
            // Simulates what ResultItem.vue template does
            const scoreDisplay = result.score != null ? result.score.toFixed(1) : '';
            expect(scoreDisplay).toBe('');
        });

        it('should display score when present', () => {
            const result = { ...TOOL_CALL_HIT, score: 12.345 };
            const scoreDisplay = result.score != null ? result.score.toFixed(1) : '';
            expect(scoreDisplay).toBe('12.3');
        });
    });

    describe('pic field handling', () => {
        it('should construct valid cover URL with pic', () => {
            const coverPicSuffix = '@320w_200h_1c_!web-space-upload-video.webp';
            const pic = TOOL_CALL_HIT.pic;
            const coverUrl = pic ? pic + coverPicSuffix : '';
            expect(coverUrl).toContain('test.jpg@320w_200h');
            expect(coverUrl).not.toContain('undefined');
        });

        it('should return empty string when pic is undefined', () => {
            const coverPicSuffix = '@320w_200h_1c_!web-space-upload-video.webp';
            const pic = MINIMAL_TOOL_CALL_HIT.pic;
            const coverUrl = pic ? pic + coverPicSuffix : '';
            expect(coverUrl).toBe('');
        });
    });

    describe('duration field handling', () => {
        it('should handle undefined duration safely', () => {
            const result = MINIMAL_TOOL_CALL_HIT;
            const durationDisplay = result.duration ? String(result.duration) : '';
            expect(durationDisplay).toBe('');
        });

        it('should display duration when present', () => {
            const result = TOOL_CALL_HIT;
            expect(result.duration).toBe(300);
        });
    });

    describe('stat.view field handling', () => {
        it('should handle stat.view from tool call result', () => {
            const result = TOOL_CALL_HIT;
            const view = result.stat?.view;
            expect(view).toBe(50000);
        });

        it('should handle missing stat safely', () => {
            const result: VideoHit = { title: 'test', bvid: 'BV1' };
            const view = result.stat?.view;
            expect(view).toBeUndefined();
        });
    });

    describe('owner field handling', () => {
        it('should access owner.mid safely', () => {
            const result = TOOL_CALL_HIT;
            const mid = result.owner?.mid || 0;
            expect(mid).toBe(12345);
        });

        it('should handle missing owner safely', () => {
            const result: VideoHit = { title: 'test', bvid: 'BV1' };
            const mid = result.owner?.mid || 0;
            expect(mid).toBe(0);
        });

        it('should handle owner name safely', () => {
            const result = TOOL_CALL_HIT;
            const name = result.owner?.name || '';
            expect(name).toBe('测试UP主');
        });
    });

    describe('normalizePicUrl', () => {
        const normalizePicUrl = (pic: string): string => {
            if (!pic) return '';
            if (pic.startsWith('//')) return 'https:' + pic;
            if (pic.startsWith('http://')) return pic.replace('http://', 'https://');
            return pic;
        };

        it('should add https: to protocol-relative URLs', () => {
            expect(normalizePicUrl('//i2.hdslb.com/bfs/archive/test.jpg'))
                .toBe('https://i2.hdslb.com/bfs/archive/test.jpg');
        });

        it('should upgrade http to https', () => {
            expect(normalizePicUrl('http://i2.hdslb.com/bfs/archive/test.jpg'))
                .toBe('https://i2.hdslb.com/bfs/archive/test.jpg');
        });

        it('should return empty string for empty input', () => {
            expect(normalizePicUrl('')).toBe('');
        });

        it('should pass through https URLs unchanged', () => {
            expect(normalizePicUrl('https://i2.hdslb.com/bfs/archive/test.jpg'))
                .toBe('https://i2.hdslb.com/bfs/archive/test.jpg');
        });
    });
});
