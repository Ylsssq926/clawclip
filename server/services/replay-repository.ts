import * as fs from 'fs';
import * as path from 'path';
import { getClawclipStateDir } from './agent-data-root.js';
import { normalizeSessionId, sessionParser } from './session-parser.js';
import type { CostMeta } from '../types/index.js';
import type { SessionMeta, SessionReplay, SessionStep } from '../types/replay.js';
import { DEMO_SESSIONS } from './demo-sessions.js';
import { getOtelSessionReplays } from './otel-session-store.js';

const ALLOWED_STEP_TYPES = new Set<SessionStep['type']>([
  'thinking',
  'tool_call',
  'tool_result',
  'response',
  'user',
  'system',
]);

function importedSessionsPath(): string {
  return path.join(getClawclipStateDir(), 'imported-sessions.json');
}

function toDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }
  return new Date();
}

function reviveParseDiagnostics(raw: unknown): SessionMeta['parseDiagnostics'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const diagnostics = raw as Record<string, unknown>;
  return {
    totalLines: Number(diagnostics.totalLines) || 0,
    parsedLines: Number(diagnostics.parsedLines) || 0,
    skippedLines: Number(diagnostics.skippedLines) || 0,
    errorSamples: Array.isArray(diagnostics.errorSamples)
      ? diagnostics.errorSamples.filter((sample): sample is string => typeof sample === 'string')
      : undefined,
    multilineRecovered:
      typeof diagnostics.multilineRecovered === 'number' && Number.isFinite(diagnostics.multilineRecovered)
        ? diagnostics.multilineRecovered
        : undefined,
  };
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
    costMeta: raw.costMeta && typeof raw.costMeta === 'object' ? (raw.costMeta as CostMeta) : undefined,
    parseDiagnostics: reviveParseDiagnostics(raw.parseDiagnostics),
  };
}

function reviveStep(raw: Record<string, unknown>, index: number): SessionStep | null {
  if (typeof raw.type !== 'string' || !ALLOWED_STEP_TYPES.has(raw.type as SessionStep['type'])) return null;

  const stepIndex = Number(raw.index);
  return {
    index: Number.isFinite(stepIndex) ? stepIndex : index,
    timestamp: toDate(raw.timestamp),
    type: raw.type as SessionStep['type'],
    content: typeof raw.content === 'string' ? raw.content : String(raw.content ?? ''),
    model: typeof raw.model === 'string' ? raw.model : undefined,
    toolName: typeof raw.toolName === 'string' ? raw.toolName : undefined,
    toolInput: typeof raw.toolInput === 'string' ? raw.toolInput : undefined,
    toolOutput: typeof raw.toolOutput === 'string' ? raw.toolOutput : undefined,
    toolCallId: typeof raw.toolCallId === 'string' ? raw.toolCallId : undefined,
    error: typeof raw.error === 'string' ? raw.error : undefined,
    isError: typeof raw.isError === 'boolean' ? raw.isError : undefined,
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : undefined,
    inputTokens: Number(raw.inputTokens) || 0,
    outputTokens: Number(raw.outputTokens) || 0,
    cacheReadTokens: Number(raw.cacheReadTokens) || undefined,
    cost: Number(raw.cost) || 0,
    durationMs: Number(raw.durationMs) || 0,
  };
}

export function parseSessionReplay(data: unknown): SessionReplay | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (!record.meta || typeof record.meta !== 'object' || !Array.isArray(record.steps)) return null;

  const meta = reviveMeta(record.meta as Record<string, unknown>);
  if (!meta) return null;

  const steps: SessionStep[] = [];
  for (let i = 0; i < record.steps.length; i += 1) {
    const row = record.steps[i];
    if (!row || typeof row !== 'object') continue;
    const step = reviveStep(row as Record<string, unknown>, i);
    if (step) steps.push({ ...step, index: steps.length });
  }

  return {
    meta: { ...meta, stepCount: steps.length },
    steps,
  };
}

export function loadImportedSessions(): SessionReplay[] {
  try {
    if (!fs.existsSync(importedSessionsPath())) return [];
    const text = fs.readFileSync(importedSessionsPath(), 'utf-8');
    const parsed = JSON.parse(text) as unknown;
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const replays: SessionReplay[] = [];

    for (const item of items) {
      const replay = parseSessionReplay(item);
      if (replay) replays.push(replay);
    }

    return replays;
  } catch {
    return [];
  }
}

export function saveImportedSessions(replays: SessionReplay[]): void {
  const dir = path.dirname(importedSessionsPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(importedSessionsPath(), JSON.stringify(replays, null, 2), 'utf-8');
}

function isDemoReplay(replay: SessionReplay): boolean {
  return replay.meta.dataSource === 'demo';
}

function sortReplaysByStartTime(replays: SessionReplay[]): SessionReplay[] {
  return [...replays].sort((left, right) => {
    const startDelta = right.meta.startTime.getTime() - left.meta.startTime.getTime();
    if (startDelta !== 0) return startDelta;
    return right.meta.endTime.getTime() - left.meta.endTime.getTime();
  });
}

function pickPreferredReplay(current: SessionReplay | undefined, candidate: SessionReplay): SessionReplay {
  if (!current) return candidate;
  const currentRank = current.meta.storeUpdatedAt ?? current.meta.endTime.getTime();
  const candidateRank = candidate.meta.storeUpdatedAt ?? candidate.meta.endTime.getTime();
  return candidateRank >= currentRank ? candidate : current;
}

function dedupeReplays(replays: SessionReplay[]): SessionReplay[] {
  const byNormalizedId = new Map<string, SessionReplay>();

  for (const replay of replays) {
    const normalizedId = normalizeSessionId(replay.meta.id);
    byNormalizedId.set(normalizedId, pickPreferredReplay(byNormalizedId.get(normalizedId), replay));
  }

  return sortReplaysByStartTime(Array.from(byNormalizedId.values()));
}

function getImportedReplays(includeDemo = true): SessionReplay[] {
  const imported = loadImportedSessions();
  return includeDemo ? imported : imported.filter(replay => !isDemoReplay(replay));
}

export function getRealMergedReplays(): SessionReplay[] {
  return dedupeReplays([
    ...sessionParser.getRealReplays(),
    ...getImportedReplays(false),
    ...getOtelSessionReplays(),
  ]);
}

interface GetMergedReplayOptions {
  includeDemoFallback?: boolean;
  minCount?: number;
  limit?: number;
}

export function getMergedReplays(options: GetMergedReplayOptions = {}): SessionReplay[] {
  const { includeDemoFallback = true, minCount = 1, limit } = options;
  const realReplays = getRealMergedReplays();

  let merged = realReplays;
  if (includeDemoFallback && realReplays.length < minCount) {
    merged = dedupeReplays([
      ...realReplays,
      ...getImportedReplays(true),
      ...DEMO_SESSIONS,
    ]);
  }

  if (limit != null && limit > 0) {
    return merged.slice(0, limit);
  }
  return merged;
}

export function getMergedSessionMetas(options: GetMergedReplayOptions = {}): SessionMeta[] {
  return getMergedReplays(options).map(replay => replay.meta);
}

export function findReplayById(sessionId: string): SessionReplay | null {
  const normalizedId = normalizeSessionId(sessionId);

  const candidates = dedupeReplays([
    ...getRealMergedReplays(),
    ...getImportedReplays(true),
    ...DEMO_SESSIONS,
  ]);

  for (const replay of candidates) {
    if (normalizeSessionId(replay.meta.id) === normalizedId) return replay;
  }

  return null;
}
