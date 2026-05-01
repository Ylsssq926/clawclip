import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCostAdvisorPlan } from '../services/cost-advisor.js';
import { costParser } from '../services/cost-parser.js';
import { tokenWasteAnalyzer } from '../services/token-waste-analyzer.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildCostAdvisorPlan', () => {
  it('turns the top saving suggestion into one executable primary action', () => {
    vi.spyOn(costParser, 'getUsageStats').mockReturnValue({
      totalCost: 1,
      totalTokens: 10_000,
      averageCostPerTask: 0.25,
      topTasks: [{ taskId: 'session-light-email', taskName: 'Light email rewrite', cost: 0.82, tokens: 4_000 }],
    } as any);
    vi.spyOn(costParser, 'getSavingSuggestions').mockReturnValue({
      totalPotentialSaving: 0.42,
      suggestions: [
        {
          currentModel: 'claude-sonnet-4.6',
          alternativeModel: 'deepseek-chat',
          currentCost: 0.82,
          alternativeCost: 0.4,
          saving: 0.42,
          tokens: 4_000,
          reasonType: 'switch-model',
          reasonZh: '轻量邮件改写正在使用高价模型，先切 DeepSeek 试跑。',
          reasonEn: 'A light email rewrite is using a premium model; trial DeepSeek first.',
          actionZh: '先把这类轻任务路由到 deepseek-chat。',
          actionEn: 'Route this light task type to deepseek-chat first.',
          qualityGuardrailZh: '先用同一任务复测，确认质量没有明显下降。',
          qualityGuardrailEn: 'Re-run the same task first and confirm quality stays stable.',
          priority: 'high',
          sessionId: 'session-light-email',
          sessionLabel: 'Light email rewrite',
        } as any,
      ],
    });
    vi.spyOn(tokenWasteAnalyzer, 'getReport').mockReturnValue({
      summary: {
        estimatedWasteTokens: 4_000,
        estimatedWasteCost: 0.42,
        signals: 1,
        topIssue: 'expensive-model',
        usingDemo: false,
      },
      diagnostics: [
        {
          type: 'expensive-model',
          severity: 'medium',
          titleZh: '高价模型干轻活',
          titleEn: 'Premium model on light task',
          descZh: '轻任务用了高价模型。',
          descEn: 'A light task used a premium model.',
          estimatedWasteTokens: 4_000,
          estimatedWasteCost: 0.42,
          sessionId: 'session-light-email',
          sessionLabel: 'Light email rewrite',
        },
      ],
    });

    const plan = buildCostAdvisorPlan(30);

    expect(plan.summary).toMatchObject({
      totalCost: 1,
      estimatedSavingsUsd: 0.42,
      estimatedSavingsPercent: 42,
      confidence: 'high',
      actionCount: 1,
    });
    expect(plan.primaryAction).toMatchObject({
      type: 'switch-model',
      titleZh: '优先灰度切换轻任务模型',
      estimatedSavingsUsd: 0.42,
      estimatedSavingsPercent: 42,
      riskLevel: 'medium',
      sessionId: 'session-light-email',
      sessionLabel: 'Light email rewrite',
      verifyWith: { route: 'compare' },
    });
    expect(plan.primaryAction?.implementation.configs.openclaw.configFile.content).toContain('deepseek');
    expect(plan.primaryAction?.implementation.configs.zeroclaw.configFile.content).toContain('deepseek');
    expect(plan.primaryAction?.evidence).toContain('Light email rewrite');
  });

  it('returns an empty plan when there is spend but no actionable saving suggestion', () => {
    vi.spyOn(costParser, 'getUsageStats').mockReturnValue({
      totalCost: 0.5,
      totalTokens: 5_000,
      averageCostPerTask: 0.1,
      topTasks: [],
    } as any);
    vi.spyOn(costParser, 'getSavingSuggestions').mockReturnValue({
      totalPotentialSaving: 0,
      suggestions: [],
    });
    vi.spyOn(tokenWasteAnalyzer, 'getReport').mockReturnValue({
      summary: {
        estimatedWasteTokens: 0,
        estimatedWasteCost: 0,
        signals: 0,
        usingDemo: false,
      },
      diagnostics: [],
    });

    const plan = buildCostAdvisorPlan(30);

    expect(plan.primaryAction).toBeNull();
    expect(plan.summary).toMatchObject({
      totalCost: 0.5,
      estimatedSavingsUsd: 0,
      estimatedSavingsPercent: 0,
      actionCount: 0,
      confidence: 'low',
    });
  });
});
