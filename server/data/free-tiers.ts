/**
 * free-tiers.ts — 免费 tier 和低成本模型数据
 * 
 * 数据来源 & 校验日期 (2026-04-01):
 *   Groq, Google Gemini, OpenRouter, DeepSeek 等官方文档
 */

export interface FreeTierInfo {
  provider: string;
  model: string;
  modelId: string; // API 调用时用的 model ID
  freeLimit: {
    requestsPerDay?: number;
    tokensPerDay?: number;
    tokensPerMonth?: number;
  };
  rateLimit: {
    rpm: number; // requests per minute
    tpm?: number; // tokens per minute
  };
  requiresCreditCard: boolean;
  url: string;
  notes?: string;
}

export const FREE_TIERS: FreeTierInfo[] = [
  // Groq
  {
    provider: 'Groq',
    model: 'Llama 4 Scout',
    modelId: 'meta-llama/llama-4-scout-17b-16e-instruct',
    freeLimit: { requestsPerDay: 14400, tokensPerDay: 500000 },
    rateLimit: { rpm: 30, tpm: 6000 },
    requiresCreditCard: false,
    url: 'https://console.groq.com',
    notes: '当前免费主推模型之一，适合通用 Agent 与轻中度推理任务',
  },
  {
    provider: 'Groq',
    model: 'Llama 3.3 70B',
    modelId: 'llama-3.3-70b-versatile',
    freeLimit: { requestsPerDay: 14400, tokensPerDay: 500000 },
    rateLimit: { rpm: 30, tpm: 6000 },
    requiresCreditCard: false,
    url: 'https://console.groq.com',
    notes: '更强但略慢，适合中等复杂任务',
  },

  // Google Gemini
  {
    provider: 'Google',
    model: 'Gemini 3.1 Flash-Lite',
    modelId: 'gemini-3.1-flash-lite',
    freeLimit: { requestsPerDay: 1000, tokensPerDay: 250000 },
    rateLimit: { rpm: 30, tpm: 250000 },
    requiresCreditCard: false,
    url: 'https://aistudio.google.com',
    notes: 'Flash-Lite 仍有免费额度；Pro 模型免费层已于 2026-04-01 移除',
  },

  // OpenRouter 免费模型
  {
    provider: 'OpenRouter',
    model: 'OpenRouter Free Router',
    modelId: 'openrouter/free',
    freeLimit: { requestsPerDay: 200 },
    rateLimit: { rpm: 20 },
    requiresCreditCard: false,
    url: 'https://openrouter.ai',
    notes: '自动路由到当前可用的免费模型池；充值 $10 后通常可升至 1000 req/day',
  },
  {
    provider: 'OpenRouter',
    model: 'DeepSeek R1 (free)',
    modelId: 'deepseek/deepseek-r1:free',
    freeLimit: { requestsPerDay: 200 },
    rateLimit: { rpm: 20 },
    requiresCreditCard: false,
    url: 'https://openrouter.ai',
    notes: '如需固定某个 :free 模型，可直接锁定具体免费变体',
  },

  // DeepSeek 新用户
  {
    provider: 'DeepSeek',
    model: 'DeepSeek V3.2',
    modelId: 'deepseek-chat',
    freeLimit: { tokensPerMonth: 5000000 },
    rateLimit: { rpm: 60 },
    requiresCreditCard: false,
    url: 'https://platform.deepseek.com',
    notes: '新用户赠送 500 万 tokens',
  },

  // Cerebras
  {
    provider: 'Cerebras',
    model: 'Llama 3.3 70B',
    modelId: 'llama-3.3-70b',
    freeLimit: { tokensPerDay: 1000000 },
    rateLimit: { rpm: 30 },
    requiresCreditCard: false,
    url: 'https://cloud.cerebras.ai',
    notes: '官方免费层按 1M tokens/day 口径维护，适合大输出任务',
  },
];

/**
 * 低成本模型推荐（付费但极便宜）
 */
export interface LowCostModelInfo {
  provider: string;
  model: string;
  modelId: string;
  inputPrice: number; // USD per million tokens
  outputPrice: number;
  suitableFor: string[];
  notSuitableFor: string[];
  notes: string;
}

export const LOW_COST_MODELS: LowCostModelInfo[] = [
  {
    provider: 'DeepSeek',
    model: 'DeepSeek V3.2',
    modelId: 'deepseek-chat',
    inputPrice: 0.14,
    outputPrice: 0.28,
    suitableFor: ['代码生成', '文本分析', '翻译', '摘要', '问答'],
    notSuitableFor: ['极高精度推理', '复杂多步规划'],
    notes: '性价比极高，适合大部分任务',
  },
  {
    provider: 'Groq',
    model: 'Llama 4 Scout',
    modelId: 'meta-llama/llama-4-scout-17b-16e-instruct',
    inputPrice: 0.11,
    outputPrice: 0.34,
    suitableFor: ['分类', '提取', '简单问答', '格式转换', '通用 Agent'],
    notSuitableFor: ['极高精度推理', '超长复杂规划'],
    notes: '当前免费优先推荐，速度快且上下文更现代',
  },
  {
    provider: 'Groq',
    model: 'Llama 3.3 70B',
    modelId: 'llama-3.3-70b-versatile',
    inputPrice: 0.59,
    outputPrice: 0.79,
    suitableFor: ['代码生成', '复杂分析', '多步推理'],
    notSuitableFor: ['极高精度要求'],
    notes: '速度快，能力强，性价比高',
  },
  {
    provider: 'Google',
    model: 'Gemini 3.1 Flash-Lite',
    modelId: 'gemini-3.1-flash-lite',
    inputPrice: 0.25,
    outputPrice: 1.5,
    suitableFor: ['快速响应', '简单任务', '分类'],
    notSuitableFor: ['长文本生成', '复杂推理'],
    notes: '免费层仍可用，但 Pro 模型免费层已移除',
  },
  {
    provider: 'Qwen',
    model: 'Qwen Turbo',
    modelId: 'qwen-turbo',
    inputPrice: 0.033,
    outputPrice: 0.13,
    suitableFor: ['中文任务', '快速响应', '简单分析'],
    notSuitableFor: ['复杂推理', '专业领域'],
    notes: '中文能力强，价格极低',
  },
];
