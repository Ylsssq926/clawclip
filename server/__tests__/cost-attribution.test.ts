import { afterEach, describe, expect, it, vi } from 'vitest';
import { attributeCosts } from '../services/cost-attribution.js';
import * as pricingFetcher from '../services/pricing-fetcher.js';
import { DEFAULT_DETAILED_PRICING, DEFAULT_MODEL_PRICING } from '../types/index.js';
import type { PricingSnapshot } from '../services/pricing-fetcher.js';
import type { SessionStep } from '../types/replay.js';

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

const PRICING_SNAPSHOT: PricingSnapshot = {
  pricing: DEFAULT_MODEL_PRICING,
  detailed: DEFAULT_DETAILED_PRICING,
  reference: 'official-static',
  source: 'static-default',
  updatedAt: new Date('2026-03-18T08:00:00.000Z').toISOString(),
  catalogVersion: 'static/test',
  stale: false,
  pricingMode: 'detailed-input-output-v1',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('attributeCosts', () => {
  it('attributes direct and fully-loaded tool costs with fallback pricing estimates', () => {
    const steps: SessionStep[] = [
      makeStep({ index: 0, type: 'user', content: '帮我读文件并修掉报错。' }),
      makeStep({ index: 1, type: 'tool_call', content: '', model: 'gpt-4o-mini', toolName: 'read_file', toolCallId: 'read-1', inputTokens: 1000, outputTokens: 200 }),
      makeStep({ index: 2, type: 'tool_result', content: '', toolOutput: 'ENOENT: missing file', error: 'ENOENT: missing file', isError: true, toolCallId: 'read-1' }),
      makeStep({ index: 3, type: 'thinking', content: '路径不对，再试一次。', model: 'gpt-4o-mini', inputTokens: 600, outputTokens: 100 }),
      makeStep({ index: 4, type: 'tool_call', content: '', model: 'gpt-4o-mini', toolName: 'read_file', toolCallId: 'read-2', inputTokens: 900, outputTokens: 120 }),
      makeStep({ index: 5, type: 'tool_result', content: '', toolOutput: 'ok', toolCallId: 'read-2' }),
      makeStep({ index: 6, type: 'response', content: '已经定位到问题。', model: 'gpt-4o-mini', inputTokens: 400, outputTokens: 250 }),
    ];

    vi.spyOn(pricingFetcher, 'getPricingSnapshot').mockReturnValue(PRICING_SNAPSHOT);

    const report = attributeCosts(steps);

    expect(report.byTask['read-1']).toMatchObject({ tokens: 1900 });
    expect(report.byTask['read-1']?.directCost).toBeCloseTo(0.00027, 10);
    expect(report.byTask['read-1']?.fullyLoadedCost).toBeCloseTo(0.00042, 10);
    expect(report.byTask['read-2']).toMatchObject({ tokens: 1670 });
    expect(report.byTask['read-2']?.directCost).toBeCloseTo(0.000207, 10);
    expect(report.byTask['read-2']?.fullyLoadedCost).toBeCloseTo(0.000417, 10);

    expect(report.byTool.read_file).toMatchObject({ callCount: 2, failCount: 1 });
    expect(report.byTool.read_file.directCost).toBeCloseTo(0.000477, 10);
    expect(report.byTool.read_file.fullyLoadedCost).toBeCloseTo(0.000837, 10);

    expect(report.byModel['gpt-4o-mini']).toMatchObject({ inputTokens: 2900, outputTokens: 670, callCount: 4 });
    expect(report.byModel['gpt-4o-mini']?.cost).toBeCloseTo(0.000837, 10);

    expect(report.summary.totalCost).toBeCloseTo(0.000837, 10);
    expect(report.summary.costPerStep).toBeCloseTo(0.00012, 10);
    expect(report.summary.mostExpensiveTool).toBe('read_file');
    expect(report.summary.mostExpensiveModel).toBe('gpt-4o-mini');
    expect(report.summary.wastedCost).toBeCloseTo(0.00027, 10);
  });
});
