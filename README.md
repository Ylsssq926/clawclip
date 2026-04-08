<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Local Agent Diagnostic Console · v1.1.0**

See what your agent did.  
Check whether the run held up.  
Compare the result with the cost.

Run Insights · Agent Scorecard · Cost Report — for OpenClaw, ZeroClaw, and local JSONL session review.

<p>
  <a href="https://clawclip.luelan.online">Live Demo</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#visual-proof">Preview</a> ·
  <a href="./docs/FAQ.md">FAQ</a> ·
  <a href="#core-capabilities">Core Capabilities</a> ·
  <a href="#roadmap">Roadmap</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.de.md">Deutsch</a>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-2563eb?style=flat-square" alt="Live Demo" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/analysis-session%20analysis%20local-0f172a?style=flat-square" alt="Session analysis happens locally" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw and ZeroClaw" />
</p>

</div>

> Open a session and see what happened.  
> Check whether the run held up.  
> Compare the result with the cost before you keep the change.

<a id="visual-proof"></a>

## See it in 15 seconds

Load one run and answer three questions quickly: what happened, did it hold up, and was it worth the spend.

<p align="center">
  <img src="./docs/radar-animation-en.gif" alt="ClawClip turns one agent run into Run Insights, Agent Scorecard, and Cost Report" />
</p>

<a id="core-capabilities"></a>

## Three questions you can answer fast

| The question you actually have | What ClawClip gives you |
| --- | --- |
| **What did the agent really do?** | **Run Insights** lays the run out step by step, so you can review it without digging through raw logs |
| **Did the run actually hold up?** | **Agent Scorecard** gives a quick six-part diagnosis across writing, coding, tool use, retrieval, safety, and cost-performance |
| **Was the optimization worth it?** | **Cost Report** breaks spend down by model and usage so you can see whether the gain justified the bill |

## What ships in v1.1.0

| Included in this release | Why it matters |
| --- | --- |
| **Prompt Efficiency** | Check whether extra tokens and prompt complexity are buying enough output quality to justify themselves |
| **Version Compare** | Compare models, prompts, configs, or runs side by side to spot gains and regressions |
| **Template Library + Knowledge Base** | Reuse working patterns, search local history, and keep session learnings in one place |
| **Built-in demo sessions** | Explore the full workflow before touching real project data |

## What stays local

- Session discovery, parsing, and analysis happen on your machine.
- ClawClip does **not** upload agent run data.
- Public pricing refresh is **optional** if you want updated reference prices.
- That refresh step does **not** send your session contents anywhere.

<a id="quick-start"></a>

## Quick Start

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Open `http://localhost:8080` to inspect bundled demo sessions locally, then point ClawClip at your own OpenClaw / ZeroClaw logs.

## Compatibility

ClawClip currently prioritizes the official session structures used by **OpenClaw** and **ZeroClaw**.  
Support for other local JSONL runtimes expands as parser coverage grows.

## How to read the scorecard

> The Agent Scorecard is a **heuristic read**, not a benchmark leaderboard. It looks at session signals such as response quality, tool use, safety hints, and cost structure so you can compare iterations faster.

## Session Sources

| Source | What it is used for |
| --- | --- |
| `~/.openclaw/` | Default OpenClaw session directory, auto-discovered at startup |
| `OPENCLAW_STATE_DIR` | Override the default OpenClaw state path |
| `CLAWCLIP_LOBSTER_DIRS` | Add extra local folders for session scanning |
| Built-in demo sessions | Explore Run Insights, Agent Scorecard, and Cost Report without importing real data |
| ZeroClaw exports / additional JSONL folders | Supported progressively as format coverage expands |

## Why the mascot is a shrimp

> The mascot is a shrimp because ClawClip started around OpenClaw runs.
>
> Then the real question showed up: “Did this agent actually get better, or did it just get more expensive?”
>
> That question still defines the product: replay the run, check whether it held up, and compare the result with the cost.
>
> — 🍤 ClawClip Mascot

<a id="roadmap"></a>

## After v1.1.0

- Make before-and-after validation clearer for prompt, model, and config changes
- Deepen OpenClaw / ZeroClaw coverage and broaden support for adjacent local JSONL runtimes
- Add more shareable review outputs for team workflows while keeping sessions local

## Community

- QQ Group: `892555092`
- Issues and suggestions: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## License

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
