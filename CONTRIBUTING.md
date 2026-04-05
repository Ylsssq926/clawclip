# Contributing

> [English](#contributing) | [中文](#参与贡献)

Thank you for your interest in ClawClip!

## Before You Start

- Node.js ≥ 18
- Run `npm run check` (type-checks both server and web) before submitting
- If you changed build-related configs, also run `npm run build`

## Pull Requests

- Clearly describe the motivation and scope of your changes.
- If your PR touches **model names, pricing, or ratios** in README or code, please include your **verification source or "data as of" date** in the PR description.
- All PRs are **reviewed by a human maintainer** before merge (security, copy accuracy, roadmap consistency).

## Versioning & Releases

- Version scheme: **CalVer `YYYY.MM.DD`** (e.g. `2026.03.25`). Same-day patches use `.N` suffix (e.g. `2026.03.25.1`).
- `v0.1.0` is the initial baseline tag. All subsequent releases use CalVer.
- Each release: update `package.json` version, add entry to `CHANGELOG.md`, tag + push.
- See [CHANGELOG.md](CHANGELOG.md) for the full release history.

## Code of Conduct

Be friendly and constructive. Issues are welcome for product direction and compatibility discussions.

---

# 参与贡献

感谢你对虾片 (ClawClip) 的兴趣。

## 开发前

- Node.js ≥ 18
- 提交前在仓库根目录执行：`npm run check`
- 若改动前端构建相关，再执行：`npm run build`

## Pull Request

- 请写清楚动机与影响范围；涉及 README 中的**模型名、价格或比例**时，请在 PR 描述中附上**核实来源或「信息截至日期」**。
- 合入前由维护者进行**人工审查**（安全、文案与路线图一致性）。

## 版本与发布

- 版本号采用 **日期版本 `YYYY.MM.DD`**（如 `2026.03.25`），同日多版本用 `.N` 后缀（如 `2026.03.25.1`）。
- `v0.1.0` 是初始基线 tag，后续全部使用日期版本。
- 每次发版：更新 `package.json` version、在 `CHANGELOG.md` 顶部追加条目、打 tag 并推送。
- 完整发布记录见 [CHANGELOG.md](CHANGELOG.md)。

## 行为准则

保持友善与建设性；欢迎 issue 讨论产品方向与兼容性。

## 本地开发环境

### 环境要求
- Node.js ≥ 18
- npm ≥ 9

### 目录结构
```text
clawclip/
├── server/          # Express + TypeScript 后端
│   ├── routes/      # API 路由
│   ├── services/    # 核心服务（解析、评测、成本、分析）
│   ├── types/       # TypeScript 类型定义
│   └── dist/        # 编译产物
├── web/             # React 18 + Vite + Tailwind 前端
│   ├── src/pages/   # 页面组件
│   ├── src/components/ # 通用组件
│   ├── src/lib/     # 工具库（i18n、API、样式）
│   └── dist/        # 构建产物
├── templates/       # 内置模板
├── docs/            # 文档
└── bin/             # CLI 入口
```

### 开发命令
```bash
npm run dev:server   # 后端热重载（tsx watch）
npm run dev:web      # 前端开发服务器（Vite，端口 3000）
npm run check        # 双端类型检查
npm run build        # 生产构建
```

### 提交规范
- feat: 新功能
- fix: 修复
- docs: 文档
- chore: 构建/版本/配置
- refactor: 重构
