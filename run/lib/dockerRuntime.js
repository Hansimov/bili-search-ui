const fs = require('fs');
const path = require('path');

const {
    DEFAULT_BACKEND_PORT,
    DEFAULT_FRONTEND_PORT,
    DEFAULT_HOST,
    DOCKER_STATE_DIR,
    RUN_ROOT,
} = require('./constants');
const {
    buildDisplaySource,
    buildInstanceId,
    ensureDir,
    readJson,
    runCommand,
    safeName,
    sameManagedIdentity,
    writeJson,
    yamlQuote,
} = require('./utils');
const { resolveSource } = require('./sourceManager');

function normalizeDockerOptions(args, options = {}) {
    const source = resolveSource(args, { materialize: options.materialize === true });
    const frontendPort = Number(args.frontendPort || process.env.FRONTEND_PORT || DEFAULT_FRONTEND_PORT);
    const backendPort = Number(args.backendPort || process.env.BACKEND_PORT || DEFAULT_BACKEND_PORT);
    const identity = {
        runtime: 'docker',
        mode: args.mode,
        sourceKind: source.kind,
        sourceRef: source.ref || 'workspace',
        host: args.host || process.env.HOST || DEFAULT_HOST,
        frontendPort,
        backendPort,
        backendHost: args.backendHost || 'host.docker.internal',
    };
    const instanceId = buildInstanceId(identity);
    const stateDir = path.join(DOCKER_STATE_DIR, instanceId);
    const projectName = `bxsv-${safeName(instanceId)}`.slice(0, 55);
    const containerName = `bxsv-${safeName(instanceId)}`.slice(0, 63);
    const metadata = path.join(stateDir, 'metadata.json');
    const composeFile = path.join(stateDir, 'compose.yml');
    return {
        ...identity,
        instanceId,
        stateDir,
        metadata,
        composeFile,
        projectName,
        containerName,
        sourceRoot: source.rootDir,
        sourceLabel: buildDisplaySource(source.kind, source.ref || 'workspace'),
        dockerfile: path.join(RUN_ROOT, 'Dockerfile'),
    };
}

function composeContent(record) {
    const baseLines = [
        'services:',
        '  ui:',
        `    container_name: ${yamlQuote(record.containerName)}`,
        '    labels:',
        '      bxsv.managed: "true"',
        `      bxsv.instance_id: ${yamlQuote(record.instanceId)}`,
        `      bxsv.mode: ${yamlQuote(record.mode)}`,
        `      bxsv.source: ${yamlQuote(record.sourceLabel)}`,
        '    build:',
        `      context: ${yamlQuote(record.sourceRoot)}`,
        `      dockerfile: ${yamlQuote(record.dockerfile)}`,
        `      target: ${yamlQuote(record.mode === 'dev' ? 'dev-base' : 'prod-runtime')}`,
        '    extra_hosts:',
        '      - "host.docker.internal:host-gateway"',
        '    environment:',
        `      FRONTEND_PORT: ${yamlQuote(record.frontendPort)}`,
        `      BACKEND_PORT: ${yamlQuote(record.backendPort)}`,
        `      BACKEND_HOST: ${yamlQuote(record.backendHost)}`,
        `      CHOKIDAR_USEPOLLING: ${yamlQuote('1')}`,
        '    ports:',
        `      - ${yamlQuote(`${record.frontendPort}:${record.frontendPort}`)}`,
    ];

    if (record.mode === 'dev') {
        baseLines.push(
            '    working_dir: /workspace/quasar',
            '    volumes:',
            `      - ${yamlQuote(`${record.sourceRoot}:/workspace`)}`,
            `      - ${yamlQuote(`bxsv-node-modules-${record.instanceId}:/workspace/quasar/node_modules`)}`,
            '    command:',
            '      - sh',
            '      - -lc',
            `      - ${yamlQuote(`npm install && ./node_modules/.bin/quasar dev --host 0.0.0.0 --port ${record.frontendPort}`)}`,
            'volumes:',
            `  ${safeName(`bxsv-node-modules-${record.instanceId}`)}: {}`
        );
        return `${baseLines.join('\n')}\n`;
    }

    return `${baseLines.join('\n')}\n`;
}

function ensureCompose(record) {
    ensureDir(record.stateDir);
    fs.writeFileSync(record.composeFile, composeContent(record), 'utf8');
    writeJson(record.metadata, {
        ...record,
        updatedAt: new Date().toISOString(),
    });
}

function composeArgs(record, extraArgs) {
    return ['compose', '-p', record.projectName, '-f', record.composeFile, ...extraArgs];
}

function loadMetadata(metadataPath) {
    return readJson(metadataPath, null);
}

function listDockerRecords() {
    if (!fs.existsSync(DOCKER_STATE_DIR)) {
        return [];
    }
    return fs
        .readdirSync(DOCKER_STATE_DIR)
        .map((entry) => path.join(DOCKER_STATE_DIR, entry, 'metadata.json'))
        .filter((metadataPath) => fs.existsSync(metadataPath))
        .map(loadMetadata)
        .filter(Boolean);
}

function findMatchingDockerRecord(record) {
    const current = loadMetadata(record.metadata);
    if (current) {
        return current;
    }
    return listDockerRecords().find((candidate) => sameManagedIdentity(candidate, record)) || null;
}

function dockerInspect(instanceId) {
    const result = runCommand(
        'docker',
        ['ps', '-aq', '--filter', 'label=bxsv.managed=true', '--filter', `label=bxsv.instance_id=${instanceId}`],
        { check: false }
    );
    const ids = (result.stdout || '').split(/\r?\n/).filter(Boolean);
    if (ids.length === 0) {
        return null;
    }
    const inspect = runCommand('docker', ['inspect', ids[0]], { check: false });
    if (!inspect.stdout) {
        return null;
    }
    const parsed = JSON.parse(inspect.stdout)[0];
    return {
        id: parsed.Id.slice(0, 12),
        name: (parsed.Name || '').replace(/^\//, ''),
        status: parsed.State?.Status || 'unknown',
        startedAt: parsed.State?.StartedAt || null,
        image: parsed.Config?.Image || '',
    };
}

function startDocker(args) {
    const record = normalizeDockerOptions(args, { materialize: true });
    const current = findMatchingDockerRecord(record);
    if (current) {
        const existing = dockerInspect(current.instanceId);
        if (existing) {
            if (!args.force) {
                throw new Error(`docker instance already running: ${current.instanceId}`);
            }
            stopDocker({ ...args, ...current });
        }
    }
    ensureCompose(record);
    runCommand('docker', composeArgs(record, ['up', '-d', '--build']), { stdio: 'inherit' });
    const inspect = dockerInspect(record.instanceId);
    writeJson(record.metadata, {
        ...record,
        container: inspect,
        updatedAt: new Date().toISOString(),
    });
    return {
        ...record,
        container: inspect,
    };
}

function stopDocker(args) {
    const record = normalizeDockerOptions(args);
    const current = findMatchingDockerRecord(record);
    if (!current) {
        return { ...record, stopped: false, reason: 'not-found' };
    }
    runCommand('docker', composeArgs(current, ['down', '--remove-orphans']), { stdio: 'inherit', check: false });
    writeJson(current.metadata || record.metadata, {
        ...current,
        updatedAt: new Date().toISOString(),
        stoppedAt: new Date().toISOString(),
    });
    return { ...current, stopped: true };
}

function statusDocker(args) {
    const record = normalizeDockerOptions(args);
    const current = findMatchingDockerRecord(record);
    if (!current) {
        return { ...record, status: 'not-found' };
    }
    const inspect = dockerInspect(record.instanceId);
    return {
        ...current,
        container: inspect,
        status: inspect ? inspect.status : 'stopped',
    };
}

function restartDocker(args) {
    stopDocker(args);
    return startDocker(args);
}

function logsDocker(args) {
    const record = normalizeDockerOptions(args);
    const current = findMatchingDockerRecord(record);
    if (!current) {
        throw new Error('docker instance not found');
    }
    const extraArgs = ['logs', '--tail', String(args.lines || 50)];
    if (args.follow) {
        extraArgs.push('-f');
    }
    runCommand('docker', composeArgs(current, extraArgs), { stdio: 'inherit', check: false });
    return null;
}

function listDockerPs(includeAll = false) {
    const rows = [];
    for (const record of listDockerRecords()) {
        const inspect = dockerInspect(record.instanceId);
        if (!inspect && !includeAll) {
            continue;
        }
        rows.push({
            ...record,
            status: inspect ? inspect.status : 'stopped',
            containerId: inspect ? inspect.id : '-',
        });
    }
    return rows;
}

module.exports = {
    normalizeDockerOptions,
    startDocker,
    stopDocker,
    statusDocker,
    restartDocker,
    logsDocker,
    listDockerPs,
    composeContent,
};
