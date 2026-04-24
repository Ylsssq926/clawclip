import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_SESSIONS } from '../services/demo-sessions.js';
import { TokenWasteAnalyzer } from '../services/token-waste-analyzer.js';
import { sessionParser } from '../services/session-parser.js';
import type { SessionReplay, SessionStep } from '../types/replay.js';

function makeMeta(id: string, totalTokens: number, totalCost: number, stepCount: number, modelUsed: string[]): SessionReplay['meta'] {
  const startTime = new Date('2026-03-18T08:00:00.000Z');
  const endTime = new Date(startTime.getTime() + stepCount * 1000);

  return {
    id,
    agentName: 'demo-test',
    summary: id,
    dataSource: 'demo',
    startTime,
    endTime,
    durationMs: endTime.getTime() - startTime.getTime(),
    totalCost,
    totalTokens,
    modelUsed,
    stepCount,
  };
}

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

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TokenWasteAnalyzer', () => {
  it('recognizes retry loops from tool_call -> tool_result(error) -> tool_call patterns', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T08:00:00.000Z'));

    const replay: SessionReplay = {
      meta: makeMeta('retry-demo', 2_200, 0.018, 8, ['gpt-4o-mini']),
      steps: [
        makeStep({ index: 0, type: 'user', content: '帮我重试这个读取动作直到拿到结果。' }),
        makeStep({ index: 1, type: 'tool_call', content: '', model: 'gpt-4o-mini', toolName: 'read_file', inputTokens: 320, outputTokens: 60, cost: 0.0032 }),
        makeStep({ index: 2, type: 'tool_result', content: '', toolOutput: 'ENOENT: missing file', error: 'ENOENT: missing file', isError: true }),
        makeStep({ index: 3, type: 'thinking', content: '第一次失败，再试一次。', model: 'gpt-4o-mini', inputTokens: 120, outputTokens: 40, cost: 0.0012 }),
        makeStep({ index: 4, type: 'tool_call', content: '', model: 'gpt-4o-mini', toolName: 'read_file', inputTokens: 340, outputTokens: 55, cost: 0.0034 }),
        makeStep({ index: 5, type: 'tool_result', content: '', toolOutput: 'timeout after 10000ms', error: 'timeout after 10000ms', isError: true }),
        makeStep({ index: 6, type: 'tool_call', content: '', model: 'gpt-4o-mini', toolName: 'read_file', inputTokens: 360, outputTokens: 52, cost: 0.0036 }),
        makeStep({ index: 7, type: 'response', content: '还是失败了。', model: 'gpt-4o-mini', inputTokens: 140, outputTokens: 60, cost: 0.0014 }),
      ],
    };

    vi.spyOn(sessionParser, 'getRealReplays').mockReturnValue([replay]);

    const report = new TokenWasteAnalyzer().getReport(30);
    const diagnostic = report.diagnostics.find(item => item.type === 'retry-loop');

    expect(report.summary.usingDemo).toBe(false);
    expect(diagnostic).toBeTruthy();
    expect(diagnostic?.descZh).toContain('失败');
    expect(diagnostic?.estimatedWasteTokens).toBeGreaterThan(1_000);
  });

  it('adds demo fallback diagnostics for sparse demo replays instead of returning an empty list', () => {
    const sparseDemoReplay: SessionReplay = {
      meta: makeMeta('demo/sparse', 2_600, 0.0064, 3, ['deepseek-chat']),
      steps: [
        makeStep({ index: 0, type: 'user', content: '背景：' + '这是重复背景。'.repeat(70) }),
        makeStep({ index: 1, type: 'thinking', content: '先消化上下文。', model: 'deepseek-chat', inputTokens: 960, outputTokens: 120, cost: 0.0016 }),
        makeStep({ index: 2, type: 'response', content: '结论：' + '可以，但先给一版简要结论。'.repeat(26), model: 'deepseek-chat', inputTokens: 980, outputTokens: 540, cost: 0.0048 }),
      ],
    };
    const original = [...DEMO_SESSIONS];

    DEMO_SESSIONS.splice(0, DEMO_SESSIONS.length, sparseDemoReplay);
    vi.spyOn(sessionParser, 'getRealReplays').mockReturnValue([]);

    try {
      const report = new TokenWasteAnalyzer().getReport(30);

      expect(report.summary.usingDemo).toBe(true);
      expect(report.diagnostics.some(item => ['long-prompt', 'verbose-output', 'context-bloat'].includes(item.type))).toBe(true);
    } finally {
      DEMO_SESSIONS.splice(0, DEMO_SESSIONS.length, ...original);
    }
  });

  it('emits the promised demo signals from the built-in demo set', () => {
    vi.spyOn(sessionParser, 'getRealReplays').mockReturnValue([]);

    const report = new TokenWasteAnalyzer().getReport(30);
    const signalTypes = new Set(report.diagnostics.map(item => item.type));

    expect(report.summary.usingDemo).toBe(true);
    expect(report.summary.signals).toBeGreaterThanOrEqual(3);
    expect(signalTypes.has('retry-loop')).toBe(true);
    expect(signalTypes.has('expensive-model')).toBe(true);
    expect(['long-prompt', 'verbose-output', 'context-bloat'].some(type => signalTypes.has(type as typeof report.diagnostics[number]['type']))).toBe(true);
  });
});
