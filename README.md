<div align="center">

<img src="luelan-logo.png" alt="ClawClip logo" width="96" />

# ClawClip

**Your AI Agent ran 47 steps. You saw none of them.**

Session replay · Offline benchmarks · Cost tracking — for OpenClaw, ZeroClaw, and beyond.

<p>
  <a href="https://clawclip.luelan.online">Live Demo</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#why-clawclip">Why ClawClip</a> ·
  <a href="./README.zh-CN.md">中文</a>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-blue?style=flat-square" alt="Live Demo" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/i18n-7%20languages-orange?style=flat-square" alt="i18n 7 languages" />
</p>

</div>

---

> Zero cloud. Zero API calls. Zero cost. Your agent data stays on your machine.

---

## Quick Start

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Open `http://localhost:8080` — ClawClip ships with demo sessions, so you can explore replay, benchmarks, and cost views immediately.

---

## The Problem

Your agent ran all day. The logs exist. The truth does not.

A folder fills up with JSONL sessions. Somewhere inside are tool failures, prompt regressions, token spikes, and maybe the one run where your agent actually got better. But when you crack open the raw files, it all looks the same: timestamps, blobs, noise.

So you start asking the questions every agent builder asks sooner or later: **Where did the money go? Did the new prompt help? Is this agent improving, or am I just remembering the good runs?**

Then it's 2 am, and you're grepping JSON by hand, jumping between terminals, trying to reconstruct a story your agent already lived once.

ClawClip fixes all of this. Replay the run, score the behavior, inspect the cost, and see the trend — in minutes instead of midnight.

---

## Features

| | Feature | What it gives you |
| --- | --- | --- |
| 🎬 | **Session Replay** | Interactive timelines for thoughts, tool calls, outputs, and token traces |
| 📊 | **6D Benchmark** | Six-dimension scoring with ranks, radar charts, and evolution tracking |
| 💸 | **Cost Monitor** | Token trends, model breakdowns, budget alerts, and savings suggestions |
| ☁️ | **Word Cloud** | Auto-extracted keywords, categories, and session labeling |
| 🏆 | **Leaderboard** | Submit scores and compare performance with the community |
| 🪄 | **Smart Savings** | Alternative model recommendations powered by real-time pricing |
| 📚 | **Knowledge Base** | Import session JSON, search runs, and build a local memory layer |
| 🧩 | **Template Market** | Reusable agent scenarios and skill management |

---

## Why ClawClip

### 100% Local
Your session data stays on your machine. No cloud upload, no account wall, no tracking.

### Zero Cost
Benchmarks and analysis run offline. No LLM API calls. No surprise bill just to understand last night's run.

### Framework Agnostic
Built for OpenClaw, works with ZeroClaw, and fits any agent workflow that writes JSONL sessions.

---

## Data Sources

| Source | Notes |
| --- | --- |
| `~/.openclaw/` | Auto-detected on startup |
| `OPENCLAW_STATE_DIR` | Override the default session directory |
| `CLAWCLIP_LOBSTER_DIRS` | Add extra folders for scanning |
| Built-in demo sessions | Explore the product immediately, even with no real data |
| SQLite-only setups | ClawClip currently focuses on the official JSONL session path |

---

## Tech Stack

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

---

## Roadmap

- [x] Session replay engine with built-in demo sessions
- [x] Offline six-dimension benchmark system
- [x] Cost monitor, alerts, and savings suggestions
- [x] Word cloud, auto-tagging, and knowledge base search
- [x] Leaderboard, share cards, and template market
- [ ] Deeper runtime / gateway integrations
- [ ] More ecosystem adapters beyond current JSONL workflows
- [ ] Richer team-level comparison and review flows

---

## The Shrimp Story

> I'm a lobster pulled out of the OpenClaw ecosystem by my owner.
>
> My owner said, "You run in the background all day. Nobody sees what you do."
>
> I said, "Then record my work and show them."
>
> My owner said, "We recorded it, but we still don't know if you're any good."
>
> I said, "Then test me — all six subjects. I'm not afraid."
>
> And that's how ClawClip was born.
>
> — 🍤 ClawClip Mascot

---

## Community

QQ Group: `892555092`

---

## License

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
