import { StoredUserInfo, SpaceMyInfo, MidCard } from './types';

const STORAGE_KEYS = {
    REFRESH_TOKEN: 'bili_refresh_token',
    USER_INFO: 'bili_user_info',
} as const;

export class StorageManager {
    // Token 管理
    static setRefreshToken(token: string) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    }

    static getRefreshToken(): string | null {
        return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    }

    static clearRefreshToken() {
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }

    // 用户信息管理
    static saveUserInfo(
        spaceMyInfo: SpaceMyInfo | null,
        midCard: MidCard | null,
        isLoggedIn: boolean
    ) {
        const userInfo: StoredUserInfo = {
            spaceMyInfo,
            midCard,
            isLoggedIn,
        };
        localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
    }

    static loadUserInfo(): StoredUserInfo | null {
        try {
            const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO);
            if (userInfoStr) {
                return JSON.parse(userInfoStr);
            }
            return null;
        } catch (error) {
            console.error('Failed to load user info from storage:', error);
            return null;
        }
    }

    static clearUserInfo() {
        localStorage.removeItem(STORAGE_KEYS.USER_INFO);
    }

    // 清理所有存储数据
    static clearAll() {
        this.clearRefreshToken();
        this.clearUserInfo();
    }

    // 加载所有存储数据
    static loadAll(): {
        refreshToken: string | null;
        userInfo: StoredUserInfo | null;
    } {
        return {
            refreshToken: this.getRefreshToken(),
            userInfo: this.loadUserInfo(),
        };
    }
}