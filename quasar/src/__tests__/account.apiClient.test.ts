import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BiliApiClient } from 'src/stores/account/apiClient';
import { CookieManager } from 'src/stores/account/cookieManager';

const MID_CARD_RESPONSE = {
    code: 0,
    message: 'OK',
    data: {
        card: {
            mid: '946974',
            name: '影视飓风',
            face: 'https://example.com/owner-face.jpg',
            sign: '用影像记录世界',
            fans: 2230000,
        },
    },
} as const;

describe('BiliApiClient.fetchMidCard', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('omits browser credentials for public mid-card fetches', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify(MID_CARD_RESPONSE), {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            })
        );

        const result = await BiliApiClient.fetchMidCard('946974');

        expect(fetchMock).toHaveBeenCalledWith(
            '/bili-api/x/web-interface/card?mid=946974&photo=true',
            expect.objectContaining({
                method: 'GET',
                credentials: 'omit',
                headers: { Accept: 'application/json' },
            })
        );
        expect(result?.card.name).toBe('影视飓风');
    });

    it('returns null instead of throwing when the proxy responds with HTML', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        fetchMock.mockResolvedValue(
            new Response('<!DOCTYPE html><html><body>fallback</body></html>', {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
        );

        await expect(BiliApiClient.fetchMidCard('946974')).resolves.toBeNull();
        expect(
            errorSpy.mock.calls.some(
                ([message]) =>
                    typeof message === 'string' &&
                    message.includes('MidCard response expected JSON but received:')
            )
        ).toBe(true);
    });

    it('falls back to a public request when the authenticated mid-card fetch fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { });
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(CookieManager, 'getAuthHeaders').mockReturnValue({
            Cookie: 'SESSDATA=test',
        });
        fetchMock
            .mockResolvedValueOnce(
                new Response('<!DOCTYPE html><html><body>challenge</body></html>', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' },
                })
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify(MID_CARD_RESPONSE), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                })
            );

        const result = await BiliApiClient.fetchMidCard('946974', true);

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/bili-api/x/web-interface/card?mid=946974&photo=true',
            expect.objectContaining({
                credentials: 'include',
                headers: { Cookie: 'SESSDATA=test' },
            })
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            '/bili-api/x/web-interface/card?mid=946974&photo=true',
            expect.objectContaining({
                credentials: 'omit',
                headers: { Accept: 'application/json' },
            })
        );
        expect(warnSpy).toHaveBeenCalledWith(
            'MidCard auth request failed, retrying without auth:',
            '946974'
        );
        expect(result?.card.face).toBe('https://example.com/owner-face.jpg');
    });
});