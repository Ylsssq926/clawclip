# ClawClip · BRAND

> AI 在生图、写文案、做视觉设计前必读。
> 这是**开源开发工具**，给 Agent 开发者看的，**不是 C 端产品**。

## 一句话定位

**面向 Agent 开发者的开源本地诊断台**：六维成绩单 + 版本并排比 + 日志全程本地不上传。**让"AI Agent 好不好"变得可量化、可比较**。

## 核心用户画像

- **Agent 开发者**：写过 Claude Code / OpenClaw / 自家 Agent 的人
- **技术评估者**：要给团队选 Agent 框架的 tech lead
- **AI 成本优化者**：想优化 token 消耗的工程团队
- **开源社区参与者**：寻找好的开发工具
- **不是给谁**：终端用户（不知道什么是 Agent）、产品经理（不写代码不需要这工具）

## 视觉调性

- **关键词**：技术克制、终端美学、数据可视化、开发者亲和、开源调性
- **避免**：To C 营销话术、过度图表装饰、商业 SaaS 转化漏斗
- **气质**：像 GitHub README + Vercel 文档的混合 —— 技术人看了就懂
- **参考心智**：[Vercel](https://vercel.com)、[Linear](https://linear.app)、[Sentry](https://sentry.io) 的开发者产品

## 配色

| 用途 | 色值 | 说明 |
|---|---|---|
| 主色 | `#3b82c4` 或深蓝 | 品牌锚点（开发者熟悉的"链接蓝"） |
| 背景 | 暗色优先 + 亮色可切换 | 开发者夜间长时间用 |
| 文字 | 暗色 `#e2e8f0` / 亮色 `#1e293b` | 长时间阅读不累 |
| 数据可视化 | 6 维各一色 | 雷达图 / 柱状图区分维度 |
| 成功 / 警告 / 错误 | 绿 / 黄 / 红 | 终端配色规范 |

**禁用**：糖果色、过度饱和色（数据图表可视化失败的标志）。

## 字体倾向

- 中文：苹方 / 思源黑体（极少用，工具是英文优先）
- 英文：Inter（界面）/ JetBrains Mono（代码 / 数据）
- 等宽字体：JetBrains Mono / Fira Code（终端美学的核心）
- **避免**：衬线体（不开发者）、花体（不严肃）

## AI 生图关键词模板

### 正面 prompt 关键词

```
developer tool aesthetic, terminal-inspired UI,
dark mode dashboard with data visualization,
six-dimensional radar chart focus,
clean monospace typography integration,
GitHub / Linear inspired design language,
muted blue accent (#3b82c4),
no marketing fluff, technical credibility
```

### 反面（绝不要）

```
NO: To-C marketing banner, NO: cute mascot,
NO: vibrant gradient backgrounds, NO: motion blur effects,
NO: testimonials with stock photo people,
NO: "5x faster!" claims, NO: pricing table prominence,
NO: stock business handshake
```

### 典型场景

- Hero：六维雷达图 + 一行命令行示例
- 功能展示：终端界面截图为主
- 文档页：纯文字 + 代码块为主
- **不要**：用户头像、推荐算法、订阅引导

## 文案语气

- **技术博客作者 + 严谨 README** —— 给同行看的，不解释基础概念
- 关键词：六维、版本对比、本地处理、Demo Session、Agent 诊断
- **"为什么需要这个"用一句话** —— 比如"你的 Agent 是不是在烧钱？"
- 避免：颠覆性、革命性、AI 超能力、智能化升级

## 三大核心卖点

1. **六维成绩单** —— 把"好不好"拆得足够具体（不是简单评分）
2. **版本并排比** —— 优化前后对比，让改动有据可查
3. **日志不上传** —— 全程本地处理，企业用户敢用

## 同类参考

- **Sentry** —— 学其"错误监控 + 数据可视化"
- **Datadog APM** —— 学其专业 dashboard 设计
- **Lighthouse** —— 学其六维评分思路（性能 / 可访问性 / SEO 等）
- **Linear / Vercel** —— 学其开发者产品的"克制美"

## 当前线上事实

- 域名：`https://clawclip.luelan.online`（演示站，开源项目主页）
- 服务器：上海 `121.4.98.150`（PM2 `clawclip`，端口 8080）
- GitHub: `Ylsssq926/clawclip`（开源）
- 项目分类：`opensource`（个人主站标记）
- 项目调性英文标语：**"Cut your OpenClaw / ZeroClaw token bill. Find which model earns its cost."**（来自 GitHub 描述）
- **新域 `clawclip.luelanai.com` 自动 301 跳回旧域**
