<!-- AUTO-GENERATED: do not edit directly. Source: project local rules -->

# 项目本地规则

## 01-project-local

# ClawClip 本地规则

## 项目定位
- 项目：`apps/luelan-Clawclip/`
- 域名：`clawclip.luelan.online`
- 端口：`8080`
- PM2：`clawclip`
- 部署目录：`/opt/apps/services/clawclip/`
- 测试服务器：`43.133.60.168`（ZeroClaw）
- 结构：npm workspaces，核心目录为 `server/` + `web/`
- 目标用户：OpenClaw / ZeroClaw 等 AI Agent 框架用户

## 产品上下文
- 定位：AI Agent 回放可视化 + 能力评测 + 成本优化平台
- 功能路线：会话回放 → 评测跑分 → 智能省钱
- 当前探索：自动化剪辑与内容生产链路延展

## 本地流程规则
- 历史规则要求：开发任务默认走 GPT 子代理执行；主代理负责拆分、写 prompt、监工、验收
- 如需指定模型，优先沿用项目既有偏好：`gpt-5.4` 等高质量模型
- 单个执行任务尽量控制在 3-5 个文件以内
- 如果一个功能涉及多个模块，应拆成多个串行任务，而不是一个大包任务
- 同一个文件如果反复修改超过 3 轮，应停止追加试错，先复盘方向
- 不要做范围外的顺手优化
- 子代理 prompt 至少写清：任务目标、当前状态、要改哪些文件、不要改什么、完成标准、禁止事项

## 进度推进原则
- 先让关键链路跑通，再回头打磨细节
- 非阻塞问题先记录，不要让单点问题卡住整条链路
- 每完成数个子任务后，做一次整体检查，防止方向偏移

## 部署提示
- 服务目录：`/opt/apps/services/clawclip/`
- 常见线上更新链路：`git pull && npm ci && npm run build && pm2 restart clawclip`
- GitHub 仓库：`https://github.com/Ylsssq926/clawclip.git`
- License：`MIT`

## 关键检查
- 质量门禁：`npm run check`
- 与 OpenClaw 相关的大改前，对照官方文档中 session / environment 等相关章节

## 本项目特有风险
- `apps/luelan-Clawclip/_reference/` 只作参考，不是 canonical 规则来源
- 本项目的流程偏项目化，不应上收成所有项目的统一规则
