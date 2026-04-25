import { describe, it, expect } from 'vitest';
import { resolveModelDetail, computeDetailedCost, computeCost, hasModelPricing } from '../services/pricing-utils.js';
import type { DetailedModelPricing } from '../types/index.js';
import { DEFAULT_DETAILED_PRICING, DEFAULT_MODEL_PRICING } from '../types/index.js';

describe('resolveModelDetail', () => {
  it('returns exact match', () => {
    const detail = resolveModelDetail(DEFAULT_DETAILED_PRICING, 'gpt-4o');
    expect(detail).toEqual({ input: 2.50, output: 10.0 });
  });

  it('returns fallback for unknown model', () => {
    const detail = resolveModelDetail(DEFAULT_DETAILED_PRICING, 'totally-unknown-model-v42');
    expect(detail).toEqual({ input: 2.0, output: 2.0 });
  });

  it('returns fallback for undefined model', () => {
    const detail = resolveModelDetail(DEFAULT_DETAILED_PRICING, undefined);
    expect(detail).toEqual({ input: 2.0, output: 2.0 });
  });

  it('strips date suffix and matches', () => {
    const detail = resolveModelDetail(DEFAULT_DETAILED_PRICING, 'gpt-4o-2026-03-25');
    expect(detail).toEqual({ input: 2.50, output: 10.0 });
  });

  it('strips version after colon and matches', () => {
    const detail = resolveModelDetail(DEFAULT_DETAILED_PRICING, 'claude-sonnet-4:beta');
    expect(detail).toEqual({ input: 3.0, output: 15.0 });
  });

  it('does prefix matching as last resort', () => {
    // 'gpt-4-turbo-preview' starts with 'gpt-4-turbo' which is in the table
    const detail = resolveModelDetail(DEFAULT_DETAILED_PRICING, 'gpt-4-turbo-preview');
    expect(detail).toEqual({ input: 10.0, output: 30.0 });
  });

  it('handles empty pricing table with fallback', () => {
    const empty: DetailedModelPricing = {};
    const detail = resolveModelDetail(empty, 'gpt-4o');
    expect(detail).toEqual({ input: 2.0, output: 2.0 });
  });

  it('free models return 0 prices', () => {
    const detail = resolveModelDetail(DEFAULT_DETAILED_PRICING, 'glm-4-flash');
    expect(detail).toEqual({ input: 0.0, output: 0.0 });
  });
});

describe('computeDetailedCost', () => {
  it('computes separated input/output cost', () => {
    // gpt-4o: $2.50 in / $10 out per million tokens
    const detail = { input: 2.50, output: 10.0 };
    const cost = computeDetailedCost(detail, 1000, 500);
    // 1000 * 2.50 / 1_000_000 + 500 * 10.0 / 1_000_000
    expect(cost).toBeCloseTo(0.0025 + 0.005, 10);
  });

  it('zero tokens = zero cost', () => {
    const detail = { input: 10.0, output: 30.0 };
    expect(computeDetailedCost(detail, 0, 0)).toBe(0);
  });

  it('free model = zero cost', () => {
    const detail = { input: 0, output: 0 };
    expect(computeDetailedCost(detail, 1_000_000, 1_000_000)).toBe(0);
  });
});

describe('hasModelPricing', () => {
  it('returns true for known models and aliases', () => {
    expect(hasModelPricing(DEFAULT_DETAILED_PRICING, 'gpt-4o')).toBe(true);
    expect(hasModelPricing(DEFAULT_DETAILED_PRICING, 'gpt-4o-2026-03-25')).toBe(true);
  });

  it('returns false for unknown models', () => {
    expect(hasModelPricing(DEFAULT_DETAILED_PRICING, 'unknown-x')).toBe(false);
    expect(hasModelPricing(DEFAULT_DETAILED_PRICING, undefined)).toBe(false);
  });
});

describe('computeCost (convenience)', () => {
  it('combines resolveModelDetail + computeDetailedCost', () => {
    const cost = computeCost(DEFAULT_DETAILED_PRICING, 'gpt-4o', 1000, 500);
    expect(cost).toBeCloseTo(0.0075, 10);
  });

  it('unknown model uses fallback prices', () => {
    // Fallback is { input: 2.0, output: 2.0 }
    const cost = computeCost(DEFAULT_DETAILED_PRICING, 'unknown-x', 1000, 1000);
    // (1000 * 2.0 + 1000 * 2.0) / 1_000_000 = 0.004
    expect(cost).toBeCloseTo(0.004, 10);
  });
});

describe('DeepSeek pricing defaults', () => {
  it('keeps chat and reasoner prices aligned with the latest official rates', () => {
    expect(DEFAULT_DETAILED_PRICING['deepseek-chat']).toEqual({ input: 0.14, output: 0.28 });
    expect(DEFAULT_DETAILED_PRICING['deepseek-reasoner']).toEqual({ input: 0.14, output: 0.28 });
    expect(DEFAULT_MODEL_PRICING['deepseek-chat']).toBe(0.28);
    expect(DEFAULT_MODEL_PRICING['deepseek-reasoner']).toBe(0.28);
  });
});
