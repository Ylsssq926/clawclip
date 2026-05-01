import { Router } from 'express';
import type { Request } from 'express';
import { buildCostAdvisorPlan } from '../services/cost-advisor.js';

const router = Router();

function parseDays(req: Request, fallback = 30): number {
  const raw = parseInt(String(req.query.days));
  if (!Number.isFinite(raw) || raw < 1 || raw > 365) return fallback;
  return raw;
}

router.get('/plan', (req, res) => {
  try {
    res.json(buildCostAdvisorPlan(parseDays(req)));
  } catch (error) {
    res.status(500).json({ error: '生成省钱方案失败 / Failed to build cost advisor plan', detail: String(error) });
  }
});

export default router;
