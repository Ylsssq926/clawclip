import { describe, expect, it } from 'vitest';
import { CostParser } from '../services/cost-parser.js';
import type { SessionReplay, SessionStep } from '../types/replay.js';
import { DEFAULT_DETAILED_PRICING, DEFAULT_MODEL_PRICING } from '../types/index.js';
import type { PricingSnapshot } from '../services/pricing-fetcher.js';

function makeStep(partial: Partial<SessionStep> & Pick<SessionStep, 'index' | 'type' | 'content'>): SessionStep {
  return {
    timestamp: new Date(`2026-03-18T08:00:0${partial.index}.000Z`),
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
    durationMs: 0,
    ...partial,
  };
}

describe('CostParser.getCostAttribution', () => {
  it('merges per-session attributions into a report payload', () => {
    const parser = new CostParser();
    const now = new Date();
    const pricing: PricingSnapshot = {
      pricing: DEFAULT_MODEL_PRICING,
      detailed: DEFAULT_DETAILED_PRICING,
      reference: 'official-static',
      source: 'static-default',
      updatedAt: now.toISOString(),
      catalogVersion: `static/${now.toISOString()}`,
      stale: false,
      pricingMode: 'detailed-input-output-v1',
    };

    const replay: SessionReplay = {
      meta: {
        id: 'sess-attribution',
        agentName: 'ClawClip',
        summary: 'Attribution demo',
        sessionLabel: 'Attribution demo',
        dataSource: 'demo',
        startTime: now,
        endTime: now,
        durationMs: 0,
        totalCost: 0,
        totalTokens: 0,
        modelUsed: ['gpt-4o-mini'],
        stepCount: 4,
      },
      steps: [
        makeStep({ index: 0, type: 'tool_call', content: '', model: 'gpt-4o-mini', toolName: 'read_file', toolCallId: 'read-1', inputTokens: 1000, outputTokens: 200 }),
        makeStep({ index: 1, type: 'tool_result', content: '', toolOutput: 'ENOENT', error: 'ENOENT', isError: true, toolCallId: 'read-1' }),
        makeStep({ index: 2, type: 'thinking', content: '再试一次。', model: 'gpt-4o-mini', inputTokens: 500, outputTokens: 100 }),
        makeStep({ index: 3, type: 'response', content: '先根据现有信息给建议。', model: 'gpt-4o-mini', inputTokens: 300, outputTokens: 150 }),
      ],
    };

    (parser as unknown as { getCachedUsageBatch: () => unknown }).getCachedUsageBatch = () => ({
      at: now.getTime(),
      data: [],
      pricing,
      replays: [replay],
      isDemo: true,
      usageSource: 'demo',
    });

    const report = parser.getCostAttribution(30);

    expect(report.usingDemo).toBe(true);
    expect(report.costMeta.usageSource).toBe('demo');
    expect(report.attribution.byTask['sess-attribution::read-1']).toBeTruthy();
    expect(report.attribution.byTool.read_file.callCount).toBe(1);
    expect(report.attribution.summary.totalCost).toBeGreaterThan(0);
    expect(report.attribution.summary.wastedCost).toBeGreaterThan(0);
    expect(report.attribution.summary.mostExpensiveModel).toBe('gpt-4o-mini');
  });
});
