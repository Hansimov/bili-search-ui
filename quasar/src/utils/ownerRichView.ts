import { humanReadableNumber } from 'src/utils/convert';
import { normalizeAvatarPicUrl, normalizeVideoPicUrl } from 'src/utils/videoHit';

export interface OwnerRichInfo {
    mid: string;
    name?: string;
    face?: string;
    sign?: string;
    fans?: number;
    sample_title?: string;
    sample_bvid?: string;
    sample_pic?: string;
    sample_view?: number;
}

export type OwnerRichInput = Omit<Partial<OwnerRichInfo>, 'mid'> & {
    mid?: string | number;
};

export const normalizeOwnerRichInfo = (
    owner: OwnerRichInput
): OwnerRichInfo | null => {
    const mid = String(owner.mid || '').trim();
    if (!mid) {
        return null;
    }

    return {
        mid,
        name: owner.name,
        face: owner.face,
        sign: owner.sign,
        fans: owner.fans,
        sample_title: owner.sample_title,
        sample_bvid: owner.sample_bvid,
        sample_pic: owner.sample_pic,
        sample_view: owner.sample_view,
    };
};

export const getOwnerHref = (mid?: string | number): string => {
    const normalizedMid = String(mid || '').trim();
    return normalizedMid ? `https://space.bilibili.com/${normalizedMid}` : '';
};

export const getOwnerDisplayName = (
    owner: OwnerRichInput,
    fallback?: string
): string => {
    return owner.name?.trim() || fallback || `UP 主 ${owner.mid || ''}`.trim();
};

export const getOwnerAvatarUrl = (owner: OwnerRichInput): string => {
    return owner.face ? normalizeAvatarPicUrl(owner.face) : '';
};

export const formatOwnerFans = (fans?: number): string => {
    if (fans == null) return '';
    return `${humanReadableNumber(fans)} 粉丝`;
};

export const getOwnerUidText = (mid?: string | number): string => {
    const normalizedMid = String(mid || '').trim();
    return normalizedMid ? `UID ${normalizedMid}` : '';
};

export const getOwnerStatLine = (
    owner: OwnerRichInput,
    options: { includeUid?: boolean } = {}
): string => {
    const includeUid = options.includeUid ?? true;
    return [
        formatOwnerFans(owner.fans),
        includeUid ? getOwnerUidText(owner.mid) : '',
    ]
        .filter(Boolean)
        .join(' · ');
};

export const getOwnerSampleHref = (owner: OwnerRichInput): string => {
    if (owner.sample_bvid) {
        return `https://www.bilibili.com/video/${owner.sample_bvid}`;
    }
    if (owner.sample_title && /^https?:\/\//.test(owner.sample_title)) {
        return owner.sample_title;
    }
    return '';
};

export const getOwnerSampleTitle = (owner: OwnerRichInput): string => {
    return owner.sample_title?.trim() || '';
};

export const getOwnerSampleCoverUrl = (
    owner: OwnerRichInput
): string => {
    return owner.sample_pic ? normalizeVideoPicUrl(owner.sample_pic) : '';
};

export const hasOwnerSample = (owner: OwnerRichInput): boolean => {
    return Boolean(
        getOwnerSampleTitle(owner) ||
        getOwnerSampleHref(owner) ||
        getOwnerSampleCoverUrl(owner)
    );
};