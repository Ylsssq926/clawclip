import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_SESSIONS } from '../services/demo-sessions.js';
import { TokenWasteAnalyzer, detectBadCycle } from '../services/token-waste-analyzer.js';
import { sessionParser } from '../services/session-parser.js';
import type { SessionReplay, SessionStep } from '../types/replay.js';

const DAY_MS = 86_400_000;

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

  it('uses the hybrid detector to classify repeated tool paths with confidence', () => {
    const steps: SessionStep[] = [
      makeStep({ index: 0, type: 'user', content: '帮我把文件读出来。' }),
      makeStep({ index: 1, type: 'tool_call', content: '', toolName: 'read_file', toolInput: JSON.stringify({ path: 'src/List.tsx' }) }),
      makeStep({ index: 2, type: 'tool_result', content: '', toolOutput: 'ENOENT: src/List.tsx', error: 'ENOENT: src/List.tsx', isError: true }),
      makeStep({ index: 3, type: 'thinking', content: '路径不对，再试一次。' }),
      makeStep({ index: 4, type: 'tool_call', content: '', toolName: 'read_file', toolInput: JSON.stringify({ path: 'app/src/List.tsx' }) }),
      makeStep({ index: 5, type: 'tool_result', content: '', toolOutput: 'ENOENT: app/src/List.tsx', error: 'ENOENT: app/src/List.tsx', isError: true }),
      makeStep({ index: 6, type: 'thinking', content: '还是不对，再换一个常见路径。' }),
      makeStep({ index: 7, type: 'tool_call', content: '', toolName: 'read_file', toolInput: JSON.stringify({ path: 'frontend/src/List.tsx' }) }),
      makeStep({ index: 8, type: 'response', content: '我先根据报错推断原因。' }),
    ];

    const detection = detectBadCycle(steps);

    expect(detection.detected).toBe(true);
    expect(['high', 'medium']).toContain(detection.confidence);
    expect(detection.pattern).toContain('read_file');
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

  it('flags exact expensive models but excludes cheaper mini variants', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T08:00:00.000Z'));

    const expensiveReplay: SessionReplay = {
      meta: makeMeta('expensive-model', 12_000, 0.12, 3, ['gpt-5.4']),
      steps: [
        makeStep({ index: 0, type: 'user', content: '给我一份策略。' }),
        makeStep({ index: 1, type: 'response', content: '这是策略。', model: 'gpt-5.4', inputTokens: 4_500, outputTokens: 2_500, cost: 0.12 }),
      ],
    };

    const cheapVariantReplay: SessionReplay = {
      meta: makeMeta('cheap-variant', 4_800, 0.004, 2, ['gpt-5.4-mini']),
      steps: [
        makeStep({ index: 0, type: 'user', content: '给我一份简版策略。' }),
        makeStep({ index: 1, type: 'response', content: '这是简版策略。', model: 'gpt-5.4-mini', inputTokens: 1_800, outputTokens: 900, cost: 0.004 }),
      ],
    };

    vi.spyOn(sessionParser, 'getRealReplays').mockReturnValue([expensiveReplay, cheapVariantReplay]);

    const report = new TokenWasteAnalyzer().getReport(30);
    const expensiveSignals = report.diagnostics.filter(item => item.type === 'expensive-model');

    expect(expensiveSignals.some(item => item.sessionId === 'expensive-model')).toBe(true);
    expect(expensiveSignals.some(item => item.sessionId === 'cheap-variant')).toBe(false);
  });

  it('keeps built-in demo sessions in the recent past window', () => {
    const now = Date.now();
    const startTimes = DEMO_SESSIONS.map(replay => replay.meta.startTime.getTime());

    expect(Math.max(...startTimes)).toBeLessThanOrEqual(now - 2 * DAY_MS);
    expect(Math.min(...startTimes)).toBeGreaterThan(now - 30 * DAY_MS);
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
