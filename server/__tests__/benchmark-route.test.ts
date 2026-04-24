import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import benchmarkRouter from '../routes/benchmark.js';
import { benchmarkRunner } from '../services/benchmark-runner.js';
import type { BenchmarkResult } from '../types/benchmark.js';

function makeBenchmarkResult(overrides: Partial<BenchmarkResult>): BenchmarkResult {
  return {
    id: overrides.id ?? 'benchmark-test',
    runAt: overrides.runAt ?? new Date('2026-03-18T09:00:00.000Z'),
    overallScore: overrides.overallScore ?? 70,
    rank: overrides.rank ?? 'B',
    dimensions: overrides.dimensions ?? [],
    totalSessions: overrides.totalSessions ?? 8,
    totalTokens: overrides.totalTokens ?? 10_000,
    totalCost: overrides.totalCost ?? 0.8,
    avgCostPerSession: overrides.avgCostPerSession ?? 0.1,
    topModel: overrides.topModel ?? 'deepseek-chat',
    summary: overrides.summary ?? 'test summary',
    summaryEn: overrides.summaryEn,
    dataSource: overrides.dataSource ?? 'real',
    costMeta: overrides.costMeta,
  };
}

async function requestProof(): Promise<{ status: number; body: any }> {
  const app = express();
  app.use('/api/benchmark', benchmarkRouter);

  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('failed to resolve test server port');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/api/benchmark/proof`);
    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/benchmark/proof', () => {
  it('does not present demo history as real before/after proof', async () => {
    const previous = makeBenchmarkResult({
      id: 'benchmark-demo-8',
      runAt: new Date('2026-03-17T09:00:00.000Z'),
      overallScore: 72,
      totalTokens: 380_000,
      totalCost: 4.15,
      dataSource: 'demo',
    });
    const latest = makeBenchmarkResult({
      id: 'benchmark-demo-live',
      runAt: new Date('2026-03-18T09:00:00.000Z'),
      overallScore: 74,
      totalTokens: 410_000,
      totalCost: 4.6,
      dataSource: 'demo',
    });

    vi.spyOn(benchmarkRunner, 'getLatest').mockReturnValue(latest);
    vi.spyOn(benchmarkRunner, 'getHistory').mockReturnValue({ results: [previous, latest] });

    const { status, body } = await requestProof();

    expect(status).toBe(200);
    expect(body.sampleComparison).toBe(true);
    expect(body.previous).toBeNull();
    expect(body.deltas).toBeNull();
    expect(body.verdictZh).toMatch(/示例|sample/i);
  });

  it('still returns real deltas when benchmark history is real', async () => {
    const previous = makeBenchmarkResult({
      id: 'benchmark-real-prev',
      runAt: new Date('2026-03-17T09:00:00.000Z'),
      overallScore: 68,
      totalTokens: 12_000,
      totalCost: 1.2,
      dataSource: 'real',
    });
    const latest = makeBenchmarkResult({
      id: 'benchmark-real-latest',
      runAt: new Date('2026-03-18T09:00:00.000Z'),
      overallScore: 74,
      totalTokens: 10_000,
      totalCost: 0.9,
      dataSource: 'real',
    });

    vi.spyOn(benchmarkRunner, 'getLatest').mockReturnValue(latest);
    vi.spyOn(benchmarkRunner, 'getHistory').mockReturnValue({ results: [previous, latest] });

    const { status, body } = await requestProof();

    expect(status).toBe(200);
    expect(body.sampleComparison).not.toBe(true);
    expect(body.previous?.id).toBe('benchmark-real-prev');
    expect(body.deltas).toMatchObject({
      score: 6,
      tokens: -2_000,
      cost: -0.3,
    });
    expect(body.verdictZh).toContain('成本还降了');
  });
});
