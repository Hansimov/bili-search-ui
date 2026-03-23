# Bili Search UI Runbook

`run/` 负责这个仓库的服务管理、实例编排和运行文档。

这里的边界是明确的：

- `quasar/` 只放前端应用代码
- `run/` 负责命令行、Docker、源码版本切换、实例状态和内置模板

## 目录说明

- `run/bxsv.js`：统一 CLI 入口
- `run/lib/`：CLI 实现、本地运行时、Docker 运行时、源码物化工具
- `run/lib/templates.js`：内置运行模板定义
- `run/Dockerfile`：前端容器镜像模板

## 安装 CLI

在仓库根目录执行：

```bash
node run/bxsv.js install
source ~/.zshrc
```

也可以在 `quasar/` 目录执行兼容脚本：

```bash
npm run bxsv:install
```

## 命令总览

```bash
bxsv start [options]
bxsv stop [options]
bxsv restart [options]
bxsv status [options]
bxsv check [options]
bxsv logs [options]
bxsv ps [options]
bxsv templates [options]
bxsv template --name <template> [options]
```

## 常用参数

```text
--runtime <local|docker>         运行环境，默认 local
--mode <dev|pro>                 运行模式，默认 dev
--source <workspace|local-git|remote-git>
--git-ref <ref>                  分支 / 标签 / 提交
--git-repo <path>                本地 Git 仓库路径
--git-url <url>                  远程 Git 仓库地址
--host <host>                    前端监听地址，默认 0.0.0.0
-fp --frontend-port <port>       前端端口，默认 21002
-bp --backend-port <port>        后端 API 端口，默认 21001
-wp --websocket-port <port>      WebSocket 端口，默认 21003
--backend-host <host>            后端 API 主机覆盖
--websocket-host <host>          WebSocket 主机覆盖
--foreground                     本地模式前台运行
--force                          强制替换已存在的本地实例
-n --lines <n>                   日志尾部行数
-f --follow                      持续跟随日志
--output <table|json>            输出模式，默认 table
--all                            `ps` 时包含已停止实例
--json                           `--output json` 的兼容别名
--instance-id <id>               过滤指定实例
--status <running|stopped>       过滤实例状态
--template <name>                使用内置模板预填运行参数
--name <name>                    用于 `bxsv template` 查看某个模板
--path <path>                    `check` 请求路径，默认 /
--timeout <ms>                   `check` 超时，默认 10000
--expected-status <code>         `check` 期望的 HTTP 状态码
```

## 实例过滤和输出

按运行环境查看 Docker 实例：

```bash
bxsv ps --runtime docker
```

只看停止实例：

```bash
bxsv ps --all --status stopped
```

机器可读输出：

```bash
bxsv ps --all --output json
bxsv status --runtime local --mode dev -fp 21002 --output json
bxsv check --runtime docker --mode pro -fp 23102 --output json
```

表格输出：

```bash
bxsv ps --all --output table
bxsv status --runtime docker --mode pro -fp 23102 --output table
bxsv check --runtime local --mode dev -fp 21002 --output table
```

## 内置模板

不再使用 `run/examples/*.sh`。常用运行组合已经内置到 `bxsv` 中。

查看模板列表：

```bash
bxsv templates --output table
bxsv templates --output json
```

查看某个模板：

```bash
bxsv template --name local-dev --output table
bxsv template --name docker-pro --output json
```

直接套用模板：

```bash
bxsv start --template local-dev
bxsv start --template local-pro --foreground
bxsv start --template docker-dev -fp 21012 -bp 21011 -wp 21013
bxsv check --template docker-pro --expected-status 200
bxsv status --template local-dev --output json
```

## 健康检查

前端没有像后端那样固定的 `/health` 接口，所以 `bxsv check` 的语义是：

- 先确认实例是否处于 `running`
- 再请求前端 URL，默认 `GET /`
- 默认接受 `2xx` 到 `4xx`，因为某些开发态前端实例会对根路径返回 `404`，但服务本身仍然是可达的
- 也可以用 `--expected-status` 指定精确状态码

示例：

```bash
bxsv check --runtime local --mode dev -fp 21002
bxsv check --runtime docker --mode pro -fp 23102 --expected-status 200
bxsv check --runtime local --mode dev -fp 21002 --path / --output json
```

## 启动矩阵

工作区代码，本地开发：

```bash
bxsv start --runtime local --mode dev --source workspace
```

工作区代码，本地生产：

```bash
bxsv start --runtime local --mode pro --source workspace --foreground
```

工作区代码，Docker 开发：

```bash
bxsv start --runtime docker --mode dev --source workspace \
  -fp 21012 -bp 21011 -wp 21013
```

工作区代码，Docker 生产：

```bash
bxsv start --runtime docker --mode pro --source workspace \
  -fp 21102 -bp 21101 -wp 21103
```

本地 Git 版本，Docker 生产：

```bash
bxsv start --runtime docker --mode pro \
  --source local-git --git-ref v0.3.0 \
  -fp 21202 -bp 21201 -wp 21203
```

远程 Git 版本，Docker 开发：

```bash
bxsv start --runtime docker --mode dev \
  --source remote-git \
  --git-url https://github.com/Hansimov/bili-search-ui.git \
  --git-ref main \
  -fp 21302 -bp 21301 -wp 21303
```