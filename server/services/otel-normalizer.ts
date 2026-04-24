import type { OtelSpan, OtelResource, OtelKeyValue } from '../types/otel.js';
import type { SessionStep } from '../types/replay.js';

/** 从 OTEL 属性数组中提取指定 key 的值 */
function getAttr(attrs: OtelKeyValue[], key: string): string | number | boolean | undefined {
  const kv = attrs.find(a => a.key === key);
  if (!kv) return undefined;
  const v = kv.value;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.intValue !== undefined) return parseInt(v.intValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.boolValue !== undefined) return v.boolValue;
  return undefined;
}

/** 将 Unix nano 时间戳转换为 Date */
function nanoToDate(nano: string): Date {
  const ms = Math.floor(parseInt(nano, 10) / 1_000_000);
  return new Date(ms);
}

/** 计算两个 Unix nano 时间戳之间的毫秒差 */
function nanoDiffMs(startNano: string, endNano: string): number {
  const start = parseInt(startNano, 10);
  const end = parseInt(endNano, 10);
  return Math.floor((end - start) / 1_000_000);
}

/**
 * 将 OTEL span 转换为 ClawClip SessionStep
 * 
 * 映射规则：
 * - gen_ai.operation.name = "invoke_agent" → type: "response"
 * - gen_ai.operation.name = "execute_tool" → type: "tool_call"
 * - gen_ai.tool.name → toolName
 * - gen_ai.usage.input_tokens → inputTokens
 * - gen_ai.usage.output_tokens → outputTokens
 * - gen_ai.request.model → model
 * - status.code = 2 (ERROR) → isError: true
 * - startTimeUnixNano → timestamp
 * - endTimeUnixNano - startTimeUnixNano → durationMs
 * 
 * 兼容旧字段：
 * - gen_ai.system → 等同于 gen_ai.provider.name
 * - llm.model_name → 等同于 gen_ai.request.model
 */
export function normalizeOtelSpan(
  span: OtelSpan,
  _resource: OtelResource,
  index: number
): Partial<SessionStep> {
  const attrs = span.attributes;
  
  // 提取关键属性
  const operationName = getAttr(attrs, 'gen_ai.operation.name') as string | undefined;
  const toolName = getAttr(attrs, 'gen_ai.tool.name') as string | undefined;
  const model = (getAttr(attrs, 'gen_ai.request.model') || getAttr(attrs, 'llm.model_name')) as string | undefined;
  const inputTokens = (getAttr(attrs, 'gen_ai.usage.input_tokens') || 0) as number;
  const outputTokens = (getAttr(attrs, 'gen_ai.usage.output_tokens') || 0) as number;
  
  // 确定步骤类型
  let type: SessionStep['type'] = 'response';
  if (operationName === 'execute_tool' || toolName) {
    type = 'tool_call';
  } else if (operationName === 'invoke_agent' || operationName === 'chat') {
    type = 'response';
  } else if (span.name.toLowerCase().includes('tool')) {
    type = 'tool_call';
  }
  
  // 检查错误状态
  const isError = span.status?.code === 2;
  const error = isError ? span.status?.message : undefined;
  
  // 计算时间
  const timestamp = nanoToDate(span.startTimeUnixNano);
  const durationMs = nanoDiffMs(span.startTimeUnixNano, span.endTimeUnixNano);
  
  // 构建 SessionStep
  const step: Partial<SessionStep> = {
    index,
    timestamp,
    type,
    content: span.name,
    model,
    toolName,
    isError,
    error,
    inputTokens,
    outputTokens,
    cost: 0, // 需要后续根据 model 计算
    durationMs,
  };
  
  // 如果是 tool_call，尝试提取 input/output
  if (type === 'tool_call') {
    const toolInput = getAttr(attrs, 'gen_ai.tool.input') as string | undefined;
    const toolOutput = getAttr(attrs, 'gen_ai.tool.output') as string | undefined;
    if (toolInput) step.toolInput = toolInput;
    if (toolOutput) step.toolOutput = toolOutput;
  }
  
  // 提取 reasoning（如果有）
  const reasoning = getAttr(attrs, 'gen_ai.reasoning') as string | undefined;
  if (reasoning) {
    step.reasoning = reasoning;
  }
  
  return step;
}

/**
 * 从 OTEL resource 中提取服务名称
 */
export function extractServiceName(resource: OtelResource): string {
  const serviceName = getAttr(resource.attributes, 'service.name') as string | undefined;
  return serviceName || 'unknown-agent';
}
