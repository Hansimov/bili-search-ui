# Bili Search UI

`quasar/` 目录只负责前端应用本身。

服务管理、Docker、命令行、实例状态和启动矩阵已经迁移到仓库根目录的 [run/README.md](/home/asimov/repos/bili-search-ui/run/README.md)。

## 前置要求

本地运行：

- Node.js 18+，建议 20+
- npm

Docker 运行：

- Docker
- Docker Compose Plugin，也就是 `docker compose`

## 安装依赖

```bash
npm install
```

## 运行与管理

运行和服务管理请看 [run/README.md](/home/asimov/repos/bili-search-ui/run/README.md)。

如果你只想在当前目录快速启动前台实例，保留了两个包装脚本：

```bash
npm run dev
npm run serve
```

其中 `serve` 对应 `bxsv` 的 `pro` 模式；常用运行组合请直接使用 `bxsv templates` 和 `bxsv start --template ...`。

## 开发校验

```bash
npm test
npm run lint
npm run typecheck
```