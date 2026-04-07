# ClawClip 兼容性说明

> 适用版本：`1.1.x`
>
> 这份文档只写**当前代码已经实现**的兼容边界，帮助你快速判断：能不能接、该怎么摆目录、遇到问题先看哪里。

## 一句话结论

ClawClip 当前的主兼容路径仍然是 **OpenClaw / ZeroClaw 的本地 JSONL 会话**。  
如果你的运行时也能落到类似目录，并产出接近 OpenClaw 风格的 JSONL，通常可以尝试接入；如果核心数据只在 SQLite / DB 里，当前还不支持直接读取。

## 优先支持哪些框架

| 来源 | 当前状态 | 说明 |
| --- | --- | --- |
| OpenClaw | 优先支持 | 以官方会话目录与 JSONL 转写结构为主路径 |
| ZeroClaw | 优先支持 | 优先兼容官方 / 导出后的 JSONL 会话结构 |
| Claw | 尝试扫描 | 默认会扫描 `~/.claw`，前提是目录里确实存在兼容的会话 JSONL |
| custom JSONL | 条件支持 | 不是“任意 JSONL 都行”；需要目录结构和事件形态落在当前解析器覆盖范围内 |

> 说得更直接一点：**优先保证 OpenClaw / ZeroClaw 体验，其他格式走 best-effort。**

## 默认会扫描哪些目录

ClawClip 会按下面的顺序探测**实际存在**的数据根：

1. `CLAWCLIP_LOBSTER_DIRS` 指定的额外目录
2. `OPENCLAW_STATE_DIR` 指向的目录
3. `~/.openclaw`
4. `~/.zeroclaw`
5. `~/.claw`

如果这些目录不存在，就不会强行报“兼容”。

## 支持哪些目录结构

当前自动扫描识别的是下面两类布局：

### 1) 标准代理目录

```text
<root>/agents/<agentId>/sessions/*.jsonl
```

这是当前最稳的接入方式，也是 OpenClaw / ZeroClaw 主路径。

### 2) 扁平 sessions 目录

```text
<root>/sessions/*.jsonl
```

这种情况下，ClawClip 会把它当成一个默认 agent 来源来展示。

### 3) `sessions.json` 元数据

```text
<root>/agents/<agentId>/sessions/sessions.json
```

`sessions.json` 会被当作**元数据补充**来读（比如展示名、更新时间、store 内 token 统计），**不会**被当成会话转写本身。

## 支持哪些环境变量与扩展名配置

| 变量 | 作用范围 | 当前行为 |
| --- | --- | --- |
| `OPENCLAW_STATE_DIR` | 会话发现 / 主数据根回退 | 覆盖默认 OpenClaw 状态目录；若目录存在，会参与扫描 |
| `CLAWCLIP_LOBSTER_DIRS` | 会话发现 | 追加额外数据根，支持用**逗号或分号**分隔多个路径 |
| `CLAWCLIP_SESSION_EXTENSIONS` | 会话文件识别 | 默认只认 `.jsonl`；可配置额外扩展名，支持**逗号或分号**分隔，缺少 `.` 会自动补上 |
| `CLAWCLIP_PRIMARY_LOBSTER_HOME` | 技能 / 模板写入目标 | 主要影响 skill / template 安装写到哪里，不改变解析器已经支持的格式边界 |
| `CLAWCLIP_STATE_DIR` | 虾片自身状态目录 | 用于预算、排行榜、导入会话等虾片内部状态，不是原始会话转写扫描根 |

## 当前解析器能读什么样的 JSONL

在 `1.1.x` 里，解析器已经覆盖这些常见形态：

- OpenClaw 当前的 `type: session / message / custom_message / tool_result ...` 风格转写
- 较旧或更直连的 Chat Completions 风格单行 JSON（顶层 `role/content`）
- 一条 assistant 消息里带多个 `tool_calls`
- `tool_result` / `function_call_output` 这类工具输出事件
- 带 `reasoning` / `thinking` / `reasoning_content` 的内容块
- 最多 20 行的 pretty-printed JSON 恢复

这并不等于“所有 JSONL 都支持”。如果你的导出结构和这些差异很大，ClawClip 可能只能发现文件，但无法把它解析成可回放步骤。

## 当前明确不支持什么

下面这些情况，当前请先不要按“已经兼容”来理解：

- **SQLite / `.db` / `.sqlite` 直接读取**
- 只有配置文件、没有实际 `.jsonl` 会话转写
- 只有 `sessions.json`，没有对应 transcript 文件
- 空文件、元数据文件、或格式不兼容的 `.jsonl`
- **超过 28 MB** 的单个会话文件（当前会跳过）
- 只把运行记录存在远端服务或私有二进制格式里的框架

## 如果你的数据接不上，最稳的排查顺序

1. 先确认数据根是否真的落在上面的扫描路径里
2. 确认目录结构是不是 `agents/<agent>/sessions/*.jsonl` 或扁平 `sessions/*.jsonl`
3. 确认文件扩展名是否仍是 `.jsonl`，或者你已经设置了 `CLAWCLIP_SESSION_EXTENSIONS`
4. 如果框架主要存 SQLite / DB，请先找它的 JSONL 导出能力，而不是期待 ClawClip 直接读库
5. 如果要提 issue，最好附一个**脱敏后的最小样例结构**，比一句“某框架不兼容”更有帮助

## 现在适不适合接入？

- 如果你在用 **OpenClaw / ZeroClaw**，而且会话已经落成 JSONL：**适合直接接**。
- 如果你在用 **Claw 或其他本地 runtime**，但也能导出到上述目录与 JSONL 形态：**可以尝试接，按 best-effort 看结果**。
- 如果你的数据现在主要在 **SQLite / DB**：**先别指望开箱即用**，当前最稳的路线仍然是先导出 / 同步成兼容 JSONL。
