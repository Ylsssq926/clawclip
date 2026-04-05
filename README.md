<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Local-first diagnostic tool for AI Agents**

Run Insights · Agent Scorecard · Cost Report — for OpenClaw, ZeroClaw, and practical local JSONL workflows.

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
  <img src="https://img.shields.io/badge/local-100%25%20local-0f172a?style=flat-square" alt="100% local" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw and ZeroClaw" />
</p>

</div>

> ClawClip is a local-first diagnostic tool for AI Agents.  
> It turns JSONL session logs into reviewable evidence, scores your agent across 6 dimensions, and tracks every cent spent.  
> 100% local. Zero cloud. Zero API calls.

<a id="quick-start"></a>

## Quick Start

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Open `http://localhost:8080` to inspect bundled demo sessions locally, then point ClawClip at your own OpenClaw / ZeroClaw logs.

<a id="core-capabilities"></a>

## Core Capabilities

| Capability | What it helps you do |
| --- | --- |
| 🔍 **Run Insights** | Review every reasoning step, tool call, error, retry, and outcome as an audit-ready evidence chain |
| 📊 **Agent Scorecard** | Heuristically score writing, coding, tool use, retrieval, safety, and cost-performance from real run behavior |
| 💰 **Cost Report** | Break spend down by model, track trends, trigger budget awareness, and surface savings opportunities |
| 📈 **Prompt Efficiency** | Compare output quality against token and cost input to see whether prompts are actually worth their footprint |
| 🔄 **Version Compare** | Compare models, prompts, configs, or runs side by side to see what improved and what regressed |
| 📚 **Template Library + Knowledge Base** | Reuse working templates, search historical sessions, and build a local memory layer for iteration |

## Compatibility

ClawClip prioritizes the official session structures used by **OpenClaw** and **ZeroClaw**.  
Support for other local JSONL-based agent runtimes will expand gradually, based on real format coverage instead of vague “supports everything” promises.

## Scoring Method

> The Agent Scorecard uses a **Heuristic Scorecard** approach. It analyzes behavioral signals in session logs — such as response quality, tool usage, safety hints, and cost structure. It is not a strict benchmark built on a standardized test set; it is a fast diagnostic signal for run quality.

## Data Sources

| Source | Notes |
| --- | --- |
| `~/.openclaw/` | Default OpenClaw session directory, auto-detected at startup |
| `OPENCLAW_STATE_DIR` | Override the default OpenClaw state path |
| `CLAWCLIP_LOBSTER_DIRS` | Add extra local folders for session scanning |
| Built-in demo sessions | Explore Run Insights, Agent Scorecard, and Cost Report without importing real data |
| ZeroClaw exports / additional JSONL folders | Supported progressively as parser coverage matures |

## Tech Stack

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

<a id="roadmap"></a>

## Roadmap

### v1.0 — Tool maturity
- Stabilize Run Insights, Agent Scorecard, and Cost Report for day-to-day local diagnosis
- Improve evidence review, import ergonomics, and OpenClaw / ZeroClaw compatibility
- Make local-first workflows feel fast, clear, and dependable

### v1.5 — Optimization loop
- Strengthen Prompt Efficiency, Version Compare, and savings recommendations
- Connect diagnostics to repeatable optimization suggestions and post-change validation
- Expand Template Library + Knowledge Base into a practical iteration loop

### v2.0 — Team workflows
- Add team-facing review views, shareable reports, and baseline comparison workflows
- Support scenario libraries, recurring evaluation routines, and multi-run summaries
- Help teams manage agent quality and cost together, not run by run

## The Shrimp Story

> I was a shrimp pulled out of the OpenClaw tide pool by my owner.
>
> My owner said, “You run all day, but nobody can tell whether you are getting better or just getting more expensive.”
>
> I said, “Then stop staring at raw logs. Turn my runs into evidence, give me a scorecard, and show the bill.”
>
> So ClawClip became a local desk for reviewing what an agent did, how well it did it, and what it cost.
>
> — 🍤 ClawClip Mascot

## Community

- QQ Group: `892555092`
- Issues and suggestions: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## License

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
