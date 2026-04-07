import { Router } from 'express';
import { benchmarkRunner } from '../services/benchmark-runner.js';
import { sessionParser } from '../services/session-parser.js';
import type { BenchmarkResult } from '../types/benchmark.js';

const router = Router();

type SampleCountConfidence = 'low' | 'medium' | 'high';

interface BenchmarkProofDeltas {
  score: number;
  tokens: number;
  cost: number;
  costPct?: number;
  tokensPct?: number;
}

interface BenchmarkProofResponse {
  latest: BenchmarkResult;
  previous: BenchmarkResult | null;
  deltas: BenchmarkProofDeltas | null;
  verdictZh?: string;
  verdictEn?: string;
}

function resolveSampleCountConfidence(sessionCount: number): SampleCountConfidence {
  if (sessionCount < 3) return 'low';
  if (sessionCount < 10) return 'medium';
  return 'high';
}

function resolveLatestSessionAt(items: Array<{ endTime: Date }>): string | undefined {
  let latestTs = 0;

  for (const item of items) {
    const ts = item.endTime.getTime();
    if (!Number.isNaN(ts) && ts > latestTs) {
      latestTs = ts;
    }
  }

  return latestTs > 0 ? new Date(latestTs).toISOString() : undefined;
}

function resolveBenchmarkFreshness(latest: BenchmarkResult | null): {
  dataCutoffAt?: string;
  sampleCountConfidence: SampleCountConfidence;
} {
  const sessions = sessionParser.getSessions();

  if (!latest) {
    return {
      dataCutoffAt: resolveLatestSessionAt(sessions),
      sampleCountConfidence: resolveSampleCountConfidence(sessions.length),
    };
  }

  const runAtTs = latest.runAt.getTime();
  const sessionsAtRun = sessions.filter(session => session.endTime.getTime() <= runAtTs);
  const freshnessSource = sessionsAtRun.length > 0 ? sessionsAtRun : sessions;

  return {
    dataCutoffAt: resolveLatestSessionAt(freshnessSource),
    sampleCountConfidence: resolveSampleCountConfidence(latest.totalSessions),
  };
}

function resolveDeltaPct(current: number, previous: number): number | undefined {
  if (!Number.isFinite(previous) || previous === 0) return undefined;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function resolveProofVerdict(scoreDelta: number, costDelta: number): { zh: string; en: string } {
  if (scoreDelta >= 0 && costDelta < 0) {
    return {
      zh: '这次优化质量没掉，成本还降了，值得保留。',
      en: 'Quality held up and cost went down — this optimization is worth keeping.',
    };
  }

  if (scoreDelta > 0 && costDelta > 0) {
    return {
      zh: '质量提升了，但成本也上去了，适合高价值任务。',
      en: 'Quality improved, but cost also rose — better suited to high-value tasks.',
    };
  }

  if (scoreDelta < 0 && costDelta < 0) {
    return {
      zh: '成本降了，但质量也在回落，建议观察是否过度降配。',
      en: 'Cost dropped, but quality also slipped — watch for over-optimization.',
    };
  }

  if (scoreDelta < 0 && costDelta >= 0) {
    return {
      zh: '这次调整既没省钱也没提分，建议回退或重新试验。',
      en: 'This change neither saved money nor improved quality — consider reverting or retrying.',
    };
  }

  if (scoreDelta > 0 && costDelta === 0) {
    return {
      zh: '质量提升了，成本基本持平，这次优化可以继续沿用。',
      en: 'Quality improved while cost stayed flat — this optimization looks worth keeping.',
    };
  }

  if (scoreDelta === 0 && costDelta > 0) {
    return {
      zh: '质量没有明显变化，但成本上去了，暂不建议扩大使用。',
      en: 'Quality stayed flat while cost increased — not a strong candidate to scale out.',
    };
  }

  return {
    zh: '这次调整变化不大，建议再多跑几次 benchmark 观察趋势。',
    en: 'The change is small so far — run a few more benchmarks to confirm the trend.',
  };
}

function buildBenchmarkProof(latest: BenchmarkResult, previous: BenchmarkResult | null): BenchmarkProofResponse {
  if (!previous) {
    return {
      latest,
      previous: null,
      deltas: null,
    };
  }

  const deltas: BenchmarkProofDeltas = {
    score: latest.overallScore - previous.overallScore,
    tokens: latest.totalTokens - previous.totalTokens,
    cost: latest.totalCost - previous.totalCost,
    tokensPct: resolveDeltaPct(latest.totalTokens, previous.totalTokens),
    costPct: resolveDeltaPct(latest.totalCost, previous.totalCost),
  };
  const verdict = resolveProofVerdict(deltas.score, deltas.cost);

  return {
    latest,
    previous,
    deltas,
    verdictZh: verdict.zh,
    verdictEn: verdict.en,
  };
}

/** GET /api/benchmark/meta — 评测数据是否基于内置 Demo 会话 */
router.get('/meta', (_req, res) => {
  try {
    const latest = benchmarkRunner.getLatest();
    const freshness = resolveBenchmarkFreshness(latest);
    res.json({
      dataSource: benchmarkRunner.getSessionDataSource(),
      ...freshness,
    });
  } catch (e) {
    res.status(500).json({ error: '获取评测元信息失败 / Failed to get benchmark meta', detail: String(e) });
  }
});

/** POST /api/benchmark/run — 执行评测（离线分析，不调 LLM） */
router.post('/run', (_req, res) => {
  try {
    const result = benchmarkRunner.runBenchmark();
    res.json({
      ...result,
      ...resolveBenchmarkFreshness(result),
    });
  } catch (e) {
    res.status(500).json({ error: '执行评测失败 / Benchmark run failed', detail: String(e) });
  }
});

/** GET /api/benchmark/latest — 获取最近一次评测结果 */
router.get('/latest', (_req, res) => {
  try {
    const latest = benchmarkRunner.getLatest();
    if (!latest) {
      res.status(404).json({ error: '暂无评测记录 / No benchmark results yet. Run POST /api/benchmark/run first.' });
      return;
    }
    res.json({
      ...latest,
      ...resolveBenchmarkFreshness(latest),
    });
  } catch (e) {
    res.status(500).json({ error: '获取最新评测失败 / Failed to get latest benchmark', detail: String(e) });
  }
});

/** GET /api/benchmark/history — 获取历史评测列表 */
router.get('/history', (_req, res) => {
  try {
    const history = benchmarkRunner.getHistory();
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: '获取评测历史失败 / Failed to get benchmark history', detail: String(e) });
  }
});

/** GET /api/benchmark/proof — 比较最近两次评测，给出优化前后证明 */
router.get('/proof', (_req, res) => {
  try {
    const latest = benchmarkRunner.getLatest();
    if (!latest) {
      res.status(404).json({ error: '暂无评测记录 / No benchmark results yet. Run POST /api/benchmark/run first.' });
      return;
    }

    const history = benchmarkRunner.getHistory();
    const sortedResults = [...history.results].sort((a, b) => b.runAt.getTime() - a.runAt.getTime());
    const previous = sortedResults.find(item => item.id !== latest.id) ?? null;

    res.json(buildBenchmarkProof(latest, previous));
  } catch (e) {
    res.status(500).json({ error: '获取优化前后证明失败 / Failed to get benchmark proof', detail: String(e) });
  }
});

export default router;
