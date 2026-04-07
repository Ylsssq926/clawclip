<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Local Agent Diagnostic Console · v1.1.0**

See what your agent actually did.  
Score whether it held up.  
Prove whether the optimization was worth it.

Run Insights · Agent Scorecard · Cost Report — for OpenClaw, ZeroClaw, and practical local JSONL workflows that need evidence, not vibes.

<p>
  <a href="https://clawclip.luelan.online">Live Demo</a> ·
  <a href="#quick-start">Quick Start</a> ·
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

> ClawClip turns raw agent sessions into a review desk you can trust.  
> It shows the full run as evidence, scores whether the agent held up, and connects quality back to spend so you can tell whether “better” was actually worth paying for.
>
> **Boundary, stated plainly:** session analysis happens locally, agent run data is not uploaded, and price refresh is optional when you want current public pricing references.

<a id="core-capabilities"></a>

## The three questions ClawClip settles

| The question you actually have | What ClawClip gives you |
| --- | --- |
| **What did the agent really do?** | **Run Insights** reconstructs reasoning steps, tool calls, retries, errors, and outcomes as one reviewable evidence trail |
| **Did the run actually hold up?** | **Agent Scorecard** gives a practical heuristic read across writing, coding, tool use, retrieval, safety, and cost-performance |
| **Was the optimization worth it?** | **Cost Report** breaks spend down by model and usage so you can see whether the gain justified the bill |

## What ships in v1.1.0

| Included in this release | Why it matters |
| --- | --- |
| **Prompt Efficiency** | Check whether extra tokens and prompt complexity are buying enough output quality to justify themselves |
| **Version Compare** | Compare models, prompts, configs, or runs side by side to spot real gains and real regressions |
| **Template Library + Knowledge Base** | Reuse working patterns, search local history, and turn scattered session logs into an iteration memory |
| **Built-in demo sessions** | Explore the full workflow before touching real project data |

## Local-first, without fuzzy claims

- Session discovery, parsing, and analysis happen on your machine.
- ClawClip does **not** upload agent run data.
- Public pricing refresh is **optional** and only used to update cost references.
- That pricing step does **not** require sending your session contents anywhere.

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
Support for other local JSONL-based agent runtimes expands based on real parser coverage — not blanket “supports everything” promises.

## How to read the scorecard

> The Agent Scorecard is a **heuristic diagnostic**, not a benchmark leaderboard. It reads behavioral signals from real sessions — such as response quality, tool usage, safety hints, and cost structure — to help you review faster and compare iteration direction with more confidence.

## Session Sources

| Source | What it is used for |
| --- | --- |
| `~/.openclaw/` | Default OpenClaw session directory, auto-discovered at startup |
| `OPENCLAW_STATE_DIR` | Override the default OpenClaw state path |
| `CLAWCLIP_LOBSTER_DIRS` | Add extra local folders for session scanning |
| Built-in demo sessions | Explore Run Insights, Agent Scorecard, and Cost Report without importing real data |
| ZeroClaw exports / additional JSONL folders | Supported progressively as format coverage expands |

## The Shrimp Story

> I was a shrimp pulled out of the OpenClaw tide pool by my owner.
>
> My owner said, “You run all day, but nobody can tell whether you are getting better or just getting more expensive.”
>
> I said, “Then stop worshipping raw logs. Turn the run into evidence, give me a scorecard, and put the bill on the table.”
>
> So ClawClip became a local console for seeing what an agent did, how well it held up, and whether the spend paid off.
>
> — 🍤 ClawClip Mascot

<a id="roadmap"></a>

## After v1.1.0

- Make before-and-after validation clearer for prompt, model, and config changes
- Deepen OpenClaw / ZeroClaw coverage and broaden support for adjacent local JSONL runtimes
- Add more shareable review outputs for team workflows without breaking the local-first core

## Community

- QQ Group: `892555092`
- Issues and suggestions: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## License

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
