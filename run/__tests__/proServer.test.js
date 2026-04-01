import fs from 'fs';
import http from 'http';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..', '..');
const quasarDir = path.join(workspaceRoot, 'quasar');
const proServerPath = path.join(workspaceRoot, 'run', 'lib', 'proServer.js');

function listen(server) {
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            resolve(server.address().port);
        });
    });
}

function closeServer(server) {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function waitForServer(url, timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;

    const attempt = async () => {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return;
            }
        } catch {
            // server is still starting
        }

        if (Date.now() >= deadline) {
            throw new Error(`Timed out waiting for ${url}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
        return attempt();
    };

    return attempt();
}

function waitForExit(child) {
    return new Promise((resolve) => {
        if (child.exitCode != null) {
            resolve(child.exitCode);
            return;
        }
        child.once('exit', (code) => resolve(code));
    });
}

describe('proServer', () => {
    it('proxies /bili-api requests instead of serving the SPA fallback', async () => {
        const requests = [];
        const biliApiServer = http.createServer((req, res) => {
            requests.push({
                url: req.url,
                referer: req.headers.referer,
                origin: req.headers.origin,
                userAgent: req.headers['user-agent'],
            });
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, path: req.url }));
        });
        const biliApiPort = await listen(biliApiServer);

        const probeServer = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('probe');
        });
        const frontendPort = await listen(probeServer);
        await closeServer(probeServer);

        const tempRoot = fs.mkdtempSync(path.join(quasarDir, '.tmp-pro-server-'));
        const distDir = path.join(tempRoot, 'dist', 'spa');
        fs.mkdirSync(distDir, { recursive: true });
        fs.writeFileSync(path.join(tempRoot, 'package.json'), '{}\n', 'utf8');
        fs.writeFileSync(
            path.join(distDir, 'index.html'),
            '<!doctype html><html><body>spa fallback</body></html>\n',
            'utf8'
        );

        const child = spawn(process.execPath, [proServerPath], {
            cwd: quasarDir,
            env: {
                ...process.env,
                DIST_DIR: distDir,
                FRONTEND_PORT: String(frontendPort),
                BACKEND_HOST: '127.0.0.1',
                BACKEND_PORT: '65535',
                BILI_API_TARGET: `http://127.0.0.1:${biliApiPort}`,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        try {
            await waitForServer(`http://127.0.0.1:${frontendPort}/`);

            const proxyResponse = await fetch(
                `http://127.0.0.1:${frontendPort}/bili-api/x/web-interface/card?mid=946974&photo=true`
            );
            const proxyJson = await proxyResponse.json();
            expect(proxyJson).toEqual({
                ok: true,
                path: '/x/web-interface/card?mid=946974&photo=true',
            });
            expect(requests).toHaveLength(1);
            expect(requests[0].referer).toBe('https://www.bilibili.com');
            expect(requests[0].origin).toBe('https://www.bilibili.com');
            expect(requests[0].userAgent).toContain('Mozilla/5.0');

            const spaResponse = await fetch(`http://127.0.0.1:${frontendPort}/missing-route`);
            const spaHtml = await spaResponse.text();
            expect(spaHtml).toContain('spa fallback');
        } finally {
            child.kill('SIGTERM');
            await waitForExit(child);
            await closeServer(biliApiServer);
            fs.rmSync(tempRoot, { recursive: true, force: true });
        }
    });
});