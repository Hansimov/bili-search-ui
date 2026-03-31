const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function safeName(value) {
    const text = String(value || 'default').trim().toLowerCase();
    const safe = text.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return safe || 'default';
}

function shortHash(value) {
    return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 10);
}

function buildInstanceId(identity) {
    const core = [
        identity.runtime,
        identity.mode,
        identity.sourceKind,
        identity.sourceRef || 'workspace',
        `fp${identity.frontendPort}`,
        `bp${identity.backendPort}`,
    ]
        .map(safeName)
        .join('-');
    return `${core}-${shortHash(JSON.stringify(identity))}`;
}

function buildDisplaySource(kind, ref) {
    if (kind === 'workspace') {
        return 'workspace';
    }
    return `${kind}:${ref || 'HEAD'}`;
}

function formatTable(headers, rows) {
    const stringRows = rows.map((row) => row.map((cell) => String(cell)));
    const widths = headers.map((header) => header.length);
    for (const row of stringRows) {
        row.forEach((cell, index) => {
            widths[index] = Math.max(widths[index], cell.length);
        });
    }

    const renderRow = (row) => row.map((cell, index) => cell.padEnd(widths[index], ' ')).join('  ');
    const separator = widths.map((width) => '-'.repeat(width));
    return [renderRow(headers), renderRow(separator), ...stringRows.map(renderRow)].join('\n');
}

function readJson(filePath, fallback = null) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return fallback;
    }
}

function writeJson(filePath, value) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function removeIfExists(filePath) {
    fs.rmSync(filePath, { recursive: true, force: true });
}

function runCommand(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: options.stdio || 'pipe',
        encoding: options.encoding || 'utf8',
        input: options.input,
        maxBuffer: options.maxBuffer || 256 * 1024 * 1024,
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0 && options.check !== false) {
        const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
        const stdout = typeof result.stdout === 'string' ? result.stdout.trim() : '';
        const details = stderr || stdout || `exit code ${result.status}`;
        throw new Error(`${command} ${args.join(' ')} failed: ${details}`);
    }

    return result;
}

function spawnBackground(command, args, options) {
    ensureDir(path.dirname(options.logFile));
    const fd = fs.openSync(options.logFile, 'a');
    const child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        detached: true,
        stdio: ['ignore', fd, fd],
    });
    child.unref();
    fs.closeSync(fd);
    return child.pid;
}

function processExists(pid) {
    if (!pid || pid <= 0) {
        return false;
    }
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function terminateProcess(pid, timeoutMs = 5000) {
    if (!processExists(pid)) {
        return false;
    }

    try {
        process.kill(-pid, 'SIGTERM');
    } catch {
        try {
            process.kill(pid, 'SIGTERM');
        } catch {
            return false;
        }
    }

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (!processExists(pid)) {
            return true;
        }
        await sleep(200);
    }

    try {
        process.kill(-pid, 'SIGKILL');
    } catch {
        try {
            process.kill(pid, 'SIGKILL');
        } catch {
            return false;
        }
    }

    return true;
}

function tailLines(filePath, lines = 50) {
    const text = fs.readFileSync(filePath, 'utf8');
    return text.split(/\r?\n/).slice(-lines).join('\n');
}

function followFile(filePath, lines = 50) {
    return spawn('tail', ['-n', String(lines), '-f', filePath], { stdio: 'inherit' });
}

function waitForPort(port, host = '127.0.0.1', timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;

    return new Promise((resolve) => {
        const probe = () => {
            const socket = net.createConnection({ host, port });
            socket.setTimeout(1000);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('timeout', () => socket.destroy());
            socket.on('error', () => {
                socket.destroy();
                if (Date.now() >= deadline) {
                    resolve(false);
                    return;
                }
                setTimeout(probe, 250);
            });
            socket.on('close', () => {
                if (Date.now() >= deadline) {
                    resolve(false);
                }
            });
        };

        probe();
    });
}

function yamlQuote(value) {
    return JSON.stringify(String(value));
}

function frontendUrl(record, requestPath = '/') {
    const normalizedPath = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
    return `http://127.0.0.1:${record.frontendPort}${normalizedPath}`;
}

function requestUrl(targetUrl, options = {}) {
    const timeoutMs = options.timeoutMs || 10000;
    const method = options.method || 'GET';
    const url = new URL(targetUrl);
    const client = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
        const request = client.request(
            url,
            {
                method,
                timeout: timeoutMs,
            },
            (response) => {
                let body = '';
                response.setEncoding('utf8');
                response.on('data', (chunk) => {
                    body += chunk;
                });
                response.on('end', () => {
                    resolve({
                        ok: response.statusCode >= 200 && response.statusCode < 400,
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body,
                        url: targetUrl,
                    });
                });
            }
        );
        request.on('timeout', () => {
            request.destroy(new Error(`request timeout after ${timeoutMs}ms`));
        });
        request.on('error', (error) => {
            reject(error);
        });
        request.end();
    });
}

function printError(error) {
    console.error(`bxsv: ${error.message}`);
}

module.exports = {
    ensureDir,
    safeName,
    shortHash,
    buildInstanceId,
    buildDisplaySource,
    formatTable,
    readJson,
    writeJson,
    removeIfExists,
    runCommand,
    spawnBackground,
    processExists,
    terminateProcess,
    tailLines,
    followFile,
    waitForPort,
    yamlQuote,
    frontendUrl,
    requestUrl,
    printError,
};
