<div align="center">

<img src="luelan-logo.png" alt="掠蓝标志" width="96" />

# 虾片（ClawClip）

**本地 Agent 诊断台 · v1.1.0**

先看一次运行发生了什么。  
再看这次有没有撑住。  
最后对照成本，判断这次优化值不值。

运行洞察 · Agent 成绩单 · 成本报告 —— 用来看 OpenClaw、ZeroClaw 和本地 JSONL 会话。

<p>
  <a href="https://clawclip.luelan.online">在线体验</a> ·
  <a href="#quick-start">快速开始</a> ·
  <a href="#visual-proof">一眼看懂</a> ·
  <a href="./docs/FAQ.md">常见问题</a> ·
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
  <img src="https://img.shields.io/badge/分析-本地会话分析-0f172a?style=flat-square" alt="会话分析本地完成" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw 和 ZeroClaw" />
</p>

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
