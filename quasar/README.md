# Bili Search UI

A UI for Bili Search Project.

## 安装依赖
```bash
npm install
```

## 构建
```bash
npm run build
```

## 运行

### 命令行参数

```sh
-fp (--frontend-port):  前端 UI   端口 (默认: 21002)
-bp (--backend-port):   后端 API  端口 (默认: 21001)  
-wp (--websocket-port): 通信 WbSk 端口 (默认: 21003)
```

### 开发模式 (dev)
```bash
# 默认端口 (前端:21002, 后端:21001, WebSocket:21003)
npm run dev

# 自定义端口
npm run dev -- -fp 21012 -bp 21011 -wp 21013
node qrun.js dev -fp 21012 -bp 21011 -wp 21013
```

### 生产模式 (serve)
```bash
# 默认端口
npm run serve -- ./dist/spa --proxy proxy.mjs --history

# 自定义端口
npm run serve -- ./dist/spa --proxy proxy.mjs --history -fp 21012 -bp 21011
node qrun.js serve ./dist/spa --proxy proxy.mjs --history -fp 21012 -bp 21011
```

### 环境变量

也可以通过环境变量来设置端口。不过命令行参数会覆盖环境变量。

```bash
FRONTEND_PORT=21012 BACKEND_PORT=21011 WEBSOCKET_PORT=21013 npm run dev
```