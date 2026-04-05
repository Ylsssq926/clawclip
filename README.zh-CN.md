<div align="center">

<img src="luelan-logo.png" alt="虾片" width="96" />

# 🍤 虾片 (ClawClip)

**本地 Agent 诊断台**

运行洞察 · Agent 成绩单 · 成本账单 —— 面向 OpenClaw、ZeroClaw 与务实的本地 JSONL 工作流。

<p>
  <a href="https://clawclip.luelan.online">在线体验</a> ·
  <a href="#quick-start">快速开始</a> ·
  <a href="#core-capabilities">核心能力</a> ·
  <a href="#roadmap">路线图</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.de.md">Deutsch</a>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-在线体验-2563eb?style=flat-square" alt="在线体验" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/local-100%25%20本地-0f172a?style=flat-square" alt="100% 本地" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw 和 ZeroClaw" />
</p>

</div>

> ClawClip 是 AI Agent 的「能力成绩单」和「成本账单」。  
> 不只是回放日志——而是告诉你：你的 Agent 在写作、编程、工具使用、检索、安全、成本控制六个维度上，到底打几分？花了多少钱？比上次进步了吗？  
> 100% 本地运行，数据永不外传。

<a id="quick-start"></a>

## Quick Start

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

打开 `http://localhost:8080`，先用内置 Demo 会话体验本地诊断，再接入你自己的 OpenClaw / ZeroClaw 日志。

<a id="core-capabilities"></a>

## 核心能力

| 能力 | 你能得到什么 |
| --- | --- |
| 🔍 **运行洞察（Run Insights）** | 审查每一步思考、工具调用、错误、重试与结果，形成可回看的证据链 |
| 📊 **Agent 成绩单（Agent Scorecard）** | 基于真实运行行为，对写作 / 编程 / 工具 / 检索 / 安全 / 性价比六维进行启发式评分 |
| 💰 **成本账单（Cost Report）** | 按模型拆分成本、追踪趋势、提示预算风险，并给出省钱建议 |
| 📈 **Prompt 效率（Prompt Efficiency）** | 对比 Prompt 的投入与产出，判断 token 和花费是否换来了足够结果 |
| 🔄 **版本对比（Version Compare）** | 并排比较不同模型、Prompt、配置或运行版本，找出真正的提升与退步 |
| 📚 **模板库 + 知识库（Template Library + Knowledge Base）** | 复用有效模板、搜索历史会话，沉淀本地迭代记忆 |

## 兼容性声明

虾片优先支持 **OpenClaw** 与 **ZeroClaw** 的官方会话结构。  
其他本地 JSONL Agent 会按真实格式覆盖情况逐步扩展，而不是先承诺“任意 JSONL 都支持”。

## 评分方法说明

> Agent 成绩单基于启发式规则评分（Heuristic Scorecard），分析日志中的行为特征（回复质量、工具使用、成本结构等）。它不是基于标准测试集的严格评测，而是运行质量的快速诊断信号。

## Data Sources

| 来源 | 说明 |
| --- | --- |
| `~/.openclaw/` | 默认 OpenClaw 会话目录，启动时自动扫描 |
| `OPENCLAW_STATE_DIR` | 覆盖默认 OpenClaw 状态目录 |
| `CLAWCLIP_LOBSTER_DIRS` | 追加额外的本地会话扫描目录 |
| 内置 Demo 会话 | 不导入真实数据，也能先体验运行洞察、成绩单与成本账单 |
| ZeroClaw 导出目录 / 其他 JSONL 文件夹 | 随解析覆盖能力逐步支持 |

## Tech Stack

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

<a id="roadmap"></a>

## Roadmap

### v1.0 — 工具成熟
- 把运行洞察、Agent 成绩单、成本账单打磨成稳定可用的本地诊断三件套
- 提升证据审查体验、导入流程与 OpenClaw / ZeroClaw 兼容性
- 让本地分析足够快、足够清晰、足够可靠

### v1.5 — 优化闭环
- 强化 Prompt 效率、版本对比与省钱建议
- 把诊断结果连接到可执行的优化建议和改后验证流程
- 让模板库 + 知识库真正成为日常迭代闭环

### v2.0 — 团队化
- 增加团队视角的评审界面、可分享报告与基线对比流程
- 支持场景模板库、周期性评测与多运行汇总
- 帮助团队一起管理 Agent 质量与成本，而不只是单次复盘

## The Shrimp Story

> 我原本是一只在 OpenClaw 潮池里打工的小虾。
>
> 主人说：“你天天跑任务，可大家看不出来你到底是更强了，还是只是更贵了。”
>
> 我说：“那就别只盯着原始日志了。把我的运行变成证据链，给我一张成绩单，再把账单摊开看。”
>
> 于是，虾片成了一张本地诊断台：看见 Agent 做了什么、做得怎么样、又花了多少钱。
>
> —— 🍤 虾片吉祥物

## Community

- QQ 群：`892555092`
- 问题反馈与建议：[GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## License

[MIT](./LICENSE)

---

<div align="center">

用 🍤 制作 by **[掠蓝 (Luolan)](https://github.com/Ylsssq926)**

</div>
