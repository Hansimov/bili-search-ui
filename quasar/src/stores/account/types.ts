export interface CookieInfo {
    DedeUserID: string;
    DedeUserID__ckMd5: string;
    Expires: string;
    SESSDATA: string;
    bili_jct: string;
}

// space/myinfo API 响应数据结构
export interface SpaceMyInfo {
    mid: number;
    name: string;
    sex: string;
    face: string;
    sign: string;
    rank: number;
    level: number;
    jointime: number;
    moral: number;
    silence: number;
    email_status: number;
    tel_status: number;
    identification: number;
    vip: {
        type: number;
        status: number;
        due_date: number;
        vip_pay_type: number;
        theme_type: number;
        label: {
            path: string;
            text: string;
            label_theme: string;
            text_color: string;
            bg_style: number;
            bg_color: string;
            border_color: string;
            use_img_label: boolean;
            img_label_uri_hans: string;
            img_label_uri_hant: string;
            img_label_uri_hans_static: string;
            img_label_uri_hant_static: string;
            label_id: number;
            label_goto: {
                mobile: string;
                pc_web: string;
            };
        };
        avatar_subscript: number;
        nickname_color: string;
        role: number;
        avatar_subscript_url: string;
        tv_vip_status: number;
        tv_vip_pay_type: number;
        tv_due_date: number;
        avatar_icon: {
            icon_type: number;
            icon_resource: Record<string, unknown>;
        };
    };
    pendant: {
        pid: number;
        name: string;
        image: string;
        expire: number;
        image_enhance: string;
        image_enhance_frame: string;
        n_pid: number;
    };
    nameplate: {
        nid: number;
        name: string;
        image: string;
        image_small: string;
        level: string;
        condition: string;
    };
    official: {
        role: number;
        title: string;
        desc: string;
        type: number;
    };
    birthday: number;
    is_tourist: number;
    is_fake_account: number;
    pin_prompting: number;
    is_deleted: number;
    in_reg_audit: number;
    is_rip_user: boolean;
    profession: {
        id: number;
        name: string;
        show_name: string;
        is_show: number;
        category_one: string;
        realname: string;
        title: string;
        department: string;
        certificate_no: string;
        certificate_show: boolean;
    };
    face_nft: number;
    face_nft_new: number;
    is_senior_member: number;
    honours: {
        mid: number;
        colour: {
            dark: string;
            normal: string;
        };
        tags: string[] | null;
        is_latest_100honour: number;
    };
    digital_id: string;
    digital_type: number;
    attestation: {
        type: number;
        common_info: {
            title: string;
            prefix: string;
            prefix_title: string;
        };
        splice_info: {
            title: string;
        };
        icon: string;
        desc: string;
    };
    expert_info: {
        title: string;
        state: number;
        type: number;
        desc: string;
    };
    name_render: null | {
        color?: string;
        style?: string;
    };
    country_code: string;
    level_exp: {
        current_level: number;
        current_min: number;
        current_exp: number;
        next_exp: number;
        level_up: number;
    };
    coins: number;
    following: number;
    follower: number;
}

// web-interface/card API 响应数据结构
export interface MidCard {
    card: {
        mid: string;
        name: string;
        approve: boolean;
        sex: string;
        rank: string;
        face: string;
        face_nft: number;
        face_nft_type: number;
        DisplayRank: string;
        regtime: number;
        spacesta: number;
        birthday: string;
        place: string;
        description: string;
        article: number;
        attentions: string[];
        fans: number;
        friend: number;
        attention: number;
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
            image_enhance: string;
            image_enhance_frame: string;
            n_pid: number;
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
        official_verify: {
            type: number;
            desc: string;
        };
        vip: {
            type: number;
            status: number;
            due_date: number;
            vip_pay_type: number;
            theme_type: number;
            label: {
                path: string;
                text: string;
                label_theme: string;
                text_color: string;
                bg_style: number;
                bg_color: string;
                border_color: string;
                use_img_label: boolean;
                img_label_uri_hans: string;
                img_label_uri_hant: string;
                img_label_uri_hans_static: string;
                img_label_uri_hant_static: string;
                label_id: number;
                label_goto: {
                    mobile: string;
                    pc_web: string;
                };
            };
            avatar_subscript: number;
            nickname_color: string;
            role: number;
            avatar_subscript_url: string;
            tv_vip_status: number;
            tv_vip_pay_type: number;
            tv_due_date: number;
            avatar_icon: {
                icon_type: number;
                icon_resource: Record<string, unknown>;
            };
            vipType: number;
            vipStatus: number;
        };
        is_senior_member: number;
        name_render: null | {
            color?: string;
            style?: string;
        };
    };
    following: boolean;
    archive_count: number;
    article_count: number;
    follower: number;
    like_num: number;
    space?: {
        s_img: string;
        l_img: string;
    };
}

export interface RelationFollowingUserInfo {
    mid: number;
    attribute: number;
    mtime: number;
    tag: string | null;
    special: number;
    contract_info: Record<string, unknown>;
    uname: string;
    face: string;
    sign: string;
    face_nft: number;
    official_verify: {
        type: number;
        desc: string;
    };
    vip: {
        vipType: number;
        vipDueDate: number;
        dueRemark: string;
        accessStatus: number;
        vipStatus: number;
        vipStatusWarn: string;
        themeType: number;
        label: {
            path: string;
            text: string;
            label_theme: string;
            text_color: string;
            bg_style: number;
            bg_color: string;
            border_color: string;
        };
        avatar_subscript: number;
        nickname_color: string;
        avatar_subscript_url: string;
    };
    name_render: Record<string, unknown>;
    nft_icon: string;
    rec_reason: string;
    track_id: string;
    follow_time: string;
}

// 关注列表响应数据结构
export interface RelationFollowingResponse {
    code: number;
    message: string;
    ttl: number;
    data: {
        list: RelationFollowingUserInfo[];
        re_version: number;
        total: number;
    };
}

// 关注列表数据结构
export interface RelationFollowingUserInfoList {
    users: RelationFollowingUserInfo[];
    total: number;
    lastUpdated: number; // 时间戳
}

export interface AccountState {
    isLoggedIn: boolean;
    spaceMyInfo: SpaceMyInfo | null;
    midCard: MidCard | null;
    refreshToken: string | null;
    relationFollowings: RelationFollowingUserInfoList | null;
}

export interface StoredUserInfo {
    spaceMyInfo: SpaceMyInfo | null;
    midCard: MidCard | null;
    isLoggedIn: boolean;
}