# Changelog

All notable changes to ClawClip will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Version scheme: `YYYY.MM.DD` (CalVer, daily). Patch suffix `.N` for same-day releases.

---

## [2026.03.25.1] — 2026-03-25

### Improved
- Landing page interaction polish and runtime error productization
- Real data compatibility: better CLI detection, graceful fallbacks
- Production deployment documentation (docs/DEPLOYMENT.md)
- Skills/templates routes enhanced with better validation and error messages
- Status API enhanced with more detailed system info

[2026.03.25.1]: https://github.com/Ylsssq926/clawclip/compare/2026.03.25...2026.03.25.1

---

## [2026.03.25] — 2026-03-25

### Added
- **Replay Smart Insights**: 7-rule diagnostic engine analyzes each session replay for patterns (thinking waste, tool retry loops, model mixing, long sessions, cost concentration, tool success rate, token efficiency). Collapsible UI panel with step-linked insights.
- **Prompt Insight page**: cross-session prompt efficiency analysis — avg prompt length, output/input ratio, tool trigger rate, efficient/wasteful session detection. New sidebar tab.
- **Data Export API**: `GET /api/export/sessions`, `/costs`, `/benchmark` with CSV and JSON format support for BI tool integration.
- **Multi-Agent Compare**: side-by-side session comparison (2-5 sessions) with bar chart visualization. New sidebar tab + `POST /api/replay/compare` API.
- **Alert Webhook**: configurable webhook for budget alerts and high-cost session notifications. Compatible with DingTalk, Feishu, Slack, generic webhooks. Config + history + test APIs.
- **Version infrastructure**: CHANGELOG.md, CalVer `YYYY.MM.DD` convention, release badge, CONTRIBUTING versioning docs.

[2026.03.25]: https://github.com/Ylsssq926/clawclip/compare/v0.1.0...2026.03.25

---

## [v0.1.0] — 2026-03-25

First stable release.

### Added
- Session Replay: interactive timeline visualization of AI Agent JSONL logs
- 6-Dimension Benchmark: writing, coding, tool use, retrieval, safety, cost efficiency (offline, no LLM API calls)
- Cost Monitor: token spend trends, model breakdown, budget alerts, insights & savings suggestions
- Smart Savings: alternative model recommendations powered by PriceToken real-time pricing
- Word Cloud & Tags: auto-extracted keywords, session auto-tagging
- Knowledge Base: import session JSON, full-text search, drag-and-drop upload, export
- Leaderboard: submit benchmark scores, anti-cheat validation (dimension avg check, rate limiting, IP nickname caps)
- Template Market: pre-built Agent scenario templates, one-click apply
- Skill Manager: install/uninstall OpenClaw skills with friendly error messages
- Evolution Curve: 8-point demo history (D to A growth story)
- Landing Page: blue-white theme, leaderboard showcase, evolution curve preview, responsive mobile layout
- CLI entry (`bin/clawclip.mjs`): auto-build on first run, `npm start` one-command launch
- Docker support: `Dockerfile` with `npm ci` + multi-stage build
- 7-language i18n: Chinese, English, Japanese, Korean, Spanish, French, German
- Browser language auto-detection for default locale
- Bilingual benchmark content (summary, details, dimension labels: zh + en)
- Bilingual backend error messages (zh/en)
- SEO meta tags (Open Graph, Twitter Card)
- 7-language README files with top-bar language switcher
- Bilingual CONTRIBUTING.md
- Incremental session parsing by file mtime (30s cache)
- Fuzzy model name matching for pricing (date suffix stripping, prefix matching)
- Multi tool-call support in session parser
- Unified logger with LOG_LEVEL env var
- Unified frontend API fetch layer (apiGet/apiPost/apiGetSafe)
- GitHub badges, comparison table, stats bar in README

### Security
- Leaderboard POST response strips internal `_ip` field
- Query parameter caps (analytics days≤365, limit≤500; replay limit≤200)
- Benchmark history capped at 100 entries
- Safe JSON.parse in error handling (parseApiErrorMessage)

[v0.1.0]: https://github.com/Ylsssq926/clawclip/releases/tag/v0.1.0
