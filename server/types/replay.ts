import type { CostMeta } from './index.js';

export interface SessionMeta {
  id: string;
  agentName: string;
  /** 数据根标识：openclaw / zeroclaw / env-0 / demo 等，便于多框架并存时区分 */
  dataSource?: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  totalCost: number;
  totalTokens: number;
  modelUsed: string[];
  stepCount: number;
  summary: string;
  /** OpenClaw sessions.json 匹配到的展示名 */
  sessionLabel?: string;
  /** 如 agent:main:telegram:... */
  sessionKey?: string;
  /** sessions.json 的 updatedAt（ms），用于列表排序贴近 Gateway */
  storeUpdatedAt?: number;
  /** sessions.json：Gateway 侧估算的上下文 token */
  storeContextTokens?: number;
  /** sessions.json：store 内统计的总 token（若有） */
  storeTotalTokens?: number;
  /** sessions.json：模型或 modelOverride */
  storeModel?: string;
  /** 通道/表面：lastChannel、channel、origin 等 */
  storeChannel?: string;
  /** 提供方：origin.provider 等 */
  storeProvider?: string;
  costMeta?: CostMeta;
  parseDiagnostics?: {
    totalLines: number;
    parsedLines: number;
    skippedLines: number;
    errorSamples?: string[];
    multilineRecovered?: number;
  };
}

export interface SessionStep {
  index: number;
  timestamp: Date;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'response' | 'user' | 'system';
  content: string;
  model?: string;
  toolName?: string;
  toolInput?: string;
  toolOutput?: string;
  /** tool call 的唯一标识，用于关联 tool_call 和 tool_result */
  toolCallId?: string;
  /** OTEL span 的唯一标识，用于幂等去重 */
  spanId?: string;
  /** 错误信息（如果这一步失败了） */
  error?: string;
  /** 步骤是否出错 */
  isError?: boolean;
  /** 推理/思考内容（和 content 分开存储） */
  reasoning?: string;
  inputTokens: number;
  outputTokens: number;
  /** 缓存读取的 token 数量（如果支持） */
  cacheReadTokens?: number;
  cost: number;
  /** 当前 cost 是否基于已知模型定价估算得出 */
  costEstimated?: boolean;
  durationMs: number;
  /** tool_call 对应的 tool_result 的 index */
  pairedResultIndex?: number;
  /** 这是对哪个失败 call 的重试（指向失败的 tool_call 的 index） */
  retryOfIndex?: number;
  /** 这个 call 被重试了几次 */
  retryCount?: number;
}

export interface SessionReplay {
  meta: SessionMeta;
  steps: SessionStep[];
}
