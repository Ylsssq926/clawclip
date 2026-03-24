import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DEFAULT_MODEL_PRICING } from '../types/index.js';
import type { SessionMeta, SessionReplay, SessionStep } from '../types/replay.js';
import { DEMO_SESSIONS } from './demo-sessions.js';

const HOME_DIR = os.homedir();
const AGENTS_ROOT = path.join(HOME_DIR, '.openclaw', 'agents');

function priceFor(model?: string): number {
  if (model && DEFAULT_MODEL_PRICING[model] != null) return DEFAULT_MODEL_PRICING[model];
  return 5.0;
}

function computeCost(model: string | undefined, input: number, output: number): number {
  return (input + output) * priceFor(model) / 1_000_000;
}

/** 钳工牌 session id：agent/文件名（无后缀），再 URL 编码，省得夹钳打滑 */
export function makeSessionId(agentName: string, fileBase: string): string {
  return encodeURIComponent(`${agentName}/${fileBase}`);
}

export function normalizeSessionId(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
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

function readUsage(obj: JsonlLine): { input: number; output: number } {
  const usage = obj.usage as Record<string, unknown> | undefined;
  if (!usage) return { input: 0, output: 0 };
  const input = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0;
  const output = Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0;
  return { input, output };
}

function parseTimestamp(obj: JsonlLine): Date {
  const t = obj.timestamp;
  if (t == null || t === '') return new Date();
  const d = new Date(String(t));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * 从一行 JSONL 揪出一步；认不出来的行交给 null（本虾不硬嚼碎壳）
 */
function lineToStep(obj: JsonlLine, index: number): SessionStep | null {
  const timestamp = parseTimestamp(obj);
  const { input, output } = readUsage(obj);
  const model = typeof obj.model === 'string' ? obj.model : undefined;
  const role = typeof obj.role === 'string' ? obj.role : undefined;

  const base = (): Pick<SessionStep, 'inputTokens' | 'outputTokens'> => ({
    inputTokens: input,
    outputTokens: output,
  });

  if (role === 'user') {
    return {
      index,
      timestamp,
      type: 'user',
      content: stringifyContent(obj.content),
      ...base(),
      cost: 0,
      durationMs: 0,
    };
  }

  if (role === 'assistant') {
    const toolCalls = obj.tool_calls;
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const tc = toolCalls[0] as Record<string, unknown>;
      const fn = (tc.function as Record<string, unknown>) || {};
      const name = String(fn.name ?? 'tool');
      const args = fn.arguments;
      const toolInput = typeof args === 'string' ? args : JSON.stringify(args ?? {});
      return {
        index,
        timestamp,
        type: 'tool_call',
        content: stringifyContent(obj.content) || '',
        model,
        toolName: name,
        toolInput,
        ...base(),
        cost: 0,
        durationMs: 0,
      };
    }
    const text = stringifyContent(obj.content);
    if (text.length > 0) {
      return {
        index,
        timestamp,
        type: 'response',
        content: text,
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
          stringifyContent(obj.content) ||
          stringifyContent(obj.reasoning) ||
          '（模型内部推算）',
        model,
        ...base(),
        cost: 0,
        durationMs: 0,
      };
    }
    return null;
  }

  if (role === 'tool') {
    const out = stringifyContent(obj.content);
    return {
      index,
      timestamp,
      type: 'tool_result',
      content: out,
      toolOutput: out,
      model,
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
      content: stringifyContent(obj.content),
      model,
      ...base(),
      cost: 0,
      durationMs: 0,
    };
  }

  if (obj.usage != null && (input > 0 || output > 0)) {
    return {
      index,
      timestamp,
      type: 'thinking',
      content: stringifyContent(obj.content) || '（用量记录）',
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

function buildMeta(agentName: string, id: string, steps: SessionStep[]): SessionMeta {
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

function parseJsonlFile(agentName: string, filePath: string, baseName: string): SessionReplay | null {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  const draft: SessionStep[] = [];
  for (const line of content.split('\n')) {
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
  const id = makeSessionId(agentName, baseName);
  const meta = buildMeta(agentName, id, steps);
  return { meta, steps };
}

function loadRealReplays(): SessionReplay[] {
  const out: SessionReplay[] = [];
  if (!fs.existsSync(AGENTS_ROOT)) return out;

  let agents: string[];
  try {
    agents = fs.readdirSync(AGENTS_ROOT);
  } catch {
    return out;
  }

  for (const agent of agents) {
    const agentPath = path.join(AGENTS_ROOT, agent);
    let st: fs.Stats;
    try {
      st = fs.statSync(agentPath);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;

    const sessionsDir = path.join(agentPath, 'sessions');
    if (!fs.existsSync(sessionsDir)) continue;

    let files: string[];
    try {
      files = fs.readdirSync(sessionsDir);
    } catch {
      continue;
    }

    for (const f of files) {
      if (!f.endsWith('.jsonl')) continue;
      const baseName = f.slice(0, -'.jsonl'.length);
      const replay = parseJsonlFile(agent, path.join(sessionsDir, f), baseName);
      if (replay) out.push(replay);
    }
  }

  return out;
}

export class SessionParser {
  /** 扫一遍 ~/.openclaw 会话，按结束时间倒序；空目录也不炸毛，乖乖返回 [] */
  getSessions(limit?: number): SessionMeta[] {
    const real = loadRealReplays();
    const list: SessionMeta[] =
      real.length === 0 ? DEMO_SESSIONS.map(d => d.meta) : real.map(r => r.meta);

    list.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

    if (limit != null && limit > 0) {
      return list.slice(0, limit);
    }
    return list;
  }

  /** 按 id 取整条会话；支持 URL 解码后的 canonical id */
  getSessionReplay(sessionId: string): SessionReplay | null {
    const norm = normalizeSessionId(sessionId);

    for (const r of loadRealReplays()) {
      if (normalizeSessionId(r.meta.id) === norm) return r;
    }

    for (const d of DEMO_SESSIONS) {
      if (normalizeSessionId(d.meta.id) === norm) return d;
    }

    return null;
  }
}

export const sessionParser = new SessionParser();
