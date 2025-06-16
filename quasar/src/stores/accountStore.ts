import { defineStore } from 'pinia'

export interface CookieInfo {
    DedeUserID: string;
    DedeUserID__ckMd5: string;
    Expires: string;
    SESSDATA: string;
    bili_jct: string;
}

export interface UserCardInfo {
    mid: string;
    name: string;
    sex: string;
    face: string;
    sign: string;
    level_info: {
        current_level: number;
        current_min: number;
        current_exp: number;
        next_exp: number;
    };
    pendant: {
        pid: number;
        name: string;
        image: string;
        expire: number;
    };
    nameplate: {
        nid: number;
        name: string;
        image: string;
        image_small: string;
        level: string;
        condition: string;
    };
    Official: {
        role: number;
        title: string;
        desc: string;
        type: number;
    };
    vip: {
        vipType: number;
        vipStatus: number;
        dueRemark: string;
        accessStatus: number;
        vipStatusWarn: string;
        theme_type: number;
    };
    fans: number;
    friend: number;
    attention: number;
}

export interface UserSpaceInfo {
    s_img: string;
    l_img: string;
}

export interface AccountState {
    isLoggedIn: boolean;
    cookies: CookieInfo | null;
    userCard: UserCardInfo | null;
    userSpace: UserSpaceInfo | null;
    refreshToken: string | null;
}

const STORAGE_KEYS = {
    REFRESH_TOKEN: 'bili_refresh_token',
    COOKIES: 'bili_cookies',
    USER_INFO: 'bili_user_info',
} as const;

export const useAccountStore = defineStore('account', {
    state: (): AccountState => ({
        isLoggedIn: false,
        cookies: null,
        userCard: null,
        userSpace: null,
        refreshToken: null,
    }),

    getters: {
        userName(): string {
            return this.userCard?.name || '';
        },
        userAvatar(): string {
            return this.userCard?.face || '';
        },
        userId(): string {
            return this.userCard?.mid || '';
        },
        hasValidSession(): boolean {
            return !!this.cookies?.SESSDATA && !!this.cookies?.DedeUserID;
        },
        canMakeAuthenticatedRequests(): boolean {
            return this.hasValidSession;
        },
    },

    actions: {
        // Cookie 管理
        parseCookiesFromUrl(url: string): CookieInfo | null {
            try {
                const urlObj = new URL(url);
                const params = new URLSearchParams(urlObj.search);

                const cookies: CookieInfo = {
                    DedeUserID: params.get('DedeUserID') || '',
                    DedeUserID__ckMd5: params.get('DedeUserID__ckMd5') || '',
                    Expires: params.get('Expires') || '',
                    SESSDATA: params.get('SESSDATA') || '',
                    bili_jct: params.get('bili_jct') || '',
                };

                console.log('Parsed cookies:', {
                    DedeUserID: cookies.DedeUserID,
                    hasSessionData: !!cookies.SESSDATA,
                    hasBiliJct: !!cookies.bili_jct
                });

                if (!cookies.DedeUserID || !cookies.SESSDATA) {
                    throw new Error('Missing required cookie fields');
                }

                return cookies;
            } catch (error) {
                console.error('Failed to parse cookies from URL:', error);
                console.error('Original URL:', url);
                return null;
            }
        },

        setCookies(cookies: CookieInfo) {
            this.cookies = cookies;
            // 持久化存储，但不设置到浏览器
            this.saveCookiesToStorage(cookies);
            console.log('Cookies saved to store:', cookies);
        },

        clearCookies() {
            this.cookies = null;
            localStorage.removeItem(STORAGE_KEYS.COOKIES);
        },

        // 创建带认证信息的请求头
        getAuthHeaders(): HeadersInit {
            if (!this.cookies) {
                return {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
                };
            }

            // 构建完整的Cookie字符串
            const cookieString = [
                `SESSDATA=${decodeURIComponent(this.cookies.SESSDATA)}`,
                // `DedeUserID=${this.cookies.DedeUserID}`,
            ].join('; ');

            const headers: HeadersInit = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                'Cookie': cookieString,
            };

            console.log('getAuthHeaders():', { cookieString: cookieString.substring(0, 100) + '...' });
            return headers;
        },

        // 用户信息管理
        async fetchUserInfo(mid?: string): Promise<boolean> {
            try {
                console.log('fetchUserInfo called with mid:', mid, 'hasValidSession:', this.hasValidSession);

                // 如果有有效的 session，优先尝试获取当前用户信息
                if (this.hasValidSession) {
                    console.log('Attempting to fetch current user info via myinfo API');
                    const myInfoSuccess = await this.fetchMyInfo();
                    if (myInfoSuccess) {
                        console.log('Successfully fetched current user info');
                        return true;
                    }
                    console.log('Failed to fetch myinfo, falling back to user card');
                }

                // 回退到公开用户信息
                const targetMid = mid || this.cookies?.DedeUserID;
                console.log('Fetching user card for mid:', targetMid);

                if (targetMid) {
                    const cardSuccess = await this.fetchUserCard(targetMid);
                    if (cardSuccess) {
                        console.log('Successfully fetched user card');
                        return true;
                    }
                }

                console.log('No mid available for fetching user info');
                return false;
            } catch (error) {
                console.error('Failed to fetch user info:', error);
                return false;
            }
        },

        async fetchMyInfo(): Promise<boolean> {
            try {
                console.log('Fetching my info with auth headers');
                console.log('Current cookies state:', {
                    hasSessionData: !!this.cookies?.SESSDATA,
                    hasDedeUserID: !!this.cookies?.DedeUserID,
                    sessionDataLength: this.cookies?.SESSDATA?.length || 0
                });

                const headers = this.getAuthHeaders();
                const response = await fetch('/bili-api/x/space/myinfo', {
                    method: 'GET',
                    headers: headers,
                    credentials: 'include', // 确保包含credentials
                });

                console.log('MyInfo response status:', response.status);
                console.log('MyInfo response headers:', response.headers);

                if (!response.ok) {
                    console.error('MyInfo request failed with status:', response.status);
                    const errorText = await response.text();
                    console.error('Error response body:', errorText);
                    return false;
                }

                const data = await response.json();
                console.log('MyInfo response data:', { code: data.code, message: data.message, hasData: !!data.data });

                if (data.code === 0 && data.data) {
                    this.setUserInfoFromMyInfo(data.data);
                    this.saveUserInfoToStorage();
                    console.log('MyInfo processed successfully');
                    return true;
                } else {
                    console.error('MyInfo API returned error:', data.code, data.message);
                    return false;
                }
            } catch (error) {
                console.error('Error fetching my info:', error);
                return false;
            }
        },

        async fetchUserCard(mid: string): Promise<boolean> {
            try {
                console.log('Fetching user card for mid:', mid);
                const headers = this.hasValidSession ? this.getAuthHeaders() : { 'Content-Type': 'application/json' };

                const response = await fetch(`/bili-api/x/web-interface/card?mid=${mid}&photo=true`, {
                    method: 'GET',
                    headers,
                    credentials: 'include',
                });

                console.log('UserCard response status:', response.status);

                if (!response.ok) {
                    console.error('UserCard request failed with status:', response.status);
                    return false;
                }

                const data = await response.json();
                console.log('UserCard response data:', data);

                if (data.code === 0 && data.data) {
                    this.setUserInfoFromCard(data.data);
                    this.saveUserInfoToStorage();
                    console.log('UserCard processed successfully');
                    return true;
                } else {
                    console.error('UserCard API returned error:', data.code, data.message);
                    return false;
                }
            } catch (error) {
                console.error('Error fetching user card:', error);
                return false;
            }
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUserInfoFromMyInfo(myInfo: any) {
            console.log('Setting user info from myInfo:', { mid: myInfo.mid, name: myInfo.name });
            this.userCard = {
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
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUserInfoFromCard(cardData: any) {
            console.log('Setting user info from card:', { mid: cardData.card.mid, name: cardData.card.name });
            this.userCard = {
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

            if (cardData.space) {
                this.userSpace = cardData.space;
            }
        },

        // 会话管理
        async establishSession(url: string, refreshToken: string): Promise<boolean> {
            try {
                console.log('Establishing session with URL:', url.substring(0, 100) + '...');

                // 解析和设置 cookies
                const cookies = this.parseCookiesFromUrl(url);
                if (!cookies) {
                    console.error('Failed to parse cookies from URL');
                    return false;
                }

                this.setCookies(cookies);
                this.setRefreshToken(refreshToken);

                console.log('Cookies and token set, fetching user info...');

                // 获取用户信息
                const userInfoSuccess = await this.fetchUserInfo();
                console.log('User info fetch result:', userInfoSuccess);

                if (userInfoSuccess) {
                    this.isLoggedIn = true;
                    console.log('Session established successfully');
                    return true;
                }

                // 用户信息获取失败，清理会话
                console.error('Failed to fetch user info, clearing session');
                this.clearSession();
                return false;
            } catch (error) {
                console.error('Failed to establish session:', error);
                this.clearSession();
                return false;
            }
        },

        clearSession() {
            console.log('Clearing session');
            this.isLoggedIn = false;
            this.userCard = null;
            this.userSpace = null;
            this.clearCookies();
            this.clearRefreshToken();
            this.clearStoredData();
        },

        async validateSession(): Promise<boolean> {
            if (!this.hasValidSession) {
                console.log('No valid session to validate');
                return false;
            }

            try {
                const success = await this.fetchMyInfo();
                if (!success) {
                    console.log('Session validation failed, clearing session');
                    this.clearSession();
                    return false;
                }
                return true;
            } catch (error) {
                console.error('Session validation error:', error);
                this.clearSession();
                return false;
            }
        },

        // Token 管理
        setRefreshToken(token: string) {
            this.refreshToken = token;
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
        },

        clearRefreshToken() {
            this.refreshToken = null;
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        },

        // 持久化存储
        saveCookiesToStorage(cookies: CookieInfo) {
            localStorage.setItem(STORAGE_KEYS.COOKIES, JSON.stringify(cookies));
        },

        saveUserInfoToStorage() {
            if (this.userCard) {
                const userInfo = {
                    userCard: this.userCard,
                    userSpace: this.userSpace,
                    isLoggedIn: this.isLoggedIn,
                };
                localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
            }
        },

        loadFromStorage() {
            try {
                // 加载 refresh token
                const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
                if (refreshToken) {
                    this.refreshToken = refreshToken;
                }

                // 加载 cookies
                const cookiesStr = localStorage.getItem(STORAGE_KEYS.COOKIES);
                if (cookiesStr) {
                    this.cookies = JSON.parse(cookiesStr);
                }

                // 加载用户信息
                const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO);
                if (userInfoStr) {
                    const userInfo = JSON.parse(userInfoStr);
                    this.userCard = userInfo.userCard;
                    this.userSpace = userInfo.userSpace;
                    this.isLoggedIn = userInfo.isLoggedIn && this.hasValidSession;
                }

                console.log('Loaded from storage:', {
                    hasRefreshToken: !!this.refreshToken,
                    hasValidSession: this.hasValidSession,
                    isLoggedIn: this.isLoggedIn,
                    userName: this.userName,
                });
            } catch (error) {
                console.error('Failed to load from storage:', error);
                this.clearStoredData();
            }
        },

        clearStoredData() {
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.COOKIES);
            localStorage.removeItem(STORAGE_KEYS.USER_INFO);
        },

        // 初始化
        async initialize(): Promise<void> {
            console.log('Initializing account store...');
            // 从本地存储加载数据
            this.loadFromStorage();

            // 如果有会话数据，验证其有效性
            if (this.isLoggedIn && this.hasValidSession) {
                console.log('Found existing session, validating...');
                const isValid = await this.validateSession();
                if (!isValid) {
                    console.log('Session validation failed');
                }
            } else {
                console.log('No valid session found');
                this.isLoggedIn = false;
            }
        },
    },
});