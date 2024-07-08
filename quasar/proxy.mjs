export default [
    {
        path: '/api',
        rule: {
            target: 'http://localhost:21001',
            changeOrigin: true,
            pathRewrite: { '^/api': '' }
        },
    },
];
// https://quasar.dev/quasar-cli-vite/commands-list#serve
// https://github.com/chimurai/http-proxy-middleware