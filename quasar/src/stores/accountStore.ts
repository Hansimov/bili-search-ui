import { defineStore } from 'pinia';
import { AccountState, CookieInfo, SpaceMyInfo, MidCard, StoredRelationFollowingUserInfoList } from './account/types';
import { CookieManager, BiliApiClient, StorageManager } from './account';
import { Notify } from 'quasar';

export * from './account/types';

export const useAccountStore = defineStore('account', {
    state: (): AccountState & {
        isUpdatingFollowings: boolean;
    } => ({
        isLoggedIn: false,
        spaceMyInfo: null,
        midCard: null,
        refreshToken: null,
        relationFollowings: null,
        isUpdatingFollowings: false,
    }),

    getters: {
        userName(): string {
            return this.spaceMyInfo?.name || this.midCard?.card?.name || '';
        },

        userAvatar(): string {
            return this.spaceMyInfo?.face || this.midCard?.card?.face || '';
        },

        userMid(): number {
            return this.spaceMyInfo?.mid || 0;
        },

        userFans(): number {
            return this.midCard?.card?.fans || 0;
        },

        userAttention(): number {
            return this.midCard?.card?.attention || 0;
        },

        userCoins(): number {
            return Math.floor(this.spaceMyInfo?.coins || 0);
        },

        userArchiveCount(): number {
            return this.midCard?.archive_count || 0;
        },

        userSpace(): { s_img: string; l_img: string } | null {
            return this.midCard?.space || null;
        },

        hasValidSession(): boolean {
            const cookies = CookieManager.getBiliCookies();
            return !!(cookies && cookies.SESSDATA && cookies.DedeUserID);
        },

        canMakeAuthenticatedRequests(): boolean {
            return this.hasValidSession && this.isLoggedIn;
        },

        followingCount(): number {
            return this.relationFollowings?.total || 0;
        },

        followingUsers(): StoredRelationFollowingUserInfoList['users'] {
            return this.relationFollowings?.users || [];
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
        },

        clearCookies() {
            CookieManager.clearBiliCookies();
        },

        // 创建带认证信息的请求头
        getAuthHeaders(): HeadersInit {
            return CookieManager.getAuthHeaders();
        },

        // 获取关注列表（智能更新）
        async fetchRelationFollowings(forceRefresh = false): Promise<boolean> {
            if (!this.hasValidSession || !this.userMid) {
                console.log('Cannot fetch relation followings: no valid session or user mid');
                return false;
            }

            try {
                console.log('Fetching relation followings for user mid:', this.userMid, 'forceRefresh:', forceRefresh);

                // 构造完整格式的现有数据传递给 API
                const existingData = forceRefresh || !this.relationFollowings ? null :
                    StorageManager.convertStoredToApiList(this.relationFollowings);

                const users = await BiliApiClient.fetchRelationFollowings(
                    this.userMid.toString(),
                    existingData
                );

                if (users) {
                    // 转换为存储格式
                    this.relationFollowings = StorageManager.createStoredRelationFollowings(users);
                    this.saveRelationFollowingsToStorage();
                    console.log(`Successfully updated relation followings: ${users.length} users`);
                    return true;
                } else {
                    console.log('Failed to fetch relation followings');
                    return false;
                }
            } catch (error) {
                console.error('Error fetching relation followings:', error);
                return false;
            }
        },

        // 手动更新关注列表
        async handleUpdateFollowings(): Promise<boolean> {
            if (this.isUpdatingFollowings) {
                return false;
            }

            this.isUpdatingFollowings = true;

            try {
                console.log('Manually triggering relation followings update...');
                const success = await this.fetchRelationFollowings(false);

                if (success) {
                    console.log(
                        `Successfully updated followings: ${this.followingCount} users`
                    );
                    Notify.create({
                        type: 'positive',
                        message: `关注列表同步成功，共 ${this.followingCount} 个关注`,
                        position: 'top-right',
                        timeout: 1500,
                    });
                    return true;
                } else {
                    console.log('Failed to update followings');
                    Notify.create({
                        type: 'negative',
                        message: '关注列表同步失败，请重试',
                        position: 'top-right',
                        timeout: 1500,
                    });
                    return false;
                }
            } catch (error) {
                console.error('Error updating followings:', error);
                Notify.create({
                    type: 'negative',
                    message: '关注列表同步失败，请重试',
                    position: 'top-right',
                    timeout: 1500,
                });
                return false;
            } finally {
                this.isUpdatingFollowings = false;
            }
        },

        // 强制刷新关注列表
        async refreshRelationFollowings(): Promise<boolean> {
            return await this.fetchRelationFollowings(true);
        },

        // 检查关注列表是否需要更新
        shouldUpdateRelationFollowings(): boolean {
            if (!this.relationFollowings) return true;

            const lastUpdated = this.relationFollowings.lastUpdated;
            const now = Date.now();
            const oneHour = 60 * 60 * 1000; // 1小时

            return (now - lastUpdated) > oneHour;
        },

        // 退出登录
        handleLogout() {
            console.log('Logging out user');
            this.clearSession();
            Notify.create({
                type: 'info',
                message: '已退出登录',
                position: 'top-right',
                timeout: 1500,
            });
        },

        // 用户信息管理 - 并行获取两种用户信息
        async fetchUserInfo(mid?: string): Promise<boolean> {
            try {
                console.log('fetchUserInfo called with mid:', mid, 'hasValidSession:', this.hasValidSession);

                let spaceMyInfoSuccess = false;
                let midCardSuccess = false;

                // 如果有有效的 session，获取当前用户信息
                if (this.hasValidSession) {
                    console.log('Attempting to fetch SpaceMyInfo API');
                    const spaceMyInfo = await BiliApiClient.fetchSpaceMyInfo();
                    if (spaceMyInfo) {
                        this.spaceMyInfo = spaceMyInfo;
                        spaceMyInfoSuccess = true;
                        console.log('Successfully fetched SpaceMyInfo');
                    } else {
                        console.log('Failed to fetch SpaceMyInfo');
                    }
                }

                // 获取用户卡片信息
                const cookies = this.getCurrentCookies();
                const targetMid = mid || cookies?.DedeUserID || this.spaceMyInfo?.mid?.toString();
                console.log('Fetching MidCard for mid:', targetMid);

                if (targetMid) {
                    const midCard = await BiliApiClient.fetchMidCard(targetMid, this.hasValidSession);
                    if (midCard) {
                        this.midCard = midCard;
                        midCardSuccess = true;
                        console.log('Successfully fetched MidCard');
                    } else {
                        console.log('Failed to fetch MidCard');
                    }
                }

                // 保存到本地存储
                if (spaceMyInfoSuccess || midCardSuccess) {
                    this.saveUserInfoToStorage();
                    return true;
                }

                console.log('No user info fetched successfully');
                return false;
            } catch (error) {
                console.error('Failed to fetch user info:', error);
                return false;
            }
        },

        // 设置用户信息
        setUserInfo(spaceMyInfo: SpaceMyInfo | null, midCard: MidCard | null) {
            this.spaceMyInfo = spaceMyInfo;
            this.midCard = midCard;
        },

        // 会话管理
        async establishSession(url: string, refreshToken: string): Promise<boolean> {
            try {
                console.log('Establishing session...');

                // 解析并设置 cookies
                const cookies = this.parseCookiesFromUrl(url);
                if (!cookies) {
                    console.error('Failed to parse cookies from URL');
                    return false;
                }

                this.setCookies(cookies);
                this.setRefreshToken(refreshToken);

                // 获取用户信息
                const userInfoSuccess = await this.fetchUserInfo();
                if (userInfoSuccess) {
                    this.isLoggedIn = true;
                    console.log('Session established successfully');

                    // 显示登录成功通知
                    Notify.create({
                        type: 'positive',
                        message: `登录成功！欢迎回来，${this.userName}`,
                        position: 'top-right',
                        timeout: 1500,
                    });

                    return true;
                } else {
                    console.error('Failed to fetch user info after setting cookies');

                    Notify.create({
                        type: 'negative',
                        message: '登录失败，请重试',
                        position: 'top-right',
                        timeout: 1500,
                    });

                    this.clearSession();
                    return false;
                }
            } catch (error) {
                console.error('Error establishing session:', error);
                this.clearSession();
                return false;
            }
        },

        clearSession() {
            console.log('Clearing session');
            this.isLoggedIn = false;
            this.spaceMyInfo = null;
            this.midCard = null;
            this.refreshToken = null;
            // this.relationFollowings = null;
            this.isUpdatingFollowings = false;
            this.clearCookies();
            StorageManager.clearAll();
        },

        async validateSession(): Promise<boolean> {
            if (!this.hasValidSession) {
                console.log('No valid session found');
                return false;
            }

            try {
                // 尝试获取用户信息来验证 session
                const isValid = await this.fetchUserInfo();
                if (isValid) {
                    this.isLoggedIn = true;
                    console.log('Session validation successful');
                    return true;
                } else {
                    console.log('Session validation failed');
                    this.clearSession();
                    return false;
                }
            } catch (error) {
                console.error('Error validating session:', error);
                this.clearSession();
                return false;
            }
        },

        // 检查现有的 cookies 并尝试自动登录
        async tryAutoLogin(): Promise<boolean> {
            console.log('Attempting auto-login from existing cookies...');

            const cookies = this.getCurrentCookies();
            if (!cookies) {
                console.log('No existing cookies found');
                return false;
            }

            console.log('Found existing cookies, attempting to fetch user info...');

            try {
                const success = await this.fetchUserInfo();
                if (success) {
                    this.isLoggedIn = true;
                    console.log('Auto-login successful');
                    return true;
                } else {
                    console.log('Auto-login failed - invalid cookies');
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
            StorageManager.saveUserInfo(
                this.spaceMyInfo,
                this.midCard,
                this.isLoggedIn
            );
        },

        saveRelationFollowingsToStorage() {
            if (this.relationFollowings) {
                StorageManager.saveRelationFollowings(this.relationFollowings);
            }
        },

        loadFromStorage() {
            try {
                const data = StorageManager.loadAll();

                // 加载 refresh token
                if (data.refreshToken) {
                    this.refreshToken = data.refreshToken;
                }

                // 加载用户信息
                if (data.userInfo) {
                    this.spaceMyInfo = data.userInfo.spaceMyInfo;
                    this.midCard = data.userInfo.midCard;
                    this.isLoggedIn = data.userInfo.isLoggedIn;
                }

                // 加载关注列表
                if (data.relationFollowings) {
                    this.relationFollowings = data.relationFollowings;
                }

                console.log('Loaded from storage:', {
                    hasRefreshToken: !!this.refreshToken,
                    hasSpaceMyInfo: !!this.spaceMyInfo,
                    hasMidCard: !!this.midCard,
                    isLoggedIn: this.isLoggedIn,
                    hasRelationFollowings: !!this.relationFollowings,
                    followingCount: this.followingCount,
                    userName: this.userName,
                });
            } catch (error) {
                console.error('Failed to load from storage:', error);
                StorageManager.clearAll();
            }
        },

        // 初始化
        async initialize(): Promise<void> {
            console.log('Initializing account store...');

            // 加载本地存储的数据
            this.loadFromStorage();

            // 如果有登录状态，尝试验证 session
            if (this.isLoggedIn) {
                console.log('Found existing login state, validating session...');
                const isValid = await this.validateSession();

                if (!isValid) {
                    console.log('Session validation failed, clearing state');
                    this.clearSession();
                }
            } else {
                // 尝试自动登录
                console.log('No login state found, attempting auto-login...');
                await this.tryAutoLogin();
            }

            console.log('Account store initialization completed');
        },
    },
});