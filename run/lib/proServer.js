const fs = require('fs');
const http = require('http');
const path = require('path');
const { createRequire } = require('module');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.FRONTEND_PORT || 21002);
const distDir = process.env.DIST_DIR;
const backendHost = process.env.BACKEND_HOST || '127.0.0.1';
const backendPort = Number(process.env.BACKEND_PORT || 21001);
const biliApiTarget = process.env.BILI_API_TARGET || 'https://api.bilibili.com';
const biliUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

if (!distDir) {
    throw new Error('DIST_DIR is required');
}

const resolvedDistDir = path.resolve(distDir);
const indexHtmlPath = path.join(resolvedDistDir, 'index.html');
const quasarDir = path.resolve(resolvedDistDir, '..', '..');
const workspaceRequire = createRequire(path.join(quasarDir, 'package.json'));
const httpProxy = workspaceRequire('http-proxy');

const apiProxy = httpProxy.createProxyServer({
    target: `http://${backendHost}:${backendPort}`,
    changeOrigin: true,
    xfwd: true,
});

const biliApiProxy = httpProxy.createProxyServer({
    target: biliApiTarget,
    changeOrigin: true,
    xfwd: true,
    secure: biliApiTarget.startsWith('https://'),
});

function sendProxyError(res, error) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Proxy error: ${error.message}`);
}

apiProxy.on('error', (error, req, res) => {
    if (res && !res.headersSent) {
        sendProxyError(res, error);
    }
});

biliApiProxy.on('error', (error, req, res) => {
    if (res && !res.headersSent) {
        sendProxyError(res, error);
    }
});

biliApiProxy.on('proxyReq', (proxyReq) => {
    proxyReq.setHeader('Referer', 'https://www.bilibili.com');
    proxyReq.setHeader('Origin', 'https://www.bilibili.com');
    proxyReq.setHeader('User-Agent', biliUserAgent);
});

function contentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.html':
            return 'text/html; charset=utf-8';
        case '.js':
        case '.mjs':
            return 'application/javascript; charset=utf-8';
        case '.css':
            return 'text/css; charset=utf-8';
        case '.json':
            return 'application/json; charset=utf-8';
        case '.svg':
            return 'image/svg+xml';
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.webp':
            return 'image/webp';
        case '.avif':
            return 'image/avif';
        case '.ico':
            return 'image/x-icon';
        case '.txt':
            return 'text/plain; charset=utf-8';
        default:
            return 'application/octet-stream';
    }
}

function safeFilePath(urlPathname) {
    const decodedPath = decodeURIComponent(urlPathname);
    const cleaned = decodedPath.replace(/^\/+/, '');
    const absolutePath = path.resolve(resolvedDistDir, cleaned);
    if (!absolutePath.startsWith(resolvedDistDir)) {
        return null;
    }
    return absolutePath;
}

function serveFile(filePath, res) {
    const stream = fs.createReadStream(filePath);
    stream.on('open', () => {
        res.writeHead(200, { 'Content-Type': contentType(filePath) });
    });
    stream.on('error', () => {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Failed to read file');
    });
    stream.pipe(res);
}

function handleStaticRequest(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const candidatePath = safeFilePath(requestUrl.pathname);

    if (candidatePath) {
        try {
            const stat = fs.existsSync(candidatePath) ? fs.statSync(candidatePath) : null;
            if (stat && stat.isFile()) {
                serveFile(candidatePath, res);
                return;
            }
            if (stat && stat.isDirectory()) {
                const nestedIndex = path.join(candidatePath, 'index.html');
                if (fs.existsSync(nestedIndex)) {
                    serveFile(nestedIndex, res);
                    return;
                }
            }
        }
        catch {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Failed to inspect file');
            return;
        }
    }

    serveFile(indexHtmlPath, res);
}

const server = http.createServer((req, res) => {
    const requestUrl = req.url || '/';

    if (requestUrl.startsWith('/api')) {
        req.url = req.url.replace(/^\/api/, '') || '/';
        apiProxy.web(req, res);
        return;
    }

    if (requestUrl.startsWith('/bili-api')) {
        req.url = req.url.replace(/^\/bili-api/, '') || '/';
        biliApiProxy.web(req, res);
        return;
    }

    handleStaticRequest(req, res);
});

server.listen(port, host, () => {
    process.stdout.write(`bxsv pro server listening on http://${host}:${port}\n`);
});