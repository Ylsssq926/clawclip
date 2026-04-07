# Contributing

> [English](#contributing) | [中文](#参与贡献)

Thanks for helping improve ClawClip.

## Before You Start

- Use **Node.js 18+** and **npm 9+**.
- Install dependencies from the repo root: `npm install`
- Keep each PR focused. Small, reviewable changes beat bundled cleanup.
- If you touch **pricing, ratios, model names, provider claims, or compatibility statements**, include a source link or a clear **"verified as of YYYY-MM-DD"** note in the PR.
- If you change shared product copy across languages, update the relevant **README** and **i18n** content together when practical. If you intentionally leave some translations for follow-up, say so in the PR description.

## Local Development

```bash
npm run dev:server   # backend on http://localhost:8080
npm run dev:web      # Vite dev server on http://localhost:3000
npm run check        # type-check server + web
npm run build        # production build for both workspaces
npm start            # run the built app; first run auto-builds if dist is missing
```

## Minimum Checks Before Opening a PR

- Run `npm run check`
- If your change affects runtime behavior, build output, or the UI, also run `npm run build`
- For docs-only changes, verify commands, paths, and version wording against the current codebase

## What to Include in the PR Description

Please include:

- what changed
- why it changed
- how you verified it
- screenshots or recordings for visible UI changes
- any source links or dates for pricing / ratio / model-name changes
- a note about README / i18n updates, or what is intentionally deferred

## Versioning

- ClawClip uses **SemVer** (`1.1.0`, `1.1.1`, `1.2.0`)
- Do not switch docs or PR language back to the old CalVer wording
- Unless a maintainer asks for it, you usually do **not** need to bump versions, edit release tags, or write release notes in a contribution PR

## Release Notes

Release work is maintainer-facing, not the center of normal contribution flow. If your change should be called out in release notes, mention that briefly in the PR.

## Code of Conduct

Be respectful, direct, and constructive. Issues and PRs are welcome for product direction, parser coverage, compatibility, and documentation clarity.

---

# 参与贡献

感谢你帮助改进虾片（ClawClip）。

## 开始前准备

- 使用 **Node.js 18+** 与 **npm 9+**
- 在仓库根目录安装依赖：`npm install`
- 每个 PR 尽量聚焦一件事；小而清晰的改动比一锅端式“顺手整理”更容易合并
- 如果你改动了**价格、比例、模型名、厂商说法或兼容性描述**，请在 PR 中附上来源链接，或明确写出**“信息核实日期 / verified as of YYYY-MM-DD”**
- 如果你修改的是多语言共享文案，请尽量同步更新相关 **README** 与 **i18n** 内容；如果有些语言打算后补，也请在 PR 描述里写清楚

## 本地开发命令

```bash
npm run dev:server   # 后端，默认 http://localhost:8080
npm run dev:web      # 前端 Vite，默认 http://localhost:3000
npm run check        # server + web 类型检查
npm run build        # 两个 workspace 的生产构建
npm start            # 运行构建产物；若 dist 缺失会先自动构建
```

## 提交前最少检查

- 运行 `npm run check`
- 如果改动会影响运行行为、构建产物或界面，再额外运行 `npm run build`
- 如果是纯文档改动，也请按当前代码核对命令、路径和版本口径，避免文档先跑偏

## PR 描述建议包含什么

请至少写清楚：

- 改了什么
- 为什么改
- 你怎么验证的
- 若有可见界面变化，附截图或录屏
- 若涉及价格 / 比例 / 模型名，附来源链接或日期
- README / i18n 是否已同步，或哪些内容明确留待后续补齐

## 版本说明

- ClawClip 使用 **SemVer**（例如 `1.1.0`、`1.1.1`、`1.2.0`）
- 不要再把文档或 PR 口径写回旧的 CalVer
- 除非维护者明确要求，普通贡献 PR 通常**不需要**自己改版本号、发 tag 或写完整发布说明

## 发布说明

发布流程是维护者侧工作，不是贡献文档的主角。如果你的改动值得进 release notes，在 PR 里顺手标一下即可。

## 行为准则

保持尊重、直接、建设性。欢迎通过 Issue 或 PR 讨论产品方向、解析覆盖、兼容性与文档准确性。
