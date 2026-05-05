import { describe, expect, it } from 'vitest';
import { classifyQuotaStatus, generateQuotaRecommendation } from '../services/quota-monitor.js';

describe('quota monitor helpers', () => {
  it('classifies a non-zero low remaining percentage as low instead of exhausted', () => {
    expect(classifyQuotaStatus(1)).toBe('low');
    expect(classifyQuotaStatus(20)).toBe('low');
    expect(classifyQuotaStatus(0)).toBe('exhausted');
  });

  it('recommends cheap paid fallback when all free providers are low', () => {
    const recommendation = generateQuotaRecommendation([
      {
        provider: 'Groq',
        model: 'llama',
        remaining: { requests: 10 },
        limit: { requests: 100 },
        percentage: 10,
        checkedAt: '2026-03-18T08:00:00.000Z',
        status: 'low',
      },
      {
        provider: 'Cerebras',
        model: 'llama',
        remaining: { requests: 15 },
        limit: { requests: 100 },
        percentage: 15,
        checkedAt: '2026-03-18T08:00:00.000Z',
        status: 'low',
      },
    ]);

    expect(recommendation).toMatchObject({
      action: 'switch',
      suggestedProvider: 'DeepSeek',
      suggestedModel: 'deepseek-chat',
    });
  });
});
