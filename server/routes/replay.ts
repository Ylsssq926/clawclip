import { Router } from 'express';
import type { SessionReplay } from '../types/replay.js';
import { sessionParser } from '../services/session-parser.js';
import { analyzeReplay } from '../services/replay-analyzer.js';
import { buildTaskDescriptor, textSimilarity } from '../services/consistency-tracker.js';
import { findReplayById, getMergedSessionMetas } from '../services/replay-repository.js';

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

    const fallback = String(req.query.fallback ?? '').trim().toLowerCase();
    const rawMinCount = req.query.minCount;
    let minCount = 1;
    if (rawMinCount !== undefined && rawMinCount !== '') {
      const n = parseInt(String(rawMinCount), 10);
      if (Number.isFinite(n) && n > 0) minCount = Math.min(n, 50);
    }

    const sessions = getMergedSessionMetas({
      includeDemoFallback: true,
      minCount: fallback === 'demo' ? minCount : 1,
      limit,
    }).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    res.json(sessions);
  } catch (e) {
    next(e);
  }
});

/** GET /api/replay/diagnostics — JSONL 解析诊断 */
router.get('/diagnostics', (_req, res, next) => {
  try {
    res.json(sessionParser.getDiagnostics());
  } catch (e) {
    next(e);
  }
});

/** GET /api/replay/sessions/:id — 单会话回放（:id 可为 URL 编码） */
router.get('/sessions/:id', (req, res, next) => {
  try {
    const replay = findReplayById(req.params.id);
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

    const replays = ids
      .map(id => findReplayById(id))
      .filter((replay): replay is SessionReplay => replay !== null);

    const results = replays.map(replay => {
      const meta = replay.meta;
      return {
        id: meta.id,
        agentName: meta.agentName,
        label: (meta.sessionLabel || meta.summary || meta.agentName).slice(0, 80),
        totalCost: meta.totalCost,
        totalTokens: meta.totalTokens,
        durationMs: meta.durationMs,
        stepCount: meta.stepCount,
        modelUsed: meta.modelUsed,
        avgTokensPerStep: meta.stepCount > 0 ? Math.round(meta.totalTokens / meta.stepCount) : 0,
        costPerStep: meta.stepCount > 0 ? +(meta.totalCost / meta.stepCount).toFixed(6) : 0,
      };
    });

    const decisionDiff = replays.length >= 2 ? computeDecisionDiff(replays[0], replays[1]) : [];

    res.json({ sessions: results, decisionDiff });
  } catch (e) {
    next(e);
  }
});

interface DecisionDiff {
  stepIndex: number;
  type: 'tool_choice' | 'model_choice' | 'output_divergence';
  sessionA: { value: string; cost: number };
  sessionB: { value: string; cost: number };
  description: string;
}

function computeDecisionDiff(replayA: SessionReplay, replayB: SessionReplay): DecisionDiff[] {
  const diffs: DecisionDiff[] = [];
  const maxSteps = Math.max(replayA.steps.length, replayB.steps.length);

  for (let i = 0; i < maxSteps; i += 1) {
    const stepA = replayA.steps[i];
    const stepB = replayB.steps[i];

    if (!stepA || !stepB) continue;

    if (stepA.type === 'tool_call' && stepB.type === 'tool_call') {
      const toolA = stepA.toolName || '';
      const toolB = stepB.toolName || '';
      if (toolA !== toolB) {
        diffs.push({
          stepIndex: i,
          type: 'tool_choice',
          sessionA: { value: toolA, cost: stepA.cost || 0 },
          sessionB: { value: toolB, cost: stepB.cost || 0 },
          description: `步骤 ${i + 1}: 工具选择不同 (${toolA} vs ${toolB})`,
        });
      }
    }

    if (stepA.model && stepB.model && stepA.model !== stepB.model) {
      diffs.push({
        stepIndex: i,
        type: 'model_choice',
        sessionA: { value: stepA.model, cost: stepA.cost || 0 },
        sessionB: { value: stepB.model, cost: stepB.cost || 0 },
        description: `步骤 ${i + 1}: 模型选择不同 (${stepA.model} vs ${stepB.model})`,
      });
    }

    if (stepA.type === 'response' && stepB.type === 'response') {
      const contentA = stepA.content || '';
      const contentB = stepB.content || '';
      const lenA = contentA.length;
      const lenB = contentB.length;
      const maxLen = Math.max(lenA, lenB);
      const minLen = Math.min(lenA, lenB);

      if (maxLen > 0 && (maxLen - minLen) / maxLen > 0.5) {
        diffs.push({
          stepIndex: i,
          type: 'output_divergence',
          sessionA: { value: `${lenA} 字符`, cost: stepA.cost || 0 },
          sessionB: { value: `${lenB} 字符`, cost: stepB.cost || 0 },
          description: `步骤 ${i + 1}: 输出长度差异明显 (${lenA} vs ${lenB} 字符)`,
        });
      }
    }
  }

  return diffs;
}

/** GET /api/replay/sessions/:id/insights — 会话智能诊断 */
router.get('/sessions/:id/insights', (req, res, next) => {
  try {
    const replay = findReplayById(req.params.id);
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

/** GET /api/replay/similar?sessionId=xxx&limit=5 — 推荐相似 session */
router.get('/similar', (req, res, next) => {
  try {
    const sessionId = String(req.query.sessionId ?? '').trim();
    if (!sessionId) {
      res.status(400).json({ error: '需要 sessionId 参数 / sessionId parameter required' });
      return;
    }

    const raw = req.query.limit;
    let limit = 5;
    if (raw !== undefined && raw !== '') {
      const n = parseInt(String(raw), 10);
      if (Number.isFinite(n) && n > 0) limit = Math.min(n, 20);
    }

    const targetReplay = findReplayById(sessionId);
    if (!targetReplay) {
      res.status(404).json({ error: '会话不存在 / Session not found' });
      return;
    }

    const targetDescriptor = buildTaskDescriptor(targetReplay);
    const allSessions = getMergedSessionMetas({ limit: 200 });

    const similarities = allSessions
      .filter(session => session.id !== sessionId)
      .map(session => {
        const replay = findReplayById(session.id);
        if (!replay) return null;
        const descriptor = buildTaskDescriptor(replay);
        const similarity = textSimilarity(targetDescriptor, descriptor);
        return {
          id: session.id,
          agentName: session.agentName,
          summary: session.summary,
          similarity: Number(similarity.toFixed(4)),
          totalCost: session.totalCost,
          totalTokens: session.totalTokens,
          stepCount: session.stepCount,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    res.json({ similar: similarities });
  } catch (e) {
    next(e);
  }
});

export default router;
