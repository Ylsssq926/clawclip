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
  inputTokens: number;
  outputTokens: number;
  cost: number;
  durationMs: number;
}

export interface SessionReplay {
  meta: SessionMeta;
  steps: SessionStep[];
}
