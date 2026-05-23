<!-- AUTO-GENERATED: do not edit directly. Source: F:/Azure Glance/.agent/rules/shared/01-workspace-map.md -->

# 工作区全局地图

## 身份与品牌主体

- 创始人 / 开发者：掠蓝蓝蓝
- 品牌：掠蓝
- 公司名称：武汉掠蓝智能科技有限公司
- 公司状态：OPC 一人公司筹备 / 申报中
- 行业代码：I6572
- 角色定位：产品经理 + 独立开发者，非纯技术人员

## 工作区结构

- 工作区根：`F:\Azure Glance`
- 根目录有自己的 `.git`
- `apps/` 下多数项目各自拥有独立 `.git`
- `luelan-portal/` 在工作区根目录下，也有独立 `.git`
- 根仓库通过 `.gitignore` 忽略 `apps/`、`luelan-portal/` 等子项目目录，防止跨仓误提交

## 站点与源码目录映射

> 双域名结构：付费业务用 `*.luelanai.com`（香港），演示站继续用 `*.luelan.online`（上海）。
> 旧 `*.luelan.online` 付费业务子域全部 nginx 301 → 新域。
> `*.luelanai.com` 演示站子域 nginx 301 → 旧域（用户笔误兼容）。

| 站点 | 主域名（生产） | 旧域名（保留 301） | 源码目录 | 线上位置 | 类型 |
|---|---|---|---|---|---|
| 个人主站 | `luelanai.com` | `luelan.online` | `luelan-portal/` | `/opt/apps/static/luelan-portal/dist` (香港) | 静态站 |
| 企业站 | `company.luelanai.com` | `company.luelan.online` | `apps/luelan-company/` | `/opt/apps/static/luelan-company/dist` (香港) | 静态站 |
| 写作 Pro | `writing.luelanai.com` | `writing.luelan.online` | `apps/luelan-writing-pro/` | `/opt/apps/services/luelan-writing-pro` (香港 PM2:3001) | PM2 服务 |
| 入戏 | `ruxi.luelanai.com` | `ruxi.luelan.online` | `apps/luelan-ruxi/` | `/opt/apps/services/luelan-ruxi` (香港 PM2:3007 ruxi-api) | PM2 服务 |
| 简历工坊 | `resume.luelanai.com` | `resume.luelan.online` | `apps/luelan-resume/` | `/opt/apps/services/luelan-resume` (香港 PM2:3006) | PM2 服务 |
| 统一认证 | `auth.luelanai.com` | `auth.luelan.online` | `apps/luelan-auth/` | `/opt/apps/services/luelan-auth` (香港 PM2:3008) | PM2 服务 |
| 2048 猫猫 | `2048maomao.luelan.online` | — | `apps/luelan-2048maomao/` | `/opt/apps/services/luelan-2048maomao` (上海 PM2) | PM2 服务（演示站） |
| AI Love | `ai-love.luelan.online` | — | `apps/luelan-ai-love/` | `/opt/apps/services/luelan-ai-love` (上海 PM2) | PM2 服务（演示站） |
| CoPlay | `coplay.luelan.online` | — | `apps/luelan-coplay/` | `/opt/apps/static/luelan-coplay` (上海) | 静态站（演示站） |
| ClawClip | `clawclip.luelan.online` | — | `apps/luelan-Clawclip/` | `/opt/apps/services/clawclip` (上海 PM2) | PM2 服务（演示站） |
| 梗王冒险 | `gengwang.luelan.online` | — | `apps/luelan-gengwang/` | `/opt/apps/static/luelan-gengwang/dist` (上海) | 静态站（演示站） |
| 猫星球 | `cat-planet.luelan.online` | — | `apps/luelan-cat-planet/` | `/opt/apps/static/luelan-cat-planet/dist` (上海) | 静态站（演示站） |
| Relic Demo | `relic.luelan.online` | — | `apps/luelan-Relic.skill/` | `/opt/apps/static/relic-demo` (上海) | 静态站（演示站） |
| Hermes | `hermes.luelan.online` | — | Hermes 服务器 | 新加坡 43.133.60.168 | PM2 服务 |

## 服务器分布

| 服务器 | IP | 角色 | 跑什么 |
|---|---|---|---|
| 香港（luelan-ai） | `43.132.228.195` | 付费业务主战场 | portal/company/auth/writing/resume/ruxi-api + nginx 301 演示站新域 → 旧域 |
| 上海（luelan-main） | `121.4.98.150` | 演示站 + 旧域 301 入口 | 7 个演示站 + 6 个付费业务旧域 nginx 301 → 新域 |
| 新加坡（hermes） | `43.133.60.168` | Agent / Telegram Bot | Hermes 业务，跟用户登录系统隔离 |

## 域名 DNS 配置事实（DNSPod）

- `luelan.online` zone：所有 A 记录 → 上海 `121.4.98.150`
- `luelanai.com` zone：所有 A 记录 → 香港 `43.132.228.195`（**包括演示站子域**，用户笔误时香港 nginx 会 301 跳回旧域）
- `hermes.luelanai.com` 不应该加（Hermes 在新加坡，不在香港）；用户访问应走 `hermes.luelan.online`

## 术语与歧义映射

- “个人站 / 个人主站 / luelanai.com” → `luelan-portal/`
- “企业站 / 公司站 / company.luelanai.com” → `apps/luelan-company/`
- “主站 / 官网 / 首页” 默认视为歧义词；未确认前不得自行假定是个人站还是企业站
- 若用户同时提到“站点 + 后台 / API”，必须继续拆清是前端、后台还是接口服务
- 注意：个人主站不在 `apps/` 里；企业站在 `apps/` 里；两者是不同站点

## 当前核心上线项目

- 核心上线产品：`luelan-writing-pro`、`luelan-ruxi`、`luelan-resume`
- 统一认证中心：`luelan-auth`
- 开发工具重点项目：`luelan-Clawclip`

## Ren'Py 特例

- `apps/renpy-8.5.0-sdk/` 是活动 Ren'Py 工作区，用户仍有任务在跑，禁止批量清理、移动、重置或同步规则。
- `apps/renpy-8.5.0-sdk-clean/` 是前者的 Git worktree，分支 `split-gui-studio-from-sdk`，不是垃圾目录。
- 处理 Ren'Py 前必须先读 `RENPY-CLEAN-WORKTREE-AUDIT.md`。
- validate/sync 默认排除两个 Ren'Py 目录，除非显式白名单并再次确认。
