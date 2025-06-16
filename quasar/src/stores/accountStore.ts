import { defineStore } from 'pinia';
import { AccountState, CookieInfo, UserCardInfo, UserSpaceInfo } from './account/types';
import { CookieManager } from './account/cookieManager';
import { BiliApiClient } from './account/apiClient';
import { StorageManager } from './account/storageManager';

export * from './account/types';

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
            const cookies = CookieManager.getBiliCookies();
            return !!(cookies?.SESSDATA && cookies?.DedeUserID);
        },
        canMakeAuthenticatedRequests(): boolean {
            return this.hasValidSession;
        },
    },

    actions: {
        // Cookie 管理
        getCurrentCookies(): CookieInfo | null {
            return CookieManager.getBiliCookies();
        },

        parseCookiesFromUrl(url: string): CookieInfo | null {
            return CookieManager.parseCookiesFromUrl(url);
        },

        setCookies(cookies: CookieInfo) {
            CookieManager.setBiliCookies(cookies);
            console.log('Cookies saved to browser:', {
                DedeUserID: cookies.DedeUserID,
                hasSessionData: !!cookies.SESSDATA,
            });
        },

        clearCookies() {
            CookieManager.clearBiliCookies();
            console.log('Browser cookies cleared');
        },

        // 创建带认证信息的请求头
        getAuthHeaders(): HeadersInit {
            return CookieManager.getAuthHeaders();
        },

        // 用户信息管理
        async fetchUserInfo(mid?: string): Promise<boolean> {
            try {
                console.log('fetchUserInfo called with mid:', mid, 'hasValidSession:', this.hasValidSession);

                // 如果有有效的 session，优先尝试获取当前用户信息
                if (this.hasValidSession) {
                    console.log('Attempting to fetch current user info via myinfo API');
                    const result = await BiliApiClient.fetchMyInfo();
                    if (result) {
                        this.setUserInfo(result.userCard, result.userSpace);
                        this.saveUserInfoToStorage();
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
                    const result = await BiliApiClient.fetchUserCard(targetMid, this.hasValidSession);
                    if (result) {
                        this.setUserInfo(result.userCard, result.userSpace);
                        this.saveUserInfoToStorage();
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

        // 设置用户信息
        setUserInfo(userCard: UserCardInfo, userSpace: UserSpaceInfo | null) {
            this.userCard = userCard;
            this.userSpace = userSpace;
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
            this.refreshToken = null;
            this.clearCookies();
            StorageManager.clearAll();
        },

        async validateSession(): Promise<boolean> {
            if (!this.hasValidSession) {
                console.log('No valid session to validate');
                return false;
            }

            try {
                const result = await BiliApiClient.fetchMyInfo();
                if (!result) {
                    console.log('Session validation failed, clearing session');
                    this.clearSession();
                    return false;
                }
                this.setUserInfo(result.userCard, result.userSpace);
                this.saveUserInfoToStorage();
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
            StorageManager.setRefreshToken(token);
        },

        // 持久化存储
        saveUserInfoToStorage() {
            if (this.userCard) {
                StorageManager.saveUserInfo(this.userCard, this.userSpace, this.isLoggedIn);
            }
        },

        loadFromStorage() {
            try {
                const data = StorageManager.loadAll();

                // 加载 refresh token
                if (data.refreshToken) {
                    this.refreshToken = data.refreshToken;
                }

                // 加载用户信息（但不设置 isLoggedIn，因为需要验证 cookies）
                if (data.userInfo) {
                    this.userCard = data.userInfo.userCard;
                    this.userSpace = data.userInfo.userSpace;
                    // 注意：isLoggedIn 状态将在 tryAutoLogin 中设置
                }

                console.log('Loaded from storage:', {
                    hasRefreshToken: !!this.refreshToken,
                    hasUserCard: !!this.userCard,
                    userName: this.userCard?.name,
                });
            } catch (error) {
                console.error('Failed to load from storage:', error);
                StorageManager.clearAll();
            }
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
                    StorageManager.clearAll();
                }
            }
        },
    },
});