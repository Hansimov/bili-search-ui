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
    userCard: UserCardInfo | null;
    userSpace: UserSpaceInfo | null;
    refreshToken: string | null;
}

const STORAGE_KEYS = {
    REFRESH_TOKEN: 'bili_refresh_token',
    USER_INFO: 'bili_user_info',
} as const;

// Cookie 操作工具函数
const CookieUtils = {
    // 设置 cookie
    setCookie(name: string, value: string, days = 365, domain = '', path = '/') {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));

        let cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=${path}`;

        if (domain) {
            cookieString += `; domain=${domain}`;
        }

        // 设置 SameSite 和 Secure 属性以提高安全性
        cookieString += '; SameSite=Lax';
        if (location.protocol === 'https:') {
            cookieString += '; Secure';
        }

        document.cookie = cookieString;
        console.log(`Cookie set: ${name}=${value.substring(0, 20)}...`);
    },

    // 获取 cookie
    getCookie(name: string): string | null {
        const nameEQ = name + '=';
        const ca = document.cookie.split(';');

        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1, c.length);
            }
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length, c.length));
            }
        }
        return null;
    },

    // 删除 cookie
    deleteCookie(name: string, domain = '', path = '/') {
        let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;

        if (domain) {
            cookieString += `; domain=${domain}`;
        }

        document.cookie = cookieString;
        console.log(`Cookie deleted: ${name}`);
    },

    // 获取所有 bili 相关的 cookies
    getBiliCookies(): CookieInfo | null {
        const cookies = {
            DedeUserID: this.getCookie('DedeUserID') || '',
            DedeUserID__ckMd5: this.getCookie('DedeUserID__ckMd5') || '',
            Expires: this.getCookie('Expires') || '',
            SESSDATA: this.getCookie('SESSDATA') || '',
            bili_jct: this.getCookie('bili_jct') || '',
        };

        // 检查必要的 cookie 是否存在
        if (!cookies.DedeUserID || !cookies.SESSDATA) {
            return null;
        }

        return cookies;
    },

    // 设置所有 bili 相关的 cookies
    setBiliCookies(cookies: CookieInfo) {
        // 计算过期时间
        let days = 365; // 默认一年
        if (cookies.Expires) {
            try {
                const expiresDate = new Date(parseInt(cookies.Expires) * 1000);
                const now = new Date();
                days = Math.max(1, Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            } catch (error) {
                console.warn('Failed to parse expires date, using default:', error);
            }
        }

        // 设置每个 cookie
        Object.entries(cookies).forEach(([key, value]) => {
            if (value) {
                this.setCookie(key, value, days);
            }
        });
    },

    // 清除所有 bili 相关的 cookies
    clearBiliCookies() {
        const cookieNames = ['DedeUserID', 'DedeUserID__ckMd5', 'Expires', 'SESSDATA', 'bili_jct'];
        cookieNames.forEach(name => {
            this.deleteCookie(name);
            // 尝试删除可能的域名变体
            this.deleteCookie(name, '.bilibili.com');
            this.deleteCookie(name, 'bilibili.com');
        });
    }
};

export const useAccountStore = defineStore('account', {
    state: (): AccountState => ({
        isLoggedIn: false,
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
            // 直接调用 CookieUtils，而不是 this.getCurrentCookies()
            const cookies = CookieUtils.getBiliCookies();
            return !!(cookies?.SESSDATA && cookies?.DedeUserID);
        },
        canMakeAuthenticatedRequests(): boolean {
            return this.hasValidSession;
        },
    },

    actions: {
        // 获取当前的 cookies（从浏览器读取）
        getCurrentCookies(): CookieInfo | null {
            return CookieUtils.getBiliCookies();
        },

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
            // 将 cookies 设置到浏览器
            CookieUtils.setBiliCookies(cookies);
            console.log('Cookies saved to browser:', {
                DedeUserID: cookies.DedeUserID,
                hasSessionData: !!cookies.SESSDATA,
            });
        },

        clearCookies() {
            CookieUtils.clearBiliCookies();
            console.log('Browser cookies cleared');
        },

        // 创建带认证信息的请求头
        getAuthHeaders(): HeadersInit {
            const cookies = this.getCurrentCookies();

            if (!cookies) {
                return {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
                };
            }

            // 构建完整的Cookie字符串
            const cookieString = [
                `SESSDATA=${cookies.SESSDATA}`,
                `DedeUserID=${cookies.DedeUserID}`,
                cookies.bili_jct ? `bili_jct=${cookies.bili_jct}` : '',
            ].filter(Boolean).join('; ');

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
                const cookies = this.getCurrentCookies();
                const targetMid = mid || cookies?.DedeUserID;
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
                const cookies = this.getCurrentCookies();
                console.log('Current cookies state:', {
                    hasSessionData: !!cookies?.SESSDATA,
                    hasDedeUserID: !!cookies?.DedeUserID,
                    sessionDataLength: cookies?.SESSDATA?.length || 0
                });

                const headers = this.getAuthHeaders();
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

        // 检查现有的 cookies 并尝试自动登录
        async tryAutoLogin(): Promise<boolean> {
            console.log('Attempting auto-login from existing cookies...');

            const cookies = this.getCurrentCookies();
            if (!cookies) {
                console.log('No valid cookies found for auto-login');
                return false;
            }

            console.log('Found existing cookies, attempting to fetch user info...');

            try {
                const userInfoSuccess = await this.fetchUserInfo();
                if (userInfoSuccess) {
                    this.isLoggedIn = true;
                    console.log('Auto-login successful');
                    return true;
                } else {
                    console.log('Auto-login failed: could not fetch user info');
                    // cookies 可能已过期，清理它们
                    this.clearCookies();
                    return false;
                }
            } catch (error) {
                console.error('Auto-login error:', error);
                this.clearCookies();
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

        // 持久化存储（仅存储用户信息，不存储 cookies）
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

                // 加载用户信息（但不设置 isLoggedIn，因为需要验证 cookies）
                const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO);
                if (userInfoStr) {
                    const userInfo = JSON.parse(userInfoStr);
                    this.userCard = userInfo.userCard;
                    this.userSpace = userInfo.userSpace;
                    // 注意：isLoggedIn 状态将在 tryAutoLogin 中设置
                }

                console.log('Loaded from storage:', {
                    hasRefreshToken: !!this.refreshToken,
                    hasUserCard: !!this.userCard,
                    userName: this.userCard?.name,
                });
            } catch (error) {
                console.error('Failed to load from storage:', error);
                this.clearStoredData();
            }
        },

        clearStoredData() {
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER_INFO);
        },

        // 初始化
        async initialize(): Promise<void> {
            console.log('Initializing account store...');

            // 从本地存储加载数据
            this.loadFromStorage();

            // 尝试从现有 cookies 自动登录
            const autoLoginSuccess = await this.tryAutoLogin();

            if (!autoLoginSuccess) {
                console.log('Auto-login failed or no cookies found');
                this.isLoggedIn = false;
                // 清理可能不一致的用户信息
                if (this.userCard) {
                    console.log('Clearing stored user info due to invalid session');
                    this.userCard = null;
                    this.userSpace = null;
                    this.clearStoredData();
                }
            }
        },
    },
});