/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    StoredUserInfo,
    SpaceMyInfo,
    MidCard,
    RelationFollowingUserInfoList,
    StoredRelationFollowingUserInfoList,
    RelationFollowingUserInfo,
    StoredRelationFollowingUserInfo
} from './types';

const STORAGE_KEYS = {
    REFRESH_TOKEN: 'bili_refresh_token',
    USER_INFO: 'bili_user_info',
    RELATION_FOLLOWINGS: 'bili_relation_followings',
} as const;

export class StorageManager {
    // RelationFollowings: format conversion utils
    static convertToStorageFormat(users: RelationFollowingUserInfo[]): StoredRelationFollowingUserInfo[] {
        return users.map(user => {
            const { vip, ...storedUser } = user;
            return storedUser;
        });
    }

    static createStoredRelationFollowings(
        users: RelationFollowingUserInfo[],
        total?: number
    ): StoredRelationFollowingUserInfoList {
        return {
            users: this.convertToStorageFormat(users),
            total: total ?? users.length,
            lastUpdated: Date.now(),
        };
    }

    static convertToApiFormat(storedUsers: StoredRelationFollowingUserInfo[]): RelationFollowingUserInfo[] {
        return storedUsers.map(user => ({
            ...user,
            vip: {} as any, // 临时补全字段
        }));
    }

    static convertStoredToApiList(stored: StoredRelationFollowingUserInfoList): RelationFollowingUserInfoList {
        return {
            users: this.convertToApiFormat(stored.users),
            total: stored.total,
            lastUpdated: stored.lastUpdated,
        };
    }

    // RefreshToken: save, get, clear
    static setRefreshToken(token: string) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    }

    static getRefreshToken(): string | null {
        return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    }

    static clearRefreshToken() {
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    }

    // UserInfo: save, load, clear
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

    // RelationFollowings: save, load, clear
    static saveRelationFollowings(relationFollowings: StoredRelationFollowingUserInfoList) {
        try {
            localStorage.setItem(STORAGE_KEYS.RELATION_FOLLOWINGS, JSON.stringify(relationFollowings));
        } catch (error) {
            console.error('Failed to save relation followings to storage:', error);
        }
    }

    static loadRelationFollowings(): StoredRelationFollowingUserInfoList | null {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.RELATION_FOLLOWINGS);
            if (!data) return null;

            return JSON.parse(data) as StoredRelationFollowingUserInfoList;
        } catch (error) {
            console.error('Failed to load relation followings from storage:', error);
            return null;
        }
    }

    static clearRelationFollowings() {
        localStorage.removeItem(STORAGE_KEYS.RELATION_FOLLOWINGS);
    }

    // All: clear, load
    static clearAll() {
        this.clearRefreshToken();
        this.clearUserInfo();
        // this.clearRelationFollowings();
    }

    // 加载所有存储数据
    static loadAll(): {
        refreshToken: string | null;
        userInfo: StoredUserInfo | null;
        relationFollowings: StoredRelationFollowingUserInfoList | null;
    } {
        return {
            refreshToken: this.getRefreshToken(),
            userInfo: this.loadUserInfo(),
            relationFollowings: this.loadRelationFollowings(),
        };
    }
}