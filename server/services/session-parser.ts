import * as fs from 'fs';
import * as path from 'path';
import { computeCost, DEFAULT_DETAILED_PRICING } from './pricing-utils.js';
import type { SessionMeta, SessionReplay, SessionStep } from '../types/replay.js';
import { DEMO_SESSIONS } from './demo-sessions.js';
import {
  countSessionJsonlFiles,
  getLobsterDataRoots,
  getSkippedLargeFiles,
  listAgentSessionEntries,
  readJsonlFileSafe,
  resetSkippedLargeFiles,
  isSessionFile,
  stripSessionExt,
} from './agent-data-root.js';
import { enrichSessionMetaFromStore, loadOpenclawSessionStore } from './session-store.js';
import { log } from './logger.js';

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

const MAX_MULTILINE_JSON_LINES = 20;

interface ParsedJsonChunk {
  obj: JsonlLine;
  consumedLines: number;
  consumedNonEmptyLines: number;
  multilineRecovered: number;
}

function tryRecoverMultilineJson(lines: string[], startIndex: number, firstTrimmedLine: string): ParsedJsonChunk | null {
  if (!firstTrimmedLine.startsWith('{')) return null;

  let merged = lines[startIndex] ?? '';
  let consumedLines = 1;
  let consumedNonEmptyLines = 1;

  for (
    let nextIndex = startIndex + 1;
    nextIndex < lines.length && consumedLines < MAX_MULTILINE_JSON_LINES;
    nextIndex += 1
  ) {
    const nextLine = lines[nextIndex] ?? '';
    const trimmed = nextLine.trim();
    merged += `\n${nextLine}`;
    consumedLines += 1;
    if (trimmed) consumedNonEmptyLines += 1;
    if (!trimmed.endsWith('}')) continue;

    try {
      return {
        obj: JSON.parse(merged) as JsonlLine,
        consumedLines,
        consumedNonEmptyLines,
        multilineRecovered: consumedNonEmptyLines,
      };
    } catch {
      // 继续向后合并，直到命中可解析的闭合对象或达到上限。
    }
  }

  return null;
}

function parseJsonChunk(lines: string[], lineIndex: number): ParsedJsonChunk {
  const rawLine = lines[lineIndex] ?? '';
  const trimmed = rawLine.trim();

  try {
    return {
      obj: JSON.parse(trimmed) as JsonlLine,
      consumedLines: 1,
      consumedNonEmptyLines: 1,
      multilineRecovered: 0,
    };
  } catch (error) {
    const recovered = tryRecoverMultilineJson(lines, lineIndex, trimmed);
    if (recovered) return recovered;
    throw error;
  }
}

function partText(part: Record<string, unknown>): string {
  return stringifyContent(
    part.text ??
      part.content ??
      part.summary ??
      part.reasoning_content ??
      part.reasoning ??
      part.thinking ??
      part.message ??
      part.output_text ??
      part.output ??
      part.result ??
      part.value,
  );
}

function isReasoningPart(part: Record<string, unknown>): boolean {
  const type =
    typeof part.type === 'string'
      ? part.type.toLowerCase()
      : typeof part.kind === 'string'
        ? part.kind.toLowerCase()
        : '';
  return (
    type.includes('reason') ||
    type.includes('think') ||
    part.reasoning != null ||
    part.reasoning_content != null ||
    part.thinking != null
  );
}

function extractTextAndReasoning(content: unknown): { text: string; reasoning: string } {
  if (Array.isArray(content)) {
    const textParts: string[] = [];
    const reasoningParts: string[] = [];
    for (const item of content) {
      if (typeof item === 'string') {
        textParts.push(item);
        continue;
      }
      if (!item || typeof item !== 'object') continue;
      const part = item as Record<string, unknown>;
      const value = partText(part);
      if (!value) continue;
      if (isReasoningPart(part)) reasoningParts.push(value);
      else textParts.push(value);
    }
    return { text: textParts.join(''), reasoning: reasoningParts.join('') };
  }
  if (content && typeof content === 'object') {
    const part = content as Record<string, unknown>;
    const value = partText(part);
    if (!value) return { text: '', reasoning: '' };
    return isReasoningPart(part) ? { text: '', reasoning: value } : { text: value, reasoning: '' };
  }
  return { text: stringifyContent(content), reasoning: '' };
}

function mergeDistinctStrings(values: Array<string | undefined>, separator = '\n'): string {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw ?? '';
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out.join(separator);
}

function extractLineTextAndReasoning(obj: JsonlLine): { text: string; reasoning: string } {
  if (obj.content != null) return extractTextAndReasoning(obj.content);
  const msg = obj.message;
  if (typeof msg === 'string') return { text: msg, reasoning: '' };
  if (msg && typeof msg === 'object') {
    const m = msg as Record<string, unknown>;
    if (m.content != null) return extractTextAndReasoning(m.content);
    if (typeof m.text === 'string') return { text: m.text, reasoning: '' };
  }
  const choices = obj.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const ch0 = choices[0] as Record<string, unknown>;
    const message = ch0.message;
    if (message && typeof message === 'object') {
      const mm = message as Record<string, unknown>;
      if (mm.content != null) return extractTextAndReasoning(mm.content);
      if (typeof mm.text === 'string') return { text: mm.text, reasoning: '' };
    }
  }
  return { text: '', reasoning: '' };
}

function extractReasoningText(body: JsonlLine, outer: JsonlLine, contentReasoning = ''): string {
  return mergeDistinctStrings([
    contentReasoning,
    body.reasoning_content != null ? stringifyContent(body.reasoning_content) : '',
    body.reasoning != null ? stringifyContent(body.reasoning) : '',
    outer.reasoning_content != null ? stringifyContent(outer.reasoning_content) : '',
    outer.reasoning != null ? stringifyContent(outer.reasoning) : '',
  ]);
}

function stringifyErrorValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return mergeDistinctStrings(value.map(item => stringifyErrorValue(item)));
  }
  if (value && typeof value === 'object') {
    const err = value as Record<string, unknown>;
    const summary = mergeDistinctStrings(
      [
        stringifyContent(err.message),
        stringifyContent(err.error),
        stringifyContent(err.details),
        stringifyContent(err.detail),
        stringifyContent(err.reason),
      ],
      ' · ',
    );
    if (summary) return summary;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (value == null || typeof value === 'boolean') return '';
  return String(value);
}

function extractErrorText(body: JsonlLine, outer: JsonlLine): string {
  return stringifyErrorValue(body.error ?? outer.error);
}

function buildStepContent(text: string, reasoning: string): Pick<SessionStep, 'content' | 'reasoning'> {
  if (reasoning) {
    return {
      content: text || reasoning,
      reasoning,
    };
  }
  return { content: text };
}

function extractToolCallId(...records: Array<Record<string, unknown> | undefined>): string | undefined {
  for (const record of records) {
    if (!record) continue;
    const id = record.id ?? record.tool_call_id;
    if (typeof id === 'string' && id) return id;
  }
  return undefined;
}

function extractToolResultCallId(...records: Array<Record<string, unknown> | undefined>): string | undefined {
  for (const record of records) {
    if (!record) continue;
    const id = record.tool_call_id ?? record.call_id;
    if (typeof id === 'string' && id) return id;
  }
  return undefined;
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

type LineStepResult = SessionStep | SessionStep[] | null;

/**
 * 从一行 JSONL 揪出一步；认不出来的行交给 null。assistant 一条里多个 tool_calls 时返回多步。
 */
function lineToStep(obj: JsonlLine, index: number): LineStepResult {
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

  const { text, reasoning: contentReasoning } = extractLineTextAndReasoning(body);
  const reasoningExtra = extractReasoningText(body, obj, contentReasoning);
  const role = resolveMessageRole(body, outerType);
  const stepContent = buildStepContent(text, reasoningExtra);
  const errorText = extractErrorText(body, obj);

  if (outerType === 'error' || errorText) {
    const errorContent = buildStepContent(text || errorText, reasoningExtra);
    return {
      index,
      timestamp,
      type: 'system',
      ...errorContent,
      model,
      error: errorText || errorContent.content || '（错误）',
      isError: true,
      ...base(),
      cost: 0,
      durationMs: 0,
    };
  }

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
        ...stepContent,
        model,
        toolName: fc.name,
        toolInput,
        toolCallId: extractToolCallId(fc),
        ...base(),
        cost: 0,
        durationMs: 0,
      };
    }

    const toolCalls = pickToolCalls(body, obj);
    if (toolCalls && toolCalls.length > 0) {
      const steps: SessionStep[] = [];
      if (text.length > 0) {
        steps.push({
          index,
          timestamp,
          type: 'response',
          ...stepContent,
          model,
          ...base(),
          cost: 0,
          durationMs: 0,
        });
      }
      const toolCallOffset = steps.length;
      toolCalls.forEach((tc, i) => {
        const tcr = tc as Record<string, unknown>;
        const n = toolCallName(tcr);
        const tin = toolCallInput(tcr);
        const toolStepContent =
          i === 0 && text.length === 0 ? buildStepContent('', reasoningExtra) : { content: '' };
        steps.push({
          index: index + toolCallOffset + i,
          timestamp,
          type: 'tool_call',
          ...toolStepContent,
          model,
          toolName: n,
          toolInput: tin,
          toolCallId: extractToolCallId(tcr),
          ...base(),
          cost: 0,
          durationMs: 0,
        });
      });
      return steps;
    }
    if (text.length > 0 || reasoningExtra.length > 0) {
      return {
        index,
        timestamp,
        type: 'response',
        ...stepContent,
        model,
        ...base(),
        cost: 0,
        durationMs: 0,
      };
    }
    if (input > 0 || output > 0) {
      const thinkingText =
        text || stringifyContent(body.thought) || stringifyContent(obj.thought) || reasoningExtra || '（模型内部推算）';
      return {
        index,
        timestamp,
        type: 'thinking',
        ...buildStepContent(thinkingText, reasoningExtra),
        model,
        ...base(),
        cost: 0,
        durationMs: 0,
      };
    }
    return null;
  }

  if (role === 'tool' || outerType === 'tool_result' || outerType === 'function_call_output') {
    const out = text || stringifyContent(body.output ?? body.result ?? obj.output ?? obj.result);
    return {
      index,
      timestamp,
      type: 'tool_result',
      content: out,
      toolOutput: out,
      model,
      toolCallId: extractToolResultCallId(body, obj),
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
      ...stepContent,
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
      ...buildStepContent(text || reasoningExtra || '（用量记录）', reasoningExtra),
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
    const cost = computeCost(DEFAULT_DETAILED_PRICING, s.model, s.inputTokens, s.outputTokens);
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
  const readResult = readJsonlFileSafe(filePath);
  if (readResult.content == null) return null;

  let totalLines = 0;
  let parsedLines = 0;
  let skippedLines = 0;
  let multilineRecovered = 0;
  const errorSamples: string[] = [];
  const draft: SessionStep[] = [];
  const lines = readResult.content.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const t = lines[lineIndex]?.trim();
    if (!t) continue;

    let parsedChunk: ParsedJsonChunk;
    try {
      parsedChunk = parseJsonChunk(lines, lineIndex);
    } catch (e) {
      totalLines += 1;
      const message = (e as Error).message;
      skippedLines += 1;
      if (errorSamples.length < 3) {
        errorSamples.push(`第 ${lineIndex + 1} 行 JSON.parse 失败：${message}`);
      }
      log.debug(`[session-parser] skipped malformed JSONL line in ${baseName}:`, message);
      continue;
    }

    totalLines += parsedChunk.consumedNonEmptyLines;
    multilineRecovered += parsedChunk.multilineRecovered;
    if (parsedChunk.consumedLines > 1) {
      lineIndex += parsedChunk.consumedLines - 1;
    }

    const stepOrSteps = lineToStep(parsedChunk.obj, draft.length);
    if (stepOrSteps == null) {
      skippedLines += 1;
      continue;
    }

    const batch = Array.isArray(stepOrSteps) ? stepOrSteps : [stepOrSteps];
    parsedLines += batch.length;
    for (const s of batch) {
      draft.push(s);
    }
  }

  if (draft.length === 0) return null;

  const steps = finalizeStepDurationsAndCost(draft);
  const id = makeSessionId(sourceId, agentName, baseName);
  const meta = buildMeta(sourceId, agentName, id, steps);
  meta.parseDiagnostics = {
    totalLines,
    parsedLines,
    skippedLines,
    multilineRecovered,
    ...(errorSamples.length > 0 ? { errorSamples } : {}),
  };
  return { meta, steps };
}

interface FileCacheEntry {
  mtimeMs: number;
  replay: SessionReplay;
}

const fileCache = new Map<string, FileCacheEntry>();

function loadRealReplaysIncremental(): SessionReplay[] {
  resetSkippedLargeFiles();
  const out: SessionReplay[] = [];
  const roots = getLobsterDataRoots();
  const seenPaths = new Set<string>();

  for (const root of roots) {
    const entries = listAgentSessionEntries(root);
    for (const e of entries) {
      const storeRows = loadOpenclawSessionStore(e.sessionsDir);
      let files: string[];
      try {
        files = fs.readdirSync(e.sessionsDir);
      } catch {
        continue;
      }
      for (const f of files) {
        if (!isSessionFile(f)) continue;
        const filePath = path.join(e.sessionsDir, f);
        seenPaths.add(filePath);
        const baseName = stripSessionExt(f);

        let mtimeMs: number;
        try {
          mtimeMs = fs.statSync(filePath).mtimeMs;
        } catch {
          continue;
        }

        const cached = fileCache.get(filePath);
        if (cached && cached.mtimeMs === mtimeMs) {
          out.push(cached.replay);
          continue;
        }

        const replay = parseJsonlFile(e.sourceId, e.agentName, filePath, baseName);
        if (replay) {
          enrichSessionMetaFromStore(replay.meta, storeRows, baseName);
          fileCache.set(filePath, { mtimeMs, replay });
          out.push(replay);
        } else {
          fileCache.delete(filePath);
        }
      }
    }
  }

  for (const key of fileCache.keys()) {
    if (!seenPaths.has(key)) fileCache.delete(key);
  }

  return out;
}

export class SessionParser {
  private cache: { at: number; data: SessionReplay[] } | null = null;
  private static readonly CACHE_MS = 30_000;

  private getCachedReplays(): SessionReplay[] {
    const now = Date.now();
    if (this.cache && now - this.cache.at < SessionParser.CACHE_MS) {
      return this.cache.data;
    }
    const data = loadRealReplaysIncremental();
    this.cache = { at: now, data };
    return data;
  }

  /** 扫所有已配置数据根的会话，按结束时间倒序 */
  getSessions(limit?: number): SessionMeta[] {
    const real = this.getCachedReplays();
    const list: SessionMeta[] =
      real.length === 0 ? DEMO_SESSIONS.map(d => d.meta) : real.map(r => r.meta);

    list.sort((a, b) => {
      const sa = a.storeUpdatedAt ?? a.endTime.getTime();
      const sb = b.storeUpdatedAt ?? b.endTime.getTime();
      if (sb !== sa) return sb - sa;
      return b.endTime.getTime() - a.endTime.getTime();
    });

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

  /**
   * 「真实数据」= 至少有一个 .jsonl 被解析为含 ≥1 步的会话（非仅发现文件）。
   */
  hasRealSessions(): boolean {
    return this.getCachedReplays().length > 0;
  }

  /**
   * 统一 jsonl 文件数与可解析会话数。若已调用 `countSessionJsonlFiles()`，传入其 `total` 可避免重复扫盘。
   */
  getJsonlVersusParsableStats(precomputedTotalJsonl?: number): {
    totalJsonlFiles: number;
    parsableSessionCount: number;
  } {
    const totalJsonlFiles = precomputedTotalJsonl ?? countSessionJsonlFiles().total;
    return { totalJsonlFiles, parsableSessionCount: this.getRealReplays().length };
  }

  getDiagnostics(): {
    totalJsonlFiles: number;
    parsableCount: number;
    skippedLargeFiles: string[];
    sessions: Array<{
      id: string;
      agentName: string;
      totalLines: number;
      parsedLines: number;
      skippedLines: number;
      multilineRecovered: number;
      errorSamples?: string[];
    }>;
  } {
    const replays = this.getRealReplays();
    return {
      totalJsonlFiles: countSessionJsonlFiles().total,
      parsableCount: replays.length,
      skippedLargeFiles: getSkippedLargeFiles(),
      sessions: replays
        .filter(replay => {
          const diagnostics = replay.meta.parseDiagnostics;
          return (
            (diagnostics?.skippedLines ?? 0) > 0 ||
            (diagnostics?.multilineRecovered ?? 0) > 0
          );
        })
        .map(replay => ({
          id: replay.meta.id,
          agentName: replay.meta.agentName,
          totalLines: replay.meta.parseDiagnostics?.totalLines ?? 0,
          parsedLines: replay.meta.parseDiagnostics?.parsedLines ?? 0,
          skippedLines: replay.meta.parseDiagnostics?.skippedLines ?? 0,
          multilineRecovered: replay.meta.parseDiagnostics?.multilineRecovered ?? 0,
          ...(replay.meta.parseDiagnostics?.errorSamples?.length
            ? { errorSamples: replay.meta.parseDiagnostics.errorSamples }
            : {}),
        })),
    };
  }

  getRealReplays(): SessionReplay[] {
    return this.getCachedReplays();
  }
}

export const sessionParser = new SessionParser();
