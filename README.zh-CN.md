# 🍤 虾片 (ClawClip)

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js ≥18](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg)](https://nodejs.org)
[![7 Languages](https://img.shields.io/badge/i18n-7%20languages-blueviolet.svg)](#核心功能)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org)
[![Live Demo](https://img.shields.io/badge/demo-在线体验-00c7b7.svg)](https://clawclip.luelan.online)

> [English](README.md) | **中文** | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

**你的 AI Agent 到底干了什么？**

虾片是一个**本地优先**的 AI Agent 可视化与分析平台——把 OpenClaw / ZeroClaw 等兼容框架的会话日志变成**可交互的时间轴回放**，做**离线六维能力评测**（不调用 LLM API），并提供基于 [PriceToken](https://pricetoken.ai) 的**实时成本追踪与省钱建议**。

> **零云依赖。零额外账单。数据始终在你电脑上。**

**在线体验**: https://clawclip.luelan.online — 8 条 Demo 会话，无需安装

<table>
<tr>
<td width="50%">

**没有虾片**
- Agent 跑完 → 日志堆在那没人看
- 哪个模型花了多少钱 → 不知道
- "Agent 有没有变强？" → 没答案
- 排查问题 = 肉眼读 JSONL

</td>
<td width="50%">

**有了虾片**
- 每一步可视化在交互式时间轴上
- 按模型、任务、时间拆分费用
- 六维评测 + 进化曲线追踪成长
- 词云、标签、知识库、排行榜一应俱全

</td>
</tr>
</table>

**一句话复制**：虾片 = 本地 Agent 日志 → 回放 + 离线体检分 + 成本与标签，隐私在你电脑。

## 这是给谁用的？

- 你装了 OpenClaw / ZeroClaw，想知道 Agent 每一步在干嘛
- 你想评估 Agent 的写作、代码、工具调用、检索、安全性和性价比
- 你想监控 Token 花了多少钱、花在了哪个模型上
- 你想通过词云和标签快速回顾 Agent 的工作内容

## 快速开始

**环境**：Node.js **≥ 18**；首次启动会自动构建，约 1-2 分钟。

```bash
# 1. 克隆 & 安装
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install

# 2. 启动
npm start

# 打开 http://localhost:8080（端口可通过 PORT 环境变量修改）
```

### 开发模式

```bash
# 终端 1：启动后端（tsx watch 热重载）
npm run dev:server

# 终端 2：启动前端（Vite dev server，端口 3000，/api 自动代理到 8080）
npm run dev:web
```

### 数据从哪来？

- 启动后会尝试读取 **`~/.openclaw/`** 以及环境变量 **`OPENCLAW_STATE_DIR`**、**`CLAWCLIP_LOBSTER_DIRS`** 下的会话 **JSONL**。
- **没有真实 JSONL？** 内置 **8 条 Demo** 会话，可先体验回放与评测界面。
- **只有 SQLite、没有 JSONL？** 仪表盘会显示**生态与兼容提示**——虾片当前以 JSONL 会话为主路径。

## 核心功能

| 功能 | 说明 |
|------|------|
| 🎬 会话回放 | JSONL 日志 → 时间轴回放，每步思考、工具调用、Token 消耗逐步展开 |
| 📊 六维评测 | 写作、代码、工具调用、检索、安全、性价比，S/A/B/C/D 等级 + 雷达图 + 进化曲线 |
| 💰 成本监控 | Token 消耗趋势图、模型费用对比、预算告警、洞察与省钱建议 |
| ☁️ 词云与标签 | 自动提取关键词生成词云，会话自动标签 |
| 📚 知识库 | 导入会话 JSON 构建知识库，全文搜索、拖拽上传、一键导出 |
| 🏆 排行榜 | 提交评测分数，与其他用户对比排名 |
| 🛒 模板市场 | 预置 Agent 场景模板，一键应用 + 技能管理 |
| 🧠 智能省钱 | 消费分析 + 替代模型推荐（接入 PriceToken 实时定价） |

## 技术栈

Express + TypeScript | React 18 + Vite + Tailwind CSS | Recharts | Framer Motion | Lucide React

## 路线图

- [x] 会话回放引擎 + 8 条 Demo 会话
- [x] 六维评测 + 雷达图 + 进化曲线
- [x] 成本监控 + 预算告警
- [x] 词云可视化 + 自动标签
- [x] 分享卡片 + Landing Page
- [x] 知识库导入导出 + 全文搜索
- [x] 排行榜（提交分数 + 排名对比）
- [x] 模板市场 + 技能管理
- [x] 智能省钱 / 成本优化（P0 + P1 已完成）
- [ ] P2：（可选里程碑）与运行时/网关的深度联动

## 交流

QQ 群: `892555092`

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

制作: 掠蓝 (Luelan)
