import { Router } from 'express';
import { sessionParser } from '../services/session-parser.js';

const router = Router();

/** GET /api/replay/sessions?limit=20 — 会话列表（新在前） */
router.get('/sessions', (req, res, next) => {
  try {
    const raw = req.query.limit;
    let limit: number | undefined;
    if (raw !== undefined && raw !== '') {
      const n = parseInt(String(raw), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
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
      res.status(404).json({ error: '会话不存在' });
      return;
    }
    res.json(replay);
  } catch (e) {
    next(e);
  }
});

export default router;
