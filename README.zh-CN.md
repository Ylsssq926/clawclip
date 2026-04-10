<div align="center">

<img src="luelan-logo.png" alt="虾片（ClawClip）" width="96" />

# 虾片（ClawClip）🍤

**降低你的 OpenClaw / ZeroClaw token 账单。找出哪个模型真的值这个钱。只保留让 Agent 真正变强的改动。**

本地运行 · 不上传数据 · 直接读你现有的日志

<p>
  <a href="https://clawclip.luelan.online">在线体验</a> ·
  <a href="#quick-start">快速开始</a> ·
  <a href="#visual-proof">一眼看懂</a> ·
  <a href="./docs/FAQ.md">常见问题</a> ·
  <a href="#core-capabilities">它能做什么</a> ·
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
  <img src="https://img.shields.io/badge/分析-本地运行-0f172a?style=flat-square" alt="本地运行" />
  <img src="https://img.shields.io/badge/支持-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw 和 ZeroClaw" />
</p>

</div>

---

**如果你在用 OpenClaw 或 ZeroClaw，你一定遇到过这个问题：** token 成本悄悄累积，重试循环在后台烧钱，每次换模型或改 Prompt 之后，你都不确定这次改动到底有没有用。

虾片给你答案。它读取你本地的会话日志，逐步回放每次运行，给出评分，并精确拆解每一分钱花在哪里——让你找到浪费、选对模型、只保留真正让 Agent 变强的改动。

<a id="visual-proof"></a>

## 15 秒看明白

<p align="center">
  <img src="./docs/radar-animation-zh.gif" alt="虾片回放一次运行，给出评分，并展示成本去向" />
</p>

<a id="core-capabilities"></a>

## 它能做什么

### 找出 token 在哪里被浪费
虾片扫描你的会话，找出重试循环、Prompt 膨胀、输出冗长、轻任务用了贵模型这些模式。它把悄悄拉高账单的问题浮出来，告诉你先改哪个最值。

### 并排对比模型和 Agent 配置
用不同模型或 Prompt 跑同一个任务，然后直接对比：哪个分数更高、哪个花费更少、哪个真的有进步。换模型之后不用再靠感觉猜。

### 证明一次优化到底有没有用
每次评测结果都会保存。改完之后，你能看到前后对比——分数、token 数、成本——加上一句直接的结论：变好了、变差了，还是没什么区别。如果分数涨了但账单涨得更多，你也会看到。

### 像看对话一样回放任何一次运行
逐步看 Agent 实际做了什么：每一次工具调用、重试、推理过程和回复，按顺序展开。不用翻原始 JSONL，直接找到出问题的那一步。

---

## 它回答的三个问题

| 你真正想知道的 | 虾片怎么回答 |
| --- | --- |
| **token 预算都花到哪里去了？** | **成本报告** 按模型、任务类型和会话拆解花费，带浪费信号和省钱建议 |
| **Agent 真的在变强吗？** | **Agent 成绩单** 每次运行后给出六维结论，改动后有前后对比证明 |
| **那次运行到底发生了什么？** | **运行洞察** 逐步回放每一步，不用读原始日志就能找到问题 |

---

## v1.1.0 现在能做什么

| 功能 | 用来做什么 |
| --- | --- |
| **Token 浪费检测** | 标记重试循环、上下文膨胀、Prompt 低效和模型错配 |
| **模型效果/成本矩阵** | 展示哪些模型在你的真实任务里性价比最高 |
| **优化前后证明** | 对比最近两次评测，给出直接结论 |
| **省钱建议** | 优先推荐最可能降低成本又不损效果的改动 |
| **Prompt 效率** | 检查更长的 Prompt 和更多 token 有没有真的换来更好的输出 |
| **版本对比** | 并排对比不同运行、模型或配置 |
| **模板库 + 知识库** | 沉淀跑通的经验，搜索历史，不用重复同样的实验 |

---

## 哪些数据留在本地

- 会话发现、解析和所有分析都在你的机器本地完成。
- 虾片**不会**上传 Agent 运行数据。
- 价格刷新是可选的，只更新成本参考数字，不发送会话内容。

<a id="quick-start"></a>

## 三步跑起来

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

打开 `http://localhost:8080`，内置 Demo 会话立刻可用，不需要任何配置。准备好之后，把虾片指向你自己的 OpenClaw 或 ZeroClaw 日志。

## 当前支持

**优先支持：** OpenClaw 和 ZeroClaw 官方会话格式。  
**也支持：** 任何本地 JSONL Agent 工作流——随解析覆盖逐步扩展。

```bash
# 指向自定义日志目录
CLAWCLIP_LOBSTER_DIRS=/path/to/your/sessions npm start
```

## 会话从哪来

| 来源 | 说明 |
| --- | --- |
| `~/.openclaw/` | 启动时自动扫描 |
| `OPENCLAW_STATE_DIR` | 覆盖默认 OpenClaw 状态目录 |
| `CLAWCLIP_LOBSTER_DIRS` | 追加额外目录（逗号或分号分隔） |
| 内置 Demo 会话 | 立刻可用，不需要真实数据 |
| ZeroClaw 导出目录 / 其他 JSONL | 随解析覆盖逐步支持 |

## 这张成绩单怎么看

> Agent 成绩单是**启发式诊断**，不是标准化 benchmark。它读取你真实会话里的信号（回复质量、工具使用、安全模式、成本结构），帮你更快比较不同版本。用来追踪相对进步，不适合做绝对排名。

<a id="roadmap"></a>

## 接下来要做什么

- 可分享报告：把完整的回放 + 成绩单 + 成本摘要导出为静态快照
- AI 辅助诊断：在现有启发式分析上叠加 LLM 二次解读
- 更多 Agent 框架支持：扩展到 OpenClaw / ZeroClaw 之外的本地 JSONL 格式
- 实时监控：运行时实时接入会话

## 社区

- QQ 群：`892555092`
- GitHub Discussions：[提问或分享你的用法](https://github.com/Ylsssq926/clawclip/discussions)
- Issues：[报告问题或提功能建议](https://github.com/Ylsssq926/clawclip/issues)

## 许可证

[MIT](./LICENSE)

---

<div align="center">

🍤 由 **[掠蓝（Luelan）](https://github.com/Ylsssq926)** 出品

*如果虾片帮你降低了 token 账单或找到了更好的模型配置，点个 ⭐ 是最好的支持。*

</div>

> 打开一次 Agent 运行，直接看它做了什么。  
> 看这次有没有撑住。  
> 再对照成本，判断这次优化值不值。

<a id="visual-proof"></a>

## 15 秒看明白

一次运行，直接回答三个问题：发生了什么、有没有撑住、值不值。

<p align="center">
  <img src="./docs/radar-animation-zh.gif" alt="虾片把一次 Agent 运行展开成运行洞察、Agent 成绩单和成本报告" />
</p>

<a id="core-capabilities"></a>

## 它先把三件事说清

| 你真正想知道的 | 虾片怎么回答 |
| --- | --- |
| **Agent 到底做了什么？** | **运行洞察（Run Insights）** 把一次运行按步骤摊开，你不用翻原始日志也能看明白 |
| **这次运行到底有没有撑住？** | **Agent 成绩单（Agent Scorecard）** 给你一张六维诊断，快速看出哪里稳、哪里没稳 |
| **这次优化到底值不值？** | **成本报告（Cost Report）** 按模型和使用情况拆开成本，看提升配不配得上这笔花费 |

## v1.1.0 现在能做什么

| 这版已经有 | 它解决什么问题 |
| --- | --- |
| **Prompt 效率** | 看更多 token、更长 prompt，到底有没有换来足够结果 |
| **版本对比** | 把模型、Prompt、配置或不同运行并排摆开，看到真正的进步和退步 |
| **模板库 + 知识库** | 把跑通的经验沉淀下来，不用每次都从零试 |
| **内置 Demo 会话** | 不接入真实项目，也能先把整套流程跑一遍 |

## 哪些数据留在本地

- 会话发现、解析和诊断都在你的机器本地完成。
- 虾片不会上传 Agent 运行数据。
- 成本价格可以按需联网刷新，用来更新公开定价参考。
- 这个步骤不会发送你的会话内容。

<a id="quick-start"></a>

## 三步跑起来

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

打开 `http://localhost:8080`，先看看内置 Demo，再接入你自己的 OpenClaw / ZeroClaw 日志。

## 当前支持

虾片优先对齐 **OpenClaw** 与 **ZeroClaw** 的官方会话结构。  
其他本地 JSONL Agent 会随解析覆盖逐步扩展。

## 这张成绩单怎么看

> Agent 成绩单是 **启发式诊断**，不是排行榜。它读的是这次运行里已经出现的信号，比如回复质量、工具使用、安全提示和成本结构，帮你更快比较不同版本。

## 会话从哪来

| 来源 | 说明 |
| --- | --- |
| `~/.openclaw/` | 默认 OpenClaw 会话目录，启动时自动扫描 |
| `OPENCLAW_STATE_DIR` | 覆盖默认 OpenClaw 状态目录 |
| `CLAWCLIP_LOBSTER_DIRS` | 追加额外的本地会话扫描目录 |
| 内置 Demo 会话 | 不导入真实数据，也能先体验运行洞察、成绩单与成本报告 |
| ZeroClaw 导出目录 / 其他 JSONL 文件夹 | 随解析覆盖能力逐步支持 |

## 为什么叫“虾片（ClawClip）”

虾片（ClawClip）最早就是从本地回看 OpenClaw 运行开始做起的。

后来产品一直围着同一个问题打磨：这个 Agent 到底是真的更强了，还是只是更贵了？

所以现在的主流程还是这三步：先把一次运行摊开，再看结果有没有撑住，最后对照成本判断这次优化值不值。

<a id="roadmap"></a>

## v1.1.0 之后

- 把改前 / 改后的验证做得更直接，方便比较优化前后差异
- 继续补强 OpenClaw / ZeroClaw 与更多本地 JSONL 格式覆盖
- 增加适合团队评审的汇总视图与可分享报告，同时保持本地处理

## 社区

- QQ 群：`892555092`
- 问题反馈与建议：[GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## 许可证

[MIT](./LICENSE)

---

<div align="center">

🍤 由 **[掠蓝（Luelan）](https://github.com/Ylsssq926)** 出品

</div>
