import { SpaceMyInfo, MidCard } from './types';
import { CookieManager } from './cookieManager';

export class BiliApiClient {
    // 获取当前用户信息 (space/myinfo)
    static async fetchSpaceMyInfo(): Promise<SpaceMyInfo | null> {
        try {
            console.log('Fetching space myinfo with auth headers');
            const cookies = CookieManager.getBiliCookies();
            console.log('Current cookies state:', {
                hasSessionData: !!cookies?.SESSDATA,
                hasDedeUserID: !!cookies?.DedeUserID,
                sessionDataLength: cookies?.SESSDATA?.length || 0
            });

            const headers = CookieManager.getAuthHeaders();
            const response = await fetch('/bili-api/x/space/myinfo', {
                method: 'GET',
                headers: headers,
                credentials: 'include',
            });

            console.log('SpaceMyInfo response status:', response.status);

            if (!response.ok) {
                console.error('SpaceMyInfo request failed with status:', response.status);
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                return null;
            }

            const data = await response.json();
            console.log('SpaceMyInfo response data:', { code: data.code, message: data.message, hasData: !!data.data });

            if (data.code === 0 && data.data) {
                console.log('SpaceMyInfo processed successfully');
                return data.data as SpaceMyInfo;
            } else {
                console.error('SpaceMyInfo API returned error:', data.code, data.message);
                return null;
            }
        } catch (error) {
            console.error('Error fetching space myinfo:', error);
            return null;
        }
    }

    // 获取用户卡片信息 (web-interface/card)
    static async fetchMidCard(mid: string, useAuth = false): Promise<MidCard | null> {
        try {
            console.log('Fetching mid card for mid:', mid);
            const headers = useAuth ? CookieManager.getAuthHeaders() : { 'Content-Type': 'application/json' };

            const response = await fetch(`/bili-api/x/web-interface/card?mid=${mid}&photo=true`, {
                method: 'GET',
                headers,
                credentials: 'include',
            });

            console.log('MidCard response status:', response.status);

            if (!response.ok) {
                console.error('MidCard request failed with status:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('MidCard response data:', data);

            if (data.code === 0 && data.data) {
                console.log('MidCard processed successfully');
                return data.data as MidCard;
            } else {
                console.error('MidCard API returned error:', data.code, data.message);
                return null;
            }
        } catch (error) {
            console.error('Error fetching mid card:', error);
            return null;
        }
    }
}