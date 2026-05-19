# clawclip 部署说明

> 本地 Agent 诊断台（ClawClip / 虾片）。本文件记录非敏感部署事实；真实密钥不写入文档。

## 生产事实

| 项目 | 值 |
|---|---|
| 域名 | `clawclip.luelanai.com` |
| 部署类型 | Node 服务（Express + 静态 Web 构建产物），workspaces：`server` + `web` |
| 主服务器 | `121.4.98.150` |
| 远端目录 | `/opt/apps/services/clawclip`（注意：线上目录无 `luelan-` 前缀） |
| PM2 进程 | `clawclip` |
| 后端端口 | `8080` |
| Nginx | `clawclip.luelanai.com` → `127.0.0.1:8080` |

## 当前线上状态

已通过主服务器只读检查确认（见 `governance/audits/2026-05-11-deployment-audit.md`）：

```text
PM2:    clawclip online
script: /opt/apps/services/clawclip/server/dist/index.js
cwd:    /opt/apps/services/clawclip
Nginx:  proxy_pass http://127.0.0.1:8080
```

线上跑的是 `server` workspace 的编译产物 `server/dist/index.js`，不是 `bin/clawclip.mjs` 包装器。

## 环境变量

生产环境至少需要：

```bash
NODE_ENV=production
PORT=8080
```

如启用 LLM/Agent 数据源、OpenClaw / ZeroClaw 对接或其他外部接口，所需 API key、token、profile 路径一律通过服务器 `.env` 或密钥管理注入，不写仓库文档；实际键名清单见 `.agent/private/`。

## 部署方式

- **项目内**：根目录 `npm run build` 会同时跑 `build --workspace=server`（tsc 编译）和 `build --workspace=web`（Vite 产物）。生产启动直接 `node server/dist/index.js`。`bin/clawclip.mjs` 是本地/CLI 使用的兜底包装，线上不用。
- **工作区统一脚本**：无；本地只读审计通过根 `deploy/remote-main.py`。

## PM2 示例（线上形态）

```js
module.exports = {
  apps: [{
    name: 'clawclip',
    cwd: '/opt/apps/services/clawclip',
    script: 'server/dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
    },
  }],
};
```

## 部署/更新注意事项

1. 升级前后拉取代码并执行 `npm install` + `npm run build`，确认 `server/dist/index.js` 与 `web/dist/index.html` 均已生成再 `pm2 reload`。
2. 不要覆盖服务器 `.env`。
3. `web/dist` 由 Node 服务以静态资源形式托管（默认部署形态）；若后续拆出独立 Nginx root，需同步调整 server block。
4. 构建失败或 tsc 报错时不要重启线上进程。
5. 更新后只读验证：

```bash
pm2 status clawclip
pm2 logs clawclip --lines 30 --nostream
curl -I https://clawclip.luelanai.com/
```

## 回滚注意

- 若只是 `server` 改动导致异常：`git checkout <prev> -- server/` → `npm run build --workspace=server` → `pm2 reload clawclip`。
- 若 `web` 静态资源异常：回滚 `web/` 后重新 `npm run build --workspace=web`，无需重启 Node 进程（静态文件更新即可生效）。
- **不要**直接把本地 `bin/clawclip.mjs` 包装器接入 PM2，线上权威入口是 `server/dist/index.js`。
- 线上目录名是 `/opt/apps/services/clawclip`（不含 `luelan-` 前缀），与仓库名 `luelan-Clawclip` 不一致；部署脚本编写时切勿混用。

## 运维入口

```bash
DEPLOY_MAIN_PASSWORD=... python deploy/remote-main.py "pm2 status --no-color"
```

`remote-main.py` 默认只读，不执行重启/写入类命令。
