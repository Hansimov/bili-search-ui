export default [
    {
        path: '/api',
        rule: {
            target: 'http://localhost:21001',
            changeOrigin: true,
            pathRewrite: { '^/api': '' },
        },
    },
    {
        path: '/ws',
        rule: {
            target: 'ws://localhost:21003/ws',
            changeOrigin: true,
            ws: true,
            pathRewrite: { '^/ws': '' },
        },
    },
];
// https://quasar.dev/quasar-cli-vite/commands-list#serve
// https://github.com/chimurai/http-proxy-middleware
