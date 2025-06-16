import { UserCardInfo, UserSpaceInfo } from './types';
import { CookieManager } from './cookieManager';

export class BiliApiClient {
    // 获取当前用户信息
    static async fetchMyInfo(): Promise<{ userCard: UserCardInfo; userSpace: UserSpaceInfo | null } | null> {
        try {
            console.log('Fetching my info with auth headers');
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

            console.log('MyInfo response status:', response.status);

            if (!response.ok) {
                console.error('MyInfo request failed with status:', response.status);
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                return null;
            }

            const data = await response.json();
            console.log('MyInfo response data:', { code: data.code, message: data.message, hasData: !!data.data });

            if (data.code === 0 && data.data) {
                const userCard = this.transformMyInfoToUserCard(data.data);
                console.log('MyInfo processed successfully');
                return { userCard, userSpace: null };
            } else {
                console.error('MyInfo API returned error:', data.code, data.message);
                return null;
            }
        } catch (error) {
            console.error('Error fetching my info:', error);
            return null;
        }
    }

    // 获取用户卡片信息
    static async fetchUserCard(mid: string, useAuth = false): Promise<{ userCard: UserCardInfo; userSpace: UserSpaceInfo | null } | null> {
        try {
            console.log('Fetching user card for mid:', mid);
            const headers = useAuth ? CookieManager.getAuthHeaders() : { 'Content-Type': 'application/json' };

            const response = await fetch(`/bili-api/x/web-interface/card?mid=${mid}&photo=true`, {
                method: 'GET',
                headers,
                credentials: 'include',
            });

            console.log('UserCard response status:', response.status);

            if (!response.ok) {
                console.error('UserCard request failed with status:', response.status);
                return null;
            }

            const data = await response.json();
            console.log('UserCard response data:', data);

            if (data.code === 0 && data.data) {
                const userCard = this.transformCardDataToUserCard(data.data);
                const userSpace = data.data.space || null;
                console.log('UserCard processed successfully');
                return { userCard, userSpace };
            } else {
                console.error('UserCard API returned error:', data.code, data.message);
                return null;
            }
        } catch (error) {
            console.error('Error fetching user card:', error);
            return null;
        }
    }

    // 转换 myInfo 数据格式
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static transformMyInfoToUserCard(myInfo: any): UserCardInfo {
        console.log('Setting user info from myInfo:', { mid: myInfo.mid, name: myInfo.name });
        return {
            mid: myInfo.mid.toString(),
            name: myInfo.name,
            sex: myInfo.sex,
            face: myInfo.face,
            sign: myInfo.sign,
            level_info: {
                current_level: myInfo.level,
                current_min: myInfo.level_exp?.current_min || 0,
                current_exp: myInfo.level_exp?.current_exp || 0,
                next_exp: myInfo.level_exp?.next_exp || 0,
            },
            pendant: myInfo.pendant || { pid: 0, name: '', image: '', expire: 0 },
            nameplate: myInfo.nameplate || { nid: 0, name: '', image: '', image_small: '', level: '', condition: '' },
            Official: myInfo.official || { role: 0, title: '', desc: '', type: -1 },
            vip: {
                vipType: myInfo.vip?.type || 0,
                vipStatus: myInfo.vip?.status || 0,
                dueRemark: '',
                accessStatus: 0,
                vipStatusWarn: '',
                theme_type: myInfo.vip?.theme_type || 0,
            },
            fans: myInfo.follower || 0,
            friend: myInfo.following || 0,
            attention: myInfo.following || 0,
        };
    }

    // 转换 cardData 数据格式
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static transformCardDataToUserCard(cardData: any): UserCardInfo {
        console.log('Setting user info from card:', { mid: cardData.card.mid, name: cardData.card.name });
        return {
            mid: cardData.card.mid,
            name: cardData.card.name,
            sex: cardData.card.sex,
            face: cardData.card.face,
            sign: cardData.card.sign,
            level_info: cardData.card.level_info,
            pendant: cardData.card.pendant,
            nameplate: cardData.card.nameplate,
            Official: cardData.card.Official,
            vip: {
                vipType: cardData.card.vip.vipType,
                vipStatus: cardData.card.vip.vipStatus,
                dueRemark: cardData.card.vip.dueRemark || '',
                accessStatus: cardData.card.vip.accessStatus || 0,
                vipStatusWarn: cardData.card.vip.vipStatusWarn || '',
                theme_type: cardData.card.vip.theme_type || 0,
            },
            fans: cardData.card.fans,
            friend: cardData.card.friend,
            attention: cardData.card.attention,
        };
    }
}