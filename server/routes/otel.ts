import { Router } from 'express';
import type { OtelTracePayload } from '../types/otel.js';
import { normalizeOtelSpan, extractServiceName } from '../services/otel-normalizer.js';
import type { SessionReplay, SessionStep } from '../types/replay.js';
import { log } from '../services/logger.js';
import {
  clearOtelSessions,
  deleteOtelSessionReplay,
  getOtelSessionCount,
  getOtelSessionReplay,
  getOtelSessionReplays,
  inferOtelDataSource,
  setOtelSessionReplay,
} from '../services/otel-session-store.js';

const router = Router();

/**
 * POST /api/otel/v1/traces
 * 接收 OTLP JSON 格式的 trace 数据
 */
router.post('/v1/traces', (req, res, next) => {
  try {
    const payload = req.body as OtelTracePayload;

    if (!payload.resourceSpans || !Array.isArray(payload.resourceSpans)) {
      res.status(400).json({ error: 'Invalid OTLP payload: missing resourceSpans' });
      return;
    }

    let totalSpans = 0;

    for (const resourceSpan of payload.resourceSpans) {
      const resource = resourceSpan.resource;
      const serviceName = extractServiceName(resource);

      for (const scopeSpan of resourceSpan.scopeSpans) {
        const spans = scopeSpan.spans;
        if (!spans || spans.length === 0) continue;

        const dataSource = inferOtelDataSource(resource, scopeSpan.scope?.name, serviceName);

        // 按 traceId 分组
        const traceGroups = new Map<string, typeof spans>();
        for (const span of spans) {
          const existing = traceGroups.get(span.traceId) || [];
          existing.push(span);
          traceGroups.set(span.traceId, existing);
        }

        // 为每个 trace 创建或更新 SessionReplay
        for (const [traceId, traceSpans] of traceGroups) {
          let session = getOtelSessionReplay(traceId);

          if (!session) {
            const firstSpan = traceSpans[0];
            const startTime = new Date(Math.floor(parseInt(firstSpan.startTimeUnixNano, 10) / 1_000_000));

            session = {
              meta: {
                id: traceId,
                agentName: serviceName,
                dataSource,
                startTime,
                endTime: startTime,
                durationMs: 0,
                totalCost: 0,
                totalTokens: 0,
                modelUsed: [],
                stepCount: 0,
                summary: `OTEL trace from ${serviceName}`,
              },
              steps: [],
            };
            setOtelSessionReplay(traceId, session);
          } else {
            if ((!session.meta.dataSource || session.meta.dataSource === 'otel') && dataSource !== 'otel') {
              session.meta.dataSource = dataSource;
            }
            if ((!session.meta.agentName || session.meta.agentName === 'unknown-agent') && serviceName) {
              session.meta.agentName = serviceName;
            }
          }

          const existingSpanIds = new Set(
            session.steps.map(step => step.spanId).filter((spanId): spanId is string => Boolean(spanId)),
          );

          // 转换并添加 spans
          for (const span of traceSpans) {
            if (existingSpanIds.has(span.spanId)) {
              continue;
            }

            const step = normalizeOtelSpan(span, resource, session.steps.length) as SessionStep;
            existingSpanIds.add(span.spanId);

            const endTime = new Date(Math.floor(parseInt(span.endTimeUnixNano, 10) / 1_000_000));
            if (endTime > session.meta.endTime) {
              session.meta.endTime = endTime;
            }

            if (step.timestamp < session.meta.startTime) {
              session.meta.startTime = step.timestamp;
            }

            session.meta.totalTokens += (step.inputTokens ?? 0) + (step.outputTokens ?? 0);
            session.meta.totalCost += step.cost ?? 0;

            if (step.model && !session.meta.modelUsed.includes(step.model)) {
              session.meta.modelUsed.push(step.model);
            }

            session.steps.push(step);
            session.meta.stepCount = session.steps.length;
            totalSpans += 1;
          }

          session.steps.sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
          session.steps.forEach((step, index) => {
            step.index = index;
          });

          session.meta.durationMs = session.meta.endTime.getTime() - session.meta.startTime.getTime();
        }
      }
    }

    log.info(`OTEL: 接收 ${totalSpans} spans，当前存储 ${getOtelSessionCount()} traces`);

    res.status(200).json({
      success: true,
      receivedSpans: totalSpans,
      activeSessions: getOtelSessionCount(),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/otel/sessions
 * 获取从 OTEL 接收的会话列表
 */
router.get('/sessions', (_req, res, next) => {
  try {
    const sessions = getOtelSessionReplays().map((session: SessionReplay) => ({
      id: session.meta.id,
      agentName: session.meta.agentName,
      dataSource: session.meta.dataSource,
      startTime: session.meta.startTime,
      endTime: session.meta.endTime,
      durationMs: session.meta.durationMs,
      totalCost: session.meta.totalCost,
      totalTokens: session.meta.totalTokens,
      modelUsed: session.meta.modelUsed,
      stepCount: session.meta.stepCount,
      summary: session.meta.summary,
    }));

    sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    res.json(sessions);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/otel/sessions/:traceId
 * 获取单个 OTEL trace 的完整回放
 */
router.get('/sessions/:traceId', (req, res, next) => {
  try {
    const session = getOtelSessionReplay(req.params.traceId);
    if (!session) {
      res.status(404).json({ error: 'OTEL trace not found' });
      return;
    }
    res.json(session);
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/otel/sessions/:traceId
 * 删除指定的 OTEL trace
 */
router.delete('/sessions/:traceId', (req, res, next) => {
  try {
    const deleted = deleteOtelSessionReplay(req.params.traceId);
    if (!deleted) {
      res.status(404).json({ error: 'OTEL trace not found' });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/otel/sessions
 * 清空所有 OTEL traces
 */
router.delete('/sessions', (_req, res, next) => {
  try {
    const count = clearOtelSessions();
    res.json({ success: true, deletedCount: count });
  } catch (e) {
    next(e);
  }
});

export default router;
