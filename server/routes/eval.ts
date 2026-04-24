import { Router } from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findReplayById } from '../services/replay-repository.js';
import type { SessionReplay, SessionStep } from '../types/replay.js';

const router = Router();

interface EvalCaseFailureStep {
  index: number;
  type: SessionStep['type'];
  toolName?: string;
  message: string;
  error?: string;
  timestamp: string;
  cost: number;
}

interface EvalCaseRecord {
  id: string;
  createdAt: string;
  sessionId: string;
  title: string;
  taskDescription: string;
  note?: string;
  tags: string[];
  cost: {
    totalCost: number;
    totalTokens: number;
    durationMs: number;
    models: string[];
  };
  failureCount: number;
  failures: EvalCaseFailureStep[];
  replay: SessionReplay;
}

interface EvalCaseListItem {
  id: string;
  createdAt: string;
  sessionId: string;
  title: string;
  taskDescription: string;
  note?: string;
  tags: string[];
  failureCount: number;
  lastError?: string;
  totalCost: number;
  totalTokens: number;
}

function evalCasesDir(): string {
  return path.join(os.homedir(), '.clawclip', 'eval-cases');
}

function ensureEvalCasesDir(): void {
  fs.mkdirSync(evalCasesDir(), { recursive: true });
}

function normalizeText(value: string): string {
  return value.replace(/\r/g, '\n').replace(/\s+/g, ' ').trim();
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function createEvalCaseId(sessionId: string, createdAt: Date): string {
  const stamp = createdAt.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `eval-${stamp}-${hashString(`${sessionId}-${createdAt.getTime()}`).slice(0, 8)}`;
}

function evalCasePath(id: string): string {
  return path.join(evalCasesDir(), `${id}.json`);
}

function dedupeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const trimmed = normalizeText(tag).slice(0, 40);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
}

function getReplayTitle(replay: SessionReplay): string {
  return normalizeText(replay.meta.sessionLabel || replay.meta.summary || '未命名会话');
}

function getTaskDescription(replay: SessionReplay): string {
  const firstUserStep = replay.steps.find(step => step.type === 'user')?.content ?? '';
  return normalizeText(firstUserStep || replay.meta.summary || replay.meta.sessionLabel || getReplayTitle(replay));
}

function summarizeFailureStep(step: SessionStep): EvalCaseFailureStep {
  const message = normalizeText(step.error || step.toolOutput || step.content || '失败步骤');
  return {
    index: step.index,
    type: step.type,
    toolName: step.toolName,
    message,
    error: step.error,
    timestamp: step.timestamp.toISOString(),
    cost: step.cost,
  };
}

function collectFailureSteps(replay: SessionReplay): EvalCaseFailureStep[] {
  return replay.steps
    .filter(step => step.isError === true || Boolean(step.error))
    .map(summarizeFailureStep);
}

function parseEvalCaseRecord(value: unknown): EvalCaseRecord | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== 'string'
    || typeof record.createdAt !== 'string'
    || typeof record.sessionId !== 'string'
    || typeof record.title !== 'string'
    || typeof record.taskDescription !== 'string'
  ) {
    return null;
  }

  const cost = record.cost && typeof record.cost === 'object' ? (record.cost as Record<string, unknown>) : {};
  const failures: EvalCaseFailureStep[] = Array.isArray(record.failures)
    ? record.failures.flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const failure = item as Record<string, unknown>;
        if (typeof failure.index !== 'number' || typeof failure.type !== 'string' || typeof failure.message !== 'string') {
          return [];
        }
        return [{
          index: failure.index,
          type: failure.type as SessionStep['type'],
          toolName: typeof failure.toolName === 'string' ? failure.toolName : undefined,
          message: failure.message,
          error: typeof failure.error === 'string' ? failure.error : undefined,
          timestamp: typeof failure.timestamp === 'string' ? failure.timestamp : '',
          cost: typeof failure.cost === 'number' ? failure.cost : 0,
        }];
      })
    : [];

  return {
    id: record.id,
    createdAt: record.createdAt,
    sessionId: record.sessionId,
    title: record.title,
    taskDescription: record.taskDescription,
    note: typeof record.note === 'string' ? record.note : undefined,
    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    cost: {
      totalCost: typeof cost.totalCost === 'number' ? cost.totalCost : 0,
      totalTokens: typeof cost.totalTokens === 'number' ? cost.totalTokens : 0,
      durationMs: typeof cost.durationMs === 'number' ? cost.durationMs : 0,
      models: Array.isArray(cost.models) ? cost.models.filter((model): model is string => typeof model === 'string') : [],
    },
    failureCount: typeof record.failureCount === 'number' ? record.failureCount : failures.length,
    failures,
    replay: record.replay as SessionReplay,
  };
}

function listEvalCaseRecords(): EvalCaseRecord[] {
  try {
    if (!fs.existsSync(evalCasesDir())) return [];
    const files = fs.readdirSync(evalCasesDir()).filter(file => file.endsWith('.json'));
    const records: EvalCaseRecord[] = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(evalCasesDir(), file), 'utf-8');
        const parsed = parseEvalCaseRecord(JSON.parse(raw));
        if (parsed) records.push(parsed);
      } catch {
        // ignore broken file
      }
    }

    return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    return [];
  }
}

function toListItem(record: EvalCaseRecord): EvalCaseListItem {
  return {
    id: record.id,
    createdAt: record.createdAt,
    sessionId: record.sessionId,
    title: record.title,
    taskDescription: record.taskDescription,
    note: record.note,
    tags: record.tags,
    failureCount: record.failureCount,
    lastError: record.failures[record.failures.length - 1]?.message,
    totalCost: record.cost.totalCost,
    totalTokens: record.cost.totalTokens,
  };
}

router.post('/cases', (req, res, next) => {
  try {
    const body = req.body as { sessionId?: unknown; note?: unknown; tags?: unknown };
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
    if (!sessionId) {
      res.status(400).json({ error: '缺少 sessionId / sessionId is required' });
      return;
    }

    const replay = findReplayById(sessionId);
    if (!replay) {
      res.status(404).json({ error: '会话不存在 / Session not found' });
      return;
    }

    const failures = collectFailureSteps(replay);
    if (failures.length === 0) {
      res.status(400).json({ error: '该会话没有失败步骤，不能保存为测试用例 / This session has no failed step to save as an eval case' });
      return;
    }

    const createdAt = new Date();
    const id = createEvalCaseId(replay.meta.id, createdAt);
    const note = typeof body.note === 'string' ? normalizeText(body.note).slice(0, 500) : undefined;
    const tags = dedupeTags(body.tags);

    const record: EvalCaseRecord = {
      id,
      createdAt: createdAt.toISOString(),
      sessionId: replay.meta.id,
      title: getReplayTitle(replay),
      taskDescription: getTaskDescription(replay),
      note: note || undefined,
      tags,
      cost: {
        totalCost: replay.meta.totalCost,
        totalTokens: replay.meta.totalTokens,
        durationMs: replay.meta.durationMs,
        models: replay.meta.modelUsed,
      },
      failureCount: failures.length,
      failures,
      replay,
    };

    ensureEvalCasesDir();
    fs.writeFileSync(evalCasePath(id), JSON.stringify(record, null, 2), 'utf-8');

    res.status(201).json({ id });
  } catch (error) {
    next(error);
  }
});

router.get('/cases', (_req, res, next) => {
  try {
    res.json(listEvalCaseRecords().map(toListItem));
  } catch (error) {
    next(error);
  }
});

export default router;
