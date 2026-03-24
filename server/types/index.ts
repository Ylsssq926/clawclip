export interface TokenUsage {
  timestamp: Date;
  taskId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  sessionId: string;
}

export interface DailyUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface CostStats {
  totalCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  averageCostPerTask: number;
  topTasks: TaskCost[];
  trend: 'up' | 'down' | 'stable';
  comparedToLastMonth: number;
}

export interface TaskCost {
  taskId: string;
  taskName: string;
  tokens: number;
  cost: number;
  timestamp: Date;
}

export interface BudgetConfig {
  monthly: number;
  alertThreshold: number;
  currency: string;
}

export interface ModelPricing {
  [model: string]: number;
}

export const DEFAULT_MODEL_PRICING: ModelPricing = {
  'gpt-4o': 10.0,
  'gpt-4o-mini': 1.5,
  'gpt-4': 80.0,
  'gpt-4.1': 5.0,
  'gpt-4.1-mini': 1.0,
  'claude-3.5-sonnet': 8.0,
  'claude-3.5-haiku': 0.8,
  'claude-3-opus': 80.0,
  'claude-sonnet-4': 8.0,
  'qwen-turbo': 0.8,
  'qwen-max': 8.0,
  'deepseek-chat': 0.1,
  'deepseek-reasoner': 2.0,
  'minimax-01': 1.0,
  'glm-4': 5.0,
  'moonshot-v1': 3.0,
};

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  monthly: 500,
  alertThreshold: 80,
  currency: 'CNY',
};

/** 单个「龙虾」数据根在本机的探测结果（用于兼容多框架/多路径） */
export interface LobsterDataRootStatus {
  id: string;
  label: string;
  homeDir: string;
  sessionJsonlFiles: number;
  hasConfig: boolean;
  configPath: string;
  skillsCount: number;
}

export interface OpenClawStatus {
  running: boolean;
  version: string;
  uptime: string;
  configPath: string;
  skillCount: number;
  channels: string[];
  /** 探测到的 CLI：openclaw / zeroclaw，均未找到则为 null */
  cliCommand: 'openclaw' | 'zeroclaw' | null;
  dataRoots: LobsterDataRootStatus[];
  totalSessionFiles: number;
  /** 是否已读取到真实会话 JSONL（非内置 Demo） */
  hasRealSessionData: boolean;
}

export interface SkillInfo {
  name: string;
  description: string;
  installed: boolean;
  version?: string;
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  skills: string[];
}
