# OTLP/HTTP Trace Receiver

ClawClip 实现了一个最小化的 OTLP/HTTP trace 接收器，用于接收来自 LangGraph、AutoGen 等框架的 OpenTelemetry trace 数据。

## 架构

```
LangGraph/AutoGen (OTEL SDK)
    ↓ OTLP/HTTP JSON
ClawClip Server (/api/otel/v1/traces)
    ↓ normalizeOtelSpan()
SessionReplay (内存存储)
    ↓
前端展示 (与 JSONL 会话统一)
```

## API 端点

### POST /api/otel/v1/traces
接收 OTLP JSON 格式的 trace 数据。

**请求体示例：**
```json
{
  "resourceSpans": [{
    "resource": {
      "attributes": [
        {"key": "service.name", "value": {"stringValue": "my-agent"}}
      ]
    },
    "scopeSpans": [{
      "spans": [{
        "traceId": "abc123",
        "spanId": "def456",
        "name": "invoke_agent",
        "startTimeUnixNano": "1000000000000000",
        "endTimeUnixNano": "1000000500000000",
        "status": {"code": 1},
        "attributes": [
          {"key": "gen_ai.operation.name", "value": {"stringValue": "invoke_agent"}},
          {"key": "gen_ai.request.model", "value": {"stringValue": "gpt-4o"}},
          {"key": "gen_ai.usage.input_tokens", "value": {"intValue": "100"}},
          {"key": "gen_ai.usage.output_tokens", "value": {"intValue": "50"}}
        ]
      }]
    }]
  }]
}
```

**响应：**
```json
{
  "success": true,
  "receivedSpans": 1,
  "activeSessions": 1
}
```

### GET /api/otel/sessions
获取从 OTEL 接收的会话列表。

### GET /api/otel/sessions/:traceId
获取单个 trace 的完整回放数据。

### DELETE /api/otel/sessions/:traceId
删除指定的 trace。

### DELETE /api/otel/sessions
清空所有 OTEL traces。

## 字段映射

| OTEL 字段 | ClawClip SessionStep 字段 | 说明 |
|-----------|---------------------------|------|
| `gen_ai.operation.name = "invoke_agent"` | `type: "response"` | Agent 调用 |
| `gen_ai.operation.name = "execute_tool"` | `type: "tool_call"` | 工具调用 |
| `gen_ai.tool.name` | `toolName` | 工具名称 |
| `gen_ai.usage.input_tokens` | `inputTokens` | 输入 token 数 |
| `gen_ai.usage.output_tokens` | `outputTokens` | 输出 token 数 |
| `gen_ai.request.model` | `model` | 模型名称 |
| `status.code = 2` | `isError: true` | 错误状态 |
| `startTimeUnixNano` | `timestamp` | 开始时间 |
| `endTimeUnixNano - startTimeUnixNano` | `durationMs` | 持续时间 |

### 兼容旧字段

- `gen_ai.system` → 等同于 `gen_ai.provider.name`
- `llm.model_name` → 等同于 `gen_ai.request.model`

## 集成示例

### LangGraph

```bash
pip install langsmith[otel]
export LANGSMITH_OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:8080/api/otel/v1/traces
export OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/json
```

### AutoGen

```python
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(
    SimpleSpanProcessor(
        OTLPSpanExporter(
            endpoint="http://localhost:8080/api/otel/v1/traces"
        )
    )
)

# 使用 provider 初始化 AutoGen
```

## 实现细节

### 类型定义
- `types/otel.ts` - OTLP JSON 格式类型定义

### 核心服务
- `services/otel-normalizer.ts` - OTEL span → SessionStep 转换逻辑

### 路由
- `routes/otel.ts` - OTLP 接收器 HTTP 端点

### 存储
- 内存存储：`Map<traceId, SessionReplay>`
- 按 traceId 分组 spans
- 自动更新会话元数据（时长、token、成本等）

## 测试

```bash
npm test --workspace=server -- otel-normalizer
```

## 限制

1. **内存存储**：当前实现使用内存存储，服务重启后数据丢失
2. **无持久化**：未实现到 JSONL 的持久化
3. **基础成本计算**：需要后续根据 model 计算实际成本
4. **无 span 关联**：未实现 parent-child span 关系的可视化

## 未来改进

- [ ] 持久化到 JSONL
- [ ] 根据 model 计算实际成本
- [ ] 支持 span 层级关系可视化
- [ ] 支持 OTLP/gRPC 协议
- [ ] 支持批量导出
