const BUILTIN_TEMPLATES = [
    {
        name: 'local-dev',
        description: 'Workspace code in local development mode',
        defaults: {
            runtime: 'local',
            mode: 'dev',
            source: 'workspace',
        },
        commands: {
            start: 'bxsv start --template local-dev',
            status: 'bxsv status --template local-dev --output table',
            check: 'bxsv check --template local-dev --output table',
        },
    },
    {
        name: 'local-pro',
        description: 'Workspace code in local production mode',
        defaults: {
            runtime: 'local',
            mode: 'pro',
            source: 'workspace',
        },
        commands: {
            start: 'bxsv start --template local-pro --foreground',
            status: 'bxsv status --template local-pro --output table',
            check: 'bxsv check --template local-pro --expected-status 200',
        },
    },
    {
        name: 'docker-dev',
        description: 'Workspace code in Docker development mode',
        defaults: {
            runtime: 'docker',
            mode: 'dev',
            source: 'workspace',
        },
        commands: {
            start: 'bxsv start --template docker-dev',
            status: 'bxsv status --template docker-dev --output table',
            check: 'bxsv check --template docker-dev --output table',
        },
    },
    {
        name: 'docker-pro',
        description: 'Workspace code in Docker production mode',
        defaults: {
            runtime: 'docker',
            mode: 'pro',
            source: 'workspace',
        },
        commands: {
            start: 'bxsv start --template docker-pro',
            status: 'bxsv status --template docker-pro --output table',
            check: 'bxsv check --template docker-pro --expected-status 200',
        },
    },
];

function listTemplates() {
    return BUILTIN_TEMPLATES.map((template) => ({ ...template }));
}

function getTemplate(name) {
    return BUILTIN_TEMPLATES.find((template) => template.name === name) || null;
}

module.exports = {
    BUILTIN_TEMPLATES,
    listTemplates,
    getTemplate,
};