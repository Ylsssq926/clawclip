<div align="center">

# 🍤 虾片 (ClawClip)

**你的 AI Agent 跑了 47 步，烧了 ¥16，你一脸懵逼。**

*虾片把无聊的 Agent 日志变成好看的时间轴回放，离线给龙虾做六维体检，顺便告诉你钱都花哪了。*

[![在线体验](https://img.shields.io/badge/🔴_在线体验-clawclip.luelan.online-blue?style=for-the-badge)](https://clawclip.luelan.online)
[![MIT License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Node.js ≥18](https://img.shields.io/badge/node-%E2%89%A518-brightgreen?style=for-the-badge)](https://nodejs.org)

[![Latest Release](https://img.shields.io/github/v/release/Ylsssq926/clawclip?label=release)](https://github.com/Ylsssq926/clawclip/releases)
[![7 Languages](https://img.shields.io/badge/i18n-7%20languages-blueviolet.svg)](#核心功能)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org)

> [English](README.md) | **中文** | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

</div>

---

<table>
<tr>
<td width="50%">

### 😵 没有虾片
- Agent 跑完 → 日志堆在那没人看
- 哪个模型花了多少钱 → 🤷
- "Agent 有没有变强？" → 没答案
- 排查问题 = 肉眼读 JSONL

</td>
<td width="50%">

### 🍤 有了虾片
- 每一步可视化在交互式时间轴上
- 按模型、任务、时间拆分费用
- 六维评测 + 进化曲线追踪成长
- 词云、标签、知识库、排行榜一应俱全

</td>
</tr>
</table>

**一句话复制**：虾片 = 本地 Agent 日志 → 回放 + 离线体检分 + 成本与标签，隐私在你电脑。

---

## ⚡ 30 秒启动

```bash
git clone https://github.com/Ylsssq926/clawclip.git && cd clawclip
npm install && npm start
# → http://localhost:8080（内置 8 条 Demo 会话，开箱即用）
```

> **环境要求**：Node.js ≥ 18。首次启动自动构建，约 1-2 分钟。

### 开发模式

```bash
# 终端 1：启动后端（tsx watch 热重载）
npm run dev:server

# 终端 2：启动前端（Vite dev server，端口 3000，/api 自动代理到 8080）
npm run dev:web
```

---

## 为什么选虾片？

- **100% 本地** — 数据始终在你电脑上。无云端、无账号、无追踪。
- **零成本** — 评测完全离线运行。不调用 LLM API。没有隐藏费用。
- **框架无关** — 支持 OpenClaw、ZeroClaw，以及任何输出 JSONL 日志的 Agent 框架。

---

## 这是给谁用的？

- 你装了 OpenClaw / ZeroClaw，想知道 Agent 每一步在干嘛
- 你想评估 Agent 的写作、代码、工具调用、检索、安全性和性价比
- 你想监控 Token 花了多少钱、花在了哪个模型上
- 你想通过词云和标签快速回顾 Agent 的工作内容

---

## 核心功能

🎬 **会话回放** — JSONL 日志变时间轴，每步思考、工具调用、Token 消耗逐步展开

📊 **六维评测** — 写作、代码、工具调用、检索、安全、性价比 — S/A/B/C/D 等级 + 雷达图 + 进化曲线（离线运行，零 API 调用）

💰 **成本监控** — Token 消耗趋势图、模型费用对比、预算告警、洞察与省钱建议

☁️ **词云与标签** — 自动提取关键词生成词云，按类别着色，会话自动标签

📚 **知识库** — 导入会话 JSON 构建知识库，全文搜索、拖拽上传、一键导出

🏆 **排行榜** — 提交评测分数，与其他用户对比排名

🛒 **模板市场** — 预置 Agent 场景模板，一键应用 + 技能管理

🧠 **智能省钱** — 消费分析 + 替代模型推荐（接入 [PriceToken](https://pricetoken.ai) 实时定价）

---

## 数据从哪来？

| 来源 | 说明 |
|------|------|
| `~/.openclaw/` | 启动时自动扫描 |
| `OPENCLAW_STATE_DIR` | 环境变量覆盖路径 |
| `CLAWCLIP_LOBSTER_DIRS` | 自定义额外目录 |
| **没有真实 JSONL？** | 内置 8 条 Demo 会话，可先体验回放与评测 |
| **只有 SQLite？** | 仪表盘显示生态与兼容提示 — 虾片当前以 JSONL 会话为主路径 |

---

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

## 类型检查（PR / 发版前）

```bash
npm run check
```

对 `server` 和 `web` 两个 workspace 执行 `tsc --noEmit`。

## 贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。安全自查清单：[docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)。

---

## 关于这只虾

> 我是一只被主人从 OpenClaw 生态里捞出来的龙虾。
> 主人说："你天天在后台跑，别人都看不见你干了什么。"
> 我说："那就把我的工作录下来给他们看呗。"
> 主人又说："录下来了，但不知道你到底行不行啊。"
> 我说："那就考我呗，六科全考，我不怕。"
> 于是就有了虾片。
>
> —— 🍤 虾片项目吉祥物

---

## 交流

QQ 群: `892555092`

## 许可证

[MIT](LICENSE)

---

<div align="center">

用 🍤 制作 by **[掠蓝 (Luelan)](https://github.com/Ylsssq926)**

</div>
