<!-- AUTO-GENERATED: do not edit directly. Source: workspace shared rules -->

# 共享规则

## 01-workspace-map

# 工作区全局地图

## 身份与品牌主体
- 创始人 / 开发者：掠蓝蓝蓝
- 品牌：掠蓝
- 公司名称：武汉掠蓝智能科技有限公司
- 公司状态：OPC 一人公司筹备 / 申报中
- 行业代码：I6572
- 角色定位：产品经理 + 独立开发者，非纯技术人员

## 工作区结构
- 工作区根：`C:\Personal\Azure Glance`
- 根目录有自己的 `.git`
- `apps/` 下的各项目各自拥有独立 `.git`
- `luelan-portal/` 在工作区根目录下，也有独立 `.git`
- 旧名映射：`server-portal`（package name / deploy 脚本旧名）→ `luelan-portal/`

## 站点与源码目录映射（共享权威事实）
| 站点 | 域名 | 源码目录（相对工作区根） | 部署位置 | 类型 |
|------|------|------------------------|----------|------|
| 个人主站 | `luelan.online` | `luelan-portal/` | `/opt/apps/static/luelan-portal/dist` | 静态站 |
| 企业站 | `company.luelan.online` | `apps/luelan-company/` | `/opt/apps/static/luelan-company/dist` | 静态站 |
| 写作 Pro | `writing.luelan.online` | `apps/luelan-writing-pro/` | `/opt/apps/services/luelan-writing-pro` | PM2 服务 |
| 入戏 | `ruxi.luelan.online` | `apps/luelan-ruxi/` | `/opt/apps/services/luelan-ruxi` | PM2 服务 |
| 简历工坊 | `resume.luelan.online` | `apps/luelan-resume/` | `/opt/apps/services/luelan-resume` | PM2 服务 |
| 统一认证 | `auth.luelan.online` | `apps/luelan-auth/` | `/opt/apps/services/luelan-auth` | PM2 服务 |
| 2048猫猫 | `2048maomao.luelan.online` | `apps/luelan-2048maomao/` | `/opt/apps/services/luelan-2048maomao` | PM2 服务 |
| AI Love | `ai-love.luelan.online` | `apps/luelan-ai-love/` | `/opt/apps/services/luelan-ai-love` | PM2 服务 |
| CoPlay | `coplay.luelan.online` | `apps/luelan-coplay/` | `/opt/apps/static/luelan-coplay` | 静态站 |
| ClawClip | `clawclip.luelan.online` | `apps/luelan-Clawclip/` | `/opt/apps/services/clawclip` | PM2 服务 |

## 术语与歧义映射
- “个人站 / 个人主站 / luelan.online” → `luelan-portal/`
- “企业站 / 公司站 / company.luelan.online” → `apps/luelan-company/`
- “主站 / 官网 / 首页” 默认视为歧义词；未确认前不得自行假定是个人站还是企业站
- 若用户同时提到“站点 + 后台 / API”，必须继续拆清是前端、后台还是接口服务
- 注意：个人主站不在 `apps/` 里；企业站在 `apps/` 里；两者是不同站点

## 当前核心上线项目
- 核心上线产品：`luelan-writing-pro`、`luelan-ruxi`、`luelan-resume`
- 开源重点项目：`luelan-Clawclip`

## 02-runtime-and-operations

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
- 海外 / 测试服务器：`43.133.60.168`

## Claw 服务器连接与业务路由（共享权威事实）
### 统一 SSH 入口
- 主服务器：`ssh ruxi-server`（密钥认证，免密）
- 海外服务器首选：`ssh zeroclaw-server`
- 海外服务器别名：`ssh openclaw-server`
- `zeroclaw-server` / `openclaw-server` 在 `~/.ssh/config` 中都指向：
  - `HostName 43.133.60.168`
  - `User ubuntu`
  - `IdentityFile ~/.ssh/id_ed25519_ruxi`
- 如果本机 SSH 别名失效，海外服务器的明文回退方式是：`ssh ubuntu@43.133.60.168`
- 已实测：`ubuntu / Weijiang1.` 可登录并可 `sudo`；`openclaw / Weijiang1.` 可登录但无 sudo；`root` 不能用同密码登录
- **腾讯云控制台“执行命令”只作为 SSH 不可用时的兜底方案，不是首选连接方式**
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

### GPT Image 2 生图工作流（首选方案，ListenHub）

#### 平台与账号
- 地址：`https://listenhub.ai/zh/app/ai-image`
- 模型选择：**GPT-Image-2**（下拉菜单第三项，有 ✨ 标识）
- 比例：GPT-Image-2 支持 `1:1 / 9:16 / 16:9`，无 4:3；封面图用 `16:9` 生成后 PIL 裁剪为 1200×900
- 账号管理：Ruby 账号（`rubmullins260@gmail.com`）已登录，每账号有限时免费额度（活动期间约 100 张）
- 额度用完时：换其他已登录账号继续，不要重新注册（临时邮箱收不到验证码）

#### 操作流程（Playwright CDP）
```javascript
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
let page = ctx.pages().find(p => p.url().includes('listenhub'));
if (!page) { page = await ctx.newPage(); await page.goto('https://listenhub.ai/zh/app/ai-image'); }
// 1. 选模型 GPT-Image-2
// 2. 选比例 16:9
// 3. 输入 prompt，点击生成
// 4. 等待图片出现（最多 3 分钟）
// 5. 用 fetch + FileReader 下载 blob URL（无水印）
// 6. PIL 裁剪为 1200×900
```

#### PIL 裁剪标准（封面图）
```python
from PIL import Image
def process(src, dst):
    img = Image.open(src).convert('RGB')
    w, h = img.size
    tr = 1200/900
    cr = w/h
    if cr > tr:
        nw = int(h * tr)
        img = img.crop(((w-nw)//2, 0, (w-nw)//2+nw, h))
    else:
        nh = int(w / tr)
        img = img.crop((0, (h-nh)//2, w, (h-nh)//2+nh))
    img = img.resize((1200, 900), Image.LANCZOS)
    img.save(dst, 'JPEG', quality=88, optimize=True, progressive=True)
```

#### GPT Image 2 Prompt 写法规范（重要）

GPT Image 2 的核心优势是**成品感**，它吃"任务书"，不吃"玄学词库"。

**最佳 Prompt 结构（7 段式）：**
```
1. 封面类型：项目封面 / 官网 Hero / 应用商店首图 / 宣传海报
2. 比例与用途：16:9，用于官网项目展示
3. 主视觉：一个明确主体，位置、占比
4. 版式骨架：上标题区、中主视觉、下副标题/标签
5. 风格：只选一个主风格 + 一个材质/时代参照 + 一个配色方案
6. 限制：无乱码、无杂字、留白充足、适合封面
7. 如需画内文字：直接写出标题/副标题内容
```

**写法规律：**
- 先定义"图是什么"（杂志封面、产品 Hero、游戏 KV），再描述内容
- 少堆"masterpiece / 8K / 超清"，多写视觉事实（S 型构图、左上标题区、宣纸背景）
- 最后补 avoid 列表（避免电商感、避免乱码、避免过度装饰）
- Pixel art 要强调：crisp pixel art、limited palette、readable silhouette、grid-aligned

**按项目类型推荐风格关键词：**

| 项目类型 | 推荐风格词 |
|---------|-----------|
| 技术/SaaS/后台产品 | dark SaaS dashboard, glassmorphism, purple/cyan accent, floating cards, premium product hero |
| 游戏/二次元/世界观 | game key visual, cinematic poster, anime key art, strong silhouette, volumetric light |
| 国风/品牌/内容 | 极简东方美学, 宣纸质感, S 型构图, 青绿鎏金, 高级商业插画 |
| 公益/工具/教程 | editorial layout, clean typography, card-based composition, warm soft light |
| 像素/复古游戏 | crisp pixel art, limited palette, 8-bit style, neon grid, retro arcade |

**避坑：**
- 不要只堆风格词，要写清版式骨架
- 不要省略"成品类型"
- 不要让模型自由发挥画内文字（要写就直接给出）
- 不要同时混超过 2 个主风格
- 深色 Dashboard 封面只保留 1 个核心图表 + 3~5 个指标卡片

---

### Gemini 生图工作流（备用方案，本地 Playwright）

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

## 03-subagents-and-quality

# 子代理、提示词与质量规则

## 总原则
- 子代理是执行器，不是替你猜需求的人
- 先把上下文写足，再把任务派清楚
- 质量优先，不计较 token 成本；复杂任务默认可以注入大量上下文
- 如果结果有不确定性，优先通过补上下文、补限制、补验收标准解决，不要让用户兜底判断

## 子代理模型选择与分工（核心规范）

### 功能类任务 → `s2api:gpt-5.4`
适用场景：
- 代码实现、重构、调试
- 数据处理、格式转换、批量操作
- 配置文件生成、脚本编写
- 技术方案设计、架构调整
- 测试用例编写、问题排查
- 部署脚本、自动化流程
- 任何以"实现功能"为核心目标的任务

特点：执行力强、逻辑严密、适合结构化任务

### 文案与表达类任务 → `dome:claude-sonnet-4.5`
适用场景：
- 产品文案、营销文案、品牌表达
- 用户引导、帮助文档、说明文字
- 项目介绍、README、对外展示内容
- 错误提示、交互文案、通知消息
- 邮件模板、客服话术、沟通文本
- 任何需要"像人话"、有温度、有吸引力的文字
- **设计思考和方案评估**：需要大局观、创意、用户视角的任务
- **审查 GPT 的文案产出**：GPT 在功能实现中产出的文案（错误提示、按钮文案、代码注释等）需要 sonnet 主观审查

特点：自然流畅、有温度、懂用户心理、不会写成冷冰冰的说明书、有创意和大局观

**文案分工原则**：
- 所有文案类任务主要交给 sonnet
- GPT 负责功能实现时，如果涉及文案（UI文案、提示信息、注释等），完成后需要 sonnet 主观审查
- sonnet 审查时不能随意通过，要用自己的判断标准评估文案质量

### 主模型（统筹者）职责
- 拆解任务、分配子代理、验收结果
- 不直接处理大量任务以节约 token（包括文案修正、代码实现等都交给子代理）
- 子代理超时或出问题时稍后重试，不轻易放弃
- 确保每个子代理都拿到充足的上下文和明确的目标
- **统筹多个子代理时的职责**：
  - 整合多个子代理的结果，识别跨审查一致的核心问题
  - 根据模型特点合理分工（sonnet 主要负责文案/设计/审查，GPT 负责功能实现）
  - 可以并发启动多个子代理提高效率，但并发数量要在能够验收的范围内
  - 如果任务很多，分批启动和验收更合理（比如先审查，再实施，再验收）
  - 等待子代理完成后验收，发现问题继续派子代理修正，而不是自己动手

### 给子代理下需求的质量要求
- **不计消耗**：大量注入上下文、背景、约束、示例，狠狠输出提示词
- **杜绝临时方案**：明确要求高质量产出，不接受"先这样凑合"
- **提供充足指导**：包括但不限于当前状态、目标效果、反例、验收标准
- **明确边界**：哪些文件可以改、哪些不能碰、哪些相邻项目要避开
- **强调质量优先**：在提示词中明确说"不用担心算力消耗，只要高质量产出"
- **提供具体示例**：给出正确和错误的示例，让子代理理解标准

## 派发子代理前必须做到
1. 明确目标仓库、目标目录、目标文件
2. 先读取真实文件状态，不能靠记忆描述当前代码
3. 写清用户目标、非目标、验收标准
4. 写清不要改哪些文件、哪些相邻项目不能碰
5. 写清构建 / 测试 / 语法检查方式
6. 写清失败后怎么处理，不能允许静默跳过
7. 派发前先确认目标文件属于哪个 git 仓库，避免跨仓误改

## GPT 子代理高质量调用规则（新增统一要求）
- 默认允许把提示词写得非常细、非常长、非常具体
- 默认允许大量上下文注入：
  - 当前代码状态
  - 相关文件路径
  - 目标行为
  - 非目标
  - 反例
  - 不要改的文件
  - 验收标准
  - 运行命令
  - 历史坑点
- 不为了省 token 删除关键背景
- 提示词应显式包含：
  - 任务目标
  - 真实现状
  - 精确文件边界
  - 禁止事项
  - 完成标准
  - 输出格式
- 如果任务复杂，提示词里应加入“先分析再动手”的要求
- 如果任务容易误改相邻项目，提示词里必须写明负面约束
- 如果任务是多步链路，提示词里必须写明每一步的验收方式

## 提示词模板最少包含这些块
- 任务目标
- 当前状态
- 需要修改的文件
- 不要修改的文件
- 完成标准
- 运行 / 检查命令
- 失败时的处理方式

## 验收规则
1. **主代理必须验收，但不是自己动手检查**
   - 子代理返回后，不能只信"通过了"就算完成
   - 主代理保持批判性思维，识别疑点和不确定的地方
   - 如果存在疑点，继续分配新的子代理去审查和检查
   - 主代理负责思考疑虑点、制定检查方案，但检查工作交给子代理
   - 主模型尽量保持统筹和主观判断，不直接消耗大量 token 做检查
   - 子代理说做完了不等于真的做完了，子代理说完成得好不等于真的完成得好
2. **文案审查机制**：
   - GPT 在功能实现中如果产出了文案（UI文案、错误提示、按钮文案、代码注释等），完成后必须让 sonnet 主观审查
   - sonnet 审查时不能随意通过，要用自己的判断标准评估
   - 纯文案任务直接交给 sonnet，不需要 GPT 参与
3. **验收时机和并发控制**：
   - 可以并发启动多个子代理提高效率
   - 但并发数量要在能够验收的范围内
   - 如果任务很多，分批启动和验收更合理（比如先审查，再实施，再验收）
   - 如果任务之间有依赖关系，必须等前一个完成并验收后再启动下一个
4. 部署前必须做四项校验：源码目录、部署目录、部署方式、PM2 进程名与端口
5. 如果子代理改了不该改的文件，按以下顺序处理：
   - 先比对变更文件清单与授权文件清单
   - 未授权文件单独回退
   - 若错误改动和正确改动已经混在一起且无法安全拆分，则整份结果弃用
   - 回退后重新验收
6. 多个子代理改同一文件时，合并后必须重新验证
7. 子代理只负责改代码和提交结果，不直接执行部署；部署由主代理统一执行

## 失败处理
1. 子代理失败时先分析根因，不盲目重试
2. 构建失败时优先自己修，不要继续多轮传话
3. 失败、超时、无结果都必须单独记录
4. 任何一个子代理失败或无结果，不得对用户声称“全部完成”
5. 回复用户前必须核对：
   - 派出了几个子代理
   - 每个任务是什么
   - 是否全部返回
   - 是否覆盖了任务要求
   - 是否有任务被静默跳过
6. 禁止：
   - 只汇报成功的子代理，忽略失败的
   - 把“部分完成”说成“已完成”
   - 子代理失败后不处理就继续下一步

## 企业站额外审查
当目标项目是 `apps/luelan-company/` 时，除技术正确外，还必须审查：
- 是否提升企业可信度
- 是否清晰表达主营业务
- 是否与 OPC / 公司申报信息一致
- 是否存在夸大表述或容易引发审查疑虑的内容
- 改动前是否已经确认方向

## 04-brand-and-admin

# 品牌、联系人与后台公共信息

## 品牌
- 品牌名：掠蓝
- 署名：`掠蓝 出品`
- 品牌色：`#3b82c4`

### 品牌色使用原则
- 品牌色不是强制要求，要结合项目本身的调性考虑
- 游戏类、娱乐类项目可以有自己的主题色系（如 2048猫猫的猫咪主题色）
- 工具类、严肃类项目可以根据功能定位选择合适的配色
- 企业站、个人主站等品牌展示类项目优先使用品牌色
- 只在需要体现"掠蓝"品牌统一性时才强调品牌色

## 联系方式
- QQ：`469906100`
- 微信：`pain_wei`
- 邮箱：`ylsssq@qq.com`

## 公司主体
- 名称：武汉掠蓝智能科技有限公司
- 状态：OPC 一人公司筹备 / 申报中
- 行业代码：`I6572`

## 后台账号说明
- 默认后台账号：`luelan`
- 默认后台密码：`Weijiang1.`
- Writing Pro 例外账号：`469906100@qq.com`

## 表达与文案气质
- 默认更接近 **聪明网友 + 轻军师** 的结合：会聊天、会接话、不端着，但办事仍然利索
- 对外表达优先追求：**松弛、讨喜、吸睛、有趣、像人话**；不要默认写成说明书、汇报稿或 PR 稿
- 文案先看项目自己的调性，再自然发挥；不要为了"优化文案"不断给自己加越来越细的模板规则
- 信息仍要准确，但不必每次都写满写尽；允许留白，允许有一点画面感、梗感和呼吸感

### 文案创作核心原则
1. **拒绝冷冰冰**：不写机器味、说明书味、官方公告味的文字
2. **像人在说话**：想象你在跟朋友介绍这个产品，会怎么说？
3. **抓住核心差异**：用户为什么要用你的产品？一句话说清楚
4. **有画面感**：能让人脑补出使用场景，而不是堆砌功能列表
5. **留呼吸感**：不要把每个字都写满，适当留白更有吸引力

### 文案类型与风格指南
- **产品介绍**：突出核心价值，18-20 字精准表达，避免"功能强大"等空话
- **用户引导**：友好、耐心、不说教，像朋友在帮忙
- **错误提示**：说清楚发生了什么、为什么、怎么办，不甩锅给用户
- **营销文案**：有吸引力但不夸张，真实可信比华丽辞藻重要
- **技术文档**：清晰准确，但不失人性化，适当加入使用场景和小提示

### 反面案例（禁止）
- ❌ "本系统提供强大的功能支持"
- ❌ "为用户带来极致体验"
- ❌ "一站式解决方案"
- ❌ "赋能企业数字化转型"
- ❌ 任何让人读完还是不知道具体做什么的文案

### 正面示例（推荐）
- ✅ "场景黑箱调模 / 默认去 AI 味 / 国内外平台合规"（写作 Pro）
- ✅ "工坊造世界 / 分支可回看 / 实时 AI 推进"（入戏）
- ✅ "六维成绩单 / 版本并排比 / 日志不上传"（ClawClip）

## 使用要求
- 涉及品牌展示、公司介绍、联系信息、后台入口时，以本文件为共享基线
- 项目本地如果有例外，只在项目本地规则中补充，不要回写多个重复版本

## 05-workflow-and-governance

# 工作流、代码质量与规则治理

## Git 版本管理

### 提交频率与推送
- 每完成一个独立任务立即执行 `git add . && git commit -m "描述" && git push`
- 多项目协作时各项目独立推送，修改了哪个推哪个
- 除非用户明确说"不要提交 / 不要推送 / 先别上线"，否则不要把 commit / push 作为反复确认事项
- 若仓库没有远端，则至少完成本地 commit，并在结果里明确说明未推送原因
- 禁止积压未推送的代码，禁止用 new/V2 等临时命名

### Commit 格式
- 格式：`类型: 简要描述`
- 类型包括：feat（新功能）、fix（修复）、ui（界面）、docs（文档）、refactor（重构）、chore（杂项）

## 内容保护（最高优先级）

### 文件修改原则
- 修改文件前必须先读取原文件内容
- 大文件用局部替换（Edit 工具），禁止整体覆盖
- 重做模块前先充分参考旧文件，禁止先删后补
- 整理合并文件时先完成新版再清理旧文件

### 误操作恢复
- 意外覆盖文件时立即承认错误
- 用 `git checkout HEAD^ -- path/to/file` 或 `git show` 恢复
- 恢复后将旧内容与新更新合并

## 代码质量标准

### 基本要求
- 遵循项目现有代码风格、命名规范、目录结构
- 完整的防御性编码：边界条件、空值检查、异常处理
- 生成代码后自行验证逻辑正确性
- 不创建多余映射层，不遗留无用旧文件
- 安全相关代码遵循最佳实践

### UI 一致性
- 同项目内统一视觉语言（配色、间距、圆角、阴影、交互模式）
- 新增页面/组件参考已有设计，禁止随意引入新风格
- 移动端须针对性设计，复杂布局改为卡片/Tab/折叠面板
- 图标来源统一，选用现代图标库

## 问题追踪与处理

### 问题记录
- 某需求或操作多次出错时，在回复中详细记录需求背景与操作过程
- 便于切换对话窗口时快速追溯，及时换方案
- 修复问题后验证修复有效性，确认未引入新问题
- 处理问题时先全局观察再修复，禁止头痛医头

### 失败处理策略
- 同一问题反复失败超过 3 次，标记跳过继续推进
- 整体进度优先于局部完美：宁可全部 80% 也不要一个 100% 其余未开始
- 任务拆小执行，避免长时间无产出

## 沟通协议

### 语言与表达
- 使用简体中文回复，技术术语保留英文
- 需求不明确时先澄清，禁止基于假设推进
- 进度实时反馈：当前阶段、已完成、待处理

### 回复风格
- 简洁直接，不重复已说过的话
- 不使用 markdown 标题（除非多步骤答案）
- 不过度使用粗体
- 不提及执行日志
- 总结时极简表达，避免冗长复述和列表堆砌

## 规则治理

### 唯一权威规则体系
- 共享公共规则：工作区根 `/.claude/rules/shared/`
- 项目局部规则：各项目根 `/.claude/rules/project/`
- `CLAUDE.md` 只作为入口索引，不再承载大量重复正文
- `.cursor/`、`.kiro/`、`.codebuddy/`、`.trae/`、`.github/copilot-instructions.md` 均视为**生成物**，不得手工改成新的权威来源

### 编辑规则
- 修改公共规则：只改工作区根 `/.claude/rules/shared/`
- 修改项目规则：只改目标项目根 `/.claude/rules/project/`
- 修改后统一运行同步脚本，刷新各 IDE 适配层
- 不要在生成物里手改规则；若发现生成物与规则源不一致，应回到 canonical 文件修

### 不要当作权威规则源的目录
以下路径即使存在规则样式文件，也只当参考、历史、临时副本或第三方内容：
- `.deploy-tmp/`
- `**/cankao/`
- `**/_reference/`
- `**/backup/`
- `**/node_modules/`
- `apps/luelan-writing-pro/别人的kiro规则/`
- 外部参考仓库 / 样板仓库 / 第三方子项目

### 清理与迁移原则
- 不得因为"看起来重复"就直接删规则
- 每一条旧规则都必须有去向：上收为 shared / 留在 project / 明确标记为 legacy
- 完成迁移前，不得一次性粗暴清空旧规则
- 每个项目都能通过自身目录下的规则入口文件被 IDE 默认读取
- 公共常量只保留一个 canonical 来源
- 项目局部坑点只保留在对应项目的 canonical 文件中
