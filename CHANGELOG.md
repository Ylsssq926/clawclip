# Changelog

All notable changes to ClawClip will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Public release versioning now follows SemVer (`MAJOR.MINOR.PATCH`).
Date-based releases below are retained as historical milestones from the pre-1.0 period.

---

## [1.2.0] — 2026-04-10

This release straightens ClawClip into a clearer optimization path: replay what happened, benchmark the outcome, then move into cost decisions. It also makes the first screens calmer, the wording sharper, and the multilingual experience more complete across the app and GitHub docs.

### Changed
- Reworked the in-app flow around Replay → Benchmark → Cost so the full loop now connects end to end.
- Rebuilt the Benchmark first screen to put the conclusion first, keep evidence immediately behind it, and add direct next-step actions into Cost or Replay.
- Simplified the visual system by removing color-coded page identities and converging on a tighter blue + risk + neutral palette.
- Streamlined the first screens of Prompt Insight, Knowledge, Template Market, and Leaderboard to reduce noise and make the main action clearer.
- Restored conversational playback in Replay so session review feels like following the actual dialogue again.

### Improved
- Rewrote core product messaging to emphasize the main promise more clearly: spend less, get stronger outcomes, and compare versions with confidence.
- Removed 150 obsolete copy keys and unified brand presence across the product.
- Completed in-product localization across 7 languages.

### Documentation
- Synchronized the GitHub README across 5 languages and refreshed the FAQ for multilingual readers.

[1.2.0]: https://github.com/Ylsssq926/clawclip/compare/1.1.0...1.2.0

## [1.1.0] — 2026-04-07

### Added
- Added reference pricing comparison in Cost Report so actual spend can be checked against a pricing baseline.
- Added a model value matrix that shows quality and spend together.
- Added replay deep links that open the related context directly from review views.
- Added filters for billed cost, reference cost, and cost variance.

### Changed
- Updated cost review wording and layout so savings and scorecard signals are easier to read.
- Updated Version Compare to show baseline vs candidate runs more clearly.

### Clarified
- Standardized public release numbering on SemVer for the `1.x` line.
- Kept older CalVer entries below as historical records.
- Preserved earlier product names in historical entries where needed for accuracy.

[1.1.0]: https://github.com/Ylsssq926/clawclip/compare/1.0.0...1.1.0

## [1.0.0] — 2026-04-05

### Changed
- Renamed the product around three main views: Run Insights, Agent Scorecard, and Cost Report.
- Unified terminology across 7 languages.
- Rewrote 7 README files and documented how the heuristic scorecard is read.
- Added `docs/ROADMAP.md` with the current three-phase plan.
- Updated the landing page hero to a dual-column layout with an animated SVG radar chart.
- Reordered the landing page feature sections to match the main product flow.
- Unified pricing source display across the product.

### Added
- Added per-dimension explanations to Agent Scorecard.
- Added model breakdown, budget configuration, and daily average line to Cost Report.
- Added error highlighting, high-cost markers, and tool failure detection to Run Insights.
- Added prompt efficiency charts and auto-suggestions.
- Added side-by-side version comparison with cost bars and generated conclusions.
- Added a dashboard data ingestion panel with setup guidance.
- Added a site-wide Demo/Real data indicator.

[1.0.0]: https://github.com/Ylsssq926/clawclip/compare/2026.04.05...1.0.0

---

## Historical milestones before 1.0

Date-based versions below are preserved as historical records from before the stable release line.

## [2026.04.05] — 2026-04-05

### Added
- Enabled Cost Monitor, Prompt Insight, and Benchmark in Demo mode with sample data.
- Added click-through navigation from landing feature cards to pages, Dashboard sessions to Replay, and word cloud keywords to Knowledge search.
- Persisted template install state in `localStorage` and added expandable template previews.
- Added session count display and recommended search tags in Knowledge.
- Replaced manual session ID input with a selector in Compare.

### Changed
- Unified alert and warning text colors in the light theme across 8 pages.
- Changed Benchmark Demo to evaluate Demo sessions instead of using hardcoded results.
- Added Demo-session fallback data for cost trend, model breakdown, and savings suggestions.
- Added Demo-session fallback to Prompt Analyzer when real data is unavailable.
- Rewrote the ja/ko/es/fr/de README files to match the updated en/zh structure.

[2026.04.05]: https://github.com/Ylsssq926/clawclip/compare/2026.03.29...2026.04.05

## [2026.03.29] — 2026-03-29

### Added
- Added parse diagnostics API (`GET /api/replay/diagnostics`) and a Dashboard warning banner for sessions with parsing issues.
- Added recovery for pretty-printed multi-line JSON blocks up to 20 lines in the session parser.
- Added diagnostics for files over the 28 MB limit.
- Added a globe icon to the language switcher.
- Added missing `.glass-raised` utility class.

### Changed
- Switched the site from the dark theme to a light blue-white theme.
- Unified brand colors around `#3b82c4` across Tailwind tokens and component defaults.
- Improved word cloud density, font range, and fill rate.
- Expanded Demo data to 6 model types over a 7-day span and updated sample tool calls and translator steps.
- Extended `SessionStep` with `toolCallId`, `error`, `isError`, and `reasoning`, and split assistant text and `tool_calls` into separate steps.
- Updated the landing-to-AppShell background transition.
- Improved language detection using `navigator.languages` with timezone fallback.
- Rewrote the README and updated badges and setup instructions.

### Fixed
- Fixed missing `card` base class on `card-blue` elements in TemplateMarket.
- Fixed landing hero title overlap on Chinese fonts by adjusting line height.
- Improved light theme text contrast by replacing `text-slate-400` with `text-slate-500` across 6 pages.
- Fixed ShimmerButton secondary variant text color on light backgrounds.
- Fixed LanguageSwitcher shell variant styling in the light header.

[2026.03.29]: https://github.com/Ylsssq926/clawclip/compare/2026.03.25.1...2026.03.29

## [2026.03.25.1] — 2026-03-25

### Changed
- Improved landing page interactions and runtime error handling.
- Improved real-data compatibility with better CLI detection and fallbacks.
- Updated deployment documentation in `docs/DEPLOYMENT.md`.
- Improved validation and error messages for the skills and templates routes.
- Expanded the status API with more detailed system information.

[2026.03.25.1]: https://github.com/Ylsssq926/clawclip/compare/2026.03.25...2026.03.25.1

---

## [2026.03.25] — 2026-03-25

### Added
- Added a replay insights panel with step-linked findings for thinking waste, tool retry loops, model mixing, long sessions, cost concentration, tool success rate, and token efficiency.
- Added the Prompt Insight page for cross-session prompt metrics, output/input ratio, tool trigger rate, and efficient or wasteful session detection.
- Added export APIs for sessions, costs, and benchmark data: `GET /api/export/sessions`, `GET /api/export/costs`, and `GET /api/export/benchmark`, with CSV and JSON support.
- Added side-by-side comparison for 2-5 sessions with bar charts and `POST /api/replay/compare`.
- Added configurable webhook alerts for budget alerts and high-cost sessions, compatible with DingTalk, Feishu, Slack, and generic webhooks.
- Added versioning infrastructure: `CHANGELOG.md`, CalVer `YYYY.MM.DD`, release badge, and versioning docs in CONTRIBUTING.

[2026.03.25]: https://github.com/Ylsssq926/clawclip/compare/v0.1.0...2026.03.25

---

## [0.1.0] — 2026-03-25

Early public baseline before the `1.x` stable release line.

### Added
- Added interactive Session Replay for AI Agent JSONL logs.
- Added a 6-dimension benchmark covering writing, coding, tool use, retrieval, safety, and cost efficiency.
- Added Cost Monitor for token spend trends, model breakdown, budget alerts, and savings suggestions.
- Added Smart Savings model recommendations using PriceToken pricing.
- Added keyword extraction, word cloud, and automatic session tagging.
- Added Knowledge Base with session JSON import, full-text search, drag-and-drop upload, and export.
- Added a leaderboard with submission validation, rate limiting, and duplicate controls.
- Added Template Market with one-click apply.
- Added Skill Manager for installing and uninstalling OpenClaw skills.
- Added an 8-point demo evolution curve.
- Added a landing page with responsive mobile layout.
- Added CLI entry (`bin/clawclip.mjs`) that auto-builds on first run and supports `npm start`.
- Added Docker support with a multi-stage `Dockerfile`.
- Added 7-language i18n: Chinese, English, Japanese, Korean, Spanish, French, and German.
- Added browser language auto-detection for the default locale.
- Added bilingual benchmark content.
- Added bilingual backend error messages.
- Added SEO meta tags for Open Graph and Twitter Card.
- Added 7-language README files with top-bar language links.
- Added bilingual `CONTRIBUTING.md`.
- Added incremental session parsing by file mtime with a 30-second cache.
- Added fuzzy model name matching for pricing.
- Added multi tool-call support in the session parser.
- Added a unified logger with `LOG_LEVEL`.
- Added a unified frontend API fetch layer (`apiGet`, `apiPost`, `apiGetSafe`).
- Added GitHub badges, comparison table, and project stats to the README.

### Security
- POST responses from the leaderboard strip the internal `_ip` field.
- Added query parameter caps (analytics days <= 365, limit <= 500, replay limit <= 200).
- Capped benchmark history at 100 entries.
- Added safe `JSON.parse` handling in `parseApiErrorMessage`.

[0.1.0]: https://github.com/Ylsssq926/clawclip/releases/tag/v0.1.0
