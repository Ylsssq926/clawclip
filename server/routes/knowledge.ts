import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getClawclipStateDir } from '../services/agent-data-root.js';
import { sessionParser, normalizeSessionId } from '../services/session-parser.js';
import type { SessionMeta, SessionReplay, SessionStep } from '../types/replay.js';

const router = Router();

function importedSessionsPath(): string {
  return path.join(getClawclipStateDir(), 'imported-sessions.json');
}

function toDate(v: unknown): Date {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

function reviveMeta(raw: Record<string, unknown>): SessionMeta | null {
  if (typeof raw.id !== 'string' || typeof raw.agentName !== 'string') return null;
  return {
    id: raw.id,
    agentName: raw.agentName,
    dataSource: typeof raw.dataSource === 'string' ? raw.dataSource : undefined,
    startTime: toDate(raw.startTime),
    endTime: toDate(raw.endTime),
    durationMs: Number(raw.durationMs) || 0,
    totalCost: Number(raw.totalCost) || 0,
    totalTokens: Number(raw.totalTokens) || 0,
    modelUsed: Array.isArray(raw.modelUsed) ? raw.modelUsed.map(String) : [],
    stepCount: Number(raw.stepCount) || 0,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    sessionLabel: typeof raw.sessionLabel === 'string' ? raw.sessionLabel : undefined,
    sessionKey: typeof raw.sessionKey === 'string' ? raw.sessionKey : undefined,
    storeUpdatedAt:
      typeof raw.storeUpdatedAt === 'number' && Number.isFinite(raw.storeUpdatedAt)
        ? raw.storeUpdatedAt
        : undefined,
    storeContextTokens:
      typeof raw.storeContextTokens === 'number' && Number.isFinite(raw.storeContextTokens)
        ? raw.storeContextTokens
        : undefined,
    storeTotalTokens:
      typeof raw.storeTotalTokens === 'number' && Number.isFinite(raw.storeTotalTokens)
        ? raw.storeTotalTokens
        : undefined,
    storeModel: typeof raw.storeModel === 'string' ? raw.storeModel : undefined,
    storeChannel: typeof raw.storeChannel === 'string' ? raw.storeChannel : undefined,
    storeProvider: typeof raw.storeProvider === 'string' ? raw.storeProvider : undefined,
  };
}

function reviveStep(raw: Record<string, unknown>, index: number): SessionStep | null {
  if (typeof raw.type !== 'string') return null;
  const allowed = new Set([
    'thinking',
    'tool_call',
    'tool_result',
    'response',
    'user',
    'system',
  ]);
  if (!allowed.has(raw.type)) return null;
  const idxNum = Number(raw.index);
  return {
    index: Number.isFinite(idxNum) ? idxNum : index,
    timestamp: toDate(raw.timestamp),
    type: raw.type as SessionStep['type'],
    content: typeof raw.content === 'string' ? raw.content : String(raw.content ?? ''),
    model: typeof raw.model === 'string' ? raw.model : undefined,
    toolName: typeof raw.toolName === 'string' ? raw.toolName : undefined,
    toolInput: typeof raw.toolInput === 'string' ? raw.toolInput : undefined,
    toolOutput: typeof raw.toolOutput === 'string' ? raw.toolOutput : undefined,
    inputTokens: Number(raw.inputTokens) || 0,
    outputTokens: Number(raw.outputTokens) || 0,
    cost: Number(raw.cost) || 0,
    durationMs: Number(raw.durationMs) || 0,
  };
}

function parseSessionReplay(data: unknown): SessionReplay | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (!o.meta || typeof o.meta !== 'object' || !Array.isArray(o.steps)) return null;
  const meta = reviveMeta(o.meta as Record<string, unknown>);
  if (!meta) return null;
  const steps: SessionStep[] = [];
  for (let i = 0; i < o.steps.length; i++) {
    const row = o.steps[i];
    if (!row || typeof row !== 'object') continue;
    const s = reviveStep(row as Record<string, unknown>, i);
    if (s) steps.push({ ...s, index: steps.length });
  }
  return { meta: { ...meta, stepCount: steps.length }, steps };
}

function loadImportedSessions(): SessionReplay[] {
  try {
    if (!fs.existsSync(importedSessionsPath())) return [];
    const text = fs.readFileSync(importedSessionsPath(), 'utf-8');
    const parsed = JSON.parse(text) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const out: SessionReplay[] = [];
    for (const item of arr) {
      const r = parseSessionReplay(item);
      if (r) out.push(r);
    }
    return out;
  } catch {
    return [];
  }
}

function saveImportedSessions(replays: SessionReplay[]): void {
  const dir = path.dirname(importedSessionsPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(importedSessionsPath(), JSON.stringify(replays, null, 2), 'utf-8');
}

function getMergedReplays(): SessionReplay[] {
  const metas = sessionParser.getSessions();
  const fromParser: SessionReplay[] = [];
  for (const m of metas) {
    const r = sessionParser.getSessionReplay(m.id);
    if (r) fromParser.push(r);
  }
  const imported = loadImportedSessions();
  const byNorm = new Map<string, SessionReplay>();
  for (const r of fromParser) {
    byNorm.set(normalizeSessionId(r.meta.id), r);
  }
  for (const r of imported) {
    const k = normalizeSessionId(r.meta.id);
    if (!byNorm.has(k)) byNorm.set(k, r);
  }
  return Array.from(byNorm.values());
}

function findReplayById(sessionId: string): SessionReplay | null {
  const fromParser = sessionParser.getSessionReplay(sessionId);
  if (fromParser) return fromParser;
  const norm = normalizeSessionId(sessionId);
  for (const r of loadImportedSessions()) {
    if (normalizeSessionId(r.meta.id) === norm) return r;
  }
  return null;
}

function formatDateTime(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}`;
}

function formatOffsetMs(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `+${m}:${String(s).padStart(2, '0')}`;
}

function stepTypeLabel(step: SessionStep): string {
  switch (step.type) {
    case 'user':
      return '用户';
    case 'thinking':
      return '思考';
    case 'tool_call':
      return step.toolName ? `工具调用 - ${step.toolName}` : '工具调用';
    case 'tool_result':
      return '工具输出';
    case 'response':
      return '回复';
    case 'system':
      return '系统';
    default:
      return step.type;
  }
}

function formatTokens(n: number): string {
  return n.toLocaleString('en-US');
}

function replayToMarkdown(replay: SessionReplay): string {
  const { meta, steps } = replay;
  const title = meta.summary.trim() || '未命名会话';
  const start = formatDateTime(meta.startTime);
  const end = formatDateTime(meta.endTime);
  const models = meta.modelUsed.length > 0 ? meta.modelUsed.join(', ') : '—';
  const lines: string[] = [
    `# ${title}`,
    '',
    `- **Agent**: ${meta.agentName}`,
    `- **模型**: ${models}`,
    `- **时间**: ${start} - ${end}`,
    `- **花费**: $${meta.totalCost.toFixed(4)}`,
    `- **Token**: ${formatTokens(meta.totalTokens)}`,
    '',
    '---',
    '',
  ];

  const t0 = steps[0]?.timestamp.getTime() ?? meta.startTime.getTime();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const offset = formatOffsetMs(step.timestamp.getTime() - t0);
    const label = stepTypeLabel(step);
    lines.push(`## 步骤 ${i + 1}: ${label} (${offset})`, '');

    if (step.type === 'tool_call') {
      if (step.content.trim()) {
        lines.push(step.content.trim(), '');
      }
      if (step.toolInput != null && step.toolInput !== '') {
        lines.push(`**输入**: ${step.toolInput}`, '');
      }
    } else if (step.type === 'tool_result') {
      const out = step.toolOutput ?? step.content;
      if (out) {
        lines.push(`**输出**: ${out}`, '');
      }
    } else {
      const body = step.content.trim();
      if (body) {
        lines.push(body, '');
      }
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

function collectSearchFields(step: SessionStep): string[] {
  const parts = [step.content];
  if (step.toolInput != null) parts.push(step.toolInput);
  if (step.toolOutput != null) parts.push(step.toolOutput);
  return parts.filter(Boolean) as string[];
}

function makeSnippet(text: string, queryLower: string, maxLen = 160): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(queryLower);
  if (idx < 0) return text.slice(0, maxLen) + (text.length > maxLen ? '…' : '');
  const pad = 40;
  const start = Math.max(0, idx - pad);
  const end = Math.min(text.length, idx + queryLower.length + pad);
  let s = text.slice(start, end);
  if (start > 0) s = '…' + s;
  if (end < text.length) s = s + '…';
  return s;
}

/** GET /api/knowledge/export/:id?format=json|markdown */
router.get('/export/:id', (req, res, next) => {
  try {
    const format = String(req.query.format ?? 'json').toLowerCase();
    const replay = findReplayById(req.params.id);
    if (!replay) {
      res.status(404).json({ error: '会话不存在' });
      return;
    }
    if (format === 'markdown' || format === 'md') {
      res.type('text/markdown; charset=utf-8');
      res.send(replayToMarkdown(replay));
      return;
    }
    res.json(replay);
  } catch (e) {
    next(e);
  }
});

/** GET /api/knowledge/export-all?format=json|markdown */
router.get('/export-all', (req, res, next) => {
  try {
    const format = String(req.query.format ?? 'json').toLowerCase();
    const all = getMergedReplays();
    if (format === 'markdown' || format === 'md') {
      res.type('text/markdown; charset=utf-8');
      const text = all.map(r => replayToMarkdown(r)).join('\n\n---\n\n');
      res.send(text);
      return;
    }
    res.json(all);
  } catch (e) {
    next(e);
  }
});

/** POST /api/knowledge/import */
router.post('/import', (req, res, next) => {
  try {
    const body = req.body as unknown;
    if (body == null || typeof body !== 'object') {
      res.status(400).json({ error: '请求体应为 JSON 对象或数组' });
      return;
    }
    const items = Array.isArray(body) ? body : [body];
    const incoming: SessionReplay[] = [];
    for (const item of items) {
      const r = parseSessionReplay(item);
      if (r) incoming.push(r);
    }
    if (incoming.length === 0) {
      res.status(400).json({ error: '未解析到有效的 SessionReplay' });
      return;
    }

    const existing = loadImportedSessions();
    const byId = new Map<string, SessionReplay>();
    for (const r of existing) {
      byId.set(normalizeSessionId(r.meta.id), r);
    }
    for (const r of incoming) {
      byId.set(normalizeSessionId(r.meta.id), r);
    }
    const merged = Array.from(byId.values());
    saveImportedSessions(merged);

    res.json({ ok: true, imported: incoming.length, total: merged.length });
  } catch (e) {
    next(e);
  }
});

/** GET /api/knowledge/search?q=关键词 */
router.get('/search', (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) {
      res.json({ results: [] });
      return;
    }
    const qLower = q.toLowerCase();
    const all = getMergedReplays();
    type Match = { stepIndex: number; type: string; snippet: string };
    const results: Array<{ sessionId: string; summary: string; matches: Match[] }> = [];

    for (const replay of all) {
      const matches: Match[] = [];
      for (const step of replay.steps) {
        const fields = collectSearchFields(step);
        let hit = false;
        for (const f of fields) {
          if (f.toLowerCase().includes(qLower)) {
            hit = true;
            break;
          }
        }
        if (hit) {
          const primary = fields.find(f => f.toLowerCase().includes(qLower)) ?? fields[0] ?? '';
          matches.push({
            stepIndex: step.index,
            type: step.type,
            snippet: makeSnippet(primary, qLower),
          });
        }
      }
      if (matches.length > 0) {
        results.push({
          sessionId: replay.meta.id,
          summary: replay.meta.summary,
          matches,
        });
      }
    }

    res.json({ results });
  } catch (e) {
    next(e);
  }
});

export default router;
