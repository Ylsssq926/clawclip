import { useEffect, useMemo, useState } from 'react'
import {
  Lightbulb,
  BarChart3,
  AlertTriangle,
  ThumbsUp,
  Zap,
  Sparkles,
} from 'lucide-react'
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
import { useI18n, type Locale } from '../lib/i18n'
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

const PROMPT_LENGTH_BUCKETS = [
  { label: '0-100', match: (value: number) => value < 100 },
  { label: '100-300', match: (value: number) => value >= 100 && value < 300 },
  { label: '300-500', match: (value: number) => value >= 300 && value < 500 },
  { label: '500-1000', match: (value: number) => value >= 500 && value < 1000 },
  { label: '1000+', match: (value: number) => value >= 1000 },
] as const

const CHART_COLORS = ['#3b82c4', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444']

const chartTooltipStyle = {
  background: 'rgba(248,250,252,0.96)',
  border: '1px solid rgba(226,232,240,0.9)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
} as const

function labelsFor(locale: Locale) {
  const zh = locale.startsWith('zh')
  return {
    summary: zh ? '概览' : 'Summary',
    tips: zh ? '洞察与建议' : 'Insights',
    patterns: zh ? '会话模式' : 'Patterns',
    distribution: zh ? 'Prompt 长度分布' : 'Prompt length distribution',
    efficiencyCompare: zh ? '高效 vs 低效会话' : 'Efficient vs inefficient sessions',
    recommendations: zh ? '优化建议' : 'Optimization suggestions',
    sessions: zh ? '总会话' : 'Sessions',
    avgLen: zh ? '平均 Prompt 长度' : 'Avg prompt length',
    ratio: zh ? '平均 输出/输入' : 'Avg output/input',
    efficient: zh ? '高效会话' : 'Efficient',
    wasteful: zh ? '低效会话' : 'Wasteful',
    emptyPatterns: zh ? '暂无符合条件的会话' : 'No matching sessions',
    emptyEfficient: zh ? '暂无输出/输入比 > 3 的会话' : 'No sessions with output/input > 3',
    emptyWasteful: zh ? '暂无输出/输入比 < 0.5 的会话' : 'No sessions with output/input < 0.5',
    chartEmpty: zh ? '暂无可用于统计分布的会话' : 'No sessions available for distribution',
    agent: zh ? 'Agent' : 'Agent',
    promptLength: zh ? 'Prompt 长度' : 'Prompt length',
    outputLength: zh ? '输出长度' : 'Output length',
    colSession: zh ? '会话' : 'Session',
    colAvgLen: zh ? '平均长度' : 'Avg length',
    colRatio: zh ? '输出/输入' : 'Out/in',
    colTool: zh ? '工具占比' : 'Tool rate',
    colCost: zh ? '费用' : 'Cost',
    colSteps: zh ? '步数' : 'Steps',
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

export default function PromptInsight() {
  const { t, locale } = useI18n()
  const L = useMemo(() => labelsFor(locale), [locale])
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
      .catch(() => setError(t('cost.error')))
      .finally(() => setLoading(false))
  }, [t])

  const patterns = data?.patterns ?? []
  const summary = data?.summary ?? null
  const tips = data?.tips ?? []
  const isZh = locale.startsWith('zh')
  const emptyPromptTitle = isZh ? '还没有可分析的 Prompt 样本' : 'No prompt analysis samples yet'
  const emptyPromptDesc = isZh
    ? '接入更多真实会话后，这里会统计 Prompt 长度分布、输出/输入比和工具触发率。'
    : 'Once more real sessions arrive, this page will chart prompt length distribution, output/input ratio, and tool usage rate.'
  const emptyPromptHint = isZh
    ? '如何开始：先在 OpenClaw / ZeroClaw 跑几轮任务，再回来查看哪些 Prompt 更省、更稳。'
    : 'How to start: run a few tasks in OpenClaw / ZeroClaw, then come back to see which prompt patterns are leaner and more reliable.'

  const tipMessage = (tip: PromptInsightsPayload['tips'][0]) =>
    locale.startsWith('zh') ? tip.messageZh : tip.messageEn

  const tipStyle = (type: 'good' | 'warning' | 'tip') => {
    switch (type) {
      case 'good':
        return 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700'
      case 'warning':
        return 'border-amber-500/25 bg-amber-500/[0.07] text-amber-700'
      default:
        return 'border-blue-500/25 bg-blue-500/[0.07] text-blue-700'
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

  const isEmptyPromptAnalysis = summary?.totalSessions === 0 && patternCards.length === 0

  const wastefulSessions = useMemo(
    () => patternCards.filter(pattern => pattern.outputInputRatio < 0.5),
    [patternCards],
  )

  const recommendations = useMemo(() => {
    if (!summary || patternCards.length === 0) {
      return locale === 'zh'
        ? [
            {
              type: 'tip' as const,
              message: '当前时间范围内暂无足够样本，建议继续积累会话后再观察 Prompt 结构和产出比。',
            },
            {
              type: 'tip' as const,
              message: '接入更多真实会话后，可优先关注 Prompt 长度、工具调用率与输出/输入比三项指标。',
            },
          ]
        : [
            {
              type: 'tip' as const,
              message: 'There are not enough sessions in the selected range yet. Add more runs to evaluate prompt structure and payoff.',
            },
            {
              type: 'tip' as const,
              message: 'Once more real sessions arrive, focus on prompt length, tool usage rate, and output/input ratio first.',
            },
          ]
    }

    const avgToolRatePercent = Math.round(summary.avgToolTriggerRate * 100)

    return [
      summary.avgPromptLength > 500
        ? {
            type: 'warning' as const,
            message:
              locale === 'zh'
                ? `建议精简 Prompt，当前平均长度为 ${summary.avgPromptLength}，整体偏长。`
                : `Consider shortening prompts. The current average length is ${summary.avgPromptLength}, which is on the long side.`,
          }
        : {
            type: 'good' as const,
            message:
              locale === 'zh'
                ? `平均 Prompt 长度为 ${summary.avgPromptLength}，整体较克制，可继续沉淀为模板。`
                : `Average prompt length is ${summary.avgPromptLength}, which looks relatively lean. You can keep standardizing this structure.`,
          },
      summary.avgToolTriggerRate < 0.2
        ? {
            type: 'warning' as const,
            message:
              locale === 'zh'
                ? `工具使用率仅 ${avgToolRatePercent}%，偏低，考虑增加工具调用来提升信息获取能力。`
                : `Tool usage is only ${avgToolRatePercent}%, which is relatively low. Consider adding more tool calls to improve information gathering.`,
          }
        : summary.avgToolTriggerRate > 0.6
          ? {
              type: 'tip' as const,
              message:
                locale === 'zh'
                  ? `工具使用率约 ${avgToolRatePercent}%，依赖度偏高，建议关注工具链路是否带来额外成本。`
                  : `Tool usage is around ${avgToolRatePercent}%, which is fairly high. Make sure the extra tool calls are worth the cost.`,
            }
          : {
              type: 'good' as const,
              message:
                locale === 'zh'
                  ? `工具使用率约 ${avgToolRatePercent}%，整体处于合理区间，可继续保持。`
                  : `Tool usage is around ${avgToolRatePercent}%, which looks healthy overall.`,
            },
      wastefulSessions.length > efficientSessions.length
        ? {
            type: 'warning' as const,
            message:
              locale === 'zh'
                ? `低效会话多于高效会话（${wastefulSessions.length} vs ${efficientSessions.length}），建议优先优化 Prompt 结构与上下文噪音。`
                : `Inefficient sessions outnumber efficient ones (${wastefulSessions.length} vs ${efficientSessions.length}). Start by tightening prompt structure and reducing noise.`,
          }
        : efficientSessions.length > wastefulSessions.length
          ? {
              type: 'good' as const,
              message:
                locale === 'zh'
                  ? `高效会话更多（${efficientSessions.length} vs ${wastefulSessions.length}），建议复用这些会话的 Prompt 模板。`
                  : `Efficient sessions are leading (${efficientSessions.length} vs ${wastefulSessions.length}). Reuse their prompt patterns as templates.`,
            }
          : {
              type: 'tip' as const,
              message:
                locale === 'zh'
                  ? `高效与低效会话数量接近，建议重点对比边界样本，找出最影响结果的 Prompt 片段。`
                  : `Efficient and inefficient sessions are close in count. Compare the borderline cases to identify the prompt fragments that matter most.`,
            },
    ]
  }, [summary, patternCards.length, locale, wastefulSessions.length, efficientSessions.length])

  if (loading) {
    return <PromptSkeleton />
  }

  if (error) {
    return (
      <FadeIn>
        <div className="card p-6 text-center text-slate-500">{error}</div>
      </FadeIn>
    )
  }

  if (!data || !summary || isEmptyPromptAnalysis) {
    return (
      <FadeIn className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
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

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('nav.prompt')}</h2>
          <p className="text-xs text-slate-500">30d</p>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          {L.summary}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="card p-4">
            <span className="text-xs text-slate-500">{L.sessions}</span>
            <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{summary.totalSessions}</p>
          </div>
          <div className="card p-4">
            <span className="text-xs text-slate-500">{L.avgLen}</span>
            <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{summary.avgPromptLength}</p>
          </div>
          <div className="card p-4">
            <span className="text-xs text-slate-500">{L.ratio}</span>
            <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{summary.avgOutputInputRatio}</p>
          </div>
          <div className="card p-4 border-emerald-500/15">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />
              {L.efficient}
            </span>
            <p className="mt-1 text-xl font-semibold text-emerald-600 tabular-nums">{summary.efficientCount}</p>
          </div>
          <div className="card p-4 border-amber-500/15">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              {L.wasteful}
            </span>
            <p className="mt-1 text-xl font-semibold text-amber-600 tabular-nums">{summary.wastefulCount}</p>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <BarChart3 className="h-4 w-4 text-blue-400" />
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
                <Bar dataKey="sessions" radius={[10, 10, 0, 0]}>
                  {promptLengthDistribution.map((entry, index) => (
                    <Cell key={entry.range} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Zap className="h-4 w-4 text-emerald-500" />
          {L.efficiencyCompare}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <ThumbsUp className="h-4 w-4" />
              {L.efficient}
            </div>
            <div className="space-y-3">
              {efficientSessions.length === 0 && <p className="text-sm text-slate-500">{L.emptyEfficient}</p>}
              {efficientSessions.map(session => (
                <div
                  key={session.sessionId}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{session.agentName}</p>
                      <p className="mt-1 truncate text-xs text-slate-500" title={session.sessionLabel}>
                        {session.sessionLabel || session.sessionId}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-700">
                      {session.outputInputRatio.toFixed(2)}x
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <div>
                      <p>{L.promptLength}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{session.avgPromptLength}</p>
                    </div>
                    <div>
                      <p>{L.outputLength}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{session.avgOutputLength}</p>
                    </div>
                    <div>
                      <p>{L.ratio}</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-700 tabular-nums">
                        {session.outputInputRatio.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-rose-700">
              <AlertTriangle className="h-4 w-4" />
              {L.wasteful}
            </div>
            <div className="space-y-3">
              {wastefulSessions.length === 0 && <p className="text-sm text-slate-500">{L.emptyWasteful}</p>}
              {wastefulSessions.map(session => (
                <div key={session.sessionId} className="rounded-xl border border-rose-500/20 bg-rose-500/[0.05] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{session.agentName}</p>
                      <p className="mt-1 truncate text-xs text-slate-500" title={session.sessionLabel}>
                        {session.sessionLabel || session.sessionId}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-rose-500/15 px-2 py-1 text-xs font-medium text-rose-700">
                      {session.outputInputRatio.toFixed(2)}x
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <div>
                      <p>{L.promptLength}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{session.avgPromptLength}</p>
                    </div>
                    <div>
                      <p>{L.outputLength}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">{session.avgOutputLength}</p>
                    </div>
                    <div>
                      <p>{L.ratio}</p>
                      <p className="mt-1 text-sm font-semibold text-rose-700 tabular-nums">
                        {session.outputInputRatio.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Sparkles className="h-4 w-4 text-violet-400" />
          {L.recommendations}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {recommendations.map((item, index) => (
            <div
              key={`${item.type}-${index}`}
              className={cn('rounded-xl border px-4 py-3 text-sm leading-relaxed', tipStyle(item.type))}
            >
              {item.message}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          {L.tips}
        </div>
        <ul className="space-y-2">
          {tips.map((tip, i) => (
            <li
              key={i}
              className={cn('rounded-lg border px-3 py-2.5 text-sm leading-relaxed', tipStyle(tip.type))}
            >
              {tipMessage(tip)}
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5 overflow-x-auto">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Zap className="h-4 w-4 text-violet-400" />
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
            {patterns.map(p => (
              <tr key={p.sessionId} className="border-b border-slate-200 text-slate-500 last:border-0">
                <td className="py-2.5 pr-3 max-w-[220px] truncate" title={p.sessionLabel}>
                  {p.sessionLabel || '—'}
                </td>
                <td className="py-2.5 pr-3 tabular-nums">{p.avgPromptLength}</td>
                <td className="py-2.5 pr-3 tabular-nums">{p.outputInputRatio}</td>
                <td className="py-2.5 pr-3 tabular-nums">{(p.toolTriggerRate * 100).toFixed(0)}%</td>
                <td className="py-2.5 pr-3 tabular-nums">{p.totalCost.toFixed(4)}</td>
                <td className="py-2.5 tabular-nums">{p.stepCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {patterns.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">{L.emptyPatterns}</p>
        )}
      </section>
    </FadeIn>
  )
}
