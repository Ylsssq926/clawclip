<div align="center">

# 🍤 ClawClip

**Your AI Agent just ran 47 steps, burned $2.30, and you have no idea what happened.**

*ClawClip turns boring JSONL logs into interactive timelines, runs offline benchmarks, and tells you where every cent went.*

[![Live Demo](https://img.shields.io/badge/🔴_Live_Demo-clawclip.luelan.online-blue?style=for-the-badge)](https://clawclip.luelan.online)
[![MIT License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Node.js ≥18](https://img.shields.io/badge/node-%E2%89%A518-brightgreen?style=for-the-badge)](https://nodejs.org)

[![Latest Release](https://img.shields.io/github/v/release/Ylsssq926/clawclip?label=release)](https://github.com/Ylsssq926/clawclip/releases)
[![7 Languages](https://img.shields.io/badge/i18n-7%20languages-blueviolet.svg)](#whats-inside)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org)

> **English** | [中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

</div>

---

<table>
<tr>
<td width="50%">

### 😵 Without ClawClip
- Agent runs → logs pile up unread
- "Which model costs how much?" → 🤷
- "Is my Agent getting better?" → no answer
- Debugging = squinting at raw JSONL

</td>
<td width="50%">

### 🍤 With ClawClip
- Every step visualized on an interactive timeline
- Cost breakdown by model, task, and time
- 6-dimension benchmark with evolution tracking
- Word cloud, tags, knowledge base, leaderboard

</td>
</tr>
</table>

---

## ⚡ 30-Second Setup

```bash
git clone https://github.com/Ylsssq926/clawclip.git && cd clawclip
npm install && npm start
# → http://localhost:8080 (8 built-in demo sessions, no config needed)
```

> **Requirements**: Node.js ≥ 18. First run auto-builds (~1-2 min).

### Development Mode

```bash
# Terminal 1: backend (tsx watch, hot reload)
npm run dev:server

# Terminal 2: frontend (Vite dev server, port 3000, /api proxied to 8080)
npm run dev:web
```

---

## Why ClawClip?

- **100% Local** — Your data never leaves your machine. No cloud, no accounts, no tracking.
- **Zero Cost** — Benchmarks run offline. No LLM API calls. No hidden fees.
- **Framework Agnostic** — Works with OpenClaw, ZeroClaw, and any agent that writes JSONL logs.

---

## What's Inside

🎬 **Session Replay** — Every thought, tool call, and token cost on an interactive timeline

📊 **6-Dimension Benchmark** — Writing, coding, tools, retrieval, safety, cost-efficiency — S/A/B/C/D rank + radar chart + evolution curve (offline, zero API calls)

💰 **Cost Monitor** — Token trends, model breakdown, budget alerts, savings suggestions

☁️ **Word Cloud** — Auto-extracted keywords, color-coded by category, session auto-tagging

📚 **Knowledge Base** — Import session JSON, full-text search, drag-and-drop upload

🏆 **Leaderboard** — Submit scores, compare with the community

🛒 **Template Market** — Pre-built Agent scenario templates, one-click apply + skill management

🧠 **Smart Savings** — Alternative model recommendations via [PriceToken](https://pricetoken.ai) real-time pricing

---

## Where Does the Data Come From?

| Source | Details |
|--------|---------|
| `~/.openclaw/` | Auto-scanned on startup |
| `OPENCLAW_STATE_DIR` | Environment variable override |
| `CLAWCLIP_LOBSTER_DIRS` | Additional custom directories |
| **No real JSONL?** | 8 built-in Demo sessions — explore replay, benchmark, and cost features right away |
| **Only SQLite?** | Dashboard shows ecosystem hints — ClawClip currently targets the JSONL session path |

---

## Tech Stack

Express + TypeScript | React 18 + Vite + Tailwind CSS | Recharts | Framer Motion | Lucide React

## Roadmap

- [x] Session replay engine + 8 demo sessions
- [x] 6-dimension benchmark + radar chart + evolution curve
- [x] Cost monitor + budget alerts
- [x] Word cloud + auto-tagging
- [x] Share cards + Landing page
- [x] Knowledge base import/export + full-text search
- [x] Leaderboard (submit scores + rankings)
- [x] Template market + skill management
- [x] Smart savings / cost optimization (P0 + P1 done)
- [ ] P2: (optional milestone) runtime/gateway deep integration

## Health Check

```bash
curl -s http://localhost:8080/api/health
# → { "ok": true, "service": "clawclip", "ts": "..." }
```

Production deployment (PM2, Nginx): [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Type Check (before PR / release)

```bash
npm run check
```

Runs `tsc --noEmit` for both `server` and `web` workspaces.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Security self-check: [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md).

---

## About the Shrimp

> I'm a lobster pulled out of the OpenClaw ecosystem by my owner.
> Owner said: "You run in the background all day, nobody sees what you do."
> I said: "Then record my work and show them."
> Owner: "We recorded it, but we don't know if you're any good."
> I said: "Then test me — all six subjects, I'm not afraid."
> And that's how ClawClip was born.
>
> — 🍤 ClawClip Mascot

---

## Community

QQ Group: `892555092`

## License

[MIT](LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
