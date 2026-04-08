import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import FadeIn from '../components/ui/FadeIn'
import EmptyState from '../components/ui/EmptyState'
import { cn } from '../lib/cn'
import { apiGet, apiPost, parseApiErrorMessage } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { formatDuration } from '../lib/formatSession'
import type { SessionMeta } from '../types/session'

interface CompareSession {
  id: string
  agentName: string
  label: string
  totalCost: number
  totalTokens: number
  durationMs: number
  stepCount: number
  modelUsed: string[]
  avgTokensPerStep: number
  costPerStep: number
}

interface ComparePayload {
  sessions: CompareSession[]
}

interface SessionReplayLite {
  steps: Array<{
    type: string
  }>
}

const BAR_COLORS = [
  'bg-blue-500',
  'bg-cyan-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-violet-400',
]

const COST_CHART_COLORS = ['#3b82c4', '#22d3ee', '#34d399', '#f59e0b', '#8b5cf6']

const SESSION_SUMMARY_PREVIEW_LENGTH = 40

const chartTooltipStyle = {
  background: 'rgba(248,250,252,0.96)',
  border: '1px solid rgba(226,232,240,0.9)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
} as const

function formatSessionSummary(summary: string) {
  const normalized = summary.replace(/\s+/g, ' ').trim()
  if (!normalized) return '—'
  const chars = Array.from(normalized)
  if (chars.length <= SESSION_SUMMARY_PREVIEW_LENGTH) return normalized
  return `${chars.slice(0, SESSION_SUMMARY_PREVIEW_LENGTH).join('')}…`
}

function formatSessionOptionLabel(session: SessionMeta) {
  const agentName = session.agentName.trim() || session.id
  return `${agentName} - ${formatSessionSummary(session.summary)}`
}

function sessionAliasLetter(index: number) {
  return String.fromCharCode(65 + index)
}

function MetricBar({
  value,
  max,
  colorClass,
}: {
  value: number
  max: number
  colorClass: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden mt-1.5">
      <div
        className={cn('h-full rounded-full transition-all duration-300', colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function Compare() {
  const { t, locale } = useI18n()
  const [slots, setSlots] = useState<string[]>(['', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<CompareSession[] | null>(null)
  const [partialWarning, setPartialWarning] = useState(false)
  const [availableSessions, setAvailableSessions] = useState<SessionMeta[]>([])
  const [availableSessionsLoading, setAvailableSessionsLoading] = useState(true)
  const [availableSessionsError, setAvailableSessionsError] = useState<string | null>(null)
  const [toolCallCounts, setToolCallCounts] = useState<Record<string, number | null>>({})

  const sessionAlias = useCallback(
    (index: number) => t('compare.sessionAlias', { letter: sessionAliasLetter(index) }),
    [t],
  )
  const selectPlaceholder = t('compare.selectPlaceholder')
  const compareHint = t('compare.hint')
  const sessionsLoadErrorText = t('compare.sessionsLoadError')
  const costChartTitle = t('compare.costChart.title')
  const costChartSeries = t('compare.costChart.series')
  const costChartEmpty = t('compare.costChart.empty')
  const conclusionTitle = t('compare.conclusion.title')
  const conclusionEmpty = t('compare.conclusion.empty')
  const noSelectionTitle = t('compare.empty.noSelectionTitle')
  const noSelectionHint = t('compare.empty.noSelectionHint')
  const noAvailableSessionsTitle = t('compare.empty.noSessionsTitle')
  const noAvailableSessionsDesc = t('compare.empty.noSessionsDesc')
  const noAvailableSessionsHint = t('compare.empty.noSessionsHint')

  useEffect(() => {
    let cancelled = false

    setAvailableSessionsLoading(true)
    setAvailableSessionsError(null)

    apiGet<SessionMeta[]>('/api/replay/sessions?limit=50&fallback=demo&minCount=50')
      .then(data => {
        if (cancelled) return
        const comparableSessions = (Array.isArray(data) ? data : []).filter(
          session => (session.totalTokens ?? 0) > 0 || (session.totalCost ?? 0) > 0,
        )
        setAvailableSessions(comparableSessions)
      })
      .catch(e => {
        if (cancelled) return
        setAvailableSessions([])
        setAvailableSessionsError(parseApiErrorMessage(e, sessionsLoadErrorText))
      })
      .finally(() => {
        if (!cancelled) setAvailableSessionsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sessionsLoadErrorText])

  useEffect(() => {
    let cancelled = false

    if (!sessions?.length) {
      setToolCallCounts({})
      return () => {
        cancelled = true
      }
    }

    Promise.all(
      sessions.map(async session => {
        try {
          const replay = await apiGet<SessionReplayLite>(`/api/replay/sessions/${encodeURIComponent(session.id)}`)
          const toolCalls = Array.isArray(replay.steps)
            ? replay.steps.filter(step => step.type === 'tool_call').length
            : 0
          return [session.id, toolCalls] as const
        } catch {
          return [session.id, null] as const
        }
      }),
    ).then(entries => {
      if (!cancelled) {
        setToolCallCounts(Object.fromEntries(entries))
      }
    })

    return () => {
      cancelled = true
    }
  }, [sessions])

  const maxima = useMemo(() => {
    if (!sessions?.length) {
      return {
        cost: 0,
        tokens: 0,
        duration: 0,
        steps: 0,
        avgTok: 0,
        costStep: 0,
      }
    }
    return {
      cost: Math.max(...sessions.map(s => s.totalCost), 0),
      tokens: Math.max(...sessions.map(s => s.totalTokens), 0),
      duration: Math.max(...sessions.map(s => s.durationMs), 0),
      steps: Math.max(...sessions.map(s => s.stepCount), 0),
      avgTok: Math.max(...sessions.map(s => s.avgTokensPerStep), 0),
      costStep: Math.max(...sessions.map(s => s.costPerStep), 0),
    }
  }, [sessions])

  const costChartData = useMemo(
    () =>
      (sessions ?? []).map((session, index) => ({
        id: session.id,
        shortName: sessionAliasLetter(index),
        alias: sessionAlias(index),
        label: session.label || session.agentName || session.id,
        totalCost: session.totalCost,
        color: COST_CHART_COLORS[index % COST_CHART_COLORS.length],
      })),
    [sessions, sessionAlias],
  )

  const toolCallStatus = useMemo(() => {
    if (!sessions?.length) return 'idle' as const
    const values = sessions.map(session => toolCallCounts[session.id])
    if (values.every(value => typeof value === 'number')) return 'ready' as const
    if (values.some(value => value === null)) return 'partial' as const
    return 'loading' as const
  }, [sessions, toolCallCounts])

  const toolCallStatusLabel =
    toolCallStatus === 'ready'
      ? t('compare.toolStatus.ready')
      : toolCallStatus === 'partial'
        ? t('compare.toolStatus.partial')
        : t('compare.toolStatus.loading')

  const conclusions = useMemo(() => {
    if (!sessions || sessions.length < 2) return [] as string[]

    const sessionEntries = sessions.map((session, index) => ({
      ...session,
      alias: sessionAlias(index),
    }))

    const cheapest = sessionEntries.reduce((best, current) =>
      current.totalCost < best.totalCost ? current : best,
    )
    const mostExpensive = sessionEntries.reduce((best, current) =>
      current.totalCost > best.totalCost ? current : best,
    )

    const messages: string[] = []

    if (cheapest.totalCost === mostExpensive.totalCost) {
      messages.push(
        t('compare.conclusion.costClose', {
          cost: cheapest.totalCost.toFixed(4),
        }),
      )
    } else {
      const stepPhrase = t(
        cheapest.stepCount <= mostExpensive.stepCount
          ? 'compare.conclusion.stepPhrase.fewer'
          : 'compare.conclusion.stepPhrase.more',
      )

      messages.push(
        t('compare.conclusion.cheaper', {
          alias: cheapest.alias,
          lowCost: cheapest.totalCost.toFixed(4),
          highCost: mostExpensive.totalCost.toFixed(4),
          stepPhrase,
          lowSteps: cheapest.stepCount,
          highSteps: mostExpensive.stepCount,
        }),
      )
    }

    const bestCostPerStep = sessionEntries.reduce((best, current) =>
      current.costPerStep < best.costPerStep ? current : best,
    )
    const fastest = sessionEntries.reduce((best, current) =>
      current.durationMs < best.durationMs ? current : best,
    )

    if (bestCostPerStep.id === fastest.id) {
      messages.push(
        t('compare.conclusion.bestCostAndFastest', {
          alias: bestCostPerStep.alias,
          costPerStep: bestCostPerStep.costPerStep.toFixed(6),
        }),
      )
    } else {
      messages.push(
        t('compare.conclusion.bestCostVsFastest', {
          bestAlias: bestCostPerStep.alias,
          costPerStep: bestCostPerStep.costPerStep.toFixed(6),
          fastestAlias: fastest.alias,
          duration: formatDuration(fastest.durationMs, locale),
        }),
      )
    }

    if (toolCallStatus === 'ready') {
      const toolSessions = sessionEntries.map(session => ({
        ...session,
        toolCalls: toolCallCounts[session.id] ?? 0,
      }))
      const mostTools = toolSessions.reduce((best, current) =>
        current.toolCalls > best.toolCalls ? current : best,
      )
      const fewestTools = toolSessions.reduce((best, current) =>
        current.toolCalls < best.toolCalls ? current : best,
      )

      if (mostTools.toolCalls === fewestTools.toolCalls) {
        messages.push(
          t('compare.conclusion.toolsSame', {
            count: mostTools.toolCalls,
          }),
        )
      } else {
        messages.push(
          t('compare.conclusion.toolsMore', {
            mostAlias: mostTools.alias,
            mostCount: mostTools.toolCalls,
            fewestCount: fewestTools.toolCalls,
          }),
        )
      }
    }

    return messages
  }, [sessions, toolCallCounts, toolCallStatus, sessionAlias, t, locale])

  const addSlot = () => {
    setSlots(s => (s.length < 5 ? [...s, ''] : s))
  }

  const setSlot = (index: number, value: string) => {
    setSlots(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const runCompare = async () => {
    const raw = slots.map(s => s.trim()).filter(Boolean)
    const ids = [...new Set(raw)]
    if (ids.length < 2) {
      setError(t('compare.error.min'))
      return
    }
    if (ids.length > 5) {
      setError(t('compare.error.max'))
      return
    }
    setError(null)
    setPartialWarning(false)
    setToolCallCounts({})
    setLoading(true)
    try {
      const data = await apiPost<ComparePayload>('/api/replay/compare', { ids })
      setSessions(data.sessions ?? [])
      if ((data.sessions?.length ?? 0) < ids.length) {
        setPartialWarning(true)
      }
    } catch (e) {
      setSessions(null)
      setError(parseApiErrorMessage(e, t('compare.error.load')))
    } finally {
      setLoading(false)
    }
  }

  const rowDefs: Array<{
    key: string
    label: string
    kind: 'text' | 'numeric'
    getValue?: (s: CompareSession) => number
    format: (s: CompareSession) => string
    maxKey?: keyof typeof maxima
  }> = useMemo(
    () => [
      {
        key: 'label',
        label: t('compare.row.label'),
        kind: 'text',
        format: s => s.label || s.id,
      },
      {
        key: 'cost',
        label: t('replay.metric.cost'),
        kind: 'numeric',
        getValue: s => s.totalCost,
        maxKey: 'cost',
        format: s => `$${s.totalCost.toFixed(4)}`,
      },
      {
        key: 'tokens',
        label: t('replay.metric.tokens'),
        kind: 'numeric',
        getValue: s => s.totalTokens,
        maxKey: 'tokens',
        format: s => s.totalTokens.toLocaleString(),
      },
      {
        key: 'duration',
        label: t('replay.metric.time'),
        kind: 'numeric',
        getValue: s => s.durationMs,
        maxKey: 'duration',
        format: s => formatDuration(s.durationMs, locale),
      },
      {
        key: 'steps',
        label: t('compare.row.steps'),
        kind: 'numeric',
        getValue: s => s.stepCount,
        maxKey: 'steps',
        format: s => String(s.stepCount),
      },
      {
        key: 'avgTok',
        label: t('compare.row.avgTokensPerStep'),
        kind: 'numeric',
        getValue: s => s.avgTokensPerStep,
        maxKey: 'avgTok',
        format: s => s.avgTokensPerStep.toLocaleString(),
      },
      {
        key: 'costStep',
        label: t('compare.row.costPerStep'),
        kind: 'numeric',
        getValue: s => s.costPerStep,
        maxKey: 'costStep',
        format: s => `$${s.costPerStep.toFixed(6)}`,
      },
      {
        key: 'models',
        label: t('compare.row.models'),
        kind: 'text',
        format: s => (s.modelUsed?.length ? s.modelUsed.join(', ') : '—'),
      },
    ],
    [t, locale],
  )

  return (
    <FadeIn>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{t('compare.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">{compareHint}</p>
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            {slots.map((value, i) => (
              <label key={i} className="flex flex-col gap-1.5 min-w-[180px] flex-1">
                <span className="text-[11px] text-slate-500 uppercase tracking-wide">
                  {t('compare.placeholder')} {i + 1}
                </span>
                <select
                  value={value}
                  onChange={e => setSlot(i, e.target.value)}
                  disabled={availableSessionsLoading || availableSessions.length === 0}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 disabled:bg-white disabled:text-slate-400"
                >
                  <option value="" disabled>
                    {selectPlaceholder}
                  </option>
                  {availableSessions.map(session => (
                    <option key={session.id} value={session.id}>
                      {formatSessionOptionLabel(session)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addSlot}
              disabled={slots.length >= 5}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                slots.length >= 5
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100',
              )}
            >
              {t('compare.addSlot')}
            </button>
            <button
              type="button"
              onClick={runCompare}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:opacity-95 disabled:opacity-50"
            >
              {loading ? t('compare.loading') : t('compare.submit')}
            </button>
          </div>
          {availableSessionsError && <p className="text-sm text-rose-400">{availableSessionsError}</p>}
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>

        {loading && (
          <div className="card p-5 space-y-3 animate-fade-in">
            <div className="skeleton h-5 w-48 rounded-lg" />
            <div className="skeleton h-36 w-full rounded-xl" />
            <div className="skeleton h-36 w-full rounded-xl" />
          </div>
        )}

        {!loading && !sessions && !error && !availableSessionsLoading && (
          <EmptyState
            icon={availableSessions.length === 0 ? '🧪' : '🆚'}
            title={availableSessions.length === 0 ? noAvailableSessionsTitle : noSelectionTitle}
            description={availableSessions.length === 0 ? noAvailableSessionsDesc : compareHint}
            hint={availableSessions.length === 0 ? noAvailableSessionsHint : noSelectionHint}
          />
        )}

        {!loading && partialWarning && sessions && sessions.length > 0 && (
          <p className="text-sm text-amber-400/90">{t('compare.warn.partial')}</p>
        )}

        {!loading && sessions && sessions.length > 0 && (
          <>
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 text-slate-500 font-medium w-40">{t('compare.col.metric')}</th>
                      {sessions.map((s, i) => (
                        <th key={s.id + String(i)} className="text-left py-3 px-4 text-slate-500 font-medium min-w-[140px]">
                          <span className="line-clamp-2" title={s.id}>
                            {s.label || s.id}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rowDefs.map(row => (
                      <tr key={row.key} className="border-b border-slate-200 last:border-0">
                        <td className="py-3 px-4 text-slate-500 align-top">{row.label}</td>
                        {sessions.map((s, col) => {
                          const color = BAR_COLORS[col % BAR_COLORS.length]
                          const showBar = row.kind === 'numeric' && row.getValue && row.maxKey
                          const max = showBar ? maxima[row.maxKey!] : 0
                          const val = row.getValue?.(s) ?? 0
                          return (
                            <td key={`${row.key}-${s.id}-${col}`} className="py-3 px-4 align-top">
                              <div className="text-slate-800 tabular-nums break-words">{row.format(s)}</div>
                              {showBar && (
                                <MetricBar value={val} max={max} colorClass={color} />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-slate-900">{costChartTitle}</h3>
                <span className="text-xs text-slate-500">{costChartSeries}</span>
              </div>
              {costChartData.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">{costChartEmpty}</p>
              ) : (
                <>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={costChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                        <XAxis dataKey="shortName" stroke="#64748b" tick={{ fontSize: 12 }} />
                        <YAxis
                          stroke="#64748b"
                          tick={{ fontSize: 12 }}
                          tickFormatter={value => `$${Number(value).toFixed(2)}`}
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          labelStyle={{ color: '#64748b' }}
                          itemStyle={{ color: '#0f172a' }}
                          labelFormatter={(_, payload) => {
                            const entry = payload?.[0]?.payload as (typeof costChartData)[number] | undefined
                            return entry ? `${entry.alias} · ${entry.label}` : ''
                          }}
                          formatter={(value: number) => [`$${value.toFixed(4)}`, costChartSeries]}
                        />
                        <Bar dataKey="totalCost" radius={[10, 10, 0, 0]}>
                          {costChartData.map(entry => (
                            <Cell key={entry.id} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {costChartData.map(entry => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="shrink-0 text-sm font-semibold text-slate-900">{entry.alias}</span>
                          <span className="truncate text-sm text-slate-500" title={entry.label}>
                            {entry.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-slate-900">{conclusionTitle}</h3>
                <span className="text-xs text-slate-500">{toolCallStatusLabel}</span>
              </div>
              <div className="space-y-3">
                {conclusions.length === 0 ? (
                  <p className="text-sm text-slate-500">{conclusionEmpty}</p>
                ) : (
                  conclusions.map((message, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-blue-500/15 bg-blue-500/[0.05] px-4 py-3 text-sm leading-relaxed text-slate-700"
                    >
                      {message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {!loading && sessions && sessions.length === 0 && (
          <p className="text-sm text-slate-500">{t('compare.empty')}</p>
        )}
      </div>
    </FadeIn>
  )
}
