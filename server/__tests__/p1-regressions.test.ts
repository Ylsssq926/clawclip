import express from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import otelRouter from '../routes/otel.js';
import * as agentDataRoot from '../services/agent-data-root.js';
import { BenchmarkRunner } from '../services/benchmark-runner.js';
import { hermesParser } from '../services/parsers/hermes-parser.js';
import { SessionParser, sessionParser } from '../services/session-parser.js';
import { TokenWasteAnalyzer, detectBadCycle } from '../services/token-waste-analyzer.js';
import type { OtelTracePayload } from '../types/otel.js';
import type { SessionReplay, SessionStep } from '../types/replay.js';

function makeMeta(id: string, totalTokens: number, totalCost: number, stepCount: number, modelUsed: string[]): SessionReplay['meta'] {
  const startTime = new Date('2026-03-18T08:00:00.000Z');
  const endTime = new Date(startTime.getTime() + stepCount * 1000);

  return {
    id,
    agentName: 'p1-regression-test',
    summary: id,
    dataSource: 'real',
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

async function startOtelTestServer(): Promise<{
  request: (pathname: string, init?: RequestInit) => Promise<{ status: number; body: any }>;
  close: () => Promise<void>;
}> {
  const app = express();
  app.use(express.json());
  app.use('/api/otel', otelRouter);

  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('failed to resolve OTEL test server port');
  }

  const baseUrl = `http://127.0.0.1:${address.port}/api/otel`;

  return {
    request: async (pathname, init) => {
      const response = await fetch(`${baseUrl}${pathname}`, init);
      return {
        status: response.status,
        body: await response.json(),
      };
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close(error => {
          if (error) reject(error);
          else resolve();
        });
      }),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('P1 regressions', () => {
  it('keeps tool_call and tool_result types when the raw step carries an error', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clawclip-session-parser-'));
    const agentsDir = path.join(tempRoot, 'agents');
    const sessionsDir = path.join(agentsDir, 'test-agent', 'sessions');

    fs.mkdirSync(sessionsDir, { recursive: true });
    fs.writeFileSync(
      path.join(sessionsDir, 'tool-errors.jsonl'),
      [
        JSON.stringify({
          timestamp: '2026-03-18T08:00:00.000Z',
          function_call: {
            name: 'read_file',
            arguments: JSON.stringify({ path: 'missing.txt' }),
            id: 'call-1',
          },
          error: 'dispatch failed',
        }),
        JSON.stringify({
          type: 'tool_result',
          timestamp: '2026-03-18T08:00:01.000Z',
          tool_name: 'read_file',
          tool_call_id: 'call-1',
          error: 'ENOENT: missing file',
        }),
        JSON.stringify({
          type: 'error',
          timestamp: '2026-03-18T08:00:02.000Z',
          error: 'top level failure',
        }),
      ].join('\n'),
      'utf-8',
    );

    try {
      vi.spyOn(agentDataRoot, 'getLobsterDataRoots').mockReturnValue([
        {
          id: 'env-0',
          label: 'temp-root',
          homeDir: tempRoot,
          agentsDir,
        },
      ]);
      vi.spyOn(hermesParser, 'loadReplays').mockReturnValue([]);

      const replays = new SessionParser().getRealReplays();
      expect(replays).toHaveLength(1);
      expect(replays[0]?.steps.map(step => step.type)).toEqual(['tool_call', 'tool_result', 'system']);
      expect(replays[0]?.steps[0]).toMatchObject({
        type: 'tool_call',
        toolName: 'read_file',
        toolCallId: 'call-1',
        error: 'dispatch failed',
        isError: true,
      });
      expect(replays[0]?.steps[1]).toMatchObject({
        type: 'tool_result',
        toolName: 'read_file',
        toolCallId: 'call-1',
        error: 'ENOENT: missing file',
        isError: true,
      });
      expect(replays[0]?.steps[2]).toMatchObject({
        type: 'system',
        error: 'top level failure',
        isError: true,
      });
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('skips retry-loop diagnostics for low-confidence search/open_url cycles', () => {
    const steps: SessionStep[] = [
      makeStep({
        index: 0,
        type: 'tool_call',
        content: '',
        toolName: 'web_search',
        toolInput: JSON.stringify({ q: '深圳天气预报 今天' }),
        inputTokens: 150,
        outputTokens: 20,
        cost: 0.0015,
      }),
      makeStep({
        index: 1,
        type: 'tool_result',
        content: '',
        toolName: 'web_search',
        toolOutput: '返回了气象台页面和本地天气站链接。',
        outputTokens: 30,
      }),
      makeStep({
        index: 2,
        type: 'tool_call',
        content: '',
        toolName: 'open_url',
        toolInput: JSON.stringify({ url: 'https://weather.example.cn/shenzhen' }),
        inputTokens: 140,
        outputTokens: 18,
        cost: 0.0014,
      }),
      makeStep({
        index: 3,
        type: 'tool_result',
        content: '',
        toolName: 'open_url',
        toolOutput: '页面显示周五有阵雨，最高温 29 度。',
        outputTokens: 35,
      }),
      makeStep({
        index: 4,
        type: 'tool_call',
        content: '',
        toolName: 'web_search',
        toolInput: JSON.stringify({ q: 'OpenTelemetry JS exporter docs' }),
        inputTokens: 155,
        outputTokens: 22,
        cost: 0.00155,
      }),
      makeStep({
        index: 5,
        type: 'tool_result',
        content: '',
        toolName: 'web_search',
        toolOutput: '返回了官方文档、GitHub 仓库和 exporter 配置页面。',
        outputTokens: 32,
      }),
      makeStep({
        index: 6,
        type: 'tool_call',
        content: '',
        toolName: 'open_url',
        toolInput: JSON.stringify({ url: 'https://opentelemetry.io/docs/languages/js/exporters/' }),
        inputTokens: 145,
        outputTokens: 20,
        cost: 0.00145,
      }),
      makeStep({
        index: 7,
        type: 'response',
        content: '我已经找到对应的文档入口。',
      }),
    ];

    const detection = detectBadCycle(steps);
    expect(detection).toMatchObject({ detected: true, confidence: 'low' });

    const replay: SessionReplay = {
      meta: makeMeta('low-confidence-cycle', 1_200, 0.008, steps.length, ['gpt-4o-mini']),
      steps,
    };

    vi.spyOn(sessionParser, 'getRealReplays').mockReturnValue([replay]);

    const report = new TokenWasteAnalyzer().getReport(30);
    expect(report.summary.usingDemo).toBe(false);
    expect(report.diagnostics.find(item => item.type === 'retry-loop')).toBeUndefined();
  });

  it('counts paired errored tool_result steps as failed tool calls in reliability scoring', () => {
    const tempStateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clawclip-benchmark-'));
    const originalStateDir = process.env.CLAWCLIP_STATE_DIR;

    process.env.CLAWCLIP_STATE_DIR = tempStateDir;

    const steps: SessionStep[] = [
      makeStep({
        index: 0,
        type: 'tool_call',
        content: '',
        toolName: 'read_file',
        toolInput: JSON.stringify({ path: 'missing.txt' }),
        toolCallId: 'call-1',
        inputTokens: 120,
        outputTokens: 20,
        cost: 0.0012,
      }),
      makeStep({
        index: 1,
        type: 'tool_result',
        content: '',
        toolName: 'read_file',
        toolCallId: 'call-1',
        toolOutput: 'ENOENT: missing file',
        error: 'ENOENT: missing file',
        isError: true,
        outputTokens: 25,
      }),
      makeStep({
        index: 2,
        type: 'response',
        content: '这个文件不存在，我建议先检查路径。',
        inputTokens: 40,
        outputTokens: 35,
        cost: 0.0008,
      }),
    ];

    const replay: SessionReplay = {
      meta: makeMeta('real/reliability-error', 240, 0.002, steps.length, ['gpt-4o-mini']),
      steps,
    };

    try {
      vi.spyOn(sessionParser, 'getSessions').mockReturnValue([replay.meta]);
      vi.spyOn(sessionParser, 'getSessionReplay').mockReturnValue(replay);

      const result = new BenchmarkRunner().runBenchmark();
      const reliability = result.dimensions.find(dimension => dimension.dimension === 'reliability');

      expect(reliability?.score).toBe(60);
      expect(reliability?.evidence).toContain('失败率 100%');
      expect(reliability?.details).toContain('未能正常衔接结果');
    } finally {
      if (originalStateDir === undefined) delete process.env.CLAWCLIP_STATE_DIR;
      else process.env.CLAWCLIP_STATE_DIR = originalStateDir;
      fs.rmSync(tempStateDir, { recursive: true, force: true });
    }
  });

  it('deduplicates OTEL spans by spanId when the same request is retried', async () => {
    const server = await startOtelTestServer();
    const payload: OtelTracePayload = {
      resourceSpans: [
        {
          resource: {
            attributes: [{ key: 'service.name', value: { stringValue: 'otel-regression-test' } }],
          },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: 'trace-1',
                  spanId: 'span-1',
                  name: 'execute_tool',
                  startTimeUnixNano: '1000000000000000',
                  endTimeUnixNano: '1000000200000000',
                  attributes: [
                    { key: 'gen_ai.operation.name', value: { stringValue: 'execute_tool' } },
                    { key: 'gen_ai.tool.name', value: { stringValue: 'web_search' } },
                    { key: 'gen_ai.usage.input_tokens', value: { intValue: '12' } },
                    { key: 'gen_ai.usage.output_tokens', value: { intValue: '4' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    try {
      await server.request('/sessions', { method: 'DELETE' });

      const first = await server.request('/v1/traces', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const second = await server.request('/v1/traces', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const trace = await server.request('/sessions/trace-1');

      expect(first.status).toBe(200);
      expect(first.body.receivedSpans).toBe(1);
      expect(second.status).toBe(200);
      expect(second.body.receivedSpans).toBe(0);
      expect(trace.status).toBe(200);
      expect(trace.body.meta.stepCount).toBe(1);
      expect(trace.body.meta.totalTokens).toBe(16);
      expect(trace.body.steps).toHaveLength(1);
      expect(trace.body.steps[0]).toMatchObject({
        spanId: 'span-1',
        toolName: 'web_search',
      });
    } finally {
      await server.request('/sessions', { method: 'DELETE' });
      await server.close();
    }
  });
});
