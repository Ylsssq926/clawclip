<!-- AUTO-GENERATED: do not edit directly. Source: F:/Azure Glance/.agent/rules/shared/02-runtime-and-operations.md -->

# 运行、部署与运维公共规则

## 端口注册表

| PM2 进程名 | 端口 | 域名 / 入口 |
|---|---:|---|
| `writing-pro` | 3001 | `writing.luelan.online` |
| `2048maomao` | 3002 | `2048maomao.luelan.online` |
| `ai-love` | 3003 | `ai-love.luelan.online` |
| `ruxi` | 3004 | `ruxi.luelan.online` |
| `ruxi-admin` | 3005 | `ruxi.luelan.online/luelan` |
| `resume` | 3006 | `resume.luelan.online` |
| `ruxi-api` | 3007 | `ruxi.luelan.online/api` |
| `auth` | 3008 | `auth.luelan.online` |
| `clawclip` | 8080 | `clawclip.luelan.online` |

## 后台入口标准

- 后台路径默认：`https://<域名>/luelan`
- 后台凭据和例外账号不写入 shared；见根 `.agent/private/credentials.md`
- 后台管理系统账号不是前台用户账号，严禁混淆

## 统一认证服务

- 统一认证服务源码：`apps/luelan-auth/`
- 已接入 SSO 的核心业务项目：`luelan-writing-pro`、`luelan-ruxi`、`luelan-resume`
- 前台主 token key：`luelan_auth_token`
- 前台用户缓存 key：`luelan_current_user`
- 后台管理系统继续独立登录，不接入 SSO
- 后台 token 与前台用户 token 必须隔离，不得互用
- 业务项目本地用户表应通过 `global_user_id` 稳定绑定统一账号

## 服务器与只读脚本

- 主业务服务器：`121.4.98.150`
- Hermes / OpenClaw 服务器：`43.133.60.168`
- 主服务器只读脚本：`deploy/remote-main.py`
- Hermes 只读脚本：`deploy/remote-hermes.py`
- 服务器密码、私钥、平台账号和登录态信息不写 shared；见根 `.agent/private/`

## 线上 Nginx 重要事实

- `ruxi.luelan.online`：前台 `3004`，后台 `/luelan` → `3005`，API `/api/` → `3007`
- `writing.luelan.online`：前台静态资源、后台 `admin-dist`、后端 `3001`
- `resume.luelan.online`：前端静态资源 + 后端 `3006`
- `ai-love.luelan.online`：前端静态资源 + 后端 `3003`
- `2048maomao.luelan.online`：服务端口 `3002`
- `auth.luelan.online`：认证服务 `3008`
- `clawclip.luelan.online`：服务端口 `8080`

## 已知线上风险

- `/opt/apps/ecosystem.config.js` 被确认过时/不完整，仍含旧 `story/story-admin` 命名，缺少当前 `auth`、`ruxi-api`、`clawclip` 等完整状态；PM2 权威应以 `pm2 status/jlist` 为准。
- `sites-enabled/resume.luelan.online.conf.bak` 曾被发现位于 Nginx enabled 目录，可能造成重复 server block 风险；治理前不要随意 reload。
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

## 运维边界

- 默认只读检查；部署、重启、reload、写入服务器需用户明确要求。
- shared 可记录 IP、域名、PM2 名称、端口、部署目录等非敏感运维事实。
- 密码、私钥、token、cookie、浏览器登录态、平台账号密码放 `.agent/private/`。
