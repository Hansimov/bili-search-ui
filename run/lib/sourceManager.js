const fs = require('fs');
const path = require('path');

const { REPO_ROOT, SOURCE_CACHE_DIR } = require('./constants');
const { ensureDir, removeIfExists, runCommand, safeName } = require('./utils');

function materializeLocalGit(stageDir, gitRepo, gitRef) {
    const archive = runCommand('git', ['-C', gitRepo, 'archive', '--format=tar', gitRef], {
        encoding: null,
    });
    runCommand('tar', ['-xf', '-', '-C', stageDir], {
        input: archive.stdout,
        encoding: null,
    });
}

function materializeRemoteGit(stageDir, gitUrl, gitRef) {
    runCommand('git', ['clone', gitUrl, stageDir]);
    if (gitRef) {
        runCommand('git', ['-C', stageDir, 'checkout', gitRef]);
    }
}

function resolveSourceIdentity(args) {
    const sourceKind = args.source;
    const ref = args.gitRef || 'HEAD';
    if (sourceKind === 'workspace') {
        return {
            kind: 'workspace',
            ref: 'workspace',
            rootDir: REPO_ROOT,
        };
    }
    return {
        kind: sourceKind,
        ref,
        rootDir: null,
        gitRepo: args.gitRepo ? path.resolve(args.gitRepo) : undefined,
        gitUrl: args.gitUrl,
    };
}

function resolveSource(args, options = {}) {
    const source = resolveSourceIdentity(args);
    const sourceKind = source.kind;
    if (sourceKind === 'workspace') {
        return source;
    }

    if (options.materialize === false) {
        return source;
    }

    ensureDir(SOURCE_CACHE_DIR);
    const ref = source.ref;
    const stageName = `${safeName(sourceKind)}-${safeName(ref)}`;
    const stageDir = path.join(SOURCE_CACHE_DIR, stageName);
    removeIfExists(stageDir);
    ensureDir(stageDir);

    if (sourceKind === 'local-git') {
        const gitRepo = path.resolve(args.gitRepo || REPO_ROOT);
        materializeLocalGit(stageDir, gitRepo, ref);
        return {
            ...source,
            rootDir: stageDir,
            gitRepo,
        };
    }

    if (sourceKind === 'remote-git') {
        if (!args.gitUrl) {
            throw new Error('--git-url is required when --source=remote-git');
        }
        materializeRemoteGit(stageDir, args.gitUrl, args.gitRef);
        return {
            ...source,
            rootDir: stageDir,
            gitUrl: args.gitUrl,
        };
    }

    throw new Error(`unsupported source: ${sourceKind}`);
}

function ensureQuasarWorkspace(sourceRoot) {
    const quasarDir = path.join(sourceRoot, 'quasar');
    if (!fs.existsSync(path.join(quasarDir, 'package.json'))) {
        throw new Error(`quasar workspace not found under ${sourceRoot}`);
    }
    return quasarDir;
}

module.exports = {
    resolveSourceIdentity,
    resolveSource,
    ensureQuasarWorkspace,
};
