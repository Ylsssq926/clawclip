import { Router } from 'express';
import { costParser } from '../services/cost-parser.js';

const router = Router();

/** 费用汇总 */
router.get('/summary', (req, res) => {
  const days = parseInt(String(req.query.days)) || 30;
  try {
    const stats = costParser.getUsageStats(days);
    const budget = costParser.checkBudgetAlert();
    res.json({ ...stats, budget });
  } catch (e) {
    res.status(500).json({ error: '获取费用数据失败', detail: String(e) });
  }
});

/** 每日明细 */
router.get('/daily', (req, res) => {
  const days = parseInt(String(req.query.days)) || 30;
  try {
    const daily = costParser.getDailyUsage(days);
    res.json(daily);
  } catch (e) {
    res.status(500).json({ error: '获取每日数据失败', detail: String(e) });
  }
});

/** 按模型分组 */
router.get('/models', (req, res) => {
  const days = parseInt(String(req.query.days)) || 30;
  try {
    const models = costParser.getModelBreakdown(days);
    res.json(models);
  } catch (e) {
    res.status(500).json({ error: '获取模型数据失败', detail: String(e) });
  }
});

/** 预算配置 - 读取 */
router.get('/budget', (_req, res) => {
  res.json(costParser.getConfig());
});

/** 预算配置 - 更新 */
router.post('/budget', (req, res) => {
  try {
    const { monthly, alertThreshold } = req.body;

    if (monthly !== undefined && (typeof monthly !== 'number' || monthly <= 0 || monthly > 1_000_000)) {
      res.status(400).json({ error: '月预算必须是 1-1000000 之间的正数' });
      return;
    }
    if (alertThreshold !== undefined && (typeof alertThreshold !== 'number' || alertThreshold < 1 || alertThreshold > 100)) {
      res.status(400).json({ error: '告警阈值必须是 1-100 之间的数字' });
      return;
    }

    costParser.saveConfig({ monthly, alertThreshold });
    res.json({ success: true, config: costParser.getConfig() });
  } catch (e) {
    res.status(500).json({ error: '更新预算失败', detail: String(e) });
  }
});

router.get('/insights', (req, res) => {
  const days = parseInt(String(req.query.days)) || 30;
  try {
    const insights = costParser.getInsights(days);
    res.json(insights);
  } catch (e) {
    res.status(500).json({ error: '获取洞察数据失败', detail: String(e) });
  }
});

export default router;
