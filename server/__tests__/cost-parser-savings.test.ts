import { afterEach, describe, expect, it, vi } from 'vitest';
import { CostParser } from '../services/cost-parser.js';
import { tokenWasteAnalyzer } from '../services/token-waste-analyzer.js';
import * as agentDataRoot from '../services/agent-data-root.js';
import * as replayRepository from '../services/replay-repository.js';
import { DEFAULT_DETAILED_PRICING, DEFAULT_MODEL_PRICING } from '../types/index.js';
import type { PricingSnapshot } from '../services/pricing-fetcher.js';
import type { SessionReplay } from '../types/replay.js';
import type { TokenUsage } from '../types/index.js';

function makePricingSnapshot(now: Date): PricingSnapshot {
  return {
    pricing: {
      ...DEFAULT_MODEL_PRICING,
      'claude-sonnet-4.6': 15,
      'gpt-4o-mini': 0.6,
      'deepseek-chat': 0.55,
    },
    detailed: {
      ...DEFAULT_DETAILED_PRICING,
      'claude-sonnet-4.6': { input: 3, output: 15 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'deepseek-chat': { input: 0.27, output: 1.1 },
    },
    reference: 'pricetoken',
    source: 'pricetoken',
    updatedAt: now.toISOString(),
    catalogVersion: `pricetoken/pricetoken@${now.toISOString()}`,
    stale: false,
    pricingMode: 'detailed-input-output-v1',
  };
}

function makeReplay(id: string, model: string, now: Date): SessionReplay {
  return {
    meta: {
      id,
      agentName: 'demo-test',
      summary: id,
      sessionLabel: id,
      dataSource: 'demo',
      startTime: now,
      endTime: now,
      durationMs: 0,
      totalCost: 0,
      totalTokens: 1_500,
      modelUsed: [model],
      stepCount: 3,
      storeModel: model,
    },
    steps: [],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CostParser replay usage pricing', () => {
  it('uses cacheReadTokens when converting replay steps into usage costs', () => {
    const parser = new CostParser();
    const now = new Date();
    const replay: SessionReplay = {
      meta: {
        id: 'cached-session',
        agentName: 'cache-test',
        summary: 'cache test',
        dataSource: 'real',
        startTime: now,
        endTime: now,
        durationMs: 0,
        totalCost: 0,
        totalTokens: 1_100,
        modelUsed: ['gpt-4o'],
        stepCount: 1,
      },
      steps: [
        {
          index: 0,
          timestamp: now,
          type: 'response',
          content: 'cached response',
          model: 'gpt-4o',
          inputTokens: 1000,
          outputTokens: 100,
          cacheReadTokens: 800,
          cost: 0,
          durationMs: 0,
        },
      ],
    };

    vi.spyOn(replayRepository, 'getRealMergedReplays').mockReturnValue([replay]);
    vi.spyOn(agentDataRoot, 'getLobsterDataRoots').mockReturnValue([
      {
        id: 'env-0',
        label: 'empty-root',
        homeDir: '/tmp/empty-clawclip-root',
        agentsDir: '/tmp/empty-clawclip-root/agents',
      },
    ]);

    const stats = parser.getUsageStats(30);

    expect(stats.totalCost).toBeCloseTo(0.0025, 10);
  });
});

describe('CostParser.getSavingSuggestions', () => {
  it('keeps sub-cent demo retry suggestions instead of filtering them all out', () => {
    const parser = new CostParser();
    const now = new Date('2026-03-16T08:00:00.000Z');
    const pricing = makePricingSnapshot(now);
    const usages: TokenUsage[] = [
      {
        timestamp: now,
        taskId: 'demo/retry-loop',
        model: 'gpt-4o-mini',
        inputTokens: 900,
        outputTokens: 180,
        cost: 0.0068,
        sessionId: 'demo/retry-loop',
        usageSource: 'demo',
      },
    ];

    (parser as unknown as { getCachedUsageBatch: () => unknown }).getCachedUsageBatch = () => ({
      at: now.getTime(),
      data: usages,
      pricing,
      replays: [makeReplay('demo/retry-loop', 'gpt-4o-mini', now)],
      isDemo: true,
      usageSource: 'demo',
    });

    vi.spyOn(tokenWasteAnalyzer, 'getReport').mockReturnValue({
      summary: {
        estimatedWasteTokens: 720,
        estimatedWasteCost: 0.0068,
        signals: 1,
        topIssue: 'retry-loop',
        usingDemo: true,
      },
      diagnostics: [
        {
          type: 'retry-loop',
          severity: 'medium',
          titleZh: '工具重试循环',
          titleEn: 'Tool retry loop',
          descZh: '失败后连续重试。',
          descEn: 'Repeated retries after failures.',
          estimatedWasteTokens: 720,
          estimatedWasteCost: 0.0068,
          sessionId: 'demo/retry-loop',
          sessionLabel: 'demo/retry-loop',
        },
      ],
    });

    const report = parser.getSavingSuggestions(30);
    const suggestions = report.suggestions as Array<{ reasonType?: string; saving: number }>;

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.reasonType).toBe('reduce-retries');
    expect(suggestions[0]?.saving).toBeCloseTo(0.0068, 10);
    expect(report.totalPotentialSaving).toBeCloseTo(0.0068, 10);
  });

  it('turns expensive-model and context-bloat diagnostics into demo savings suggestions', () => {
    const parser = new CostParser();
    const now = new Date('2026-03-16T08:10:00.000Z');
    const pricing = makePricingSnapshot(now);
    const usages: TokenUsage[] = [
      {
        timestamp: now,
        taskId: 'demo/light-email',
        model: 'claude-sonnet-4.6',
        inputTokens: 950,
        outputTokens: 220,
        cost: 0.0092,
        sessionId: 'demo/light-email',
        usageSource: 'demo',
      },
    ];

    (parser as unknown as { getCachedUsageBatch: () => unknown }).getCachedUsageBatch = () => ({
      at: now.getTime(),
      data: usages,
      pricing,
      replays: [makeReplay('demo/light-email', 'claude-sonnet-4.6', now)],
      isDemo: true,
      usageSource: 'demo',
    });

    vi.spyOn(tokenWasteAnalyzer, 'getReport').mockReturnValue({
      summary: {
        estimatedWasteTokens: 1_240,
        estimatedWasteCost: 0.0172,
        signals: 2,
        topIssue: 'expensive-model',
        usingDemo: true,
      },
      diagnostics: [
        {
          type: 'expensive-model',
          severity: 'medium',
          titleZh: '高价模型用在轻任务',
          titleEn: 'Premium model on a light task',
          descZh: '轻任务用了贵模型。',
          descEn: 'Premium model used on a light task.',
          estimatedWasteTokens: 620,
          estimatedWasteCost: 0.0092,
          sessionId: 'demo/light-email',
          sessionLabel: 'demo/light-email',
        },
        {
          type: 'context-bloat',
          severity: 'medium',
          titleZh: '上下文膨胀',
          titleEn: 'Context bloat',
          descZh: '上下文越滚越大。',
          descEn: 'Context keeps growing.',
          estimatedWasteTokens: 620,
          estimatedWasteCost: 0.008,
          sessionId: 'demo/light-email',
          sessionLabel: 'demo/light-email',
        },
      ],
    });

    const report = parser.getSavingSuggestions(30);
    const suggestions = report.suggestions as Array<{ reasonType?: string; saving: number; alternativeModel: string }>;
    const reasonTypes = suggestions.map(item => item.reasonType);

    expect(reasonTypes).toContain('switch-model');
    expect(reasonTypes).toContain('trim-prompt');
    expect(suggestions.every(item => item.saving > 0)).toBe(true);
    expect(suggestions.find(item => item.reasonType === 'switch-model')?.alternativeModel).not.toBe('claude-sonnet-4.6');
  });
});
