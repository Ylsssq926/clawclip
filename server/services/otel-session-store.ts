import type { SessionMeta, SessionReplay } from '../types/replay.js';
import type { OtelKeyValue, OtelResource } from '../types/otel.js';

const otelSessions = new Map<string, SessionReplay>();

function getAttr(attrs: OtelKeyValue[] = [], key: string): string | number | boolean | undefined {
  const kv = attrs.find(item => item.key === key);
  if (!kv) return undefined;
  const value = kv.value;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.intValue !== undefined) return parseInt(value.intValue, 10);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.boolValue !== undefined) return value.boolValue;
  return undefined;
}

function pickKnownFramework(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes('langgraph') || normalized.includes('langsmith')) return 'langgraph';
  if (normalized.includes('autogen')) return 'autogen';
  if (normalized.includes('crewai')) return 'crewai';
  if (normalized.includes('llamaindex')) return 'llamaindex';
  return undefined;
}

export function inferOtelDataSource(resource: OtelResource, scopeName?: string, serviceName?: string): string {
  const candidates = [
    scopeName,
    serviceName,
    getAttr(resource.attributes, 'service.name'),
    getAttr(resource.attributes, 'service.namespace'),
    getAttr(resource.attributes, 'telemetry.sdk.name'),
    getAttr(resource.attributes, 'framework.name'),
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  for (const candidate of candidates) {
    const framework = pickKnownFramework(candidate);
    if (framework) return framework;
  }

  return 'otel';
}

export function getOtelSessionReplays(): SessionReplay[] {
  return Array.from(otelSessions.values());
}

export function getOtelSessionMetas(): SessionMeta[] {
  return getOtelSessionReplays().map(replay => replay.meta);
}

export function getOtelSessionReplay(traceId: string): SessionReplay | undefined {
  return otelSessions.get(traceId);
}

export function setOtelSessionReplay(traceId: string, replay: SessionReplay): void {
  otelSessions.set(traceId, replay);
}

export function deleteOtelSessionReplay(traceId: string): boolean {
  return otelSessions.delete(traceId);
}

export function clearOtelSessions(): number {
  const count = otelSessions.size;
  otelSessions.clear();
  return count;
}

export function getOtelSessionCount(): number {
  return otelSessions.size;
}
