# ClawClip 产品路线图

> 最后更新：2026-04-07
> 当前版本：1.1.0

## 产品定位

ClawClip（虾片）是面向 OpenClaw / ZeroClaw 的**本地 Agent 诊断台**。

它围绕三条主线，帮助团队回答最实际的三个问题：
- **Run Insights**：这次运行到底发生了什么？
- **Agent Scorecard**：这次运行值不值得信任？
- **Cost Report**：这次运行的钱花得值不值？

### 我们是什么
- 本地运行的 Agent 诊断与复盘工具
- 以证据链为核心的 Run 审查台
- 启发式能力评分器（Heuristic Scorecard）
- 成本估算、对账与优化建议工具

### 我们不是什么
- 不是严格学术 Benchmark（没有标准测试集和 ground truth）
- 不是云端托管观测平台
- 不是公开竞技场平台
- 不是模型资讯站

## 现在已经能解决什么

### 1. 看清一次 Run
- 回放 JSONL 会话，定位错误、高成本步骤、重试与工具失败
- 通过 Replay 深链从列表、对比或报告快速跳到具体运行片段
- 把“这次跑坏了”变成“是哪一步、为什么、证据在哪”

### 2. 判断效果与价值
- 用 Agent Scorecard 做六维启发式评估，并给出可解释依据
- 通过模型价值矩阵把效果与成本放在同一视角判断
- 用效果护栏降低“成本降了，但质量也掉了”的误判风险

### 3. 证明优化是否真的成立
- 用 Version Compare 对照优化前后表现，而不是只看单次演示
- 让基线 vs 候选版本有可复核的前后证明
- 支持从回放、评分、成本三个视角做交叉复盘

### 4. 对账并筛出值得处理的成本问题
- 提供定价参考对比，帮助识别模型映射偏差与价格异常
- 支持成本对账与偏差筛选，优先暴露值得回放核查的高差异运行
- 把“感觉花多了”变成“哪批 run 偏差最大、是否值得处理”

## 当前阶段：v1.1（正式版增强）

现在的 ClawClip 已经是一个可以直接落地使用的本地 Agent 诊断台。重点不是替团队自动做决定，而是把运行证据、效果判断和成本复盘放进同一套工作流里，让 Agent 优化不再停留在感觉层面。

当前版本的重点特征：
- 主叙事统一为 **本地 Agent 诊断台**
- 产品结构围绕 **Run Insights / Agent Scorecard / Cost Report** 组织
- 已具备 Demo / Real 双模式，适合试跑演示和真实日志复盘
- 更适合单人或小团队做 prompt、model、tool 改动后的快速复核

## 下一阶段重点（1.2 – 1.5）

下一阶段不追求功能铺得更散，而是把诊断闭环做得更完整：
- 把 Replay、Scorecard、Cost Report 串成更顺手的优化闭环：发现问题 → 提出建议 → 变更方案 → 复测验证
- 强化“优化前后证明”，让基线与候选方案的差异更适合直接用于评审、复盘和汇报
- 提供更顺手的批量筛查与 CLI 入口，降低连续诊断多次 run 的成本
- 扩展更多 Agent 框架适配，但继续优先保证 OpenClaw / ZeroClaw 体验

## 更远阶段（2.x）

当单次 run 诊断足够稳定后，才会继续往团队化协作延伸：
- 周报 / 月报类汇总输出
- 预算异常提醒与 Webhook
- GitHub Action / pipeline 集成
- 团队共享报告与协作化视图

## 产品边界

ClawClip 会继续守住几个边界：
- **先本地、后平台**：核心仍是本地日志诊断，而不是先做成重型云平台
- **先证据、后结论**：优先展示可复核证据，不把启发式分数包装成绝对真相
- **先兼容 OpenClaw / ZeroClaw**：扩展其他框架可以做，但不牺牲主兼容路径
- **先诊断复盘、后自动化治理**：短期重心仍是帮助用户看清问题，而不是替用户全自动改系统

## 兼容性声明
- 优先支持：OpenClaw / ZeroClaw JSONL 会话日志
- 逐步扩展：其他输出 JSONL 的 Agent 框架
- 暂不支持：SQLite / 数据库直接读取

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
