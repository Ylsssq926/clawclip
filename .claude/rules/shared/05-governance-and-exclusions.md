<!-- AUTO-GENERATED: do not edit directly. Source: .claude/rules/shared/05-governance-and-exclusions.md -->

# 规则治理、编辑边界与排除目录

## 唯一权威规则体系
- 共享公共规则：工作区根 `/.claude/rules/shared/`
- 项目局部规则：各项目根 `/.claude/rules/project/`
- `CLAUDE.md` 只作为入口索引，不再承载大量重复正文
- `.cursor/`、`.kiro/`、`.codebuddy/`、`.trae/`、`.github/copilot-instructions.md` 均视为**生成物**，不得手工改成新的权威来源

## 编辑规则
- 修改公共规则：只改工作区根 `/.claude/rules/shared/`
- 修改项目规则：只改目标项目根 `/.claude/rules/project/`
- 修改后统一运行同步脚本，刷新各 IDE 适配层
- 不要在生成物里手改规则；若发现生成物与规则源不一致，应回到 canonical 文件修

## 默认协作偏好
- 默认工作流：完成改动 → 自行验证 → commit → push
- 除非用户明确说“不要提交 / 不要推送 / 先别上线”，否则不要把 commit / push 作为反复确认事项
- 若仓库没有远端，则至少完成本地 commit，并在结果里明确说明未推送原因

## 不要当作权威规则源的目录
以下路径即使存在规则样式文件，也只当参考、历史、临时副本或第三方内容：
- `.deploy-tmp/`
- `**/cankao/`
- `**/_reference/`
- `**/backup/`
- `**/node_modules/`
- `apps/luelan-writing-pro/别人的kiro规则/`
- 外部参考仓库 / 样板仓库 / 第三方子项目

## 清理与迁移原则
- 不得因为“看起来重复”就直接删规则
- 每一条旧规则都必须有去向：
  - 上收为 shared
  - 留在 project
  - 明确标记为 legacy / reference / temp
- 完成迁移前，不得一次性粗暴清空旧规则

## 结果要求
- 每个项目都能通过自身目录下的规则入口文件被 IDE 默认读取
- 公共常量只保留一个 canonical 来源
- 项目局部坑点只保留在对应项目的 canonical 文件中