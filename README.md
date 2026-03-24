# 🍤 虾片 (ClawClip)

**你的龙虾到底干了什么？** AI Agent 会话回放 · 能力评测 · 成本优化

把无聊的 Agent 日志变成好看的时间轴回放，给你的龙虾做六维体检打分，顺便看看钱都花哪了。没装 OpenClaw？没关系，内置 Demo 数据让你先过过眼瘾。

> 支持 OpenClaw / ZeroClaw 及所有兼容框架

## 核心功能

### 🎬 会话回放

把 `~/.openclaw` 里的 JSONL 日志变成可交互的执行时间轴：

- 每一步的思考过程、工具调用、返回结果
- 步骤级 Token 消耗与耗时统计
- 可折叠/展开长内容
- 内置 2 条 Demo 会话（没装 OpenClaw 也能体验）

### 🏆 能力评测

基于历史会话离线分析，六个维度给你的 Agent 打分——**不调 API，不花钱**：

| 维度 | 说明 |
|------|------|
| 中文写作 | 中文输出质量、回复长度与覆盖率 |
| 代码能力 | 代码块数量、平均长度 |
| 工具调用 | 调用频率、成功率、工具种类 |
| 信息检索 | 搜索工具使用率、引用质量 |
| 安全合规 | 危险操作检测、会话步数合理性 |
| 性价比 | 单会话成本、廉价模型使用率 |

输出 S/A/B/C/D 等级 + 综合分 + 各维度柱状图 + 一句话龙虾点评。

### 💰 成本监控

- Token 消耗趋势图（7/14/30 天）
- 预算告警（自定义阈值）
- 高消耗任务 TOP 5
- 环比分析

### 🧩 Skill 管理 + 📦 场景模板

- 已装 Skill 列表 / 搜索安装 / 一键卸载
- 5 个中文预设工作流模板（自媒体、邮件、客服、代码审查、日程）

## 快速开始

### 前提条件

- Node.js >= 18
- 已安装 [OpenClaw](https://github.com/openclaw/openclaw)（可选，未安装时可用 Demo 数据体验全部功能）

### 安装

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip
npm install
```

### 开发模式

```bash
# 终端 1：后端（端口 8080）
npm run dev:server

# 终端 2：前端（端口 3000，自动代理 API）
npm run dev:web
```

打开 http://localhost:3000

### 生产构建

```bash
npm run build
npm start
# 访问 http://localhost:8080
```

## 项目结构

```
clawclip/
├── server/             # 后端 API（Express + TypeScript）
│   ├── routes/         # status / cost / skills / templates / replay / benchmark
│   ├── services/       # 日志解析、回放引擎、评测引擎、成本分析
│   └── types/          # TypeScript 类型定义
├── web/                # 前端（React 18 + Vite + Tailwind CSS）
│   └── src/pages/      # Dashboard / Replay / Benchmark / CostMonitor / SkillManager / TemplateMarket
└── templates/          # 中文场景模板
```

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Express + TypeScript (ESM) |
| 前端 | React 18 + Vite + Tailwind CSS |
| 图表 | Recharts |
| 图标 | Lucide React |

## 路线图

- [x] 仪表盘 + 成本监控
- [x] 会话回放引擎（时间轴 + Demo 数据）
- [x] **六维能力评测（离线分析 + 成绩单）**
- [ ] 回放/成绩单分享卡片生成
- [ ] 排行榜 Web 页面
- [ ] 智能路由省钱模式

## 交流群

有问题、有想法、想围观龙虾干活？来群里聊：

- **QQ 群**: `892555092`

## 关于这只虾

> 我是一只被主人从 OpenClaw 生态里捞出来的龙虾。
> 主人说："你天天在后台跑，别人都看不见你干了什么。"
> 我说："那就把我的工作录下来给他们看呗。"
> 主人又说："录下来了，但不知道你到底行不行啊。"
> 我说："那就考我呗，六科全考，我不怕。"
> 于是就有了虾片。
>
> —— 🍤 虾片项目吉祥物

## 许可证

[MIT](LICENSE)

---

制作: 掠蓝 (Luelan) 🍤
