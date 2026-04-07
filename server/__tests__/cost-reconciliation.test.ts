import { describe, it, expect } from 'vitest';
import { CostParser } from '../services/cost-parser.js';
import type { TokenUsage } from '../types/index.js';
import { DEFAULT_DETAILED_PRICING, DEFAULT_MODEL_PRICING } from '../types/index.js';
import type { SessionReplay } from '../types/replay.js';
import type { PricingSnapshot } from '../services/pricing-fetcher.js';

describe('CostParser.getReconciliation', () => {
  it('aggregates session rows and skips bad session ids with safe fallback', async () => {
    const parser = new CostParser();
    const now = new Date();
    const currentSnapshot: PricingSnapshot = {
      pricing: {
        ...DEFAULT_MODEL_PRICING,
        'gpt-4o': 20,
      },
      detailed: {
        ...DEFAULT_DETAILED_PRICING,
        'gpt-4o': { input: 5, output: 20 },
      },
      reference: 'pricetoken',
      source: 'pricetoken',
      updatedAt: now.toISOString(),
      catalogVersion: `pricetoken/pricetoken@${now.toISOString()}`,
      stale: false,
      pricingMode: 'detailed-input-output-v1',
    };

    const replay: SessionReplay = {
      meta: {
        id: 'sess-1',
        agentName: 'ClawClip',
        dataSource: 'openclaw',
        startTime: now,
        endTime: now,
        durationMs: 0,
        totalCost: 0,
        totalTokens: 1500,
        modelUsed: ['gpt-4o'],
        stepCount: 1,
        summary: 'Cost audit',
        sessionLabel: '成本审计',
        storeProvider: 'openai',
        storeModel: 'gpt-4o',
      },
      steps: [],
    };

    const usages: TokenUsage[] = [
      {
        timestamp: now,
        taskId: 'sess-1',
        model: 'gpt-4o',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.015,
        sessionId: 'sess-1',
        usageSource: 'replay',
      },
      {
        timestamp: new Date(now.getTime() - 60_000),
        taskId: 'broken-task',
        model: '',
        inputTokens: 300,
        outputTokens: 100,
        cost: 0.0008,
        sessionId: '',
        usageSource: 'log',
      },
    ];

    (parser as any).getCachedUsageBatch = () => ({
      at: now.getTime(),
      data: usages,
      pricing: currentSnapshot,
      replays: [replay],
      isDemo: false,
      usageSource: 'mixed',
    });

    const result = await parser.getReconciliation(7);

    expect(result.meta.currentReference).toBe('pricetoken');
    expect(result.meta.baselineReference).toBe('official-static');
    expect(result.summary.sessions).toBe(2);
    expect(result.summary.usageSourceBreakdown.replay).toBe(1);
    expect(result.summary.usageSourceBreakdown.log).toBe(1);
    expect(result.summary.estimatedRows).toBe(2);

    const replayRow = result.rows.find(row => row.sessionId === 'sess-1');
    expect(replayRow).toBeTruthy();
    expect(replayRow?.sessionLabel).toBe('成本审计');
    expect(replayRow?.provider).toBe('openai');
    expect(replayRow?.primaryModel).toBe('gpt-4o');
    expect(replayRow?.replayAvailable).toBe(true);
    expect(replayRow?.currentCost).toBeCloseTo(0.015, 10);
    expect(replayRow?.baselineCost).toBeCloseTo(0.0075, 10);

    const fallbackRow = result.rows.find(row => row.sessionId === 'broken-task');
    expect(fallbackRow).toBeTruthy();
    expect(fallbackRow?.usageSource).toBe('log');
    expect(fallbackRow?.replayAvailable).toBe(false);
    expect(fallbackRow?.sessionLabel).toContain('broken-task');
  });
});
