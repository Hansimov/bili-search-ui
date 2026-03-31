import { createRequire } from 'module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { parseArgs } = require('../lib/cli');
const { composeContent } = require('../lib/dockerRuntime');
const { buildInstanceId } = require('../lib/utils');

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
});