import constants from 'src/stores/constants.json';

export interface VideoHitLike {
    bvid?: string;
    title?: string;
    pic?: string;
    duration?: number | string | null;
    duration_str?: string | null;
    owner?: { name?: string; mid?: number | string | null } | null;
    stat?: { view?: number | string | null } | null;
    pubdate?: number | string | null;
    pubdate_str?: string | null;
    region_name?: string | null;
    region_parent_name?: string | null;
    score?: number | string | null;
}

export interface NormalizedVideoHit {
    bvid?: string;
    title?: string;
    pic?: string;
    duration?: number;
    owner?: { name?: string; mid?: number };
    stat?: { view?: number };
    pubdate?: number;
    region_name?: string;
    region_parent_name?: string;
    score?: number;
}

const toFiniteNumber = (value: number | string | null | undefined): number | undefined => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const parseDurationString = (value?: string | null): number | undefined => {
    if (!value) return undefined;
    const parts = value
        .trim()
        .split(':')
        .map((part) => Number(part));

    if (parts.length < 2 || parts.length > 3 || parts.some((part) => !Number.isFinite(part))) {
        return undefined;
    }

    if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
    }

    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
};

const parsePubdateString = (value?: string | null): number | undefined => {
    if (!value) return undefined;
    const normalized = value.trim().replace(' ', 'T');
    const parsed = Date.parse(`${normalized}+08:00`);
    if (!Number.isFinite(parsed)) {
        return undefined;
    }
    return Math.floor(parsed / 1000);
};

export const normalizeVideoHit = (hit: VideoHitLike): NormalizedVideoHit => {
    const duration = toFiniteNumber(hit.duration) ?? parseDurationString(hit.duration_str);
    const pubdate = toFiniteNumber(hit.pubdate) ?? parsePubdateString(hit.pubdate_str);

    return {
        ...hit,
        duration,
        pubdate,
        score: toFiniteNumber(hit.score),
        owner: hit.owner
            ? {
                ...hit.owner,
                mid: toFiniteNumber(hit.owner.mid),
            }
            : undefined,
        stat: hit.stat
            ? {
                ...hit.stat,
                view: toFiniteNumber(hit.stat.view),
            }
            : undefined,
        region_name: hit.region_name || undefined,
        region_parent_name: hit.region_parent_name || undefined,
    };
};

export const normalizeVideoPicUrl = (pic?: string | null): string => {
    if (!pic) return '';
    let normalized = pic;
    if (normalized.startsWith('//')) {
        normalized = `https:${normalized}`;
    } else if (normalized.startsWith('http://')) {
        normalized = normalized.replace('http://', 'https://');
    }
    if (normalized.includes(constants.coverPicSuffix)) {
        return normalized;
    }
    return `${normalized}${constants.coverPicSuffix}`;
};