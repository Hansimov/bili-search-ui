import { describe, expect, it } from 'vitest';

import { formatToolCallArgs } from 'src/utils/toolCall';
import { normalizeVideoHit } from 'src/utils/videoHit';

describe('formatToolCallArgs', () => {
    it('formats search_google query args', () => {
        expect(
            formatToolCallArgs({
                type: 'search_google',
                args: { query: 'Gemini 2.5 最近有哪些官方更新' },
            })
        ).toBe('"Gemini 2.5 最近有哪些官方更新"');
    });

    it('formats relation args with keys', () => {
        expect(
            formatToolCallArgs({
                type: 'related_videos_by_videos',
                args: { bvids: ['BV1xx'], size: 10 },
            })
        ).toBe('bvids=["BV1xx"], size=10');
    });
});

describe('normalizeVideoHit', () => {
    it('parses legacy duration_str and pubdate_str when raw fields are missing', () => {
        const normalized = normalizeVideoHit({
            bvid: 'BV1test',
            duration_str: '12:34',
            pubdate_str: '2026-01-01 00:00:00',
        });

        expect(normalized.duration).toBe(754);
        expect(normalized.pubdate).toBe(1767196800);
    });

    it('prefers raw numeric fields when both raw and string fields exist', () => {
        const normalized = normalizeVideoHit({
            bvid: 'BV1test',
            duration: 300,
            duration_str: '12:34',
            pubdate: 1700000000,
            pubdate_str: '2026-01-01 00:00:00',
        });

        expect(normalized.duration).toBe(300);
        expect(normalized.pubdate).toBe(1700000000);
    });
});