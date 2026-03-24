# 🍤 虾片 (ClawClip)

**AI Agent 回放可视化 · 能力评测 · 成本优化**

把无聊的 Agent 日志变成好看的、可分享的执行回放。看清你的龙虾到底在干嘛、干得好不好、花了多少钱。

> 支持 OpenClaw / ZeroClaw 及所有兼容框架

## 核心功能

### 🎬 会话回放

将 `~/.openclaw/agents/*/sessions/*.jsonl` 日志解析成可交互的时间轴回放：

- Agent 每一步的思考过程
- 工具调用链路（搜索、代码执行、文件操作……）
- 每步 Token 消耗与耗时
- 最终输出质量
- **一键生成分享卡片**（小红书 / 朋友圈尺寸）

### 📊 能力评测（规划中）

用标准化中文任务集跑分，生成 Agent 成绩单：

- 中文写作 · 代码能力 · 工具调用 · 信息检索 · 安全合规 · 性价比
- 全网排行榜
- 针对性优化建议

### 💰 成本分析

- Token 消耗趋势图
- 模型消耗对比
- 预算告警
- 高消耗任务排行
- 省钱建议（规划中：智能路由自动降本）

## 快速开始

### 前提条件

- Node.js >= 18
- 已安装 [OpenClaw](https://github.com/openclaw/openclaw)（可选，未安装时可用 demo 数据体验）

### 安装

```bash
git clone https://github.com/luelan/clawclip.git
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
├── server/          # 后端 API（Express + TypeScript）
│   ├── routes/      # API 路由
│   ├── services/    # 日志解析、回放引擎、成本分析
│   └── types/
├── web/             # 前端（React 18 + Vite + Tailwind CSS）
│   └── src/
│       ├── pages/   # 页面组件
│       └── components/
└── templates/       # 预设场景模板（兼容保留）
```

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Express + TypeScript |
| 前端 | React 18 + Vite + Tailwind CSS |
| 图表 | Recharts |
| 图标 | Lucide React |

## 路线图

- [x] 成本分析仪表盘
- [x] **会话回放引擎**（时间轴 + Demo 数据）
- [ ] 回放分享卡片生成
- [ ] 中文 Agent 评测基准
- [ ] 排行榜 Web 页面
- [ ] 智能路由省钱模式

## 关于这只虾

> 我是一只被主人从 OpenClaw 生态里捞出来的龙虾。
> 主人说："你天天在后台跑，别人都看不见你干了什么。"
> 我说："那就把我的工作录下来给他们看呗。"
> 于是就有了虾片。
>
> —— 🍤 虾片项目吉祥物

## 许可证

[MIT](LICENSE)

---

制作: 掠蓝 (Luelan) 🍤
