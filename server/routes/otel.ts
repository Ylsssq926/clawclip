import { Router } from 'express';
import type { OtelTracePayload } from '../types/otel.js';
import { normalizeOtelSpan, extractServiceName } from '../services/otel-normalizer.js';
import type { SessionReplay, SessionStep } from '../types/replay.js';
import { log } from '../services/logger.js';

const router = Router();

/** 内存存储：traceId → SessionReplay */
const otelSessions = new Map<string, SessionReplay>();

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
        
        // 按 traceId 分组
        const traceGroups = new Map<string, typeof spans>();
        for (const span of spans) {
          const existing = traceGroups.get(span.traceId) || [];
          existing.push(span);
          traceGroups.set(span.traceId, existing);
        }
        
        // 为每个 trace 创建或更新 SessionReplay
        for (const [traceId, traceSpans] of traceGroups) {
          let session = otelSessions.get(traceId);
          
          if (!session) {
            // 创建新会话
            const firstSpan = traceSpans[0];
            const startTime = new Date(Math.floor(parseInt(firstSpan.startTimeUnixNano, 10) / 1_000_000));
            
            session = {
              meta: {
                id: traceId,
                agentName: serviceName,
                dataSource: 'otel',
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
            otelSessions.set(traceId, session);
          }
          
          const existingSpanIds = new Set(session.steps.map(step => step.spanId).filter((spanId): spanId is string => Boolean(spanId)));
          
          // 转换并添加 spans
          for (const span of traceSpans) {
            if (existingSpanIds.has(span.spanId)) {
              continue;
            }

            const step = normalizeOtelSpan(span, resource, session.steps.length) as SessionStep;
            existingSpanIds.add(span.spanId);
            
            // 更新会话元数据
            const endTime = new Date(Math.floor(parseInt(span.endTimeUnixNano, 10) / 1_000_000));
            if (endTime > session.meta.endTime) {
              session.meta.endTime = endTime;
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
          
          // 更新总时长
          session.meta.durationMs = session.meta.endTime.getTime() - session.meta.startTime.getTime();
        }
      }
    }
    
    log.info(`OTEL: 接收 ${totalSpans} spans，当前存储 ${otelSessions.size} traces`);
    
    res.status(200).json({ 
      success: true, 
      receivedSpans: totalSpans,
      activeSessions: otelSessions.size 
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
    const sessions = Array.from(otelSessions.values()).map(s => ({
      id: s.meta.id,
      agentName: s.meta.agentName,
      startTime: s.meta.startTime,
      endTime: s.meta.endTime,
      durationMs: s.meta.durationMs,
      totalCost: s.meta.totalCost,
      totalTokens: s.meta.totalTokens,
      modelUsed: s.meta.modelUsed,
      stepCount: s.meta.stepCount,
      summary: s.meta.summary,
    }));
    
    // 按开始时间倒序
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
    const session = otelSessions.get(req.params.traceId);
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
    const deleted = otelSessions.delete(req.params.traceId);
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
    const count = otelSessions.size;
    otelSessions.clear();
    res.json({ success: true, deletedCount: count });
  } catch (e) {
    next(e);
  }
});

export default router;
