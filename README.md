<div align="center">

<img src="luelan-logo.png" alt="ClawClip" width="96" />

# ClawClip 🍤

**Your agent's burning tokens on retry loops, bloated prompts, and expensive models doing lightweight work. ClawClip shows you where — so you can cut the waste and keep what actually makes it stronger.**

Runs locally · Reads your existing logs · No upload

<p>
  <a href="https://clawclip.luelan.online">Live Demo</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#visual-proof">Preview</a> ·
  <a href="./docs/FAQ.md">FAQ</a> ·
  <a href="#core-capabilities">What it does</a> ·
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
  <img src="https://img.shields.io/badge/analysis-runs%20locally-0f172a?style=flat-square" alt="Runs locally" />
  <img src="https://img.shields.io/badge/works%20with-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw and ZeroClaw" />
</p>

</div>

---

**You're running OpenClaw or ZeroClaw. Token costs keep climbing. You swap models, tweak prompts, and hope it helped — but you're never sure.**

ClawClip ends the guessing. It reads your session logs, replays what actually happened, scores the result, and shows you exactly where the money went. Cut the waste. Pick models that earn their cost. Keep only the changes that make your agent genuinely stronger.

<a id="visual-proof"></a>

## See it in 15 seconds

<p align="center">
  <img src="./docs/radar-animation-en.gif" alt="ClawClip replays a run, scores it, and shows where the cost went" />
</p>

<a id="core-capabilities"></a>

## What it does

### Find where tokens are being wasted
Retry loops. Bloated prompts. Verbose outputs. Expensive models doing lightweight work. ClawClip finds the patterns quietly inflating your bill — and tells you which ones to fix first.

### Compare models and configs side by side
Run the same task with different models or prompts. Compare them directly: which scored higher, which cost less, which actually improved. No more guessing after a swap.

### Prove whether an optimization worked
Every benchmark run is saved. After a change, you get before/after proof: score, tokens, cost. Plain verdict: better, worse, or no real difference. If the score went up but the bill went up more, you'll see that too.

### Replay any run step by step
See what your agent actually did: every tool call, retry, reasoning block, and response, in order. Find where it went sideways without digging through raw JSONL.

---

## The three questions it answers

| What you actually want to know | What ClawClip shows you |
| --- | --- |
| **Where's my token budget going?** | **Cost Report** breaks spend by model, task, and session — with waste signals and savings suggestions |
| **Is my agent actually getting better?** | **Agent Scorecard** gives a six-dimension verdict after each run, with before/after proof when you make a change |
| **What exactly happened in that run?** | **Run Insights** replays every step so you can find the problem without reading raw logs |

---

## What's in v1.1.0

| Feature | What it's for |
| --- | --- |
| **Token waste detection** | Flags retry loops, context bloat, prompt inefficiency, and model mismatches |
| **Model value matrix** | Shows which models deliver the best results per dollar across your actual tasks |
| **Before/after proof** | Compares the last two benchmark runs with a plain verdict |
| **Savings suggestions** | Prioritizes the changes most likely to cut cost without hurting quality |
| **Prompt Efficiency** | Checks whether longer prompts and more tokens are actually buying better output |
| **Version Compare** | Side-by-side comparison of different runs, models, or configs |
| **Template Library + Knowledge Base** | Reuse what worked, search your history, stop repeating the same experiments |

---

## What stays on your machine

- Session discovery, parsing, and all analysis run locally
- ClawClip does **not** upload your agent run data
- Pricing refresh is optional — it only updates cost reference numbers, never sends session content

<a id="quick-start"></a>

## Quick Start

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

Open `http://localhost:8080`. The built-in demo sessions load immediately — no setup needed. When you're ready, point ClawClip at your own OpenClaw or ZeroClaw logs.

## Compatibility

**Primary support:** OpenClaw and ZeroClaw official session formats.  
**Also works with:** any local JSONL-based agent workflow — coverage expands as the parser grows.

```bash
# Point at a custom log directory
CLAWCLIP_LOBSTER_DIRS=/path/to/your/sessions npm start
```

## Session Sources

| Source | Notes |
| --- | --- |
| `~/.openclaw/` | Auto-discovered at startup |
| `OPENCLAW_STATE_DIR` | Override the default OpenClaw state path |
| `CLAWCLIP_LOBSTER_DIRS` | Add extra folders (comma or semicolon separated) |
| Built-in demo sessions | Available immediately, no real data needed |
| ZeroClaw exports / other JSONL | Supported progressively |

## About the scorecard

> The Agent Scorecard is a **heuristic diagnostic** — not a standardized benchmark. It reads signals from your actual sessions (response quality, tool use, safety patterns, cost structure) to help you compare iterations faster. Use it for relative improvement tracking, not absolute rankings.

<a id="roadmap"></a>

## What's coming

- Shareable reports: export a full Replay + Scorecard + Cost summary as a static snapshot
- AI-assisted diagnosis: LLM-powered second opinion on top of the existing heuristics
- Broader agent framework support: more local JSONL runtimes beyond OpenClaw / ZeroClaw
- Real-time monitoring: live session ingestion as runs happen

## Community

- QQ Group: `892555092`
- GitHub Discussions: [Ask a question or share what you built](https://github.com/Ylsssq926/clawclip/discussions)
- Issues: [Report a bug or request a feature](https://github.com/Ylsssq926/clawclip/issues)

## License

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

*If ClawClip helped you cut your token bill or find a better model config, a ⭐ goes a long way.*

</div>
