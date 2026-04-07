<div align="center">

<img src="luelan-logo.png" alt="虾片" width="96" />

# 🍤 虾片 (ClawClip)

**本地 Agent 诊断台 · v1.1.0**

看清你的 Agent：到底是真变强了，还是只是越跑越贵。

运行洞察 · Agent 成绩单 · 成本报告 —— 面向 OpenClaw、ZeroClaw 与务实的本地 JSONL 工作流。

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
  <img src="https://img.shields.io/badge/分析-本地会话分析-0f172a?style=flat-square" alt="会话分析本地完成" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw 和 ZeroClaw" />
</p>

</div>

> 虾片不是拿来“存日志”的，它是把日志摊开给你看。  
> 它会把一次运行整理成证据链，判断这次表现有没有顶住，再把成本摆出来，让你知道这次优化到底值不值。
>
> **边界先说清：** 会话分析在本地完成，不上传 Agent 运行数据；如果你要更新成本参考，价格表可以按需联网刷新公开定价。

<a id="core-capabilities"></a>

## 它先把三件事说清

| 你真正想知道的 | 虾片怎么回答 |
| --- | --- |
| **Agent 到底做了什么？** | **运行洞察（Run Insights）** 把思考步骤、工具调用、重试、报错与最终结果串成一条可复盘的证据链 |
| **这次运行到底有没有撑住？** | **Agent 成绩单（Agent Scorecard）** 从写作、编程、工具、检索、安全、性价比六个维度给你一个快速诊断 |
| **这次优化到底值不值？** | **成本报告（Cost Report）** 按模型和使用情况拆开成本，看提升有没有真的配得上这笔花费 |

## v1.1.0 现在能做什么

| 这版已经有 | 它解决什么问题 |
| --- | --- |
| **Prompt 效率** | 看更多 token、更长 prompt，到底换没换来足够结果 |
| **版本对比** | 把模型、Prompt、配置或不同运行并排摆开，看到真正进步和真实退步 |
| **模板库 + 知识库** | 把跑通的经验沉淀下来，不再每次从零试 |
| **内置 Demo 会话** | 不接入真实项目，也能先把整套流程跑明白 |

## 本地优先，但不乱喊口号

- 会话发现、解析与诊断都在你的机器本地完成。
- 虾片不会上传 Agent 运行数据。
- 成本价格可以按需联网刷新公开定价，用来更新成本参考。
- 这个联网步骤只处理公开价格信息，不会带走你的会话内容。

<a id="quick-start"></a>

## 三步跑起来

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

打开 `http://localhost:8080`，先看看内置 Demo，会更快理解这三条主轴；再接入你自己的 OpenClaw / ZeroClaw 日志。

## 当前支持

虾片优先对齐 **OpenClaw** 与 **ZeroClaw** 的官方会话结构。  
其他本地 JSONL Agent 会按真实格式覆盖逐步扩展，不先喊“什么都支持”，再慢慢补票。

## 这张成绩单怎么看

> Agent 成绩单采用 **启发式规则评分（Heuristic Scorecard）**。它读的是运行行为信号，比如回复质量、工具使用、安全提示和成本结构；它不是标准题库考试，更像一张诊断片，帮你更快发现哪一块没顶住。

## 会话从哪来

| 来源 | 说明 |
| --- | --- |
| `~/.openclaw/` | 默认 OpenClaw 会话目录，启动时自动扫描 |
| `OPENCLAW_STATE_DIR` | 覆盖默认 OpenClaw 状态目录 |
| `CLAWCLIP_LOBSTER_DIRS` | 追加额外的本地会话扫描目录 |
| 内置 Demo 会话 | 不导入真实数据，也能先体验运行洞察、成绩单与成本报告 |
| ZeroClaw 导出目录 / 其他 JSONL 文件夹 | 随解析覆盖能力逐步支持 |

## 为什么叫“虾片”

> 我原本只是 OpenClaw 潮池里的一只打工小虾。
>
> 有一天，主人看着满屏日志问：“你到底是更强了，还是只是更贵了？”
>
> 我说：“别只翻原始输出了。把运行摊开看，给我一张成绩单，再把账单摆上桌。”
>
> 于是，虾片就成了这张本地 Agent 诊断台。
>
> —— 🍤 虾片吉祥物

<a id="roadmap"></a>

## v1.1.0 之后

- 把改前 / 改后的验证做得更直接，别让“优化成功”只停留在感觉里
- 继续补强 OpenClaw / ZeroClaw 与更多本地 JSONL 格式覆盖
- 增加适合团队评审的汇总视图与可分享报告，同时守住本地优先

## 社区

- QQ 群：`892555092`
- 问题反馈与建议：[GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## 许可证

[MIT](./LICENSE)

---

<div align="center">

用 🍤 制作 by **[掠蓝 (Luolan)](https://github.com/Ylsssq926)**

</div>
