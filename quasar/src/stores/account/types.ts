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

export interface StoredUserInfo {
    userCard: UserCardInfo;
    userSpace: UserSpaceInfo | null;
    isLoggedIn: boolean;
}