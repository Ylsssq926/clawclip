import { useEffect, useMemo, useState } from 'react'
import {
  Lightbulb,
  BarChart3,
  Zap,
  ChevronDown,
  ArrowRight,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import FadeIn from '../components/ui/FadeIn'
import EmptyState from '../components/ui/EmptyState'
import { cn } from '../lib/cn'
import { useI18n } from '../lib/i18n'
import { apiGet } from '../lib/api'
import type { SessionMeta } from '../types/session'

interface PromptPattern {
  sessionId: string
  sessionLabel: string
  avgPromptLength: number
  avgOutputLength: number
  outputInputRatio: number
  toolTriggerRate: number
  totalTokens: number
  totalCost: number
  stepCount: number
}

interface PromptInsightsPayload {
  patterns: PromptPattern[]
  summary: {
    avgPromptLength: number
    avgOutputInputRatio: number
    avgToolTriggerRate: number
    totalSessions: number
    efficientCount: number
    wastefulCount: number
  }
  tips: Array<{
    type: 'good' | 'warning' | 'tip'
    messageZh: string
    messageEn: string
  }>
}

interface PromptSessionCard extends PromptPattern {
  agentName: string
}

interface PromptInsightProps {
  onOpenReplaySession?: (sessionId: string) => void
}

type FocusSessionTone = 'efficient' | 'wasteful' | 'review'

interface FocusSessionCard extends PromptSessionCard {
  tone: FocusSessionTone
}

const PROMPT_LENGTH_BUCKETS = [
  { label: '0-100', match: (value: number) => value < 100 },
  { label: '100-300', match: (value: number) => value >= 100 && value < 300 },
  { label: '300-500', match: (value: number) => value >= 300 && value < 500 },
  { label: '500-1000', match: (value: number) => value >= 500 && value < 1000 },
  { label: '1000+', match: (value: number) => value >= 1000 },
] as const

const BAR_FILL = '#3b82c4'

const chartTooltipStyle = {
  background: 'rgba(248,250,252,0.96)',
  border: '1px solid rgba(226,232,240,0.9)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
} as const

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

function localizePromptTip(
  t: TranslateFn,
  locale: string,
  tip: PromptInsightsPayload['tips'][number],
) {
  if (locale.startsWith('zh')) return tip.messageZh
  if (locale.startsWith('en')) return tip.messageEn

  const efficientMatch = tip.messageEn.match(
    /^(\d+) session\(s\) have short prompts with rich output \(output\/input ratio >3\)\. Highly efficient\.$/,
  )
  if (efficientMatch) {
    return t('promptInsight.tip.efficient', { count: efficientMatch[1] })
  }

  const wastefulMatch = tip.messageEn.match(
    /^(\d+) session\(s\) have long prompts but low output \(ratio <0\.5\)\. Consider simplifying instructions\.$/,
  )
  if (wastefulMatch) {
    return t('promptInsight.tip.wasteful', { count: wastefulMatch[1] })
  }

  const toolHeavyMatch = tip.messageEn.match(
    /^Tool calls average (\d+)% of steps\. Your Agent relies heavily on tools — watch tool call costs\.$/,
  )
  if (toolHeavyMatch) {
    return t('promptInsight.tip.toolHeavy', { percent: toolHeavyMatch[1] })
  }

  switch (tip.messageEn) {
    case 'Current real sessions do not contain analyzable prompt samples, so demo prompt insights are shown instead.':
      return t('promptInsight.tip.demoFallback.real')
    case 'You are viewing prompt insights from demo sessions. Connect OpenClaw to switch to real data automatically.':
      return t('promptInsight.tip.demoFallback.demo')
    case 'No demo sessions match the selected time range. Try a wider window.':
      return t('promptInsight.tip.noDemoRange')
    case 'No real session data yet. Connect OpenClaw to analyze prompt efficiency.':
      return t('promptInsight.tip.noRealData')
    default:
      return tip.messageEn
  }
}

function PromptSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-9 w-56 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="card p-4 space-y-3">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="card p-5 space-y-3">
        <div className="skeleton h-5 w-32" />
        {[0, 1, 2].map(i => (
          <div key={i} className="skeleton h-12 w-full rounded-lg" />
        ))}
      </div>
      <div className="card p-5">
        <div className="skeleton h-5 w-40 mb-4" />
        <div className="skeleton h-48 w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function PromptInsight({ onOpenReplaySession }: PromptInsightProps) {
  const { t, locale } = useI18n()
  const L = useMemo(
    () => ({
      summary: t('promptInsight.section.summary'),
      tips: t('promptInsight.section.insights'),
      patterns: t('promptInsight.section.patterns'),
      distribution: t('promptInsight.section.distribution'),
      recommendations: t('promptInsight.section.recommendations'),
      sessions: t('promptInsight.metric.sessions'),
      avgLen: t('promptInsight.metric.avgPromptLength'),
      ratio: t('promptInsight.metric.ratio'),
      efficient: t('promptInsight.metric.efficient'),
      wasteful: t('promptInsight.metric.wasteful'),
      emptyPatterns: t('promptInsight.empty.patterns'),
      chartEmpty: t('promptInsight.empty.chart'),
      promptLength: t('promptInsight.card.promptLength'),
      outputLength: t('promptInsight.card.outputLength'),
      colSession: t('promptInsight.table.session'),
      colAvgLen: t('promptInsight.table.avgLength'),
      colRatio: t('promptInsight.table.ratio'),
      colTool: t('promptInsight.table.toolRate'),
      colCost: t('promptInsight.table.cost'),
      colSteps: t('promptInsight.table.steps'),
      heroTitle: t('promptInsight.hero.title'),
      heroSessions: t('promptInsight.hero.sessions'),
      heroEmptyFocus: t('promptInsight.hero.emptyFocus'),
      heroDetails: t('promptInsight.hero.details'),
      heroOpenReplay: t('promptInsight.hero.openReplay'),
      heroEfficientBadge: t('promptInsight.hero.badge.efficient'),
      heroWastefulBadge: t('promptInsight.hero.badge.wasteful'),
      heroReviewBadge: t('promptInsight.hero.badge.review'),
      error: t('promptInsight.error'),
    }),
    [t],
  )
  const [data, setData] = useState<PromptInsightsPayload | null>(null)
  const [sessionAgentMap, setSessionAgentMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      apiGet<PromptInsightsPayload>('/api/analytics/prompt-insights?days=30'),
      apiGet<SessionMeta[]>('/api/replay/sessions?limit=200&fallback=demo&minCount=50').catch(() => [] as SessionMeta[]),
    ])
      .then(([insights, sessions]) => {
        setData(insights)
        setSessionAgentMap(
          Object.fromEntries(
            (Array.isArray(sessions) ? sessions : []).map(session => [
              session.id,
              session.agentName?.trim() || session.sessionLabel?.trim() || session.id,
            ]),
          ),
        )
      })
      .catch(() => setError(L.error))
      .finally(() => setLoading(false))
  }, [L.error])

  const patterns = data?.patterns ?? []
  const summary = data?.summary ?? null
  const tips = data?.tips ?? []
  const emptyPromptTitle = t('promptInsight.empty.title')
  const emptyPromptDesc = t('promptInsight.empty.desc')
  const emptyPromptHint = t('promptInsight.empty.hint')

  const tipMessage = (tip: PromptInsightsPayload['tips'][number]) =>
    localizePromptTip(t, locale, tip)

  const tipStyle = (type: 'good' | 'warning' | 'tip') => {
    switch (type) {
      case 'warning':
        return 'state-surface state-surface-danger text-orange-700'
      case 'good':
        return 'state-surface state-surface-brand text-[#3b82c4]'
      default:
        return 'state-surface text-slate-600'
    }
  }

  const patternCards = useMemo<PromptSessionCard[]>(
    () =>
      patterns.map(pattern => ({
        ...pattern,
        agentName: (sessionAgentMap[pattern.sessionId] ?? pattern.sessionLabel) || '—',
      })),
    [patterns, sessionAgentMap],
  )

  const promptLengthDistribution = useMemo(
    () =>
      PROMPT_LENGTH_BUCKETS.map(bucket => ({
        range: bucket.label,
        sessions: patternCards.filter(pattern => bucket.match(pattern.avgPromptLength)).length,
      })),
    [patternCards],
  )

  const efficientSessions = useMemo(
    () => patternCards.filter(pattern => pattern.outputInputRatio > 3),
    [patternCards],
  )

  const wastefulSessions = useMemo(
    () => patternCards.filter(pattern => pattern.outputInputRatio < 0.5),
    [patternCards],
  )

  const isEmptyPromptAnalysis = summary?.totalSessions === 0 && patternCards.length === 0

  const recommendations = useMemo(() => {
    if (!summary || patternCards.length === 0) {
      return [
        {
          type: 'tip' as const,
          message: t('promptInsight.recommendation.empty.one'),
        },
        {
          type: 'tip' as const,
          message: t('promptInsight.recommendation.empty.two'),
        },
      ]
    }

    const avgToolRatePercent = Math.round(summary.avgToolTriggerRate * 100)

    return [
      summary.avgPromptLength > 500
        ? {
            type: 'warning' as const,
            message: t('promptInsight.recommendation.longPrompt', {
              avgPromptLength: summary.avgPromptLength,
            }),
          }
        : {
            type: 'good' as const,
            message: t('promptInsight.recommendation.promptLean', {
              avgPromptLength: summary.avgPromptLength,
            }),
          },
      summary.avgToolTriggerRate < 0.2
        ? {
            type: 'warning' as const,
            message: t('promptInsight.recommendation.toolLow', {
              avgToolRatePercent,
            }),
          }
        : summary.avgToolTriggerRate > 0.6
          ? {
              type: 'tip' as const,
              message: t('promptInsight.recommendation.toolHigh', {
                avgToolRatePercent,
              }),
            }
          : {
              type: 'good' as const,
              message: t('promptInsight.recommendation.toolHealthy', {
                avgToolRatePercent,
              }),
            },
      wastefulSessions.length > efficientSessions.length
        ? {
            type: 'warning' as const,
            message: t('promptInsight.recommendation.moreWasteful', {
              wastefulCount: wastefulSessions.length,
              efficientCount: efficientSessions.length,
            }),
          }
        : efficientSessions.length > wastefulSessions.length
          ? {
              type: 'good' as const,
              message: t('promptInsight.recommendation.moreEfficient', {
                efficientCount: efficientSessions.length,
                wastefulCount: wastefulSessions.length,
              }),
            }
          : {
              type: 'tip' as const,
              message: t('promptInsight.recommendation.balanced'),
            },
    ]
  }, [summary, patternCards.length, t, wastefulSessions.length, efficientSessions.length])

  const judgementMessage = useMemo(() => {
    if (!summary || patternCards.length < 2) {
      return t('promptInsight.verdict.collectMore')
    }
    if (wastefulSessions.length > efficientSessions.length) {
      return t('promptInsight.verdict.wasteful')
    }
    if (efficientSessions.length > wastefulSessions.length) {
      return t('promptInsight.verdict.efficient')
    }
    return t('promptInsight.verdict.balanced')
  }, [summary, patternCards.length, wastefulSessions.length, efficientSessions.length, t])

  const focusSessions = useMemo<FocusSessionCard[]>(() => {
    const result: FocusSessionCard[] = []

    const nextWasteful = [...wastefulSessions]
      .sort((a, b) => a.outputInputRatio - b.outputInputRatio || b.totalTokens - a.totalTokens)[0]
    if (nextWasteful) {
      result.push({ ...nextWasteful, tone: 'wasteful' })
    }

    const nextEfficient = [...efficientSessions]
      .sort((a, b) => b.outputInputRatio - a.outputInputRatio || b.totalTokens - a.totalTokens)
      .find(session => session.sessionId !== nextWasteful?.sessionId)
    if (nextEfficient) {
      result.push({ ...nextEfficient, tone: 'efficient' })
    }

    const fallback = [...patternCards]
      .sort(
        (a, b) =>
          Math.abs(b.outputInputRatio - 1) - Math.abs(a.outputInputRatio - 1)
          || b.totalTokens - a.totalTokens,
      )

    for (const session of fallback) {
      if (result.some(item => item.sessionId === session.sessionId)) continue
      result.push({ ...session, tone: 'review' })
      if (result.length >= 2) break
    }

    return result.slice(0, 2)
  }, [efficientSessions, patternCards, wastefulSessions])

  if (loading) {
    return <PromptSkeleton />
  }

  if (error) {
    return (
      <FadeIn>
        <div className="state-surface state-surface-danger px-4 py-3 text-sm text-orange-700">{error}</div>
      </FadeIn>
    )
  }

  if (!data || !summary || isEmptyPromptAnalysis) {
    return (
      <FadeIn className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/12 text-[#3b82c4]">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t('nav.prompt')}</h2>
            <p className="text-xs text-slate-500">30d</p>
          </div>
        </div>

        <EmptyState
          icon="💡"
          title={emptyPromptTitle}
          description={emptyPromptDesc}
          hint={emptyPromptHint}
        />
      </FadeIn>
    )
  }

  const avgToolRatePercent = Math.round(summary.avgToolTriggerRate * 100)

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/12 text-[#3b82c4]">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('nav.prompt')}</h2>
          <p className="text-xs text-slate-500">30d</p>
        </div>
      </div>

      <section className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{L.heroTitle}</p>
        <p className="mt-2 max-w-3xl text-lg font-semibold leading-8 text-slate-900">{judgementMessage}</p>
        <p className="mt-3 text-sm text-slate-500">{L.sessions} · {summary.totalSessions}</p>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900">{L.heroSessions}</p>
            <p className="mt-1 text-xs text-slate-500">{t('promptInsight.section.efficiencyCompare')}</p>
          </div>
        </div>

        {focusSessions.length === 0 ? (
          <div className="state-surface px-4 py-4 text-sm text-slate-500">{L.heroEmptyFocus}</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {focusSessions.map(session => {
              const toneMeta = session.tone === 'wasteful'
                ? {
                    surface: 'state-surface state-surface-danger',
                    badge: L.heroWastefulBadge,
                    accent: 'text-orange-700',
                    value: 'text-orange-700',
                  }
                : session.tone === 'efficient'
                  ? {
                      surface: 'state-surface state-surface-brand',
                      badge: L.heroEfficientBadge,
                      accent: 'text-[#3b82c4]',
                      value: 'text-[#3b82c4]',
                    }
                  : {
                      surface: 'state-surface',
                      badge: L.heroReviewBadge,
                      accent: 'text-slate-700',
                      value: 'text-slate-700',
                    }

              return (
                <div key={session.sessionId} className={cn('px-4 py-4', toneMeta.surface)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium', toneMeta.surface, toneMeta.accent)}>
                        {toneMeta.badge}
                      </span>
                      <p className="mt-3 truncate text-sm font-semibold text-slate-900">{session.agentName}</p>
                      <p className="mt-1 truncate text-xs text-slate-500" title={session.sessionLabel}>
                        {session.sessionLabel || session.sessionId}
                      </p>
                    </div>
                    <span className={cn('shrink-0 text-sm font-semibold tabular-nums', toneMeta.value)}>
                      {session.outputInputRatio.toFixed(2)}x
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-500">
                    <div>
                      <p>{L.promptLength}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{session.avgPromptLength}</p>
                    </div>
                    <div>
                      <p>{L.outputLength}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{session.avgOutputLength}</p>
                    </div>
                    <div>
                      <p>{L.colSteps}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{session.stepCount}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="truncate">{session.totalTokens.toLocaleString()} Token · ${session.totalCost.toFixed(4)}</span>
                    <button
                      type="button"
                      onClick={() => onOpenReplaySession?.(session.sessionId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#3b82c4]/30 hover:text-[#3b82c4]"
                    >
                      {L.heroOpenReplay}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <details className="card p-5">
        <summary className="details-summary-reset flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-slate-700">
          <span>{L.heroDetails}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </summary>

        <div className="mt-5 space-y-6">
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
              <BarChart3 className="h-4 w-4 text-[#3b82c4]" />
              {L.summary}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="text-xs text-slate-500">{L.sessions}</span>
                <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{summary.totalSessions}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="text-xs text-slate-500">{L.avgLen}</span>
                <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{summary.avgPromptLength}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="text-xs text-slate-500">{L.ratio}</span>
                <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{summary.avgOutputInputRatio.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="text-xs text-slate-500">{L.colTool}</span>
                <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{avgToolRatePercent}%</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
              <BarChart3 className="h-4 w-4 text-[#3b82c4]" />
              {L.distribution}
            </div>
            {patternCards.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">{L.chartEmpty}</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={promptLengthDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="range" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: '#64748b' }}
                      itemStyle={{ color: '#0f172a' }}
                      formatter={(value: number) => [value, L.sessions]}
                    />
                    <Bar dataKey="sessions" fill={BAR_FILL} radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Zap className="h-4 w-4 text-[#3b82c4]" />
              {L.recommendations}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {recommendations.map((item, index) => (
                <div key={`${item.type}-${index}`} className={cn('px-4 py-3 text-sm leading-relaxed', tipStyle(item.type))}>
                  {item.message}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Lightbulb className="h-4 w-4 text-[#3b82c4]" />
              {L.tips}
            </div>
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className={cn('px-4 py-3 text-sm leading-relaxed', tipStyle(tip.type))}>
                  {tipMessage(tip)}
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Zap className="h-4 w-4 text-[#3b82c4]" />
              {L.patterns}
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3 font-medium">{L.colSession}</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">{L.colAvgLen}</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">{L.colRatio}</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">{L.colTool}</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">{L.colCost}</th>
                  <th className="pb-2 font-medium tabular-nums">{L.colSteps}</th>
                </tr>
              </thead>
              <tbody>
                {patternCards.map(pattern => (
                  <tr key={pattern.sessionId} className="border-b border-slate-200 text-slate-500 last:border-0">
                    <td className="py-2.5 pr-3 max-w-[220px] truncate" title={pattern.sessionLabel}>
                      {onOpenReplaySession ? (
                        <button
                          type="button"
                          onClick={() => onOpenReplaySession(pattern.sessionId)}
                          className="max-w-full truncate text-left text-slate-700 transition-colors hover:text-[#3b82c4]"
                        >
                          {pattern.sessionLabel || pattern.sessionId}
                        </button>
                      ) : (
                        pattern.sessionLabel || pattern.sessionId
                      )}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{pattern.avgPromptLength}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{pattern.outputInputRatio.toFixed(2)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{(pattern.toolTriggerRate * 100).toFixed(0)}%</td>
                    <td className="py-2.5 pr-3 tabular-nums">{pattern.totalCost.toFixed(4)}</td>
                    <td className="py-2.5 tabular-nums">{pattern.stepCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {patternCards.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">{L.emptyPatterns}</p>
            )}
          </section>
        </div>
      </details>
    </FadeIn>
  )
}
