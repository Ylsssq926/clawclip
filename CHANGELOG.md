# Changelog

All notable changes to ClawClip will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Public release versioning now follows SemVer (`MAJOR.MINOR.PATCH`).
Date-based releases below are retained as historical milestones from the pre-1.0 product-shaping period.

---

## [1.1.0] — 2026-04-07

### Stable Release Enhancement
- **Pricing reference comparison**: Cost review now puts actual spend next to a reference pricing baseline, making pricing mismatches, mapping drift, and unexpectedly expensive runs easier to spot.
- **Model value matrix**: Quality and spend can be judged together, so teams can see whether a more expensive model is actually buying better outcomes.
- **Outcome guardrails**: Savings and scorecard signals are framed more clearly as guardrails, helping teams distinguish low-risk optimizations from changes that deserve a cautious rollout.
- **Before/after proof**: Version comparison is presented more explicitly as baseline vs candidate evidence, so optimization work can be defended with visible improvement instead of anecdotes.
- **Replay deep links**: Investigation flows can jump directly into the relevant replay context, shortening the path from “this run looks wrong” to the exact step worth reviewing.
- **Cost reconciliation and variance filters**: Cost review makes it easier to isolate runs whose billed cost, reference cost, or variance deserves follow-up.

### Clarified
- Public release numbering is unified on SemVer for the `1.x` line.
- Older CalVer entries are preserved below for traceability, not as competing definitions of the stable release.
- Historical entries may still reference earlier working names such as Session Replay, Benchmark, and Cost Monitor where needed for accuracy.

[1.1.0]: https://github.com/Ylsssq926/clawclip/compare/1.0.0...1.1.0

## [1.0.0] — 2026-04-05

### First Stable Release

ClawClip v1.0 established the product as a mature local Agent diagnostic console.

#### Product Identity
- Repositioned as Local Agent Diagnostic Console: Run Insights + Agent Scorecard + Cost Report
- Terminology unified across 7 languages
- 7 README files rewritten with Heuristic Scorecard methodology disclosure
- Created docs/ROADMAP.md with 3-phase plan

#### Landing & Brand
- Dual-column hero with animated SVG radar chart
- Features reordered: Run Insights > Agent Scorecard > Cost Report

#### Core Capabilities
- Agent Scorecard: evidence-based scoring with per-dimension explanations
- Cost Report: model breakdown chart, budget config UI, daily average line
- Run Insights: replay with error highlighting, high-cost markers, tool failure detection
- Prompt Efficiency: length histogram, efficient/wasteful comparison, auto-suggestions
- Version Compare: cost bar chart, auto-generated conclusions

#### Data Trust
- Dashboard data ingestion panel with setup guide
- Site-wide Demo/Real data indicator
- Unified pricing source with transparency

[1.0.0]: https://github.com/Ylsssq926/clawclip/compare/2026.04.05...1.0.0

---

## Historical milestones before 1.0

Date-based versions below are preserved for traceability during the transition into the stable release line.

## [2026.04.05] — 2026-04-05

### Added
- **Demo Experience Overhaul**: Cost monitor, Prompt Insight, and Benchmark now fully functional in Demo mode with meaningful data
- **Navigation Flow**: Landing feature cards click-through to corresponding pages; Dashboard sessions link to Replay; word cloud keywords link to Knowledge search
- **Template Persistence**: Template install state persisted via localStorage; template detail preview with expand/collapse
- **Knowledge UX**: Session count display, recommended search tags (React, 小红书, Notion, Python, Kubernetes)
- **Compare UX**: Session selector dropdown replaces manual ID input

### Improved
- **Light Theme Polish**: Alert/warning text colors unified (text-red-300→600, text-amber-200→700) across 8 pages
- **Benchmark Demo**: Now runs real evaluation on Demo sessions instead of hardcoded results (73/B score)
- **Cost Demo Fallback**: Demo sessions feed cost trend (7 days), model breakdown (6 models), and savings suggestions
- **Prompt Analyzer**: Falls back to Demo sessions when no real data available
- **5-Language README**: ja/ko/es/fr/de READMEs rewritten to match narrative style of en/zh versions

[2026.04.05]: https://github.com/Ylsssq926/clawclip/compare/2026.03.29...2026.04.05

## [2026.03.29] — 2026-03-29

### Added
- **Light Theme**: Full site redesign from dark to light blue-white theme, matching Landing page style
- **Parse Diagnostics**: JSONL parse diagnostics API (`GET /api/replay/diagnostics`) + Dashboard warning banner for sessions with parsing issues
- **Multi-line JSON Recovery**: Session parser now recovers pretty-printed JSON across up to 20 lines
- **Large File Diagnostics**: Files exceeding 28MB limit are logged and exposed via diagnostics API

### Improved
- **Brand Color Unification**: All colors converged to brand blue `#3b82c4` — Tailwind tokens, component defaults (GlowCard/GradientText/ShimmerButton), Benchmark page
- **Word Cloud**: Denser spiral layout, larger font range, significantly better fill rate
- **Demo Data**: 6 model types (added Claude, Gemini), 7-day time span, new shell/file_write tool calls, translator session expanded to 8 steps
- **Session Parser**: SessionStep extended with `toolCallId`, `error`, `isError`, `reasoning` fields; assistant text+tool_calls now split into separate steps
- **Landing → AppShell Transition**: Gradient background transition from light to dark at page bottom
- **Language Detection**: `navigator.languages` traversal + timezone-based fallback (Asia/Shanghai → zh)
- **Language Switcher**: Added 🌐 globe icon
- **README**: Narrative rewrite with problem storytelling, flat-square badges, 30-second setup
- **glass-raised CSS**: Added missing `.glass-raised` utility class
- **TemplateMarket**: Fixed missing `card` base class on `card-blue` elements

### Fixed
- Landing hero title overlap on Chinese fonts (`leading-[1.1]` → `leading-tight`)
- Light theme text readability: `text-slate-400` → `text-slate-500` across 6 pages
- ShimmerButton secondary variant text color for light backgrounds
- LanguageSwitcher shell variant styling for light header

[2026.03.29]: https://github.com/Ylsssq926/clawclip/compare/2026.03.25.1...2026.03.29

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

## [0.1.0] — 2026-03-25

Early public baseline before the `1.x` stable release line.

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

[0.1.0]: https://github.com/Ylsssq926/clawclip/releases/tag/v0.1.0
