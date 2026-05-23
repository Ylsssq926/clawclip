<!-- AUTO-GENERATED: do not edit directly. Source: F:/Azure Glance/.agent/rules/shared/02-runtime-and-operations.md -->

# 运行、部署与运维公共规则

## 双服务器双域名总览

| 服务器 | IP | 角色 | 域名 |
|---|---|---|---|
| 香港（luelan-ai） | `43.132.228.195` | 付费业务（用户支付/AI/JWT） | `*.luelanai.com` |
| 上海（luelan-main） | `121.4.98.150` | 演示站 + 旧域 301 入口 | `*.luelan.online`（演示站）+ 旧付费域 301 |
| 新加坡（hermes） | `43.133.60.168` | Agent / Telegram Bot | `*.luelan.online`（hermes 子域）|

> 付费业务**全部在香港**；演示站继续在上海；Hermes 在新加坡跟登录系统隔离。
> 旧 `*.luelan.online` 付费业务子域 nginx 301 → `*.luelanai.com`。
> 新 `*.luelanai.com` 演示站子域（gengwang/2048maomao/ai-love/cat-planet/coplay/clawclip/relic）nginx 301 → `*.luelan.online`，用户笔误兼容。

## 端口注册表（按服务器分）

### 香港 43.132.228.195（付费业务）

| PM2 进程名 | 端口 | 域名 / 入口 |
|---|---:|---|
| `auth` | 3008 | `auth.luelanai.com` |
| `writing-pro` | 3001 | `writing.luelanai.com` |
| `resume` | 3006 | `resume.luelanai.com` |
| `ruxi-api` | 3007 | `ruxi.luelanai.com/api` |

> 注：`ruxi` 前端（3004）和 `ruxi-admin`（3005）目前**未在香港启动**，访问 `ruxi.luelanai.com/`（非 /api 路径）会 404。当前临时方案是 nginx 把 `ruxi.luelanai.com/`（不含 /api）反代到 上海 `https://ruxi.luelan.online`，或保持 404 等正式启动 ruxi 前端。

### 上海 121.4.98.150（演示站）

| PM2 进程名 | 端口 | 域名 / 入口 |
|---|---:|---|
| `2048maomao` | 3002 | `2048maomao.luelan.online` |
| `ai-love` | 3003 | `ai-love.luelan.online` |
| `clawclip` | 8080 | `clawclip.luelan.online` |

静态演示站（`gengwang` / `cat-planet` / `coplay` / `relic`）由 nginx 直接服务静态文件，不经过 PM2。

### 新加坡 43.133.60.168（Hermes / Agent）

跟用户登录系统隔离，按 `apps/openclaw-relics`（如有）独立维护。

## 后台入口标准

- 后台路径默认：`https://<域名>/luelan`
- 后台凭据和例外账号不写入 shared；见根 `.agent/private/operations-private.md`
- 后台管理系统账号不是前台用户账号，严禁混淆

## 统一认证服务（SSO）

- 统一认证服务源码：`apps/luelan-auth/`
- 部署位置：香港 43.132.228.195 PM2 `auth`（端口 3008）
- 已接入 SSO 的核心业务项目：`luelan-writing-pro`、`luelan-ruxi`、`luelan-resume`
- **Cookie-based SSO**：
  - `lue_at`：access JWT，Domain=`.luelanai.com`，HttpOnly，所有付费业务子域共享，TTL 15 分钟
  - `lue_rt`：refresh session ID，Domain=`auth.luelanai.com` host-only，仅 auth 服务可见，TTL 30 天
  - `lue_csrf`：CSRF token，非 HttpOnly，前端读取塞 `X-CSRF-Token`（暂未在写操作中校验）
- **统一登录页**：`https://auth.luelanai.com/login?return_to=<url>`，return_to 经过白名单校验（见 `apps/luelan-auth/src/utils/return-to.js`）
- 后台管理系统继续独立登录，不接入 SSO
- 后台 token 与前台用户 token 必须隔离，不得互用
- 业务项目本地用户表通过 `global_user_id` 稳定绑定统一账号
- 兼容期保留 Authorization Bearer 模式（业务后端 readAccessToken 优先 Bearer，fallback cookie），用于本地开发

## 服务器与只读脚本

- 香港付费业务服务器：`43.132.228.195`（默认 `DEPLOY_MAIN_HOST`）
- 上海演示站服务器：`121.4.98.150`（脚本调用时必须显式 `DEPLOY_MAIN_HOST=121.4.98.150`）
- Hermes / Agent 服务器：`43.133.60.168`
- 主服务器只读脚本：`deploy/remote-main.py`（默认指向香港）
- Hermes 只读脚本：`deploy/remote-hermes.py`
- 服务器密码、私钥、平台账号和登录态信息见 `.agent/private/operations-private.md`

## 双服务器查询模板

```bash
# 香港付费业务（默认）
python deploy/inspect-prod-env.py auth --save
python deploy/inspect-prod-env.py writing-pro --save
python deploy/inspect-prod-env.py ruxi-api --save
python deploy/inspect-prod-env.py resume --save

# 上海演示站（必须 export HOST）
DEPLOY_MAIN_HOST=121.4.98.150 python deploy/inspect-prod-env.py 2048maomao --save
DEPLOY_MAIN_HOST=121.4.98.150 python deploy/inspect-prod-env.py ai-love --save
DEPLOY_MAIN_HOST=121.4.98.150 python deploy/inspect-prod-env.py clawclip --save
```

## 线上 Nginx 重要事实

### 香港（付费业务，HTTPS 待 P4 签发）

- `auth.luelanai.com`：反代 `127.0.0.1:3008`
- `writing.luelanai.com`：静态前端 + `/api/` → 3001 + `/luelan/` → admin-dist
- `resume.luelanai.com`：静态前端 + `/api/` → 3006 + `/luelan/` → admin-dist
- `ruxi.luelanai.com`：`/api/` → 3007（前端暂未启动）
- `luelanai.com / company.luelanai.com`：纯静态站
- 演示站子域（gengwang.luelanai.com 等）：301 → 对应的 `*.luelan.online`

### 上海（演示站 + 旧域 301）

- 6 个付费业务旧域（writing/ruxi/resume/auth/company/根域）：301 → `*.luelanai.com`（带 path/query）
- 7 个演示站子域：正常服务（其中 PM2 类 `ai-love`/`clawclip` 走反代，静态站直接 nginx）
- `api.luelan.online`：原 `metapi` AI API 中转聚合网关 docker，已停（2026-05-21），nginx 配置保留但反代到无监听端口

## 已知线上风险

- `/opt/apps/ecosystem.config.js` 被确认过时/不完整，仍含旧 `story/story-admin` 命名，缺少当前 `auth`、`ruxi-api`、`clawclip` 等完整状态；PM2 权威应以 `pm2 status/jlist` 为准。
- `sites-enabled/resume.luelanai.com.conf.bak` 曾被发现位于 Nginx enabled 目录，可能造成重复 server block 风险；治理前不要随意 reload。
- `luelan-resume/server` 线上 env 键名中曾未看到 `ADMIN_JWT_SECRET`，部署强校验版本前必须确认。
- `luelan-auth` 线上 env 键名中曾未看到 `AUTH_INTERNAL_SECRET`，内部同步接口部署前必须确认。

## 浏览器自动化与登录态

- 浏览器自动化优先保障持久登录态、可切换 profile、低风控。
- 默认采用“一平台一 profile，一账号一 profile”。
- Playwright userDataDir、Chrome CDP、OpenClaw/ZeroClaw profile 和平台账号映射集中在 `.agent/private/browser-profiles.md`。
- 不把 cookie、session、profile 具体路径和账号密码扩散到子项目 generated shared。

## 公共 Playwright MCP 与系统 Chrome

- 本机所有工作区共用同一套 Playwright MCP（微软官方 `@playwright/mcp`），通过 `npx -y @playwright/mcp@latest` 启动。
- 强制使用系统 Chrome：`C:\Program Files\Google\Chrome\Application\chrome.exe`。
- 公共持久化 profile：`C:\Users\Jonathan\.playwright-shared\user-data\`。
- 公共启动脚本：`launch-shared-chrome.mjs`；备份脚本：`backup-user-data.mjs`。
- `.playwright-shared/` 在任何工作区外，不进 git。
- 具体路径、profile 映射、平台账号见 `.agent/private/browser-profiles.md`。
- 迁移前不要动各项目自带的 `.playwright/user-data`；任何清理必须先备份。

## 部署统一入口（重要）

所有项目的部署凭据和默认密码集中在 `.agent/private/operations-private.md` 与 `.agent/private/deploy.env`（本机 gitignore）。

### 静态站部署（portal / company / gengwang / cat-planet / coplay）

```bash
# 最简方式：本机 ~/.ssh/id_ed25519 已加服务器 authorized_keys，自动免密走密钥分支
MSYS_NO_PATHCONV=1 python deploy/upload.py "<本地构建目录>" "/opt/apps/static/<name>/dist"
```

例：
```bash
MSYS_NO_PATHCONV=1 python deploy/upload.py "apps/luelan-gengwang/dist" "/opt/apps/static/luelan-gengwang/dist"
```

如果免密失败（临时网络、密钥损坏等），可显式走密码分支：
```bash
source .agent/private/deploy.env   # 同时定义 DEPLOY_SSH_KEY 与 DEPLOY_MAIN_PASSWORD
MSYS_NO_PATHCONV=1 python deploy/upload.py "apps/xxx/dist" "/opt/apps/static/xxx/dist"
```

`upload.py` 优先级：`DEPLOY_SSH_KEY` → 本机 `~/.ssh/id_ed25519` → paramiko + `DEPLOY_MAIN_PASSWORD`。上传完自动原子切换并保留 `.bak` 备份。Nginx 无需 reload。

### PM2 服务部署

优先用项目自带 `deploy.sh` 或看项目根目录 `DEPLOY.md`。通用脚本 `deploy/upload.py` 只适合静态资源；PM2 服务需要构建 + 重启流程。

### 只读审计

```bash
DEPLOY_MAIN_PASSWORD=... python deploy/remote-main.py "pm2 status --no-color"
python deploy/remote-hermes.py "pm2 status"  # Hermes 脚本已硬编码凭据
```

### 废弃入口

- `ruxi-server` SSH alias（已废弃；本机无 ~/.ssh/config 且服务器未配对应公钥）
- `id_ed25519_ruxi` 密钥（不存在）
- 各项目 `.env.deploy` 里旧的 SSH alias 写法（已陆续清理为统一入口说明）

## 运维边界

- 默认只读检查；部署、重启、reload、写入服务器需用户明确要求。
- shared 可记录 IP、域名、PM2 名称、端口、部署目录等非敏感运维事实。
- 密码、私钥、token、cookie、浏览器登录态、平台账号密码放 `.agent/private/`。

## 生产 env 安全变更流程（强制遵守）

**背景**：2026-05-12 resume 部署 502 三分钟事故根因——后端新增 `ADMIN_JWT_SECRET` 的 `process.exit(1)` 强校验，但线上 `.env` 缺该字段，PM2 启动 191 次失败。

任何人/AI 在后端代码中**新增 env 强校验**（fail-fast、process.exit、throw on missing）**前必须**：

1. 先查生产 env 字段清单：
   ```bash
   python deploy/inspect-prod-env.py <service>   # 实时查
   cat .agent/private/prod-env-snapshots/<service>.keys   # 看最近快照
   ```

2. 如果生产**缺失**该 key：
   - 首选：SSH 追加到服务端 `.env`（用独立强随机值，不与其它 secret 共用）
   - 或：代码里改为"默认值兼容"而非"启动时 exit"
   - 严禁：直接部署让 PM2 启动循环失败

3. 部署后立即跑：
   ```bash
   # 香港付费业务（默认）
   ssh ubuntu@43.132.228.195 "pm2 status <service>"
   # 上海演示站
   ssh ubuntu@121.4.98.150 "pm2 status <service>"
   ```
   状态必须是 `online`（不是 `errored` 或 `stopped`）。

4. 任何新增生产 env key 应**立刻**更新本机快照：
   ```bash
   python deploy/inspect-prod-env.py <service> --save
   ```

### 已知线上 env 缺口（已修复）

- ~~`auth` 缺 `AUTH_INTERNAL_SECRET`~~ → 2026-05-20 已补
- ~~`resume` 缺真实 `SSO_JWT_SECRET`（placeholder）~~ → 2026-05-20 已补
- ~~`ruxi` 缺 `ADMIN_PASSWORD`~~ → 2026-05-20 已补
- ~~所有项目使用过的泄露 secret `luelan-auth-prod-secret-2026-sso-unified-v1`~~ → 2026-05-20 已全员旋转
- `clawclip` 上海 .env 0 keys 风险仍在，需核查（演示站，影响小）

