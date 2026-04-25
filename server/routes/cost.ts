import { Router } from 'express';
import type { Request } from 'express';
import { costParser } from '../services/cost-parser.js';
import * as pricingFetcher from '../services/pricing-fetcher.js';
import { tokenWasteAnalyzer } from '../services/token-waste-analyzer.js';
import { getRecommendations } from '../services/solution-recommender.js';

const router = Router();

function parseDays(req: Request, fallback = 30): number {
  const raw = parseInt(String(req.query.days));
  if (!Number.isFinite(raw) || raw < 1 || raw > 365) return fallback;
  return raw;
}

/** 费用汇总 */
router.get('/summary', (req, res) => {
  const days = parseDays(req);
  try {
    const stats = costParser.getUsageStats(days);
    const freshness = costParser.getUsageFreshness();
    const requestCount = costParser.getRequestCount(days);
    const budget = costParser.checkBudgetAlert();
    const wasteReport = tokenWasteAnalyzer.getReport(days);
    const topModelName = Object.entries(costParser.getModelBreakdown(days))
      .sort((left, right) => right[1].cost - left[1].cost)[0]?.[0];
    const recommendations = getRecommendations(
      wasteReport.diagnostics.map(diagnostic => diagnostic.type),
      topModelName,
    ).slice(0, 3);

    res.json({
      ...stats,
      requestCount,
      budget,
      recommendations,
      latestUsageAt: freshness.latestUsageAt,
      dataCutoffAt: freshness.dataCutoffAt,
      costMeta: {
        ...stats.costMeta,
        stale: freshness.pricingStale,
      },
    });
  } catch (e) {
    res.status(500).json({ error: '获取费用数据失败 / Failed to get cost data', detail: String(e) });
  }
});

/** Span-DAG 成本归因 */
router.get('/attribution', (req, res) => {
  const days = parseDays(req);
  try {
    const report = costParser.getCostAttribution(days);
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: '获取成本归因失败 / Failed to get cost attribution', detail: String(e) });
  }
});

/** 参考价格对比 */
router.get('/reference-compare', async (req, res) => {
  const days = parseDays(req);
  try {
    const comparison = await costParser.getReferenceComparison(days);
    res.json(comparison);
  } catch (e) {
    res.status(500).json({ error: '获取参考价格对比失败 / Failed to get reference pricing comparison', detail: String(e) });
  }
});

/** 成本对账 */
router.get('/reconciliation', async (req, res) => {
  const days = parseDays(req);
  const rawBaseline = req.query.baseline;
  const baseline = rawBaseline == null ? 'official-static' : String(rawBaseline);

  if (!pricingFetcher.isPricingReference(baseline)) {
    res.status(400).json({ error: 'baseline 不合法 / Invalid baseline pricing reference' });
    return;
  }

  try {
    const reconciliation = await costParser.getReconciliation(days, baseline);
    res.json(reconciliation);
  } catch (e) {
    res.status(500).json({ error: '获取成本对账失败 / Failed to get cost reconciliation', detail: String(e) });
  }
});

/** 每日明细 */
router.get('/daily', (req, res) => {
  const days = parseDays(req);
  try {
    const daily = costParser.getDailyUsage(days);
    res.json(daily);
  } catch (e) {
    res.status(500).json({ error: '获取每日数据失败 / Failed to get daily data', detail: String(e) });
  }
});

/** 趋势数据（兼容 /trend） */
router.get('/trend', (req, res) => {
  const days = parseDays(req, 7);
  try {
    const daily = costParser.getDailyUsage(days);
    res.json(daily);
  } catch (e) {
    res.status(500).json({ error: '获取趋势数据失败 / Failed to get trend data', detail: String(e) });
  }
});

/** 按模型分组 */
router.get('/models', (req, res) => {
  const days = parseDays(req);
  try {
    const models = costParser.getModelBreakdown(days);
    res.json(models);
  } catch (e) {
    res.status(500).json({ error: '获取模型数据失败 / Failed to get model data', detail: String(e) });
  }
});

/** 高消耗会话排行 */
router.get('/top-sessions', (req, res) => {
  const days = parseDays(req);
  try {
    res.json(costParser.getUsageStats(days).topTasks);
  } catch (e) {
    res.status(500).json({ error: '获取高消耗会话失败 / Failed to get top sessions', detail: String(e) });
  }
});

/** 预算配置 - 读取 */
router.get('/budget', (_req, res) => {
  res.json(costParser.getConfig());
});

/** 预算配置 - 更新 */
router.post('/budget', async (req, res) => {
  try {
    const { monthly, alertThreshold, pricingReference } = req.body;

    if (monthly !== undefined && (typeof monthly !== 'number' || monthly <= 0 || monthly > 1_000_000)) {
      res.status(400).json({ error: '月预算必须是正数 / Monthly budget must be a positive number (1-1000000)' });
      return;
    }
    if (alertThreshold !== undefined && (typeof alertThreshold !== 'number' || alertThreshold < 1 || alertThreshold > 100)) {
      res.status(400).json({ error: '告警阈值须在 1-100 / Alert threshold must be 1-100' });
      return;
    }
    if (pricingReference !== undefined && !pricingFetcher.isPricingReference(pricingReference)) {
      res.status(400).json({ error: '价格参考模式不合法 / Invalid pricing reference' });
      return;
    }

    costParser.saveConfig({ monthly, alertThreshold, pricingReference });
    if (pricingReference !== undefined) {
      await pricingFetcher.getPricingSnapshotAsync(pricingReference);
    }
    res.json({ success: true, config: costParser.getConfig() });
  } catch (e) {
    res.status(500).json({ error: '更新预算失败 / Failed to update budget', detail: String(e) });
  }
});

router.get('/insights', (req, res) => {
  const days = parseDays(req);
  try {
    const insights = costParser.getInsights(days);
    res.json(insights);
  } catch (e) {
    res.status(500).json({ error: '获取洞察数据失败 / Failed to get insights', detail: String(e) });
  }
});

router.get('/savings', (req, res) => {
  const days = parseDays(req);
  try {
    const report = costParser.getSavingSuggestions(days);
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: '获取省钱建议失败 / Failed to get savings', detail: String(e) });
  }
});

/** 获取更便宜的替代方案 */
router.get('/alternatives', (req, res) => {
  try {
    const model = String(req.query.model || '');
    const taskType = req.query.taskType ? String(req.query.taskType) : undefined;

    if (!model) {
      res.status(400).json({ error: '缺少 model 参数 / Missing model parameter' });
      return;
    }

    const result = costParser.getCheaperAlternatives(model, taskType);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: '获取替代方案失败 / Failed to get alternatives', detail: String(e) });
  }
});

export default router;
