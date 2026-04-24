# ClawClip v2 迭代计划

## 版本目标
从"OpenClaw/ZeroClaw 专用工具"升级为"通用 Agent 日志分析平台"，优先适配 Hermes 和 LangGraph，补齐可靠性评测维度。

---

## P0 功能（必做，Q2 2026）

| 功能 | 实现路径 | 用户价值 | 工作量 |
|------|---------|---------|--------|
| **Hermes 适配** | 1. 新增 `HermesParser` 读 SQLite + JSONL<br>2. XML `<tool_call>` 解析器<br>3. 映射到统一 schema（session_id/role/content/tool_calls）<br>4. 复用现有 Insights/Scorecard 组件<br><br>**Hermes → ClawClip 字段映射**<br><table><tr><th>Hermes 字段</th><th>ClawClip 统一字段</th><th>备注</th></tr><tr><td>sessions.id</td><td>sessionId</td><td>直接映射</td></tr><tr><td>sessions.source</td><td>platform</td><td>cli/telegram/discord</td></tr><tr><td>sessions.model</td><td>model</td><td>直接映射</td></tr><tr><td>sessions.started_at</td><td>timestamp</td><td>Unix epoch → ISO 8601</td></tr><tr><td>messages.role</td><td>role</td><td>user/assistant/tool</td></tr><tr><td>messages.content</td><td>content</td><td>直接映射</td></tr><tr><td>messages.tool_calls</td><td>toolCalls</td><td>JSON 字符串需反序列化</td></tr><tr><td>sessions.input_tokens</td><td>inputTokens</td><td>直接映射</td></tr><tr><td>sessions.output_tokens</td><td>outputTokens</td><td>直接映射</td></tr></table><br>**XML tool_call 解析示例**<br>`extractToolCalls(xml) => parseXML(/<tool_call>(.*?)<\/tool_call>/g).map(JSON.parse)`<br><br>**已知版本兼容问题**<br>- Hermes v0.5.0+ 新增 `reasoning` 字段（需兼容旧版无此字段）<br>- SQLite schema v6 新增 `cache_read_tokens` 等计费字段（v5 及以下需默认值 0） | NousResearch 用户量大，Hermes 是主流开源 agent 框架，适配后用户基数翻倍 | 5-8 天 |
| **可靠性维度评测** | 1. 新增 `ReliabilityScorer`<br>2. 指标：一致性（同任务多次运行的结果方差）、故障恢复率（工具失败后是否重试成功）<br>3. 在 Scorecard 页面新增第七维度卡片<br><br>**数据依据**（基于调研）：<br>- 主流 Agent 评测框架（GAIA、SWE-bench、ReliabilityBench）已将可靠性作为核心维度<br>- 当前六维缺失的具体问题：没有衡量"同一任务跑 5 次结果是否一致"的指标<br>- 研究发现：单次运行成功率 60% 的 agent，8 次运行一致性仅 25%（arXiv:2511.14136）<br>- 具体计算方式：**一致性分数 = 相同结果次数 / 总运行次数**<br>- 示例：同一任务跑 5 次，3 次成功 2 次失败 → 一致性 60%（3/5）<br>- 参考标准：Princeton HAL Reliability Dashboard 定义的 Consistency Metrics | 当前六维缺少"稳定性"视角，用户反馈需要知道 agent 是否"靠谱" | 3-5 天 |
| **版本感知解析** | 1. 在 parser 层检测 `_version` 字段<br>2. 维护 schema 映射表（OpenClaw v2026.4.1 → 新字段 `context_tokens`）<br>3. 解析失败时显示版本不兼容警告 | 避免用户升级 OpenClaw/ZeroClaw 后 ClawClip 报错，减少 support 成本 | 2-3 天 |

**P0 总工作量：10-16 天**

---

## P1 功能（重要，Q3 2026）

| 功能 | 实现路径 | 用户价值 | 工作量 |
|------|---------|---------|--------|
| **LangGraph 适配** | 1. 通过 OpenTelemetry 接收 LangGraph trace<br>2. 解析 run/span 嵌套结构，映射到统一 schema<br>3. 支持子图可视化（节点 → 工具调用链）<br>4. 复用现有 Insights/Scorecard/Cost 组件 | LangGraph 用户需要 LangSmith 的开源替代方案，ClawClip 本地离线的定位正好填补这个空白；90M+ 月下载量，是目前最大的潜在用户群 | 8-12 天 |
| **成本异常检测** | 1. 新增 `CostAnomalyDetector`<br>2. 规则：轻任务（<5 轮对话）用了贵模型（GPT-4/Claude Opus）<br>3. 上下文膨胀检测（单轮 tokens > 10k）<br>4. 在 Cost Report 页面高亮异常项 | 用户最关心"钱花哪了"，自动标出浪费点比纯数字有用 | 5-7 天 |
| **批处理机会识别** | 1. 分析 session log 中的独立任务（无依赖关系）<br>2. 标记可并行执行的任务组<br>3. 估算批处理节省的成本（Batch API 价格 50% off） | OpenAI/Anthropic 都推批处理，但用户不知道哪些任务适合，这个功能直接给建议 | 4-5 天 |
| **一致性追踪** | 1. 新增"多次运行对比"功能<br>2. 用户上传同一任务的多个 session log<br>3. 对比最终结果、中间步骤、token 消耗<br>4. 计算一致性分数（结果相同率） | 用户测试 agent 时经常跑多次，手动对比太累，自动化能省大量时间 | 5-7 天 |

**P1 总工作量：22-31 天**

---

## P2 功能（有空再做，Q4 2026）

| 功能 | 实现路径 | 用户价值 | 工作量 |
|------|---------|---------|--------|
| **CrewAI 适配** | 通过 OpenTelemetry 接收 CrewAI trace，解析 task/agent/tool 层级结构 | CrewAI 社区大，但主要用于原型开发，生产环境采用率低于 LangGraph | 5-7 天 |
| **AutoGen 适配** | 解析 Python logging 事件 + Pydantic state JSON | AutoGen 用户多为研究者，付费意愿低 | 待估 |
| **提示词缓存分析** | 检测哪些 prompt 适合缓存（重复率高、长度 > 1k tokens） | Anthropic Prompt Caching 能省 90% 成本，但需要用户主动改代码 | 待估 |
| **故障传播可视化** | DAG 图展示工具调用链，标记失败节点如何影响后续步骤 | 调试价值高，但实现复杂（需要图渲染库） | 待估 |
| **SWE-bench 集成** | 导入 SWE-bench 任务，自动跑 agent 并生成 Scorecard | 学术用户需要，但商业用户不关心 | 待估 |

---

## 技术债

| 问题 | 现状 | 解决方案 | 优先级 |
|------|------|---------|--------|
| **Parser 层耦合** | 每个 parser 都重复写 token 统计、时间解析逻辑 | 抽象 `BaseParser` 基类，统一处理通用字段 | P0 |
| **测试覆盖率低** | 只有 `OpenClawParser` 有单测 | 为每个新 parser 补充单测（至少覆盖正常/异常/版本不兼容三种场景） | P1 |
| **前端状态管理混乱** | Scorecard 和 Cost Report 共享状态但没用状态管理库 | 引入 Zustand 或 Jotai（轻量级） | P1 |
| **文档过时** | README 还是 v1 的截图 | 每次发版前更新 README + 录屏 demo | P2 |

---

## 不做的事

| 功能 | 原因 |
|------|------|
| **OpenAI Assistants API 适配** | API 将在 2026 H1 sunset，投入产出比低 |
| **IDE 工具适配（Cursor/Cline/Windsurf）** | 这些 IDE 本身有内置计价和统计，用户用它们是为了写代码，不是跑 Agent 任务。日志格式是 IDE 内部格式，不是 Agent 运行日志，适配没有意义。 |
| **云端部署版本** | 核心差异化是"本地离线"，做云端会丢失这个优势，且需要处理数据隐私问题 |
| **实时监控** | ClawClip 定位是"事后分析"，实时监控需要 agent 主动推送数据，改动太大 |
| **Agent 代码生成** | 不做"根据 Scorecard 自动优化 agent 代码"，这是另一个产品的范畴 |

---

## 里程碑

- **2026.5.15**：P0 功能完成，发布 v2.0-beta
- **2026.7.31**：P1 功能完成 3 个以上，发布 v2.0
- **2026.10.31**：P1 剩余功能 + 部分 P2，发布 v2.1

---

## 风险

1. **Hermes schema 变更**：NousResearch 更新频繁，需要订阅他们的 changelog
2. **LangGraph trace 兼容性**：OpenTelemetry span attribute 允许业务侧自定义，需要兼容不同 run/span 嵌套深度和字段缺省
3. **用户需求分散**：适配太多框架会导致维护成本爆炸，需要根据用户反馈动态调整优先级

---

## 成功指标

- **用户增长**：v2.0 发布后 3 个月内，GitHub star 从当前基数增长 3x
- **适配覆盖**：支持至少 3 个主流 agent 框架（OpenClaw/ZeroClaw/Hermes/LangGraph 四选三）
- **功能完整度**：可靠性维度评测上线后，用户反馈"更全面"的比例 > 70%
