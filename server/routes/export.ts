import { Router } from 'express';
import { sessionParser } from '../services/session-parser.js';
import { costParser } from '../services/cost-parser.js';
import { benchmarkRunner } from '../services/benchmark-runner.js';

const router = Router();

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

/** GET /api/export/sessions?format=csv|json&days=30 */
router.get('/sessions', (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const rawDays = req.query.days;
    const days = rawDays ? Math.min(Math.max(parseInt(String(rawDays), 10) || 30, 1), 365) : 30;
    const cutoff = Date.now() - days * 86400_000;

    const sessions = sessionParser.getSessions(200)
      .filter(s => s.endTime.getTime() >= cutoff);

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="clawclip-sessions.json"');
      res.json(sessions);
      return;
    }

    const headers = ['id', 'agent', 'startTime', 'endTime', 'durationMs', 'totalCost', 'totalTokens', 'models', 'steps', 'summary'];
    const rows = sessions.map(s => [
      s.id,
      s.agentName,
      s.startTime.toISOString(),
      s.endTime.toISOString(),
      String(s.durationMs),
      s.totalCost.toFixed(6),
      String(s.totalTokens),
      (s.modelUsed ?? []).join('; '),
      String(s.stepCount),
      (s.summary || '').slice(0, 200),
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clawclip-sessions.csv"');
    res.send('\uFEFF' + toCsv(headers, rows));
  } catch (e) {
    next(e);
  }
});

/** GET /api/export/costs?format=csv|json&days=30 */
router.get('/costs', (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const rawDays = req.query.days;
    const days = rawDays ? Math.min(Math.max(parseInt(String(rawDays), 10) || 30, 1), 365) : 30;

    const daily = costParser.getDailyUsage(days);
    const models = costParser.getModelBreakdown(days);

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="clawclip-costs.json"');
      res.json({ daily, models });
      return;
    }

    const headers = ['date', 'cost', 'tokens'];
    const rows = daily.map(d => [
      d.date,
      d.cost.toFixed(6),
      String(d.totalTokens),
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clawclip-costs.csv"');
    res.send('\uFEFF' + toCsv(headers, rows));
  } catch (e) {
    next(e);
  }
});

/** GET /api/export/benchmark?format=csv|json */
router.get('/benchmark', (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const history = benchmarkRunner.getHistory();

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="clawclip-benchmark.json"');
      res.json(history);
      return;
    }

    const headers = ['id', 'runAt', 'overallScore', 'rank', 'writing', 'coding', 'toolUse', 'search', 'safety', 'costEfficiency', 'sessions', 'tokens', 'cost', 'topModel'];
    const rows = history.results.map(r => {
      const dimMap: Record<string, number> = {};
      for (const d of r.dimensions) dimMap[d.dimension] = d.score;
      return [
        r.id,
        r.runAt instanceof Date ? r.runAt.toISOString() : String(r.runAt),
        String(r.overallScore),
        r.rank,
        String(dimMap['writing'] ?? ''),
        String(dimMap['coding'] ?? ''),
        String(dimMap['toolUse'] ?? ''),
        String(dimMap['search'] ?? ''),
        String(dimMap['safety'] ?? ''),
        String(dimMap['costEfficiency'] ?? ''),
        String(r.totalSessions),
        String(r.totalTokens),
        r.totalCost.toFixed(6),
        r.topModel,
      ];
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clawclip-benchmark.csv"');
    res.send('\uFEFF' + toCsv(headers, rows));
  } catch (e) {
    next(e);
  }
});

export default router;
