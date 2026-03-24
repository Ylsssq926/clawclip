import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_MODEL_PRICING } from '../types/index.js';
import type { SessionMeta, SessionReplay, SessionStep } from '../types/replay.js';
import { DEMO_SESSIONS } from './demo-sessions.js';
import {
  getLobsterDataRoots,
  listAgentSessionEntries,
  readJsonlFileSafe,
} from './agent-data-root.js';

function priceFor(model?: string): number {
  if (model && DEFAULT_MODEL_PRICING[model] != null) return DEFAULT_MODEL_PRICING[model];
  return 5.0;
}

function computeCost(model: string | undefined, input: number, output: number): number {
  return (input + output) * priceFor(model) / 1_000_000;
}

/** session id：sourceId/agent/文件名（无后缀），再 URL 编码；多根并存时不撞车 */
export function makeSessionId(sourceId: string, agentName: string, fileBase: string): string {
  return encodeURIComponent(`${sourceId}/${agentName}/${fileBase}`);
}

export function normalizeSessionId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

const KNOWN_SOURCE_PREFIXES = new Set(['openclaw', 'zeroclaw', 'claw', 'demo']);

/** 兼容旧版 id（仅 agent/file），补全为 openclaw/agent/file */
export function canonicalReplayIdVariants(decoded: string): string[] {
  const variants = new Set<string>([decoded]);
  const parts = decoded.split('/');
  const head = parts[0] ?? '';
  const isEnv = head.startsWith('env-');
  if (parts.length === 2 && head && !KNOWN_SOURCE_PREFIXES.has(head) && !isEnv) {
    variants.add(`openclaw/${decoded}`);
  }
  return [...variants];
}

function stringifyContent(c: unknown): string {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c
      .map(part => {
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: unknown }).text ?? '');
        }
        if (typeof part === 'string') return part;
        return '';
      })
      .join('');
  }
  if (c == null) return '';
  return String(c);
}

type JsonlLine = Record<string, unknown>;

function extractLineText(obj: JsonlLine): string {
  if (obj.content != null) return stringifyContent(obj.content);
  const msg = obj.message;
  if (typeof msg === 'string') return msg;
  if (msg && typeof msg === 'object') {
    const m = msg as Record<string, unknown>;
    if (m.content != null) return stringifyContent(m.content);
    if (typeof m.text === 'string') return m.text;
  }
  const choices = obj.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const ch0 = choices[0] as Record<string, unknown>;
    const message = ch0.message;
    if (message && typeof message === 'object') {
      const mm = message as Record<string, unknown>;
      if (mm.content != null) return stringifyContent(mm.content);
    }
  }
  return '';
}

function readUsage(obj: JsonlLine): { input: number; output: number } {
  const usage = obj.usage as Record<string, unknown> | undefined;
  if (!usage) return { input: 0, output: 0 };
  const input =
    Number(
      usage.input_tokens ??
        usage.prompt_tokens ??
        usage.inputTokens ??
        usage.promptTokens ??
        0,
    ) || 0;
  const output =
    Number(
      usage.output_tokens ??
        usage.completion_tokens ??
        usage.outputTokens ??
        usage.completionTokens ??
        0,
    ) || 0;
  return { input, output };
}

function parseTimestamp(obj: JsonlLine): Date {
  const t = obj.timestamp ?? obj.created_at ?? obj.createdAt;
  if (t == null || t === '') return new Date();
  if (typeof t === 'number' && Number.isFinite(t)) {
    const d = new Date(t > 1e12 ? t : t * 1000);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(String(t));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toolCallName(args: Record<string, unknown>): string {
  const fn = (args.function as Record<string, unknown>) || {};
  return String(args.name ?? fn.name ?? 'tool');
}

function toolCallInput(args: Record<string, unknown>): string {
  const fn = (args.function as Record<string, unknown>) || {};
  const raw = args.arguments ?? fn.arguments;
  return typeof raw === 'string' ? raw : JSON.stringify(raw ?? {});
}

/**
 * OpenClaw 当前转写为 Pi SessionManager JSONL：首行常为 type:session，后续 type:message 且正文在 message 内。
 * 同时保留旧版/直连 API 的 Chat Completions 单行（顶格 role/content）。
 */
function unwrapPiEnvelope(outer: JsonlLine): JsonlLine {
  const t = outer.type;
  if ((t === 'message' || t === 'custom_message') && outer.message != null && typeof outer.message === 'object') {
    const inner = outer.message as Record<string, unknown>;
    return {
      ...inner,
      usage: inner.usage ?? outer.usage,
      model: inner.model ?? outer.model,
      model_id: inner.model_id ?? outer.model_id,
      timestamp: inner.timestamp ?? outer.timestamp,
      created_at: inner.created_at ?? outer.created_at,
      createdAt: inner.createdAt ?? outer.createdAt,
    } as JsonlLine;
  }
  return outer;
}

function resolveMessageRole(body: JsonlLine, outerType: string | undefined): string | undefined {
  if (typeof body.role === 'string') return body.role;
  if (typeof body.kind === 'string') {
    const k = body.kind.toLowerCase();
    if (k === 'user' || k === 'human') return 'user';
    if (k === 'assistant' || k === 'model') return 'assistant';
    if (k === 'tool' || k === 'toolresult' || k === 'tool_result') return 'tool';
    if (k === 'system') return 'system';
  }
  if (outerType === 'toolResult' || outerType === 'tool_result') return 'tool';
  return undefined;
}

function pickToolCalls(body: JsonlLine, outer: JsonlLine): unknown[] | undefined {
  const a =
    body.tool_calls ?? body.toolCalls ?? outer.tool_calls ?? (outer.toolCalls as unknown[] | undefined);
  return Array.isArray(a) ? a : undefined;
}

/**
 * 从一行 JSONL 揪出一步；认不出来的行交给 null
 */
function lineToStep(obj: JsonlLine, index: number): SessionStep | null {
  const outerType = typeof obj.type === 'string' ? obj.type : undefined;

  if (outerType === 'session') return null;
  if (outerType === 'custom') return null;

  if (outerType === 'compaction') {
    const o = obj as Record<string, unknown>;
    const kept = o.firstKeptEntryId;
    const before = o.tokensBefore;
    const u = readUsage(obj);
    const parts = [
      '（上下文压缩）',
      kept != null ? `保留自 ${String(kept)}` : '',
      before != null ? `压缩前约 ${String(before)} tokens` : '',
    ].filter(Boolean);
    return {
      index,
      timestamp: parseTimestamp(obj),
      type: 'thinking',
      content: parts.join(' · ') || '（上下文压缩）',
      inputTokens: u.input,
      outputTokens: u.output,
      cost: 0,
      durationMs: 0,
    };
  }

  if (outerType === 'branch_summary') {
    const o = obj as Record<string, unknown>;
    const u = readUsage(obj);
    const txt =
      stringifyContent(o.summary ?? o.text ?? o.content) || '（分支摘要）';
    return {
      index,
      timestamp: parseTimestamp(obj),
      type: 'thinking',
      content: txt.slice(0, 4000),
      inputTokens: u.input,
      outputTokens: u.output,
      cost: 0,
      durationMs: 0,
    };
  }

  const body = unwrapPiEnvelope(obj);
  const timestamp = parseTimestamp(obj);
  const mergedForUsage = { ...body, usage: body.usage ?? obj.usage } as JsonlLine;
  const { input, output } = readUsage(mergedForUsage);
  const model =
    typeof body.model === 'string'
      ? body.model
      : typeof (body.model_id as string | undefined) === 'string'
        ? (body.model_id as string)
        : typeof obj.model === 'string'
          ? obj.model
          : undefined;

  const base = (): Pick<SessionStep, 'inputTokens' | 'outputTokens'> => ({
    inputTokens: input,
    outputTokens: output,
  });

  const text = extractLineText(body);
  const reasoningExtra =
    body.reasoning_content != null
      ? stringifyContent(body.reasoning_content)
      : body.reasoning != null
        ? stringifyContent(body.reasoning)
        : obj.reasoning_content != null
          ? stringifyContent(obj.reasoning_content)
          : obj.reasoning != null
            ? stringifyContent(obj.reasoning)
            : '';

  const role = resolveMessageRole(body, outerType);

  if (role === 'user' || outerType === 'user_message') {
    return {
      index,
      timestamp,
      type: 'user',
      content: text,
      ...base(),
      cost: 0,
      durationMs: 0,
    };
  }

  if (role === 'assistant' || outerType === 'assistant_message') {
    const fc = body.function_call as Record<string, unknown> | undefined;
    if (fc && typeof fc.name === 'string') {
      const args = fc.arguments;
      const toolInput = typeof args === 'string' ? args : JSON.stringify(args ?? {});
      return {
        index,
        timestamp,
        type: 'tool_call',
        content: text || '',
        model,
        toolName: fc.name,
        toolInput,
        ...base(),
        cost: 0,
        durationMs: 0,
      };
    }

    const toolCalls = pickToolCalls(body, obj);
    if (toolCalls && toolCalls.length > 0) {
      const tc = toolCalls[0] as Record<string, unknown>;
      const name = toolCallName(tc);
      const toolInput = toolCallInput(tc);
      return {
        index,
        timestamp,
        type: 'tool_call',
        content: text || '',
        model,
        toolName: name,
        toolInput,
        ...base(),
        cost: 0,
        durationMs: 0,
      };
    }
    if (text.length > 0 || reasoningExtra.length > 0) {
      return {
        index,
        timestamp,
        type: 'response',
        content: text || reasoningExtra,
        model,
        ...base(),
        cost: 0,
        durationMs: 0,
      };
    }
    if (input > 0 || output > 0) {
      return {
        index,
        timestamp,
        type: 'thinking',
        content:
          text ||
          reasoningExtra ||
          stringifyContent(body.thought) ||
          stringifyContent(obj.thought) ||
          '（模型内部推算）',
        model,
        ...base(),
        cost: 0,
        durationMs: 0,
      };
    }
    return null;
  }

  if (role === 'tool' || outerType === 'tool_result' || outerType === 'function_call_output') {
    const out =
      text ||
      stringifyContent(body.output ?? body.result ?? obj.output ?? obj.result);
    return {
      index,
      timestamp,
      type: 'tool_result',
      content: out,
      toolOutput: out,
      model,
      toolName:
        typeof body.name === 'string'
          ? body.name
          : typeof body.tool_name === 'string'
            ? body.tool_name
            : typeof obj.name === 'string'
              ? obj.name
              : typeof obj.tool_name === 'string'
                ? obj.tool_name
                : undefined,
      ...base(),
      cost: 0,
      durationMs: 0,
    };
  }

  if (role === 'system') {
    return {
      index,
      timestamp,
      type: 'system',
      content: text,
      model,
      ...base(),
      cost: 0,
      durationMs: 0,
    };
  }

  if (mergedForUsage.usage != null && (input > 0 || output > 0)) {
    return {
      index,
      timestamp,
      type: 'thinking',
      content: text || reasoningExtra || '（用量记录）',
      model,
      ...base(),
      cost: 0,
      durationMs: 0,
    };
  }

  return null;
}

function finalizeStepDurationsAndCost(steps: SessionStep[]): SessionStep[] {
  const n = steps.length;
  return steps.map((s, i) => {
    const cost = computeCost(s.model, s.inputTokens, s.outputTokens);
    const durationMs =
      i < n - 1 ? Math.max(0, steps[i + 1].timestamp.getTime() - s.timestamp.getTime()) : 0;
    return { ...s, index: i, cost, durationMs };
  });
}

function buildMeta(
  sourceId: string,
  agentName: string,
  id: string,
  steps: SessionStep[],
): SessionMeta {
  const firstUser = steps.find(s => s.type === 'user');
  const summary = (firstUser?.content ?? '').slice(0, 80);
  const models = new Set<string>();
  for (const s of steps) {
    if (s.model) models.add(s.model);
  }
  let totalCost = 0;
  let totalTokens = 0;
  for (const s of steps) {
    totalCost += s.cost;
    totalTokens += s.inputTokens + s.outputTokens;
  }
  const startTime = steps[0]?.timestamp ?? new Date();
  const endTime = steps[steps.length - 1]?.timestamp ?? startTime;
  return {
    id,
    agentName,
    dataSource: sourceId,
    startTime,
    endTime,
    durationMs: Math.max(0, endTime.getTime() - startTime.getTime()),
    totalCost,
    totalTokens,
    modelUsed: Array.from(models),
    stepCount: steps.length,
    summary,
  };
}

function parseJsonlFile(
  sourceId: string,
  agentName: string,
  filePath: string,
  baseName: string,
): SessionReplay | null {
  const content = readJsonlFileSafe(filePath);
  if (content == null) return null;

  const draft: SessionStep[] = [];
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    let obj: JsonlLine;
    try {
      obj = JSON.parse(t) as JsonlLine;
    } catch {
      continue;
    }
    const step = lineToStep(obj, draft.length);
    if (!step) continue;
    draft.push(step);
  }

  if (draft.length === 0) return null;

  const steps = finalizeStepDurationsAndCost(draft);
  const id = makeSessionId(sourceId, agentName, baseName);
  const meta = buildMeta(sourceId, agentName, id, steps);
  return { meta, steps };
}

function loadRealReplays(): SessionReplay[] {
  const out: SessionReplay[] = [];
  const roots = getLobsterDataRoots();

  for (const root of roots) {
    const entries = listAgentSessionEntries(root);
    for (const e of entries) {
      let files: string[];
      try {
        files = fs.readdirSync(e.sessionsDir);
      } catch {
        continue;
      }
      for (const f of files) {
        if (!f.endsWith('.jsonl')) continue;
        const baseName = f.slice(0, -'.jsonl'.length);
        const replay = parseJsonlFile(e.sourceId, e.agentName, path.join(e.sessionsDir, f), baseName);
        if (replay) out.push(replay);
      }
    }
  }

  return out;
}

export class SessionParser {
  private cache: { at: number; data: SessionReplay[] } | null = null;
  private static readonly CACHE_MS = 3500;

  private getCachedReplays(): SessionReplay[] {
    const now = Date.now();
    if (this.cache && now - this.cache.at < SessionParser.CACHE_MS) {
      return this.cache.data;
    }
    const data = loadRealReplays();
    this.cache = { at: now, data };
    return data;
  }

  /** 扫所有已配置数据根的会话，按结束时间倒序 */
  getSessions(limit?: number): SessionMeta[] {
    const real = this.getCachedReplays();
    const list: SessionMeta[] =
      real.length === 0 ? DEMO_SESSIONS.map(d => d.meta) : real.map(r => r.meta);

    list.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

    if (limit != null && limit > 0) {
      return list.slice(0, limit);
    }
    return list;
  }

  /** 按 id 取整条会话；支持 URL 解码与旧版 id 别名 */
  getSessionReplay(sessionId: string): SessionReplay | null {
    const norm = normalizeSessionId(sessionId);
    const variants = new Set(canonicalReplayIdVariants(norm));

    for (const r of this.getCachedReplays()) {
      const rid = normalizeSessionId(r.meta.id);
      if (variants.has(rid)) return r;
    }

    for (const d of DEMO_SESSIONS) {
      const rid = normalizeSessionId(d.meta.id);
      if (variants.has(rid)) return d;
    }

    return null;
  }

  /** 当前是否没有任何真实会话文件（用于状态 API） */
  hasRealSessions(): boolean {
    return this.getCachedReplays().length > 0;
  }
}

export const sessionParser = new SessionParser();
