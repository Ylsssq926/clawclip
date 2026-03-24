import { Router } from 'express';
import { analyticsEngine } from '../services/analytics-engine.js';

const router = Router();

/** GET /api/analytics/keywords?days=30&limit=50 — 关键词列表 */
router.get('/keywords', (req, res, next) => {
  try {
    let days: number | undefined;
    const rawDays = req.query.days;
    if (rawDays !== undefined && rawDays !== '') {
      const n = parseInt(String(rawDays), 10);
      if (Number.isFinite(n) && n > 0) days = n;
    }
    let limit: number | undefined;
    const rawLimit = req.query.limit;
    if (rawLimit !== undefined && rawLimit !== '') {
      const n = parseInt(String(rawLimit), 10);
      if (Number.isFinite(n) && n > 0) limit = n;
    }
    const data = analyticsEngine.getKeywords(days, limit);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/** GET /api/analytics/tags — 所有标签及会话数 */
router.get('/tags', (_req, res, next) => {
  try {
    const tags = analyticsEngine.getTags();
    res.json(tags);
  } catch (e) {
    next(e);
  }
});

/** GET /api/analytics/session-tags — 每个会话的标签映射 */
router.get('/session-tags', (_req, res, next) => {
  try {
    const map = analyticsEngine.getSessionTags();
    res.json(map);
  } catch (e) {
    next(e);
  }
});

export default router;
