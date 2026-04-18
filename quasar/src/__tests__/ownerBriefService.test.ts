import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchUserBriefs } from 'src/services/ownerBriefService';

describe('fetchUserBriefs', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('posts deduplicated mids to the local API and returns normalized owner briefs', async () => {
        fetchMock.mockResolvedValue(
            new Response(
                JSON.stringify({
                    users: [
                        {
                            mid: 946974,
                            name: '影视飓风',
                            face: 'https://example.com/face.jpg',
                            video_count: 321,
                        },
                    ],
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                }
            )
        );

        const result = await fetchUserBriefs(['946974', 946974, '', '946974']);

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/user_briefs',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mids: ['946974'] }),
            })
        );
        expect(result).toEqual([
            {
                mid: '946974',
                name: '影视飓风',
                face: 'https://example.com/face.jpg',
                video_count: 321,
                sign: undefined,
                fans: undefined,
                sample_title: undefined,
                sample_bvid: undefined,
                sample_pic: undefined,
                sample_view: undefined,
            },
        ]);
    });
});