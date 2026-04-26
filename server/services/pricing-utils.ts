/**
 * pricing-utils.ts — 统一定价查找、费用计算与回放重计价
 *
 * 消除 session-parser.ts 与 demo-sessions.ts 中各自独立实现的价格逻辑。
 * 使用 DetailedModelPricing / PricingSnapshot 实现 input/output 分离计价。
 */
import type { CostMeta, DetailedModelPricing, ModelPriceDetail, UsageSource } from '../types/index.js';
import { DEFAULT_DETAILED_PRICING } from '../types/index.js';
import type { SessionReplay } from '../types/replay.js';
import { normalizeModelId, type PricingSnapshot } from './pricing-fetcher.js';

const UNKNOWN_MODEL_FALLBACK: ModelPriceDetail = { input: 2.0, output: 2.0 };

/**
 * 在详细定价表中模糊查找模型价格。
 * 匹配策略（与原 priceFor 一致）：
 *   1. 精确匹配
 *   2. 去掉日期后缀（-YYYY-MM-DD）和版本号（:xxx）再匹配
 *   3. 前缀匹配（model 以表中的 key 开头）
 */
function findResolvedModelDetail(
  pricing: DetailedModelPricing,
  model?: string,
): ModelPriceDetail | undefined {
  if (!model) return undefined;

  const variants = normalizeModelId(model);
  for (const variant of variants) {
    if (pricing[variant] != null) return pricing[variant];
  }

  const keys = Object.keys(pricing);
  for (const variant of variants) {
    for (const key of keys) {
      if (variant.startsWith(key)) return pricing[key];
    }
  }

  return undefined;
}

export function hasModelPricing(
  pricing: DetailedModelPricing,
  model?: string,
): boolean {
  return findResolvedModelDetail(pricing, model) != null;
}

export function resolveModelDetail(
  pricing: DetailedModelPricing,
  model?: string,
): ModelPriceDetail {
  return findResolvedModelDetail(pricing, model) ?? UNKNOWN_MODEL_FALLBACK;
}

/**
 * 使用 input/output 分离价格精确计算费用（USD）。
 * 如果提供了 cacheReadTokens，会使用 inputCached 价格计算缓存部分。
 */
export function computeDetailedCost(
  detail: ModelPriceDetail,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens?: number,
): number {
  let cost = (inputTokens * detail.input + outputTokens * detail.output) / 1_000_000;
  
  // 如果有缓存读取 token 且模型支持缓存价格
  if (cacheReadTokens && cacheReadTokens > 0 && detail.inputCached != null) {
    // 从 inputTokens 中减去缓存部分，用缓存价格计算
    const nonCachedInput = Math.max(0, inputTokens - cacheReadTokens);
    cost = (nonCachedInput * detail.input + cacheReadTokens * detail.inputCached + outputTokens * detail.output) / 1_000_000;
  }
  
  return cost;
}

/**
 * 便捷函数：直接从定价表查找模型并计算费用。
 */
export function computeCost(
  pricing: DetailedModelPricing,
  model: string | undefined,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens?: number,
): number {
  const detail = resolveModelDetail(pricing, model);
  return computeDetailedCost(detail, inputTokens, outputTokens, cacheReadTokens);
}

export function buildCostMeta(snapshot: PricingSnapshot, usageSource: UsageSource): CostMeta {
  return {
    pricingMode: snapshot.pricingMode,
    pricingReference: snapshot.reference,
    pricingSource: snapshot.source,
    pricingUpdatedAt: snapshot.updatedAt,
    pricingCatalogVersion: snapshot.catalogVersion,
    usageSource,
    estimated: usageSource !== 'replay' || snapshot.source === 'static-default' || snapshot.stale,
  };
}

export function repriceStep(
  model: string | undefined,
  inputTokens: number,
  outputTokens: number,
  snapshot: PricingSnapshot,
  cacheReadTokens?: number,
): number {
  return computeCost(snapshot.detailed, model, inputTokens, outputTokens, cacheReadTokens);
}

export function repriceReplay(
  replay: SessionReplay,
  snapshot: PricingSnapshot,
  usageSource: UsageSource,
): SessionReplay {
  const steps = replay.steps.map(step => ({
    ...step,
    cost: repriceStep(step.model, step.inputTokens, step.outputTokens, snapshot, step.cacheReadTokens),
  }));
  const totalCost = steps.reduce((sum, step) => sum + step.cost, 0);

  return {
    ...replay,
    meta: {
      ...replay.meta,
      totalCost,
      costMeta: buildCostMeta(snapshot, usageSource),
    },
    steps,
  };
}

/** 预导出的静态默认定价表，供 session-parser / demo-sessions 直接使用 */
export { DEFAULT_DETAILED_PRICING };
