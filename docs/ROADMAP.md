# ClawClip 产品路线图

> 最后更新：2026-04-05
> 当前版本：v1.0.0

## 产品定位

ClawClip（虾片）是面向 OpenClaw / ZeroClaw 的**本地 Agent 诊断台**。

核心价值三角：
- **运行洞察（Run Insights）**：把 Agent 日志变成可审查的证据链
- **Agent 成绩单（Agent Scorecard）**：启发式六维评分，量化运行质量
- **成本账单（Cost Report）**：追踪每一分钱的去向，给出省钱建议

### 我们是什么
- 本地运行的 Agent 运行诊断工具
- 启发式能力评分器（Heuristic Scorecard）
- 成本估算与优化建议器

### 我们不是什么
- 不是严格的 Benchmark 评测框架（没有标准测试集和 ground truth）
- 不是公开竞技场平台
- 不是模板交易市场
- 不是模型资讯站

### 兼容性声明
- 优先支持：OpenClaw / ZeroClaw JSONL 会话日志
- 逐步扩展：其他输出 JSONL 的 Agent 框架
- 暂不支持：SQLite / 数据库直接读取

## 路线图

### v1.0 — 工具成熟（当前）
- [x] 会话回放 + 审查能力（错误高亮、重试检测、高成本标记）
- [x] 六维启发式评分 + 可解释依据
- [x] 成本账单 + 模型拆分 + 预算配置 + 省钱建议
- [x] Prompt 效率分析
- [x] 版本对比（会话级）
- [x] 模板库 + 知识库
- [x] 7 语言 i18n
- [x] 浅色蓝白主题
- [x] Demo 模式完整体验

### v1.5 — 优化闭环（下一阶段）
- [ ] 优化实验：基线 vs 候选版本对比报告
- [ ] Replay + Scorecard + Cost 联动分析
- [ ] 建议动作 → 复测验证闭环
- [ ] CLI 增强（`clawclip scorecard --since=7d`）
- [ ] 更多 Agent 框架适配器

### v2.0 — 团队化（远期）
- [ ] 周报 / 月报自动生成
- [ ] 预算异常告警 + Webhook 通知
- [ ] GitHub Action 集成
- [ ] 团队共享报告
- [ ] 官方模板库扩充

## 术语对照

| 旧名称 | 新名称（中文） | 新名称（英文） |
|--------|---------------|---------------|
| Session Replay | 运行洞察 | Run Insights |
| 6D Benchmark | Agent 成绩单 | Agent Scorecard |
| Cost Monitor | 成本账单 | Cost Report |
| Smart Savings | 省钱顾问 | Cost Advisor |
| Prompt Insight | Prompt 效率 | Prompt Efficiency |
| Compare | 版本对比 | Version Compare |
| Template Market | 模板库 | Template Library |
