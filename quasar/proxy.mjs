// 从环境变量或默认值获取端口配置
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = process.env.BACKEND_PORT || 21001;

export default [
    {
        path: '/api',
        rule: {
            target: `http://${BACKEND_HOST}:${BACKEND_PORT}`,
            changeOrigin: true,
            pathRewrite: { '^/api': '' },
        },
    },
];
// https://quasar.dev/quasar-cli-vite/commands-list#serve
// https://github.com/chimurai/http-proxy-middleware
