const BILI_CDN_HOST_RE = /(^|\.)hdslb\.com$/i;

const parseUrl = (url: string): URL | null => {
    try {
        return new URL(url, 'https://local.bili-search.invalid');
    } catch {
        return null;
    }
};

export const normalizeRemoteImageUrl = (url?: string | null): string => {
    if (!url) return '';

    let normalized = url.trim();
    if (!normalized) return '';

    if (normalized.startsWith('//')) {
        normalized = `https:${normalized}`;
    } else if (normalized.startsWith('http://')) {
        normalized = normalized.replace(/^http:\/\//, 'https://');
    }

    return normalized;
};

export const isBiliCdnImageUrl = (url?: string | null): boolean => {
    const normalized = normalizeRemoteImageUrl(url);
    if (!normalized) return false;

    const parsed = parseUrl(normalized);
    if (!parsed) return false;
    return BILI_CDN_HOST_RE.test(parsed.hostname);
};

/**
 * Rewrite bilibili CDN images to the local same-origin proxy to avoid hotlink blocks.
 */
export function rewriteImageUrl(url: string): string {
    const normalized = normalizeRemoteImageUrl(url);
    if (!normalized) return normalized;

    const parsed = parseUrl(normalized);
    if (!parsed || !BILI_CDN_HOST_RE.test(parsed.hostname)) {
        return normalized;
    }

    return `/bili-img/${parsed.host}${parsed.pathname}`;
}

export const getRenderableImageUrl = (url?: string | null): string => {
    const normalized = normalizeRemoteImageUrl(url);
    if (!normalized) return '';
    return rewriteImageUrl(normalized);
};

export const normalizeBiliImageUrl = (
    url?: string | null,
    suffix = ''
): string => {
    const normalized = normalizeRemoteImageUrl(url);
    if (!normalized) return '';

    if (!isBiliCdnImageUrl(normalized)) {
        return normalized;
    }

    const withSuffix = suffix && !normalized.includes(suffix)
        ? `${normalized}${suffix}`
        : normalized;

    return rewriteImageUrl(withSuffix);
};