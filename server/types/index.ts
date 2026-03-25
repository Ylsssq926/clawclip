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

/**
 * 默认模型定价表 — 值为 **output 价格 (USD / 百万 token)**。
 * cost-parser 用同一个值乘以 (inputTokens + outputTokens)，
 * 因此实际成本仅作相对比较用途，精确账单请以各云厂商为准。
 *
 * 数据来源 & 校验日期 (2026-03-25):
 *   OpenAI      — developers.openai.com/api/docs/pricing
 *   Anthropic   — docs.anthropic.com/en/about-claude/pricing
 *   Google      — ai.google.dev/gemini-api/docs/pricing
 *   DeepSeek    — api-docs.deepseek.com/quick_start/pricing
 *   Qwen        — alibabacloud.com Model Studio pricing
 *   智谱/Kimi   — open.bigmodel.cn / platform.moonshot.ai
 *   其他国内厂商 — 各自官方文档 / pricepertoken.com 交叉校验
 */
export const DEFAULT_MODEL_PRICING: ModelPricing = {
  // ── OpenAI (developers.openai.com/api/docs/pricing  2026-03) ──
  'gpt-5.4':        15.0,    // $2.50 in  / $15 out
  'gpt-5.4-mini':    4.5,    // $0.75 in  / $4.50 out
  'gpt-5.4-nano':    1.25,   // $0.20 in  / $1.25 out
  'gpt-5.4-pro':   180.0,    // $30 in    / $180 out
  'gpt-5.2':        14.0,    // $1.75 in  / $14 out
  'gpt-5.2-pro':   168.0,    // $21 in    / $168 out
  'gpt-5.1':        10.0,    // $1.25 in  / $10 out
  'gpt-5':          10.0,    // $1.25 in  / $10 out
  'gpt-5-mini':      2.0,    // $0.25 in  / $2 out
  'gpt-5-nano':      0.4,    // $0.05 in  / $0.40 out
  'gpt-5-pro':     120.0,    // $15 in    / $120 out
  'gpt-4.1':         8.0,    // $2.00 in  / $8 out
  'gpt-4.1-mini':    1.6,    // $0.40 in  / $1.60 out
  'gpt-4.1-nano':    0.4,    // $0.10 in  / $0.40 out
  'gpt-4o':         10.0,    // $2.50 in  / $10 out
  'gpt-4o-mini':     0.6,    // $0.15 in  / $0.60 out
  'gpt-4-turbo':    30.0,    // $10 in    / $30 out (legacy)
  'gpt-4':          60.0,    // $30 in    / $60 out (legacy)
  'gpt-3.5-turbo':   1.5,    // $0.50 in  / $1.50 out
  'o3-pro':         80.0,    // $20 in    / $80 out
  'o3':              8.0,    // $2.00 in  / $8 out
  'o4-mini':         4.4,    // $1.10 in  / $4.40 out
  'o3-mini':         4.4,    // $1.10 in  / $4.40 out
  'o1':             60.0,    // $15 in    / $60 out
  'o1-mini':         4.4,    // $1.10 in  / $4.40 out
  'o1-pro':        600.0,    // $150 in   / $600 out

  // ── Anthropic (docs.anthropic.com/en/about-claude/pricing  2026-03) ──
  'claude-opus-4.6':     25.0,   // $5 in  / $25 out
  'claude-opus-4.5':     25.0,   // $5 in  / $25 out
  'claude-opus-4.1':     75.0,   // $15 in / $75 out
  'claude-opus-4':       75.0,   // $15 in / $75 out
  'claude-sonnet-4.6':   15.0,   // $3 in  / $15 out
  'claude-sonnet-4.5':   15.0,   // $3 in  / $15 out
  'claude-sonnet-4':     15.0,   // $3 in  / $15 out
  'claude-sonnet-3.7':   15.0,   // $3 in  / $15 out (deprecated)
  'claude-3.5-sonnet':   15.0,   // legacy alias → Sonnet 3.7 同价
  'claude-haiku-4.5':     5.0,   // $1 in  / $5 out
  'claude-3.5-haiku':     4.0,   // $0.80 in / $4 out
  'claude-3-opus':       75.0,   // $15 in / $75 out (deprecated)
  'claude-3-haiku':       1.25,  // $0.25 in / $1.25 out

  // ── Google Gemini (ai.google.dev/gemini-api/docs/pricing  2026-03) ──
  'gemini-3.1-pro':     12.0,   // $2.00 in / $12 out (preview)
  'gemini-3.1-flash-lite': 1.5,  // $0.25 in / $1.50 out (preview)
  'gemini-3-flash':      3.0,   // $0.50 in / $3 out (preview)
  'gemini-2.5-pro':     10.0,   // $1.25 in / $10 out (≤200k)
  'gemini-2.5-flash':    2.5,   // $0.30 in / $2.50 out
  'gemini-2.5-flash-lite': 0.4,  // $0.10 in / $0.40 out
  'gemini-2.0-flash':    0.4,   // $0.10 in / $0.40 out (deprecated June 2026)

  // ── DeepSeek (api-docs.deepseek.com/quick_start/pricing  2026-03) ──
  'deepseek-chat':       0.42,  // $0.28 in / $0.42 out (V3.2)
  'deepseek-reasoner':   0.42,  // V3.2 统一定价

  // ── Qwen / 阿里 DashScope (alibabacloud.com Model Studio  2026-03) ──
  'qwen-max':       6.4,    // $1.60 in / $6.40 out (Qwen3-Max)
  'qwen-plus':      1.56,   // $0.26 in / $1.56 out (Qwen3.5-Plus)
  'qwen3.5-flash':  0.26,   // $0.065 in / $0.26 out
  'qwen-turbo':     0.13,   // $0.033 in / $0.13 out

  // ── 字节跳动 豆包 (aipricing.org/brands/bytedance  2026-03) ──
  'doubao-pro':      2.0,   // $0.25 in / $2.00 out
  'doubao-lite':     0.3,   // $0.07 in / $0.30 out

  // ── 智谱 GLM (open.bigmodel.cn  2026-03) ──
  'glm-5':           3.2,   // $1.00 in / $3.20 out
  'glm-5-code':      5.0,   // $1.20 in / $5.00 out
  'glm-4.7':         2.2,   // $0.60 in / $2.20 out
  'glm-4.5':         2.2,   // $0.60 in / $2.20 out
  'glm-4':           0.7,   // GLM-4-Plus: $0.70 in+out
  'glm-4.7-flash':   0.0,   // Free
  'glm-4.5-flash':   0.0,   // Free
  'glm-4-flash':     0.0,   // Free

  // ── 月之暗面 Kimi (platform.moonshot.ai  2026-03) ──
  'kimi-k2.5':       2.2,   // $0.45 in / $2.20 out
  'kimi-k2':         2.0,   // $0.40 in / $2.00 out
  'moonshot-v1':     2.0,   // legacy alias → Kimi K2 同价

  // ── 百度 ERNIE (pricepertoken.com/provider/baidu  2026-03) ──
  'ernie-4.0':       8.28,  // ERNIE 4.0 Turbo: $4.14 in / $8.28 out
  'ernie-speed':     0.4,   // ERNIE Speed 系列

  // ── 腾讯混元 (cloud.tencent.com  2026-03) ──
  'hunyuan-pro':     1.5,   // HY 2.0 Instruct ≈ $1.5/M out
  'hunyuan-lite':    0.28,  // Hunyuan-a13b ≈ $0.28/M out

  // ── 零一万物 (01.ai  2026-03) ──
  'yi-lightning':    0.14,  // $0.14/M
  'yi-large':        3.0,   // $3.00/M

  // ── 开源模型（托管平台均价）──
  'llama-3.3-70b':   0.8,  // Fireworks / Together ≈ $0.80/M

  // ── Mistral ──
  'mistral-large':   6.0,  // ≈ $6/M out
  'mistral-small':   0.3,  // ≈ $0.30/M out

  // ── MiniMax (pricepertoken.com  2026-03) ──
  'minimax-m2.7':    1.2,   // $0.30 in / $1.20 out (2026-03-18 发布)
  'minimax-01':      1.0,   // legacy
};

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  monthly: 50,
  alertThreshold: 80,
  currency: 'USD',
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

/** 生态/存储形态提示（无 JSONL、发现 DB 等），便于长期兼容多框架 */
export interface EcosystemNote {
  severity: 'info' | 'warn';
  rootId?: string;
  messageZh: string;
  messageEn: string;
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
  /** 存储形态与后续适配说明（双语） */
  ecosystemNotes: EcosystemNote[];
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

export interface CostInsight {
  type: 'info' | 'warning' | 'tip';
  icon: string;
  messageZh: string;
  messageEn: string;
}

export interface SavingSuggestion {
  currentModel: string;
  alternativeModel: string;
  currentCost: number;
  alternativeCost: number;
  saving: number;
  tokens: number;
}

export interface SavingsReport {
  totalPotentialSaving: number;
  suggestions: SavingSuggestion[];
}
