/**
 * free-tiers.ts — 免费 tier 和低成本模型数据
 * 
 * 数据来源 & 校验日期 (2026-03-25):
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
    model: 'Llama 3.1 8B',
    modelId: 'llama-3.1-8b-instant',
    freeLimit: { requestsPerDay: 14400, tokensPerDay: 500000 },
    rateLimit: { rpm: 30, tpm: 6000 },
    requiresCreditCard: false,
    url: 'https://console.groq.com',
    notes: '速度极快，适合轻量任务',
  },
  {
    provider: 'Groq',
    model: 'Llama 3.1 70B',
    modelId: 'llama-3.1-70b-versatile',
    freeLimit: { requestsPerDay: 14400, tokensPerDay: 500000 },
    rateLimit: { rpm: 30, tpm: 6000 },
    requiresCreditCard: false,
    url: 'https://console.groq.com',
    notes: '速度快，适合中等复杂任务',
  },

  // Google Gemini
  {
    provider: 'Google',
    model: 'Gemini 2.5 Flash-Lite',
    modelId: 'gemini-2.5-flash-lite',
    freeLimit: { requestsPerDay: 1000, tokensPerDay: 250000 },
    rateLimit: { rpm: 30, tpm: 250000 },
    requiresCreditCard: false,
    url: 'https://aistudio.google.com',
    notes: '每天 1000 次请求，适合中频使用',
  },
  {
    provider: 'Google',
    model: 'Gemini 2.0 Flash',
    modelId: 'gemini-2.0-flash',
    freeLimit: { requestsPerDay: 1500 },
    rateLimit: { rpm: 15 },
    requiresCreditCard: false,
    url: 'https://aistudio.google.com',
    notes: '免费额度较高',
  },

  // OpenRouter 免费模型
  {
    provider: 'OpenRouter',
    model: 'DeepSeek V3 (free)',
    modelId: 'deepseek/deepseek-chat:free',
    freeLimit: { requestsPerDay: 200 },
    rateLimit: { rpm: 20 },
    requiresCreditCard: false,
    url: 'https://openrouter.ai',
    notes: '充值 $10 后每天 1000 次',
  },
  {
    provider: 'OpenRouter',
    model: 'Llama 3.1 8B (free)',
    modelId: 'meta-llama/llama-3.1-8b-instruct:free',
    freeLimit: { requestsPerDay: 200 },
    rateLimit: { rpm: 20 },
    requiresCreditCard: false,
    url: 'https://openrouter.ai',
    notes: '免费额度有限',
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
    model: 'Llama 3.1 8B',
    modelId: 'llama-3.1-8b-instant',
    inputPrice: 0.05,
    outputPrice: 0.08,
    suitableFor: ['分类', '提取', '简单问答', '格式转换'],
    notSuitableFor: ['复杂推理', '长文本生成', '专业领域'],
    notes: '速度极快，适合轻量任务',
  },
  {
    provider: 'Groq',
    model: 'Llama 3.1 70B',
    modelId: 'llama-3.1-70b-versatile',
    inputPrice: 0.59,
    outputPrice: 0.79,
    suitableFor: ['代码生成', '复杂分析', '多步推理'],
    notSuitableFor: ['极高精度要求'],
    notes: '速度快，能力强，性价比高',
  },
  {
    provider: 'Google',
    model: 'Gemini 2.5 Flash-Lite',
    modelId: 'gemini-2.5-flash-lite',
    inputPrice: 0.1,
    outputPrice: 1.5,
    suitableFor: ['快速响应', '简单任务', '分类'],
    notSuitableFor: ['长文本生成', '复杂推理'],
    notes: '输出价格较高，适合短输出任务',
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
