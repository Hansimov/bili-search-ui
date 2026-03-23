const fs = require('fs');
const path = require('path');

const {
    DEFAULT_BACKEND_HOST,
    DEFAULT_FRONTEND_PORT,
    DEFAULT_BACKEND_PORT,
    DEFAULT_WEBSOCKET_HOST,
    DEFAULT_WEBSOCKET_PORT,
    DEFAULT_HOST,
    LOCAL_STATE_DIR,
    RUN_ROOT,
} = require('./constants');
const {
    buildDisplaySource,
    buildInstanceId,
    ensureDir,
    processExists,
    readJson,
    runCommand,
    spawnBackground,
    tailLines,
    terminateProcess,
    waitForPort,
    writeJson,
} = require('./utils');
const { ensureQuasarWorkspace, resolveSource } = require('./sourceManager');

function normalizeLocalOptions(args, options = {}) {
    const source = resolveSource(args, { materialize: options.materialize === true });
    const frontendPort = Number(args.frontendPort || process.env.FRONTEND_PORT || DEFAULT_FRONTEND_PORT);
    const backendPort = Number(args.backendPort || process.env.BACKEND_PORT || DEFAULT_BACKEND_PORT);
    const websocketPort = Number(args.websocketPort || process.env.WEBSOCKET_PORT || DEFAULT_WEBSOCKET_PORT);
    const backendHost = args.backendHost || process.env.BACKEND_HOST || DEFAULT_BACKEND_HOST;
    const websocketHost = args.websocketHost || process.env.WEBSOCKET_HOST || DEFAULT_WEBSOCKET_HOST;
    const host = args.host || process.env.HOST || DEFAULT_HOST;
    const sourceRef = source.ref || 'workspace';
    const instance = {
        runtime: 'local',
        mode: args.mode,
        sourceKind: source.kind,
        sourceRef,
        host,
        frontendPort,
        backendPort,
        websocketPort,
        backendHost,
        websocketHost,
    };
    const instanceId = buildInstanceId(instance);
    const stateDir = path.join(LOCAL_STATE_DIR, instanceId);
    const metadata = path.join(stateDir, 'metadata.json');
    const logFile = path.join(stateDir, 'service.log');
    const pidFile = path.join(stateDir, 'service.pid');

    return {
        ...instance,
        instanceId,
        stateDir,
        metadata,
        logFile,
        pidFile,
        sourceRoot: source.rootDir,
        sourceLabel: buildDisplaySource(source.kind, sourceRef),
        quasarDir: source.rootDir ? ensureQuasarWorkspace(source.rootDir) : null,
    };
}

function loadRecord(metadataPath) {
    return readJson(metadataPath, null);
}

function listLocalRecords(includeAll = false) {
    if (!fs.existsSync(LOCAL_STATE_DIR)) {
        return [];
    }

    return fs
        .readdirSync(LOCAL_STATE_DIR)
        .map((entry) => path.join(LOCAL_STATE_DIR, entry, 'metadata.json'))
        .filter((metadataPath) => fs.existsSync(metadataPath))
        .map(loadRecord)
        .filter(Boolean)
        .map((record) => ({
            ...record,
            status: processExists(record.pid) ? 'running' : 'stopped',
        }))
        .filter((record) => includeAll || record.status === 'running');
}

function ensureDependencies(quasarDir) {
    if (fs.existsSync(path.join(quasarDir, 'node_modules', '.bin', 'quasar'))) {
        return;
    }
    runCommand('npm', ['install'], { cwd: quasarDir, stdio: 'inherit' });
}

function localEnv(record) {
    return {
        ...process.env,
        HOST: record.host,
        FRONTEND_PORT: String(record.frontendPort),
        BACKEND_PORT: String(record.backendPort),
        WEBSOCKET_PORT: String(record.websocketPort),
        BACKEND_HOST: record.backendHost,
        WEBSOCKET_HOST: record.websocketHost,
        BROWSERSLIST_IGNORE_OLD_DATA: '1',
    };
}

function quasarBin(quasarDir) {
    return path.join(quasarDir, 'node_modules', '.bin', 'quasar');
}

function writeMetadata(record, pid) {
    ensureDir(record.stateDir);
    fs.writeFileSync(record.pidFile, `${pid}\n`, 'utf8');
    writeJson(record.metadata, {
        ...record,
        pid,
        updatedAt: new Date().toISOString(),
    });
}

function buildDevArgs(record) {
    return ['dev', '--host', record.host, '--port', String(record.frontendPort)];
}

function buildProServeArgs() {
    return [path.join(RUN_ROOT, 'lib', 'proServer.js')];
}

async function startLocal(args) {
    const record = normalizeLocalOptions(args, { materialize: true });
    ensureDir(record.stateDir);
    ensureDependencies(record.quasarDir);

    const current = loadRecord(record.metadata);
    if (current && processExists(current.pid)) {
        if (!args.force) {
            throw new Error(`local instance already running: ${record.instanceId}`);
        }
        await terminateProcess(current.pid);
    }

    const env = localEnv(record);
    const quasarCli = quasarBin(record.quasarDir);
    const bin = record.mode === 'dev' ? quasarCli : process.execPath;

    if (record.mode === 'pro') {
        runCommand(quasarCli, ['build'], { cwd: record.quasarDir, env, stdio: 'inherit' });
        env.DIST_DIR = path.join(record.quasarDir, 'dist', 'spa');
    }

    const commandArgs = record.mode === 'dev' ? buildDevArgs(record) : buildProServeArgs(record);
    if (args.foreground) {
        const result = runCommand(bin, commandArgs, {
            cwd: record.quasarDir,
            env,
            stdio: 'inherit',
            check: false,
        });
        process.exit(result.status || 0);
    }

    const pid = spawnBackground(bin, commandArgs, {
        cwd: record.quasarDir,
        env,
        logFile: record.logFile,
    });
    writeMetadata(record, pid);

    const ready = await waitForPort(record.frontendPort);
    return {
        ...record,
        pid,
        ready,
    };
}

async function stopLocal(args) {
    const record = normalizeLocalOptions(args);
    const current = loadRecord(record.metadata);
    if (!current) {
        return { ...record, stopped: false, reason: 'not-found' };
    }

    const stopped = await terminateProcess(current.pid);
    if (stopped || !processExists(current.pid)) {
        fs.rmSync(record.pidFile, { force: true });
    }
    writeJson(record.metadata, {
        ...current,
        pid: current.pid,
        updatedAt: new Date().toISOString(),
        stoppedAt: new Date().toISOString(),
    });
    return { ...record, stopped, pid: current.pid };
}

function statusLocal(args) {
    const record = normalizeLocalOptions(args);
    const current = loadRecord(record.metadata);
    if (!current) {
        return { ...record, status: 'not-found' };
    }
    return {
        ...current,
        status: processExists(current.pid) ? 'running' : 'stopped',
    };
}

async function restartLocal(args) {
    await stopLocal(args);
    return startLocal(args);
}

function logsLocal(args) {
    const record = normalizeLocalOptions(args);
    const current = loadRecord(record.metadata);
    if (!current || !fs.existsSync(current.logFile || record.logFile)) {
        throw new Error('log file not found');
    }
    const logFile = current.logFile || record.logFile;
    if (args.follow) {
        const child = require('./utils').followFile(logFile, args.lines);
        child.on('exit', (code) => process.exit(code || 0));
        return null;
    }
    return tailLines(logFile, args.lines);
}

module.exports = {
    normalizeLocalOptions,
    listLocalRecords,
    startLocal,
    stopLocal,
    statusLocal,
    restartLocal,
    logsLocal,
};
