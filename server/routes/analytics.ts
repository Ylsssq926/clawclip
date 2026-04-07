import { Router } from 'express';
import { analyticsEngine } from '../services/analytics-engine.js';
import { getPromptInsights } from '../services/prompt-analyzer.js';
import { tokenWasteAnalyzer } from '../services/token-waste-analyzer.js';

const router = Router();

function parseDays(rawDays: unknown): number | undefined {
  if (rawDays === undefined || rawDays === '') return undefined;
  const days = parseInt(String(rawDays), 10);
  if (!Number.isFinite(days) || days <= 0) return undefined;
  return Math.min(days, 365);
}

/** GET /api/analytics/keywords?days=30&limit=50 — 关键词列表 */
router.get('/keywords', (req, res, next) => {
  try {
    const days = parseDays(req.query.days);
    let limit: number | undefined;
    const rawLimit = req.query.limit;
    if (rawLimit !== undefined && rawLimit !== '') {
      const n = parseInt(String(rawLimit), 10);
      if (Number.isFinite(n) && n > 0) limit = Math.min(n, 500);
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

/** GET /api/analytics/prompt-insights?days=30 — Prompt 效率分析 */
router.get('/prompt-insights', (req, res, next) => {
  try {
    res.json(getPromptInsights(parseDays(req.query.days)));
  } catch (e) {
    next(e);
  }
});

/** GET /api/analytics/token-waste?days=30 — Token 浪费诊断 */
router.get('/token-waste', (req, res, next) => {
  try {
    res.json(tokenWasteAnalyzer.getReport(parseDays(req.query.days)));
  } catch (e) {
    next(e);
  }
});

export default router;
