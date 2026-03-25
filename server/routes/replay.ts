import { Router } from 'express';
import { sessionParser } from '../services/session-parser.js';
import { analyzeReplay } from '../services/replay-analyzer.js';

const router = Router();

/** GET /api/replay/sessions?limit=20 — 会话列表（新在前） */
router.get('/sessions', (req, res, next) => {
  try {
    const raw = req.query.limit;
    let limit: number | undefined;
    if (raw !== undefined && raw !== '') {
      const n = parseInt(String(raw), 10);
      if (Number.isFinite(n) && n > 0) limit = Math.min(n, 200);
    }
    const sessions = sessionParser.getSessions(limit);
    res.json(sessions);
  } catch (e) {
    next(e);
  }
});

/** GET /api/replay/sessions/:id — 单会话回放（:id 可为 URL 编码） */
router.get('/sessions/:id', (req, res, next) => {
  try {
    const replay = sessionParser.getSessionReplay(req.params.id);
    if (!replay) {
      res.status(404).json({ error: '会话不存在 / Session not found' });
      return;
    }
    res.json(replay);
  } catch (e) {
    next(e);
  }
});

/** POST /api/replay/compare — 多会话对比 */
router.post('/compare', (req, res, next) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 5) {
      res.status(400).json({ error: '需要 2-5 个会话 ID / Need 2-5 session IDs' });
      return;
    }
    const results = ids.map(id => {
      const replay = sessionParser.getSessionReplay(id);
      if (!replay) return null;
      const m = replay.meta;
      return {
        id: m.id,
        agentName: m.agentName,
        label: (m.sessionLabel || m.summary || m.agentName).slice(0, 80),
        totalCost: m.totalCost,
        totalTokens: m.totalTokens,
        durationMs: m.durationMs,
        stepCount: m.stepCount,
        modelUsed: m.modelUsed,
        avgTokensPerStep: m.stepCount > 0 ? Math.round(m.totalTokens / m.stepCount) : 0,
        costPerStep: m.stepCount > 0 ? +(m.totalCost / m.stepCount).toFixed(6) : 0,
      };
    }).filter(Boolean);
    res.json({ sessions: results });
  } catch (e) {
    next(e);
  }
});

/** GET /api/replay/sessions/:id/insights — 会话智能诊断 */
router.get('/sessions/:id/insights', (req, res, next) => {
  try {
    const replay = sessionParser.getSessionReplay(req.params.id);
    if (!replay) {
      res.status(404).json({ error: '会话不存在 / Session not found' });
      return;
    }
    const insights = analyzeReplay(replay);
    res.json({ insights });
  } catch (e) {
    next(e);
  }
});

export default router;
