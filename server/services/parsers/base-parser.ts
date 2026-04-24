import { computeCost, DEFAULT_DETAILED_PRICING } from '../pricing-utils.js';
import type { SessionMeta, SessionReplay, SessionStep } from '../../types/replay.js';

export interface Parser<TData = unknown> {
  canHandle(source: string): boolean;
  parse(data: TData): SessionReplay;
}

export interface SessionMetaDraft
  extends Pick<SessionMeta, 'id' | 'agentName'>,
    Partial<
      Omit<
        SessionMeta,
        | 'id'
        | 'agentName'
        | 'startTime'
        | 'endTime'
        | 'durationMs'
        | 'totalCost'
        | 'totalTokens'
        | 'modelUsed'
        | 'stepCount'
        | 'summary'
      >
    > {
  steps: SessionStep[];
  startTime?: Date;
  endTime?: Date;
  summary?: string;
}

export interface StepDraft extends Omit<SessionStep, 'index' | 'cost' | 'durationMs'> {
  index?: number;
  cost?: number;
  durationMs?: number;
}

export function makeSessionId(sourceId: string, agentName: string, fileBase: string): string {
  return encodeURIComponent(`${sourceId}/${agentName}/${fileBase}`);
}

export function stringifyContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(item => stringifyContent(item)).join('');
  }
  if (value == null) return '';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferred =
      record.text ??
      record.content ??
      record.summary ??
      record.reasoning ??
      record.reasoning_content ??
      record.message ??
      record.output ??
      record.result ??
      record.value;
    if (preferred != null && preferred !== value) {
      return stringifyContent(preferred);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function mergeDistinctStrings(values: Array<string | undefined>, separator = '\n'): string {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw?.trim() ?? '';
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out.join(separator);
}

export function parseSessionTimestamp(raw: unknown, fallback = new Date()): Date {
  if (raw == null || raw === '') return fallback;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? fallback : raw;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const date = new Date(raw > 1e12 ? raw : raw * 1000);
    return Number.isNaN(date.getTime()) ? fallback : date;
  }
  if (typeof raw === 'string') {
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && raw.trim() !== '') {
      const date = new Date(numeric > 1e12 ? numeric : numeric * 1000);
      if (!Number.isNaN(date.getTime())) return date;
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? fallback : date;
  }
  return fallback;
}

export function buildStepContent(text: string, reasoning: string): Pick<SessionStep, 'content' | 'reasoning'> {
  if (reasoning) {
    return {
      content: text || reasoning,
      reasoning,
    };
  }
  return { content: text };
}

export function createStep(draft: StepDraft): SessionStep {
  return {
    index: draft.index ?? 0,
    timestamp: draft.timestamp,
    type: draft.type,
    content: draft.content,
    ...(draft.model ? { model: draft.model } : {}),
    ...(draft.toolName ? { toolName: draft.toolName } : {}),
    ...(draft.toolInput ? { toolInput: draft.toolInput } : {}),
    ...(draft.toolOutput ? { toolOutput: draft.toolOutput } : {}),
    ...(draft.toolCallId ? { toolCallId: draft.toolCallId } : {}),
    ...(draft.error ? { error: draft.error } : {}),
    ...(draft.isError != null ? { isError: draft.isError } : {}),
    ...(draft.reasoning ? { reasoning: draft.reasoning } : {}),
    inputTokens: draft.inputTokens,
    outputTokens: draft.outputTokens,
    cost: draft.cost ?? 0,
    durationMs: draft.durationMs ?? 0,
  };
}

function cleanSessionSummary(raw: string): string {
  const compact = raw
    .replace(/\r/g, '')
    .replace(/^Sender \(untrusted metadata\):\s*```[\s\S]*?```\s*/i, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/```[^\n]*\n?/g, ' ')
    .replace(/```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (compact) return compact.slice(0, 80);
  return raw.replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function finalizeStepDurationsAndCost(steps: SessionStep[]): SessionStep[] {
  const count = steps.length;
  return steps.map((step, index) => {
    const cost = computeCost(DEFAULT_DETAILED_PRICING, step.model, step.inputTokens, step.outputTokens);
    const durationMs =
      index < count - 1 ? Math.max(0, steps[index + 1].timestamp.getTime() - step.timestamp.getTime()) : 0;
    return {
      ...step,
      index,
      cost,
      durationMs,
    };
  });
}

export function buildSessionMeta(draft: SessionMetaDraft): SessionMeta {
  const steps = draft.steps;
  const firstUser = steps.find(step => step.type === 'user');
  const summary = cleanSessionSummary(draft.summary?.trim() || firstUser?.content || '');
  const models = new Set<string>();
  let totalCost = 0;
  let totalTokens = 0;

  for (const step of steps) {
    if (step.model) models.add(step.model);
    totalCost += step.cost;
    totalTokens += step.inputTokens + step.outputTokens;
  }

  const startTime = draft.startTime ?? steps[0]?.timestamp ?? new Date();
  const endTime = draft.endTime ?? steps[steps.length - 1]?.timestamp ?? startTime;

  return {
    id: draft.id,
    agentName: draft.agentName,
    ...(draft.dataSource ? { dataSource: draft.dataSource } : {}),
    startTime,
    endTime,
    durationMs: Math.max(0, endTime.getTime() - startTime.getTime()),
    totalCost,
    totalTokens,
    modelUsed: Array.from(models),
    stepCount: steps.length,
    summary,
    ...(draft.sessionLabel ? { sessionLabel: draft.sessionLabel } : {}),
    ...(draft.sessionKey ? { sessionKey: draft.sessionKey } : {}),
    ...(draft.storeUpdatedAt != null ? { storeUpdatedAt: draft.storeUpdatedAt } : {}),
    ...(draft.storeContextTokens != null ? { storeContextTokens: draft.storeContextTokens } : {}),
    ...(draft.storeTotalTokens != null ? { storeTotalTokens: draft.storeTotalTokens } : {}),
    ...(draft.storeModel ? { storeModel: draft.storeModel } : {}),
    ...(draft.storeChannel ? { storeChannel: draft.storeChannel } : {}),
    ...(draft.storeProvider ? { storeProvider: draft.storeProvider } : {}),
    ...(draft.costMeta ? { costMeta: draft.costMeta } : {}),
    ...(draft.parseDiagnostics ? { parseDiagnostics: draft.parseDiagnostics } : {}),
  };
}

export abstract class BaseParser<TData = unknown> implements Parser<TData> {
  abstract canHandle(source: string): boolean;
  abstract parse(data: TData): SessionReplay;

  protected stringify(value: unknown): string {
    return stringifyContent(value);
  }

  protected parseTimestamp(value: unknown, fallback = new Date()): Date {
    return parseSessionTimestamp(value, fallback);
  }

  protected mergeDistinct(values: Array<string | undefined>, separator = '\n'): string {
    return mergeDistinctStrings(values, separator);
  }

  protected buildStepContent(text: string, reasoning = ''): Pick<SessionStep, 'content' | 'reasoning'> {
    return buildStepContent(text, reasoning);
  }

  protected createStep(draft: StepDraft): SessionStep {
    return createStep(draft);
  }

  protected finalizeSteps(steps: SessionStep[]): SessionStep[] {
    return finalizeStepDurationsAndCost(steps);
  }

  protected buildMeta(draft: SessionMetaDraft): SessionMeta {
    return buildSessionMeta(draft);
  }

  protected buildReplay(draft: Omit<SessionMetaDraft, 'steps'>, steps: SessionStep[]): SessionReplay {
    const finalized = this.finalizeSteps(steps);
    return {
      meta: this.buildMeta({ ...draft, steps: finalized }),
      steps: finalized,
    };
  }
}
