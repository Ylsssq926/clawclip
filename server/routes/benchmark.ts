import { Router } from 'express';
import { benchmarkRunner } from '../services/benchmark-runner.js';

const router = Router();

/** POST /api/benchmark/run — 执行评测（离线分析，不调 LLM） */
router.post('/run', (_req, res) => {
  try {
    const result = benchmarkRunner.runBenchmark();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: '执行评测失败', detail: String(e) });
  }
});

/** GET /api/benchmark/latest — 获取最近一次评测结果 */
router.get('/latest', (_req, res) => {
  try {
    const latest = benchmarkRunner.getLatest();
    if (!latest) {
      res.status(404).json({ error: '暂无评测记录，可先 POST /api/benchmark/run' });
      return;
    }
    res.json(latest);
  } catch (e) {
    res.status(500).json({ error: '获取最新评测失败', detail: String(e) });
  }
});

/** GET /api/benchmark/history — 获取历史评测列表 */
router.get('/history', (_req, res) => {
  try {
    const history = benchmarkRunner.getHistory();
    res.json(history);
  } catch (e) {
    res.status(500).json({ error: '获取评测历史失败', detail: String(e) });
  }
});

export default router;
