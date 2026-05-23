<!-- AUTO-GENERATED: do not edit directly. Source: F:/Azure Glance/.agent/rules/shared/05-workflow-and-governance.md -->

# 工作流、代码质量与规则治理

## Git 与多仓库边界

- 根目录是统筹仓库；`apps/*` 和 `luelan-portal/` 多数是独立子仓库。
- 修改哪个仓库，就在对应仓库内单独审查 `git status` 和 `git diff`。
- **每完成一个独立步骤就 commit**，让历史可追溯、可回滚；commit message 准确描述本步意图。
  - 独立步骤的判断标准：能用一句话说清"做了什么"且不与下一步耦合即可单独 commit。
  - 不要把多个不相关改动塞进同一个 commit。
  - 不要因为"还没完全做完"就拖延 commit；半成品也可以用 `wip:` 前缀提交，便于事后整理。
- 不自动 push，除非用户明确要求。
- 不执行破坏性命令，如 `git reset --hard`、`git clean -fd`、强制 push、批量删除。
- 重写 git 历史前（`reset --soft`、`rebase -i`、`filter-branch` 等）必须先 `git branch backup/<name> HEAD` 打备份。
- 根仓库忽略子项目目录是有意为之，避免跨仓误提交。

## 文件修改原则

- 修改已有文件前先读取原文件。
- 大文件优先局部替换，避免整体覆盖。
- 重做模块前先参考旧文件，不得先删后补。
- 整理合并文件时先完成新版，再清理旧文件。
- 用户已有改动不得还原，除非明确要求。

## 规则治理

- 共享公共规则 canonical：根 `.agent/rules/shared/`
- 根本地规则：根 `.agent/rules/workspace/`
- 私有运维层：根 `.agent/private/`
- 项目局部规则：各项目 `.claude/rules/project/`
- 子项目 `.claude/rules/shared/` 是 generated 副本，不得手工改成新源头。
- `.cursor/`、`.kiro/`、`.codebuddy/`、`.trae/`、`.github/copilot-instructions.md` 等都是适配层生成物，不得作为权威规则源。

## 编辑规则

- 修改公共规则：只改根 `.agent/rules/shared/`。
- 修改根工作区规则：只改根 `.agent/rules/workspace/`。
- 修改项目规则：只改目标项目 `.claude/rules/project/`。
- 修改后先运行 validate，再按需 sync。
- 不要在 generated shared 或 IDE 适配层里手改规则。

## 不作为权威规则源的目录

以下路径即使存在规则样式文件，也只当参考、历史、临时副本或第三方内容：

- `.deploy-tmp/`
- `.narrafork/`
- `**/_reference/`
- `**/backup/`
- `**/archived/`
- `**/node_modules/`
- `apps/_legacy-shells/`
- `apps/renpy-8.5.0-sdk/`
- `apps/renpy-8.5.0-sdk-clean/`
- 外部参考仓库 / 样板仓库 / 第三方子项目

## 清理与迁移原则

- 不得因为“看起来重复”就直接删规则。
- 每条旧规则都必须有去向：上收 shared / 留在 project / 移入 private / 归档 audit / 标记 legacy。
- 完成迁移前，不得一次性粗暴清空旧规则。
- 每个项目都应能通过自身 `CLAUDE.md` 被默认读取。
- 公共常量只保留一个 canonical 来源。
- 项目局部坑点只保留在对应项目的 project-local 中。

## 质量与验证

- 新脚本使用 TDD，先写失败测试，再实现。
- 规则同步默认 dry-run。
- 写入前后都要 validate。
- validate/sync 必须识别 Git 仓库边界。
- validate/sync 默认排除 Ren'Py 原目录与 clean worktree。
- sync 不碰 private、project-local、业务代码、`.env`、数据库、构建产物。
