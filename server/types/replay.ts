export interface SessionMeta {
  id: string;
  agentName: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  totalCost: number;
  totalTokens: number;
  modelUsed: string[];
  stepCount: number;
  summary: string;
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
