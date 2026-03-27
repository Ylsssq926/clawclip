/**
 * pricing-utils.ts — 统一定价查找与费用计算
 *
 * 消除 session-parser.ts 与 demo-sessions.ts 中各自独立实现的 priceFor/computeCost 冗余。
 * 使用 DetailedModelPricing 实现 input/output 分离计价。
 */
import type { DetailedModelPricing, ModelPriceDetail } from '../types/index.js';
import { DEFAULT_DETAILED_PRICING } from '../types/index.js';

const UNKNOWN_MODEL_FALLBACK: ModelPriceDetail = { input: 2.0, output: 2.0 };

/**
 * 在详细定价表中模糊查找模型价格。
 * 匹配策略（与原 priceFor 一致）：
 *   1. 精确匹配
 *   2. 去掉日期后缀（-YYYY-MM-DD）和版本号（:xxx）再匹配
 *   3. 前缀匹配（model 以表中的 key 开头）
 */
export function resolveModelDetail(
  pricing: DetailedModelPricing,
  model?: string,
): ModelPriceDetail {
  if (!model) return UNKNOWN_MODEL_FALLBACK;
  if (pricing[model] != null) return pricing[model];

  const stripped = model.replace(/-\d{4}-\d{2}-\d{2}$/, '').replace(/:.*$/, '');
  if (stripped !== model && pricing[stripped] != null) return pricing[stripped];

  for (const key of Object.keys(pricing)) {
    if (model.startsWith(key)) return pricing[key];
  }

  return UNKNOWN_MODEL_FALLBACK;
}

/**
 * 使用 input/output 分离价格精确计算费用（USD）。
 */
export function computeDetailedCost(
  detail: ModelPriceDetail,
  inputTokens: number,
  outputTokens: number,
): number {
  return (inputTokens * detail.input + outputTokens * detail.output) / 1_000_000;
}

/**
 * 便捷函数：直接从定价表查找模型并计算费用。
 */
export function computeCost(
  pricing: DetailedModelPricing,
  model: string | undefined,
  inputTokens: number,
  outputTokens: number,
): number {
  const detail = resolveModelDetail(pricing, model);
  return computeDetailedCost(detail, inputTokens, outputTokens);
}

/** 预导出的静态默认定价表，供 session-parser / demo-sessions 直接使用 */
export { DEFAULT_DETAILED_PRICING };
