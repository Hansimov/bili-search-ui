const fs = require('fs');
const path = require('path');

const {
    DEFAULT_MODE,
    DEFAULT_RUNTIME,
    DEFAULT_SOURCE,
} = require('./constants');
const { getTemplate, listTemplates } = require('./templates');
const {
    formatTable,
    frontendUrl,
    printError,
    requestUrl,
} = require('./utils');
const {
    listLocalRecords,
    logsLocal,
    restartLocal,
    startLocal,
    statusLocal,
    stopLocal,
} = require('./localRuntime');
const {
    listDockerPs,
    logsDocker,
    restartDocker,
    startDocker,
    statusDocker,
    stopDocker,
} = require('./dockerRuntime');

const HELP_TEXT = `bxsv: Bili Search UI service manager

Usage:
  bxsv start [options]
  bxsv stop [options]
  bxsv restart [options]
  bxsv status [options]
    bxsv check [options]
  bxsv logs [options]
  bxsv ps [options]
    bxsv templates [options]
    bxsv template --name <template> [options]
  bxsv install [options]

Core options:
  --runtime <local|docker>        Runtime environment, default local
    --mode <dev|pro>                Service mode, default dev
  --source <workspace|local-git|remote-git>
  --git-ref <ref>                 Branch, tag, or commit for git sources
  --git-repo <path>               Local git repository path
  --git-url <url>                 Remote git repository URL
  --host <host>                   Frontend bind host, default 0.0.0.0
  -fp, --frontend-port <port>     Frontend port
  -bp, --backend-port <port>      Backend API port
  -wp, --websocket-port <port>    WebSocket port
  --backend-host <host>           Backend host override
  --websocket-host <host>         WebSocket host override
    --instance-id <id>              Filter by managed instance id
    --status <running|stopped>      Filter by runtime status
    --template <name>               Apply a built-in runtime template
    --name <name>                   Template name for bxsv template

Command options:
  --foreground                    Run local service in foreground
  --force                         Replace an existing matching local instance
  -n, --lines <n>                 Log tail line count, default 50
  -f, --follow                    Follow logs
    --output <table|json>           Output mode, default table
    --json                          Backward-compatible alias for --output json
  --all                           Include stopped instances in ps
    --path <path>                   Request path for bxsv check, default /
    --timeout <ms>                  Timeout in milliseconds for bxsv check
    --expected-status <code>        Exact HTTP status expected by bxsv check
  --install-dir <path>            Install target for the bxsv launcher

Examples:
  bxsv start --runtime local --mode dev
    bxsv start --runtime docker --mode pro --source local-git --git-ref main
  bxsv start --runtime docker --mode dev --backend-host host.docker.internal
    bxsv start --template docker-pro -fp 21102 -bp 21101 -wp 21103
    bxsv check --runtime local --mode dev --path /
    bxsv ps --runtime docker --status running --output json
    bxsv templates --output table
    bxsv template --name local-pro --output json
  bxsv ps --all
  bxsv install
`;

function parseArgs(argv) {
    const args = {
        command: 'help',
        runtime: DEFAULT_RUNTIME,
        mode: DEFAULT_MODE,
        source: DEFAULT_SOURCE,
        lines: 50,
        follow: false,
        foreground: false,
        force: false,
        all: false,
        output: 'table',
        json: false,
        path: '/',
        timeout: 10000,
        _provided: new Set(),
    };
    const tokens = [...argv];
    if (tokens.length > 0 && !tokens[0].startsWith('-')) {
        args.command = tokens.shift();
    }

    const defs = new Map([
        ['--runtime', ['runtime', 'string']],
        ['--mode', ['mode', 'string']],
        ['--source', ['source', 'string']],
        ['--git-ref', ['gitRef', 'string']],
        ['--git-repo', ['gitRepo', 'string']],
        ['--git-url', ['gitUrl', 'string']],
        ['--host', ['host', 'string']],
        ['--backend-host', ['backendHost', 'string']],
        ['--websocket-host', ['websocketHost', 'string']],
        ['--instance-id', ['instanceId', 'string']],
        ['--status', ['statusFilter', 'string']],
        ['--template', ['template', 'string']],
        ['--name', ['name', 'string']],
        ['-fp', ['frontendPort', 'number']],
        ['--frontend-port', ['frontendPort', 'number']],
        ['-bp', ['backendPort', 'number']],
        ['--backend-port', ['backendPort', 'number']],
        ['-wp', ['websocketPort', 'number']],
        ['--websocket-port', ['websocketPort', 'number']],
        ['--foreground', ['foreground', 'boolean']],
        ['--force', ['force', 'boolean']],
        ['--all', ['all', 'boolean']],
        ['-n', ['lines', 'number']],
        ['--lines', ['lines', 'number']],
        ['-f', ['follow', 'boolean']],
        ['--follow', ['follow', 'boolean']],
        ['--output', ['output', 'string']],
        ['--json', ['json', 'boolean']],
        ['--path', ['path', 'string']],
        ['--timeout', ['timeout', 'number']],
        ['--expected-status', ['expectedStatus', 'number']],
        ['--install-dir', ['installDir', 'string']],
        ['-h', ['help', 'boolean']],
        ['--help', ['help', 'boolean']],
    ]);

    while (tokens.length > 0) {
        const token = tokens.shift();
        const [flag, inlineValue] = token.includes('=') ? token.split(/=(.*)/s, 2) : [token, null];
        const definition = defs.get(flag);
        if (!definition) {
            throw new Error(`unknown option: ${flag}`);
        }
        const [key, type] = definition;
        args._provided.add(key);
        if (type === 'boolean') {
            args[key] = true;
            continue;
        }
        const rawValue = inlineValue !== null ? inlineValue : tokens.shift();
        if (rawValue === undefined) {
            throw new Error(`missing value for ${flag}`);
        }
        args[key] = type === 'number' ? Number(rawValue) : rawValue;
    }

    if (args.help || args.command === 'help') {
        args.command = 'help';
    }
    return args;
}

function resolveOutputMode(args) {
    const mode = args.json ? 'json' : args.output || 'table';
    if (!['table', 'json'].includes(mode)) {
        throw new Error(`unsupported output mode: ${mode}`);
    }
    return mode;
}

function normalizeMode(mode) {
    if (mode === 'prod') {
        return 'pro';
    }
    return mode;
}

function applyTemplateDefaults(args) {
    if (!args.template) {
        return args;
    }
    const template = getTemplate(args.template);
    if (!template) {
        throw new Error(`unknown template: ${args.template}`);
    }
    for (const [key, value] of Object.entries(template.defaults)) {
        if (!args._provided.has(key)) {
            args[key] = value;
        }
    }
    return args;
}

function wantsJson(args) {
    return resolveOutputMode(args) === 'json';
}

function recordControlValue(record) {
    if (record.runtime === 'docker' || record.container) {
        return record.container?.id || record.containerId || '-';
    }
    return record.pid || '-';
}

function renderInstanceTable(records) {
    return formatTable(
        ['RUNTIME', 'MODE', 'SOURCE', 'FRONTEND', 'STATUS', 'PID/CTR', 'INSTANCE_ID'],
        records.map((record) => [
            record.runtime,
            record.mode,
            record.sourceLabel,
            record.frontendPort,
            record.status,
            recordControlValue(record),
            record.instanceId,
        ])
    );
}

function renderCheckTable(payload) {
    return formatTable(
        ['RUNTIME', 'URL', 'STATUS', 'RESULT', 'EXPECTED'],
        [[payload.runtime, payload.url, payload.statusCode || '-', payload.ok ? 'ok' : 'failed', payload.expectedStatus || '-']]
    );
}

function printStatus(record) {
    console.log(renderInstanceTable([record]));
}

function renderTemplates(args) {
    const templates = listTemplates();
    if (wantsJson(args)) {
        printJson(templates);
        return;
    }
    console.log(
        formatTable(
            ['NAME', 'RUNTIME', 'MODE', 'SOURCE', 'DESCRIPTION'],
            templates.map((template) => [
                template.name,
                template.defaults.runtime,
                template.defaults.mode,
                template.defaults.source,
                template.description,
            ])
        )
    );
}

function renderTemplate(args) {
    if (!args.name) {
        throw new Error('--name is required for bxsv template');
    }
    const template = getTemplate(args.name);
    if (!template) {
        throw new Error(`unknown template: ${args.name}`);
    }
    if (wantsJson(args)) {
        printJson(template);
        return;
    }
    console.log(
        formatTable(
            ['FIELD', 'VALUE'],
            [
                ['name', template.name],
                ['description', template.description],
                ['runtime', template.defaults.runtime],
                ['mode', template.defaults.mode],
                ['source', template.defaults.source],
                ['start', template.commands.start],
                ['status', template.commands.status],
                ['check', template.commands.check],
            ]
        )
    );
}

function printJson(payload) {
    console.log(JSON.stringify(payload, null, 2));
}

function buildFilters(args) {
    return {
        instanceId: args._provided.has('instanceId') ? args.instanceId : undefined,
        mode: args._provided.has('mode') ? args.mode : undefined,
        sourceKind: args._provided.has('source') ? args.source : undefined,
        sourceRef: args._provided.has('gitRef') ? args.gitRef : args.source === 'workspace' && args._provided.has('source') ? 'workspace' : undefined,
        frontendPort: args._provided.has('frontendPort') ? args.frontendPort : undefined,
        backendPort: args._provided.has('backendPort') ? args.backendPort : undefined,
        websocketPort: args._provided.has('websocketPort') ? args.websocketPort : undefined,
        status: args._provided.has('statusFilter') ? args.statusFilter : undefined,
    };
}

function matchesFilters(record, filters) {
    return Object.entries(filters).every(([key, expected]) => {
        if (expected === undefined || expected === null || expected === '') {
            return true;
        }
        if (key === 'status') {
            return record.status === expected;
        }
        if (['frontendPort', 'backendPort', 'websocketPort'].includes(key)) {
            return Number(record[key]) === Number(expected);
        }
        return record[key] === expected;
    });
}

function collectPsRecords(args) {
    const filters = buildFilters(args);
    const rows = [];

    if (!args.runtime || args.runtime === 'local') {
        for (const record of listLocalRecords(args.all)) {
            if (!matchesFilters(record, filters)) {
                continue;
            }
            rows.push({
                runtime: 'local',
                ...record,
            });
        }
    }

    if (!args.runtime || args.runtime === 'docker') {
        for (const record of listDockerPs(args.all)) {
            if (!matchesFilters(record, filters)) {
                continue;
            }
            rows.push({
                runtime: 'docker',
                ...record,
            });
        }
    }

    return rows;
}

function renderPs(args) {
    const records = collectPsRecords(args);
    const rows = records.map((record) => [
        record.runtime,
        record.mode,
        record.sourceLabel,
        record.frontendPort,
        record.status,
        record.runtime === 'local' ? record.pid || '-' : record.containerId,
    ]);

    if (rows.length === 0) {
        if (wantsJson(args)) {
            printJson([]);
            return;
        }
        console.log('No managed bxsv instances found.');
        return;
    }
    if (wantsJson(args)) {
        printJson(records);
        return;
    }
    console.log(formatTable(['RUNTIME', 'MODE', 'SOURCE', 'FRONTEND', 'STATUS', 'PID/CTR'], rows));
}

async function checkCommand(args) {
    const record = args.runtime === 'docker' ? statusDocker(args) : statusLocal(args);
    const url = frontendUrl(record, args.path || '/');
    if (record.status !== 'running') {
        const payload = {
            ok: false,
            reason: 'not-running',
            runtime: args.runtime,
            instanceId: record.instanceId,
            status: record.status,
            url,
        };
        if (wantsJson(args)) {
            printJson(payload);
        } else {
            console.log(renderCheckTable(payload));
        }
        process.exitCode = 1;
        return;
    }

    try {
        const response = await requestUrl(url, {
            timeoutMs: args.timeout,
        });
        const expectedStatus = args.expectedStatus;
        const ok = expectedStatus ? response.statusCode === expectedStatus : response.statusCode >= 200 && response.statusCode < 500;
        const payload = {
            ok,
            runtime: args.runtime,
            instanceId: record.instanceId,
            url,
            statusCode: response.statusCode,
            expectedStatus: expectedStatus || '2xx-4xx',
        };
        if (wantsJson(args)) {
            printJson(payload);
        } else {
            console.log(renderCheckTable(payload));
        }
        if (!ok) {
            process.exitCode = 1;
        }
    } catch (error) {
        const payload = {
            ok: false,
            runtime: args.runtime,
            instanceId: record.instanceId,
            url,
            error: error.message,
        };
        if (wantsJson(args)) {
            printJson(payload);
        } else {
            console.log(formatTable(['RUNTIME', 'URL', 'RESULT', 'ERROR'], [[payload.runtime, payload.url, 'failed', payload.error]]));
        }
        process.exitCode = 1;
    }
}

function installCommand(args) {
    const installDir = path.resolve(args.installDir || path.join(process.env.HOME || '~', '.local', 'bin'));
    const target = path.join(installDir, 'bxsv');
    const source = path.resolve(__dirname, '..', 'bxsv.js');
    fs.mkdirSync(installDir, { recursive: true });
    try {
        fs.rmSync(target, { force: true });
    } catch {
        // ignored
    }
    fs.symlinkSync(source, target);

    const zshrc = path.join(process.env.HOME || '', '.zshrc');
    const exportLine = 'export PATH="$HOME/.local/bin:$PATH"';
    if (fs.existsSync(zshrc)) {
        const content = fs.readFileSync(zshrc, 'utf8');
        if (!content.includes(exportLine)) {
            fs.appendFileSync(zshrc, `\n${exportLine}\n`, 'utf8');
        }
    }
    console.log(`Installed bxsv -> ${target}`);
}

async function runCommandWithRuntime(args) {
    args.mode = normalizeMode(args.mode);
    applyTemplateDefaults(args);
    args.mode = normalizeMode(args.mode);

    if (args.command === 'help') {
        console.log(HELP_TEXT);
        return;
    }

    if (args.command === 'templates') {
        renderTemplates(args);
        return;
    }

    if (args.command === 'template') {
        renderTemplate(args);
        return;
    }

    if (args.command === 'install') {
        installCommand(args);
        return;
    }

    if (args.command === 'ps') {
        if (args.runtime === DEFAULT_RUNTIME) {
            delete args.runtime;
        }
        renderPs(args);
        return;
    }

    const runtime = args.runtime || DEFAULT_RUNTIME;
    if (!['local', 'docker'].includes(runtime)) {
        throw new Error(`unsupported runtime: ${runtime}`);
    }
    if (!['dev', 'pro'].includes(args.mode)) {
        throw new Error(`unsupported mode: ${args.mode}`);
    }
    if (!['workspace', 'local-git', 'remote-git'].includes(args.source)) {
        throw new Error(`unsupported source: ${args.source}`);
    }

    if (runtime === 'local') {
        if (args.command === 'start') {
            const record = await startLocal(args);
            if (wantsJson(args)) {
                printJson(record);
                return;
            }
            console.log(`Started local ${record.mode} instance on ${record.frontendPort} (pid ${record.pid}).`);
            console.log(`Source: ${record.sourceLabel}`);
            console.log(`Log: ${record.logFile}`);
            return;
        }
        if (args.command === 'stop') {
            const record = await stopLocal(args);
            if (wantsJson(args)) {
                printJson(record);
                return;
            }
            console.log(record.stopped ? `Stopped local instance ${record.instanceId}.` : 'Local instance not found.');
            return;
        }
        if (args.command === 'restart') {
            const record = await restartLocal(args);
            if (wantsJson(args)) {
                printJson(record);
                return;
            }
            console.log(`Restarted local instance ${record.instanceId}.`);
            return;
        }
        if (args.command === 'status') {
            const record = statusLocal(args);
            if (wantsJson(args)) {
                printJson(record);
                return;
            }
            printStatus(record);
            return;
        }
        if (args.command === 'check') {
            await checkCommand(args);
            return;
        }
        if (args.command === 'logs') {
            const output = logsLocal(args);
            if (output) {
                console.log(output);
            }
            return;
        }
    }

    if (runtime === 'docker') {
        if (args.command === 'start') {
            const record = startDocker(args);
            if (wantsJson(args)) {
                printJson(record);
                return;
            }
            console.log(`Started docker ${record.mode} instance on ${record.frontendPort}.`);
            console.log(`Source: ${record.sourceLabel}`);
            console.log(`Container: ${record.container?.name || '-'}`);
            return;
        }
        if (args.command === 'stop') {
            const record = stopDocker(args);
            if (wantsJson(args)) {
                printJson(record);
                return;
            }
            console.log(record.stopped ? `Stopped docker instance ${record.instanceId}.` : 'Docker instance not found.');
            return;
        }
        if (args.command === 'restart') {
            const record = restartDocker(args);
            if (wantsJson(args)) {
                printJson(record);
                return;
            }
            console.log(`Restarted docker instance ${record.instanceId}.`);
            return;
        }
        if (args.command === 'status') {
            const record = statusDocker(args);
            if (wantsJson(args)) {
                printJson(record);
                return;
            }
            printStatus(record);
            return;
        }
        if (args.command === 'check') {
            await checkCommand(args);
            return;
        }
        if (args.command === 'logs') {
            logsDocker(args);
            return;
        }
    }

    throw new Error(`unsupported command: ${args.command}`);
}

async function main(argv) {
    try {
        const args = parseArgs(argv);
        await runCommandWithRuntime(args);
    } catch (error) {
        printError(error);
        process.exit(1);
    }
}

module.exports = {
    HELP_TEXT,
    parseArgs,
    checkCommand,
    main,
};
