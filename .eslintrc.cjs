module.exports = {
    root: true,

    env: {
        es2021: true,
        node: true,
    },

    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
    },

    extends: ['eslint:recommended'],

    rules: {
        quotes: ['warn', 'single', { avoidEscape: true }],
    },

    overrides: [
        {
            files: ['run/__tests__/**/*.js'],
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            env: {
                es2021: true,
                node: true,
            },
        },
    ],
};