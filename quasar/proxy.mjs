// 从环境变量或默认值获取端口配置
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = process.env.BACKEND_PORT || 21001;
const BILI_IMG_TARGET_ORIGIN = process.env.BILI_IMG_TARGET_ORIGIN || '';
const BILI_CDN_HOST_RE = /(^|\.)hdslb\.com$/i;
const biliUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

function parseBiliImgProxyPath(pathname = '') {
    const match = pathname.match(/^\/bili-img\/([^/]+)(\/.*)$/);
    if (!match) return null;
    const [, hostname, restPath] = match;
    if (!BILI_CDN_HOST_RE.test(hostname)) return null;
    return { hostname, restPath };
}

export default [
    {
        path: '/api',
        rule: {
            target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
            changeOrigin: true,
            pathRewrite: { '^/api': '' },
        },
    },
    {
        path: '/bili-img',
        rule: {
            target: BILI_IMG_TARGET_ORIGIN || 'https://i0.hdslb.com',
            changeOrigin: true,
            secure: true,
            router(req) {
                const parsed = parseBiliImgProxyPath(req.url || '');
                if (!parsed) return BILI_IMG_TARGET_ORIGIN || 'https://i0.hdslb.com';
                return BILI_IMG_TARGET_ORIGIN || `https://${parsed.hostname}`;
            },
            pathRewrite(pathname) {
                const parsed = parseBiliImgProxyPath(pathname);
                return parsed ? parsed.restPath : pathname;
            },
            headers: {
                Referer: 'https://www.bilibili.com',
                Origin: 'https://www.bilibili.com',
                'User-Agent': biliUserAgent,
            },
        },
    },
];
// https://quasar.dev/quasar-cli-vite/commands-list#serve
// https://github.com/chimurai/http-proxy-middleware
