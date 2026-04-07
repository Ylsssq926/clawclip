# ClawClip FAQ / 常见问题

> Applies to `v1.1.x` (including `v1.1.0`). Short answers for the questions that come up the most.
>
> 适用于 `v1.1.x`（含 `v1.1.0`）。这份 FAQ 只回答最常被重复提起的问题，不展开写成长说明书。

- Need exact format boundaries? See [COMPATIBILITY.md](./COMPATIBILITY.md)
- Need setup and self-hosting details? See [DEPLOYMENT.md](./DEPLOYMENT.md)

## Why do I only see Demo data? / 为什么我只看到 Demo 数据？

ClawClip shows built-in Demo data whenever it has not found real compatible local sessions yet. The public live demo is sample-only on purpose.

虾片在还没扫到兼容的真实本地会话时，会自动显示内置 Demo；公开演示站本来就是样例数据。

- If you want your own runs, use your local or self-hosted instance.
- The safest next step is: run a few tasks first, then point ClawClip at the folder that contains `agents/<agent>/sessions/*.jsonl` or `<root>/sessions/*.jsonl`.
- If it still stays on Demo, jump to **“Why does the page open but no sessions appear?”** below.

## How do I make ClawClip scan a custom log directory? / 怎么让 ClawClip 扫描自定义日志目录？

Point ClawClip at the **data root**, not at a single transcript file.

把路径指到**数据根目录**，不要只指向某一个 JSONL 文件。

```bash
OPENCLAW_STATE_DIR=/path/to/.openclaw
CLAWCLIP_LOBSTER_DIRS=/data/runs;/data/export
CLAWCLIP_SESSION_EXTENSIONS=.jsonl,.ndjson
```

- `OPENCLAW_STATE_DIR`: replace the default OpenClaw state root.
- `CLAWCLIP_LOBSTER_DIRS`: add one or more extra roots; use commas or semicolons to separate them.
- `CLAWCLIP_SESSION_EXTENSIONS`: only needed when your transcripts are not `.jsonl`.
- The safest layouts are `agents/<agent>/sessions/*.jsonl` or `<root>/sessions/*.jsonl`.
- In Docker, these paths must be **container paths**, not host paths.

## How much support do OpenClaw / ZeroClaw / Claw / custom JSONL actually get? / OpenClaw / ZeroClaw / Claw / custom JSONL 到底支持到什么程度？

Short version: **OpenClaw and ZeroClaw are the primary path. Claw and custom JSONL are best-effort, not blanket “everything works” support.**

短答就是：**OpenClaw 和 ZeroClaw 是主路径；Claw 和 custom JSONL 属于 best-effort，不是“任意格式都能接”。**

- Best supported: official OpenClaw / ZeroClaw-style local JSONL session layouts.
- ClawClip also scans `~/.claw` when compatible transcripts are present.
- The parser already covers common OpenClaw-style events, multi-`tool_calls`, `tool_result` / `function_call_output`, reasoning / thinking blocks, and some older chat-completions-style lines.
- Direct SQLite / `.db` / `.sqlite` reading is **not** supported yet.
- `sessions.json` can help with metadata, but it is **not** the transcript itself.
- If you need the exact boundary, read [COMPATIBILITY.md](./COMPATIBILITY.md).

## Will my data be uploaded? / 数据会不会上传出去？

By default, no. Session discovery, parsing, replay, and scorecard analysis run locally on your machine or your own deployment.

默认不会。会话发现、解析、回放和成绩单分析都在你的机器本地，或者你自己部署的实例里完成。

- ClawClip does **not** upload your agent run data by default.
- The optional network step is public pricing refresh; it updates pricing references only and does **not** send your session contents.
- If you self-host ClawClip, your data stays wherever **you** deploy it.

## When should I use Docker vs `npm start` vs dev mode? / Docker / `npm start` / dev 模式分别适合什么时候？

Use the smallest setup that matches what you are doing.

一句话：按用途选最小够用的方式。

- `npm start`: the fastest way to use ClawClip on your own machine or on a simple server.
- Docker / `docker compose up --build`: better when you want isolated deployment, clearer volume mounts, or easier server operations.
- `npm run dev:server` + `npm run dev:web`: only for people developing ClawClip itself.
- If you start only `dev:server`, opening `/` without a built frontend can show a backend message instead of the full app. That is expected.

For the fuller setup guide, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Why does the page open but no sessions appear? / 为什么页面开了但没有会话？

Most of the time, ClawClip is running fine — it just has not found compatible transcripts yet.

多数时候不是虾片坏了，而是它还没找到兼容的转写文件。

- Make sure you have actually run tasks and produced transcripts.
- Make sure the scan path points to the folder **above** `agents/<agent>/sessions`, not to one JSONL file.
- In Docker, confirm the host folder is mounted correctly and the env vars point to the **container** path.
- If the runtime stores sessions mainly in SQLite / DB, export or sync JSONL first.
- If your files use another extension, set `CLAWCLIP_SESSION_EXTENSIONS`.
- If you only have config files or `sessions.json`, that still does not count as a replayable transcript.

## Why isn’t the score a “standard benchmark score”? / 评分为什么不是“标准 benchmark 分数”？

Because ClawClip is not grading your agent against one universal test set. The Agent Scorecard is a **heuristic diagnostic** built from your own local run behavior.

因为虾片不是拿统一题库给你打分。Agent 成绩单本质上是基于你自己本地运行行为做的**启发式诊断**。

- Use it for before/after comparisons, iteration direction, and faster review.
- Do **not** treat it as vendor benchmark proof or a cross-team universal ranking.
- Demo-only scores and curves are illustrative; real sessions matter much more.

## Is pricing data real-time? / 价格数据是不是实时的？

Not in the strict “live billing dashboard” sense. ClawClip ships with a verified static fallback table, and it can refresh newer public pricing references when networking is enabled.

不是“账单后台那种严格实时”。虾片自带一份校验过的静态兜底价格表；如果开启联网，也可以刷新更新的公开价格参考。

- Use it to judge cost direction and whether an optimization was worth it.
- Do not use it as the final authority for arguing over a provider invoice line by line.
- Very new or oddly named models may temporarily fall back to an estimate until pricing mapping catches up.
