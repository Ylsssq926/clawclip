import type { SessionMeta } from '../types/session'

export type SessionSourceFilterKey = 'all' | 'openclaw' | 'hermes' | 'langgraph-otel' | 'zeroclaw'

type Translate = (key: string) => string

export const SESSION_SOURCE_FILTERS: SessionSourceFilterKey[] = [
  'all',
  'openclaw',
  'hermes',
  'langgraph-otel',
  'zeroclaw',
]

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

export function normalizeSessionSource(source?: string): string {
  const normalized = (source ?? '').trim().toLowerCase()
  if (!normalized) return 'unknown'
  if (normalized === 'claw') return 'openclaw'
  if (normalized.includes('openclaw')) return 'openclaw'
  if (normalized.includes('zeroclaw')) return 'zeroclaw'
  if (normalized.includes('hermes')) return 'hermes'
  if (normalized.includes('langgraph') || normalized.includes('langsmith')) return 'langgraph'
  if (normalized.includes('autogen')) return 'autogen'
  if (normalized.includes('crewai')) return 'crewai'
  if (normalized.includes('llamaindex')) return 'llamaindex'
  if (normalized === 'otel') return 'otel'
  return normalized
}

export function isOtelLikeSource(source?: string): boolean {
  const normalized = normalizeSessionSource(source)
  return normalized === 'otel' || normalized === 'langgraph' || normalized === 'autogen' || normalized === 'crewai' || normalized === 'llamaindex'
}

export function matchesSessionSourceFilter(source: string | undefined, filter: SessionSourceFilterKey): boolean {
  const normalized = normalizeSessionSource(source)
  if (filter === 'all') return true
  if (filter === 'langgraph-otel') return isOtelLikeSource(normalized)
  return normalized === filter
}

export function getSessionSourceDisplayName(source: string | undefined, t: Translate): string {
  const normalized = normalizeSessionSource(source)
  switch (normalized) {
    case 'openclaw':
      return t('replay.source.openclaw')
    case 'hermes':
      return t('replay.source.hermes')
    case 'langgraph':
      return t('replay.source.langgraph')
    case 'zeroclaw':
      return t('replay.source.zeroclaw')
    case 'otel':
      return t('replay.source.otel')
    case 'autogen':
      return 'AutoGen'
    case 'crewai':
      return 'CrewAI'
    case 'llamaindex':
      return 'LlamaIndex'
    case 'demo':
      return 'Demo'
    default:
      return titleCase(normalized)
  }
}

export function getSessionSourceFilterLabel(filter: SessionSourceFilterKey, t: Translate): string {
  switch (filter) {
    case 'all':
      return t('replay.source.all')
    case 'openclaw':
      return t('replay.source.openclaw')
    case 'hermes':
      return t('replay.source.hermes')
    case 'langgraph-otel':
      return `${t('replay.source.langgraph')}/${t('replay.source.otel')}`
    case 'zeroclaw':
      return t('replay.source.zeroclaw')
    default:
      return t('replay.source.all')
  }
}

export function countSessionsForSourceFilter(sessions: SessionMeta[], filter: SessionSourceFilterKey): number {
  return sessions.filter(session => matchesSessionSourceFilter(session.dataSource, filter)).length
}
