#!/usr/bin/env node

// 简单的启动脚本，解析端口参数并设置环境变量
const { spawn } = require('child_process');

// 解析命令行参数
const args = process.argv.slice(2);
const env = { ...process.env };

// 处理端口参数
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if ((arg === '-bp' || arg === '--backend-port') && nextArg) {
        env.BACKEND_PORT = nextArg;
        args.splice(i, 2);
        i -= 1;
    } else if ((arg === '-fp' || arg === '--frontend-port') && nextArg) {
        env.FRONTEND_PORT = nextArg;
        args.splice(i, 2);
        i -= 1;
    } else if ((arg === '-wp' || arg === '--websocket-port') && nextArg) {
        env.WEBSOCKET_PORT = nextArg;
        args.splice(i, 2);
        i -= 1;
    }
}

// 如果没有指定命令，默认为 dev
if (args.length === 0 || (args.length > 0 && args[0].startsWith('-'))) {
    args.unshift('dev');
}

// 显示配置信息
console.log('启动配置:');
console.log(`  命令: quasar ${args.join(' ')}`);
console.log(`  后端端口: ${env.BACKEND_PORT || '21001 (默认)'}`);
console.log(`  前端端口: ${env.FRONTEND_PORT || '21002 (默认)'}`);
console.log(`  WbSk端口: ${env.WEBSOCKET_PORT || '21003 (默认)'}`);

// 启动 quasar
const child = spawn('quasar', args, {
    stdio: 'inherit',
    env,
    shell: true
});

child.on('exit', (code) => {
    process.exit(code);
});

child.on('error', (error) => {
    console.error('启动失败:', error.message);
    process.exit(1);
});
