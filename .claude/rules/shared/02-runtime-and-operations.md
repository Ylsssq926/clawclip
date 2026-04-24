<!-- AUTO-GENERATED: do not edit directly. Source: .claude/rules/shared/02-runtime-and-operations.md -->

# 运行、部署与运维公共规则

## 端口注册表（共享权威事实）
| PM2 进程名 | 端口 | 域名 |
|-----------|------|------|
| `writing-pro` | 3001 | `writing.luelan.online` |
| `2048maomao` | 3002 | `2048maomao.luelan.online` |
| `ai-love` | 3003 | `ai-love.luelan.online` |
| `ruxi` | 3004 | `ruxi.luelan.online` |
| `ruxi-admin` | 3005 | `ruxi.luelan.online/luelan` |
| `resume` | 3006 | `resume.luelan.online` |
| `ruxi-api` | 3007 | `ruxi.luelan.online/api` |
| `auth` | 3008 | `auth.luelan.online` |
| `clawclip` | 8080 | `clawclip.luelan.online` |

## 后台统一标准
- 入口：`https://<域名>/luelan`
- 账号：`luelan`
- 密码：`Weijiang1.`
- 注意：这是后台管理系统的账号密码，不是前端用户账号
- 前端统一认证账号：`469906100@qq.com` / `weijiang1`（小写，注意和后台密码不同）
- **严禁混淆前后端账号**：后台是 luelan/Weijiang1.，前端是邮箱/weijiang1

## 统一认证服务（auth.luelan.online）
- 所有需要用户登录的项目必须接入统一认证服务
- 不允许项目自建独立的注册登录系统
- 已接入但未启用 SSO 的项目（writing-pro、ruxi、resume）需要启用
- 统一认证服务代码：`apps/luelan-auth/`
- 当前允许的项目标识：`writing-pro`、`ruxi`、`resume`
- 接入方式：配置 `SSO_ENABLED=true` + `SSO_JWT_SECRET` + `AUTH_SERVICE_URL`

## 服务器
- 主服务器：`121.4.98.150`
- SSH 连接：**必须使用 `ssh ruxi-server`**（已配置密钥认证，免密登录）
- 禁止使用 `ssh ubuntu@121.4.98.150`（会弹密码框，阻塞自动化流程）
- SSH 配置位于 `~/.ssh/config`，使用 `~/.ssh/id_ed25519_ruxi` 密钥
- 服务器用户：`ubuntu`，密码：`Weijiang1.`（仅在密钥不可用时备用）
- 海外 / 测试服务器：`43.133.60.168`（`ssh zeroclaw-server`，同样密钥认证）

## Claw 服务器连接与业务路由（共享权威事实）
### 统一 SSH 入口
- 主服务器：`ssh ruxi-server`（密钥认证，免密）
- 海外服务器：`ssh zeroclaw-server`（密钥认证，免密）
- 如需维护旧 `zeroclaw.service`，在 `zeroclaw-server` 上可切换到 `ubuntu` 视角处理

### 第二台服务器（`zeroclaw-server`）上的 Claw 实例
| 实例 | 域名 | systemd 服务 | 运行用户 | 监听 / 入口 | 登录方式 | 业务定位 |
|------|------|--------------|----------|-------------|----------|----------|
| 新 OpenClaw | `openclaw.luelan.online` | `openclaw-rescue.service` | `openclaw` | 内部监听 `127.0.0.1:19001`，经 Nginx 暴露 HTTPS | Web UI 只需密码 `Weijiang1.`，`WebSocket URL` 自动预填，token 可留空 | **国内业务** |
| 旧 ZeroClaw | `zeroclaw.luelan.online` | `zeroclaw.service` | `ubuntu` | 内部监听 `127.0.0.1:18789`，经 Nginx 暴露 HTTPS | Web UI 密码 `Weijiang1.` | **海外业务** |

### 业务选择原则
- **国内 / 中文 / 国内自媒体 / 国内站点后台 / 国内协作流程** → 优先调用 `openclaw.luelan.online`
- **海外 / 英文 / 跨境社媒 / 海外内容运营 / 海外站点与渠道** → 优先调用 `zeroclaw.luelan.online`
- 涉及同一业务同时覆盖中外两个市场时：默认把中文侧工作交给 OpenClaw，把海外适配和海外渠道动作交给 ZeroClaw

## 浏览器自动化与登录态策略
- 浏览器自动化是高优先级基础设施，默认要优先保障**持久登录态、可切换 profile、低风控**
- 默认采用：**一平台一浏览器 profile，一账号一 profile**；先人工完成首登，再复用持久化状态
- 对抖音、微信公众号、小红书等高风控平台，默认使用**半自动 / 审核后执行**方案，不把老旧、无人维护的纯脚本批量投放能力当作生产默认路径
- 浏览器自动化默认优先级：
  1. OpenClaw 自带 browser / webhooks / MCP 能力
  2. 持续维护中的新 skill / 新工具
  3. 需要真实浏览器登录态时，优先 host browser / 持久 profile，而不是脆弱的远端 GUI 临时浏览器
- 对第三方 skill 或自动化工具，安装前至少检查：**发布日期 / 最近维护时间 / 登录态保存方式 / 是否仍被平台风控拦截**

### OpenClaw / ZeroClaw 持久浏览器 profile 约定
- `ops-default`：通用默认 profile
- `douyin-main`：抖音主账号 / 主流程专用
- `wechat-oa-main`：微信公众号 / 公众号后台专用
- `xhs-main`：小红书主账号 / 主流程专用
- `overseas-main`：跨境 / 海外站点临时兼容 profile
- `x-main`：X / Twitter 主账号专用
- `reddit-main`：Reddit 主账号专用
- `weibo-main`：微博主账号专用
- `xiaoheihe-main`：小黑盒主账号专用
- 原则：**不要混用 profile**；同一平台多账号时继续按“一账号一 profile”扩展命名
- 当前目录约定：
  - OpenClaw：`/home/openclaw/.browser-profiles/`
  - ZeroClaw：`/home/ubuntu/.browser-profiles/`
  - 两边临时浏览器工作目录：`~/.browser-tmp/`

### 浏览器数据持久化与临时文件策略
- 默认只持久化：**登录态、Cookie、localStorage、sessionStorage、浏览器 profile 用户数据目录**
- 默认不持久化：**截图、下载缓存、临时导出文件、一次性抓取产物**；这类临时文件按任务结束后清理
- 浏览器自动化的关键不是保留所有文件，而是**稳定保留 profile 数据**；切换平台 / 切换账号时重点处理 profile 映射和互斥使用
- 同一平台多账号时，必须拆分独立 profile；禁止多个账号共用同一持久目录
- 当前服务器已配置每日清理 `~/.browser-tmp/` 中 **2 天前** 的临时文件；默认不要把长期登录态放进该目录

## Skill 源与安装策略
- 不要把 ClawHub 实时下载当作唯一可靠来源；遇到机器人域名限流时，优先采用**镜像站 / 手动导入 / 本地 vendoring** 方案
- 中文生态优先关注：
  1. **腾讯 SkillHub / 腾讯 ClawPro 预置 Skill**
  2. 官方 ClawHub / ClawHub 镜像
  3. 已经审核过并本地留档的 ZIP / skill 包
- 发现新 skill 时，安装前至少确认：
  - 最近更新时间
  - 安全扫描状态（Benign / Suspicious）
  - 是否需要真实账号权限
  - 是否声明了登录态保存方式
  - 是否明显针对单一作者 / 单一账号硬编码
- 对抖音、微信公众号、小红书等高风控平台，默认优先选择：**近期仍在维护、半自动、支持人工首登和持久 profile 复用** 的 skill / 工具链
- 对被标记为 Suspicious、存在命令注入风险、账号权限路径不清的 skill，不作为生产默认能力

## 共享社媒工具箱（已落地）
- 工具箱根目录：`/srv/claw-toolbox`
- 已安装可执行入口：
  - `mcp-server-weibo` / `weibo-cli`
  - `sau`（`social-auto-upload`，覆盖抖音 / 快手 / 小红书 / Bilibili 等）
  - `xiaohongshu-mcp` / `xiaohongshu-login`
  - `wechat-publisher-mcp`
  - `post-x`
  - `reddit-mcp-server`
  - `xiaoheihe` 相关 MCP 服务（HTTP）
- 新 OpenClaw 当前已注册的 MCP 名称：
  - `weibo`
  - `wechat-publisher`
  - `post-x`
  - `xiaohongshu`
  - `reddit-read`
  - `xiaoheihe`
- 说明：
  - `post-x` 需要 X API 凭证配置后才能真正发帖
  - `wechat-publisher-mcp` 需要公众号 `AppID/AppSecret`
  - `sau` / `xiaohongshu-mcp` / `xiaoheihe` 侧重浏览器登录态与持久 profile

## Playwright
- 公共目录：`C:\Users\黑受\.playwright\`
- 使用系统 Chrome，非测试框架，用于浏览器自动化

## 图片素材生成方案

### Gemini 生图工作流（主力方案，本地 Playwright）

#### 环境
- Chrome 已登录 Gemini、Python PIL 已可用
- 启动浏览器：`node C:/Users/黑受/.playwright/browser.mjs`
- CDP 端口：`http://127.0.0.1:9222`
- **Gemini 账号管理（重要）**：
  - browser.mjs 启动时默认绑定 Ruby 账号的 user-data，每次 `page.goto()` 都会刷新到 Ruby session
  - **Ruby**（`rubmullins260@gmail.com`）：只能用 Gemini 基础服务，无法访问 AI Studio
  - **JEWEL**（`jewelkrysta@gmail.com`）：可以用 Gemini 基础服务 + AI Studio，Pro 会员
  - **切换账号的正确方式**：在 Gemini 页面右上角头像处切换，不要用 `page.goto()` 重新导航（会重置回 Ruby）
  - **生图前必须检查当前账号**：截图确认右上角头像是 JEWEL（J 字母绿色头像）还是 Ruby（R 字母红色头像）
  - **额度用完时**：在页面上手动切换到另一个账号，不要重新 goto

#### 关键禁止事项
- **禁止** `chromium.launch()` 新开浏览器（没有登录态）
- **禁止** `context.newPage()` 新开标签页（会导致连接问题）
- **禁止** 点击下载按钮（下载的图片有水印）
- **禁止** `page.goto()` 重新导航到 Gemini（会重置到 Ruby 账号，撞错额度）
- **必须** 用 `chromium.connectOverCDP('http://127.0.0.1:9222')` 连接已有浏览器
- **必须** 找 `/u/1/` 的 JEWEL 页面来操作：`pages.find(p => p.url().includes('gemini.google.com/u/1'))`
- 如果没有 `/u/1/` 页面，才考虑用其他 Gemini 页面，但要先截图确认账号

#### 完整执行流程
```javascript
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

// 1. 连接已有浏览器
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const page = browser.contexts()[0].pages().find(p => p.url().includes('gemini'));
// 如果没有 Gemini 页面，用第一个页面导航过去
// if (!page) { page = browser.contexts()[0].pages()[0]; await page.goto('https://gemini.google.com/app'); }

// 2. 确认 Flash 模式（不是 Pro，Pro 不支持生图）

// 3. 输入 prompt（必须以 "Generate an image: " 开头）
const editor = page.locator('.ql-editor[role="textbox"]').first();
await editor.click({ force: true });
await page.keyboard.press('Control+a');
await page.keyboard.press('Delete');
await page.keyboard.type('Generate an image: ...', { delay: 3 });
await page.keyboard.press('Enter');

// 4. 等待图片生成（检测 blob: URL 大图，最多 4 分钟）
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(3000);
  const found = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .some(img => img.complete && img.naturalWidth > 200 && img.src.startsWith('blob:'))
  );
  if (found) break;
}

// 5. canvas 抓取（无水印）—— 不要点下载按钮！
const b64 = await page.evaluate(async () => {
  const img = Array.from(document.querySelectorAll('img'))
    .filter(i => i.complete && i.naturalWidth > 200 && i.src.startsWith('blob:')).pop();
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0);
  return canvas.toDataURL('image/png').split(',')[1];
});
writeFileSync('output.png', Buffer.from(b64, 'base64'));

// 6. PIL resize 到目标尺寸
```

#### 目标尺寸参考
- 封面 960×540、头像 256×256、banner 1280×640、OG 图 1200×630

#### 风格基底（通用，可根据项目调性调整）
`Soft digital illustration in Chinese aesthetic style. Warm cinematic lighting. Gentle muted color palette. No text, no watermark, no logo, no UI elements.`

#### 常见问题
- 找不到 blob 图片 → 检查是否在 Flash 模式、prompt 是否以 `Generate an image: ` 开头
- 浏览器连接失败 → 确认浏览器已启动（`node C:/Users/黑受/.playwright/browser.mjs`）
- 输入框找不到 → 确认在 Gemini 页面，等待页面加载完成
- 环境维护、扩展安装、排障等详细信息见 `C:/Users/黑受/.playwright/GEMINI-IMAGE-WORKFLOW.md`

### 服务端 AI 封面生成（ruxi 项目已有，可复用）
- ruxi 已有成熟的服务端封面生成方案（`server/src/services/coverGeneration.js`）
- 支持 Pollinations（免费，无需 key）+ Cloudflare AI（可选）双 provider
- 支持武侠、修仙、末世、校园、赛博朋克、悬疑、奇幻、恋爱等多种题材风格自动匹配
- 其他项目有类似需求可参考复用，不要重复造轮子

### nanobanana 图片生成
- 通过 Playwright 使用谷歌账号登录 nanobanana 生成图片
- 适用于各项目的图片素材需求

## 统一部署入口
- 统一部署脚本：`deploy/deploy.sh`
- PM2 配置权威入口：`deploy/pm2/ecosystem.config.js`

## 部署与验收底线
- 部署前必须确认：源码目录、部署目录、部署方式（静态 / PM2）、PM2 进程名与端口
- 静态站更新：构建产物与部署目录必须一一对应
- PM2 服务更新：确认进程名、端口、服务目录匹配后再重启或替换
- 构建失败时优先修构建，不要带着失败结果上线
- 线上出问题先回滚，再排查；不要在线上临时试错