import { Router } from 'express';
import { benchmarkRunner } from '../services/benchmark-runner.js';
import { sessionParser } from '../services/session-parser.js';
import type { BenchmarkResult } from '../types/benchmark.js';

const router = Router();

type SampleCountConfidence = 'low' | 'medium' | 'high';

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

export default router;
