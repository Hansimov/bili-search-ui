// 从环境变量或默认值获取端口配置
const BACKEND_PORT = process.env.BACKEND_PORT || 21001;
const WEBSOCKET_PORT = process.env.WEBSOCKET_PORT || 21003;

export default [
    {
        path: '/api',
        rule: {
            target: `http://localhost:${BACKEND_PORT}`,
            changeOrigin: true,
            pathRewrite: { '^/api': '' },
        },
    },
    {
        path: '/ws',
        rule: {
            target: `ws://localhost:${WEBSOCKET_PORT}/ws`,
            changeOrigin: true,
            ws: true,
            pathRewrite: { '^/ws': '' },
        },
    },
];
// https://quasar.dev/quasar-cli-vite/commands-list#serve
// https://github.com/chimurai/http-proxy-middleware
