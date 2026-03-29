<div align="center">
<br />
<img src="luelan-logo.png" alt="虾片" width="80" />
<br />
<br />

# 🍤 虾片 (ClawClip)

### 你的 AI Agent 跑了一整天，你连它干了啥都不知道。

会话回放 · 离线评测 · 成本追踪 —— 给你的龙虾装一个黑匣子。

<br />

[在线体验](https://clawclip.luelan.online) · [快速开始](#-快速开始) · [为什么选虾片](#-为什么选虾片) · [English](README.md)

<br />

[![在线体验](https://img.shields.io/badge/demo-在线体验-blue?style=flat-square)](https://clawclip.luelan.online)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square)](https://www.typescriptlang.org)
[![i18n](https://img.shields.io/badge/i18n-7_种语言-blueviolet?style=flat-square)](#)

</div>

> **零云端、零 API 调用、零费用。** 数据始终在你电脑上，谁也拿不走。

## 🚀 快速开始

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip
npm install && npm start
```

打开 `http://localhost:8080`，内置 Demo 会话，开箱即用。

## 🤔 你遇到过这些问题吗？

你装了 OpenClaw，Agent 每天跑几十个任务。日志堆在 `~/.openclaw/` 里。

但你从来不看。因为那是原始 JSONL。几千行。看不懂。

与此同时：
- 你不知道哪个模型在偷偷烧你的钱
- 你说不清 Agent 到底是变强了还是变弱了
- 出了 bug，你只能凌晨两点对着 JSON 文件一行行找

**虾片就是来解决这些问题的。**

## ✨ 核心功能

| 功能 | 你能得到什么 |
| --- | --- |
| 🎬 会话回放 | 把原始 JSONL 变成可读时间轴，每一步思考、工具调用、Token 消耗都能顺着看 |
| 📊 离线评测 | 六维打分 + 雷达图 + 进化曲线，不调任何 API，也能判断 Agent 是进步了还是退步了 |
| 💰 成本追踪 | 按模型、任务、时间拆账，谁在偷偷烧钱，一眼就知道 |
| ☁️ 词云标签 | 自动提关键词、打标签，回顾 Agent 最近到底都在忙什么 |
| 📚 知识库 | 导入会话 JSON，支持全文搜索、拖拽上传、一键沉淀 |
| 🧠 智能省钱 | 对比模型价格、给出替代建议，把预算花在真正有价值的地方 |
| 🏆 排行榜 / 模板市场 | 看别人怎么跑、用现成模板快速复用，少踩坑，少试错 |

## 💡 为什么选虾片？

**🔒 100% 本地** — 数据不出你的电脑。没有云端，没有账号，没有追踪。

**💸 零成本** — 评测完全离线。不调 API，不花一分钱。

**🔌 框架无关** — OpenClaw、ZeroClaw、或者任何输出 JSONL 的 Agent 框架都能用。

## 🗂️ 数据来源

| 来源 | 说明 |
| --- | --- |
| `~/.openclaw/` | 启动时自动扫描默认会话目录 |
| `OPENCLAW_STATE_DIR` | 用环境变量覆盖 OpenClaw 默认路径 |
| `CLAWCLIP_LOBSTER_DIRS` | 追加你自己的 Agent 日志目录 |
| 内置 Demo 会话 | 没有真实 JSONL，也能先体验回放、评测、成本分析 |
| 任意 JSONL Agent | 只要能产出 JSONL，会话就能进虾片 |

## 🛠️ 技术栈

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

## 🗺️ 路线图

- [x] 会话回放引擎
- [x] 六维离线评测
- [x] 成本监控与预算提醒
- [x] 词云、自动标签、知识库
- [x] 排行榜、模板市场、分享卡片
- [x] 智能省钱 / 成本优化
- [ ] 与运行时 / 网关更深度联动
- [ ] 更多 Agent 框架适配与生态接入

## 🦐 关于这只虾

> 我是一只被主人从 OpenClaw 生态里捞出来的龙虾。
> 主人说：「你天天在后台跑，别人都看不见你干了什么。」
> 我说：「那就把我的工作录下来给他们看呗。」
> 主人又说：「录下来了，但不知道你到底行不行啊。」
> 我说：「那就考我呗，六科全考，我不怕。」
> 于是就有了虾片。
>
> —— 🍤 虾片项目吉祥物

<div align="center">

喜欢折腾 Agent？欢迎来群里聊天：**QQ 群 `892555092`**

用 🍤 制作 by **[掠蓝 (Luolan)](https://github.com/Ylsssq926)** · [MIT License](LICENSE)

</div>
