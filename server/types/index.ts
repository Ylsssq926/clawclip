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

export type PricingSource = 'pricetoken' | 'static-default';

export interface CostStats {
  totalCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  averageCostPerTask: number;
  topTasks: TaskCost[];
  trend: 'up' | 'down' | 'stable';
  comparedToLastMonth: number;
  pricingSource: PricingSource;
  pricingUpdatedAt: string;
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
 * 分离 input/output 价格的详细定价表（USD / 百万 token）。
 * 用于精确计算费用；legacy ModelPricing 仅存 output 价格，供向后兼容场景使用。
 */
export interface ModelPriceDetail {
  input: number;
  output: number;
}

export type DetailedModelPricing = { [model: string]: ModelPriceDetail };

/**
 * 默认详细模型定价表 — 同时包含 input 和 output 价格。
 * 数据来源 & 校验日期 (2026-03-25):
 *   OpenAI, Anthropic, Google, DeepSeek, Qwen, 智谱/Kimi, 百度, 腾讯, 零一万物 等
 *   详见各厂商官方文档 / pricepertoken.com 交叉校验
 */
export const DEFAULT_DETAILED_PRICING: DetailedModelPricing = {
  // ── OpenAI ──
  'gpt-5.4':        { input: 2.50, output: 15.0 },
  'gpt-5.4-mini':    { input: 0.75, output: 4.50 },
  'gpt-5.4-nano':    { input: 0.20, output: 1.25 },
  'gpt-5.4-pro':   { input: 30.0, output: 180.0 },
  'gpt-5.2':        { input: 1.75, output: 14.0 },
  'gpt-5.2-pro':   { input: 21.0, output: 168.0 },
  'gpt-5.1':        { input: 1.25, output: 10.0 },
  'gpt-5':          { input: 1.25, output: 10.0 },
  'gpt-5-mini':      { input: 0.25, output: 2.0 },
  'gpt-5-nano':      { input: 0.05, output: 0.40 },
  'gpt-5-pro':     { input: 15.0, output: 120.0 },
  'gpt-4.1':         { input: 2.00, output: 8.0 },
  'gpt-4.1-mini':    { input: 0.40, output: 1.60 },
  'gpt-4.1-nano':    { input: 0.10, output: 0.40 },
  'gpt-4o':         { input: 2.50, output: 10.0 },
  'gpt-4o-mini':     { input: 0.15, output: 0.60 },
  'gpt-4-turbo':    { input: 10.0, output: 30.0 },
  'gpt-4':          { input: 30.0, output: 60.0 },
  'gpt-3.5-turbo':   { input: 0.50, output: 1.50 },
  'o3-pro':         { input: 20.0, output: 80.0 },
  'o3':              { input: 2.00, output: 8.0 },
  'o4-mini':         { input: 1.10, output: 4.40 },
  'o3-mini':         { input: 1.10, output: 4.40 },
  'o1':             { input: 15.0, output: 60.0 },
  'o1-mini':         { input: 1.10, output: 4.40 },
  'o1-pro':        { input: 150.0, output: 600.0 },

  // ── Anthropic ──
  'claude-opus-4.6':     { input: 5.0, output: 25.0 },
  'claude-opus-4.5':     { input: 5.0, output: 25.0 },
  'claude-opus-4.1':     { input: 15.0, output: 75.0 },
  'claude-opus-4':       { input: 15.0, output: 75.0 },
  'claude-sonnet-4.6':   { input: 3.0, output: 15.0 },
  'claude-sonnet-4.5':   { input: 3.0, output: 15.0 },
  'claude-sonnet-4':     { input: 3.0, output: 15.0 },
  'claude-sonnet-3.7':   { input: 3.0, output: 15.0 },
  'claude-3.5-sonnet':   { input: 3.0, output: 15.0 },
  'claude-haiku-4.5':     { input: 1.0, output: 5.0 },
  'claude-3.5-haiku':     { input: 0.80, output: 4.0 },
  'claude-3-opus':       { input: 15.0, output: 75.0 },
  'claude-3-haiku':       { input: 0.25, output: 1.25 },

  // ── Google Gemini ──
  'gemini-3.1-pro':     { input: 2.00, output: 12.0 },
  'gemini-3.1-flash-lite': { input: 0.25, output: 1.5 },
  'gemini-3-flash':      { input: 0.50, output: 3.0 },
  'gemini-2.5-pro':     { input: 1.25, output: 10.0 },
  'gemini-2.5-flash':    { input: 0.30, output: 2.50 },
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash':    { input: 0.10, output: 0.40 },

  // ── DeepSeek ──
  'deepseek-chat':       { input: 0.28, output: 0.42 },
  'deepseek-reasoner':   { input: 0.28, output: 0.42 },

  // ── Qwen / 阿里 ──
  'qwen-max':       { input: 1.60, output: 6.40 },
  'qwen-plus':      { input: 0.26, output: 1.56 },
  'qwen3.5-flash':  { input: 0.065, output: 0.26 },
  'qwen-turbo':     { input: 0.033, output: 0.13 },

  // ── 字节跳动 豆包 ──
  'doubao-pro':      { input: 0.25, output: 2.0 },
  'doubao-lite':     { input: 0.07, output: 0.30 },

  // ── 智谱 GLM ──
  'glm-5':           { input: 1.00, output: 3.20 },
  'glm-5-code':      { input: 1.20, output: 5.0 },
  'glm-4.7':         { input: 0.60, output: 2.20 },
  'glm-4.5':         { input: 0.60, output: 2.20 },
  'glm-4':           { input: 0.70, output: 0.70 },
  'glm-4.7-flash':   { input: 0.0, output: 0.0 },
  'glm-4.5-flash':   { input: 0.0, output: 0.0 },
  'glm-4-flash':     { input: 0.0, output: 0.0 },

  // ── 月之暗面 Kimi ──
  'kimi-k2.5':       { input: 0.45, output: 2.20 },
  'kimi-k2':         { input: 0.40, output: 2.0 },
  'moonshot-v1':     { input: 0.40, output: 2.0 },

  // ── 百度 ERNIE ──
  'ernie-4.0':       { input: 4.14, output: 8.28 },
  'ernie-speed':     { input: 0.20, output: 0.40 },

  // ── 腾讯混元 ──
  'hunyuan-pro':     { input: 1.0, output: 1.5 },
  'hunyuan-lite':    { input: 0.14, output: 0.28 },

  // ── 零一万物 ──
  'yi-lightning':    { input: 0.10, output: 0.14 },
  'yi-large':        { input: 1.50, output: 3.0 },

  // ── 开源模型（托管平台均价）──
  'llama-3.3-70b':   { input: 0.50, output: 0.80 },

  // ── Mistral ──
  'mistral-large':   { input: 3.0, output: 6.0 },
  'mistral-small':   { input: 0.15, output: 0.30 },

  // ── MiniMax ──
  'minimax-m2.7':    { input: 0.30, output: 1.20 },
  'minimax-01':      { input: 0.50, output: 1.0 },
};

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
  /** 能解析出至少一步的会话数（与 totalSessionFiles 可能不同） */
  parsableSessionCount?: number;
  /** 磁盘上有 .jsonl 但无法解析为可展示会话的文件数（可选，由服务端推导） */
  unparsableJsonlFileCount?: number;
  /** 是否已读取到真实会话 JSONL（非内置 Demo） */
  hasRealSessionData: boolean;
  /** 存在 jsonl 但均不可解析时的简短说明（中英分字段，便于前端直接展示） */
  sessionDataHintZh?: string;
  sessionDataHintEn?: string;
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
