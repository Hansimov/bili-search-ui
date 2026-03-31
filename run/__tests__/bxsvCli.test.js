import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { parseArgs } = require('../lib/cli');
const { composeContent } = require('../lib/dockerRuntime');
const { resolveSource } = require('../lib/sourceManager');
const { buildInstanceId } = require('../lib/utils');

function runGit(cwd, args) {
    const result = spawnSync('git', args, {
        cwd,
        encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    return (result.stdout || '').trim();
}

describe('bxsv cli', () => {
    it('parses shared service arguments', () => {
        const parsed = parseArgs([
            'start',
            '--runtime',
            'docker',
            '--mode',
            'pro',
            '--source',
            'local-git',
            '--git-ref',
            'release/v1',
            '-fp',
            '21102',
            '-bp',
            '21101',
            '--template',
            'docker-pro',
            '--output',
            'json',
        ]);

        expect(parsed.command).toBe('start');
        expect(parsed.runtime).toBe('docker');
        expect(parsed.mode).toBe('pro');
        expect(parsed.source).toBe('local-git');
        expect(parsed.gitRef).toBe('release/v1');
        expect(parsed.frontendPort).toBe(21102);
        expect(parsed.backendPort).toBe(21101);
        expect(parsed.template).toBe('docker-pro');
        expect(parsed.output).toBe('json');
    });

    it('builds stable instance ids from runtime identity', () => {
        const instanceId = buildInstanceId({
            runtime: 'docker',
            mode: 'dev',
            sourceKind: 'workspace',
            sourceRef: 'workspace',
            frontendPort: 21002,
            backendPort: 21001,
        });

        expect(instanceId).toContain('docker-dev-workspace-workspace');
        expect(instanceId.length).toBeGreaterThan(24);
    });

    it('renders docker compose for dev with bind mounts and host gateway', () => {
        const yaml = composeContent({
            instanceId: 'demo-1234',
            containerName: 'bxsv-demo',
            mode: 'dev',
            sourceLabel: 'workspace',
            sourceRoot: '/tmp/bili-search-ui',
            dockerfile: '/tmp/bili-search-ui/run/Dockerfile',
            frontendPort: 21002,
            backendPort: 21001,
            backendHost: 'host.docker.internal',
        });

        expect(yaml).toContain('host.docker.internal:host-gateway');
        expect(yaml).toContain('/tmp/bili-search-ui:/workspace');
        expect(yaml).toContain('quasar dev --host 0.0.0.0 --port 21002');
    });

    it('materializes local-git sources without corrupting git archive tar streams', () => {
        const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bxsv-local-git-'));
        let sourceRoot = null;

        try {
            runGit(repoDir, ['init']);
            runGit(repoDir, ['config', 'user.email', 'bxsv-test@example.com']);
            runGit(repoDir, ['config', 'user.name', 'bxsv test']);

            fs.mkdirSync(path.join(repoDir, 'quasar'), { recursive: true });
            fs.writeFileSync(
                path.join(repoDir, 'quasar', 'package.json'),
                JSON.stringify({ name: 'fixture-ui', version: '0.0.1' }, null, 2),
                'utf8'
            );
            fs.writeFileSync(
                path.join(repoDir, 'README.md'),
                'fixture readme\n',
                'utf8'
            );

            runGit(repoDir, ['add', '.']);
            runGit(repoDir, ['commit', '-m', 'fixture']);
            const gitRef = runGit(repoDir, ['rev-parse', 'HEAD']);

            const source = resolveSource({
                source: 'local-git',
                gitRepo: repoDir,
                gitRef,
            });
            sourceRoot = source.rootDir;

            expect(source.kind).toBe('local-git');
            expect(fs.existsSync(path.join(sourceRoot, 'quasar', 'package.json'))).toBe(true);
            expect(
                JSON.parse(fs.readFileSync(path.join(sourceRoot, 'quasar', 'package.json'), 'utf8')).name
            ).toBe('fixture-ui');
            expect(fs.readFileSync(path.join(sourceRoot, 'README.md'), 'utf8')).toBe('fixture readme\n');
        } finally {
            if (sourceRoot) {
                fs.rmSync(sourceRoot, { recursive: true, force: true });
            }
            fs.rmSync(repoDir, { recursive: true, force: true });
        }
    });
});