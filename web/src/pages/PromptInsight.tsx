import { useEffect, useMemo, useState } from 'react'
import {
  Lightbulb,
  BarChart3,
  AlertTriangle,
  ThumbsUp,
  Zap,
} from 'lucide-react'
import FadeIn from '../components/ui/FadeIn'
import { cn } from '../lib/cn'
import { useI18n, type Locale } from '../lib/i18n'
import { apiGet } from '../lib/api'

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

function labelsFor(locale: Locale) {
  const zh = locale === 'zh'
  return {
    summary: zh ? '概览' : 'Summary',
    tips: zh ? '洞察与建议' : 'Insights',
    patterns: zh ? '会话模式' : 'Patterns',
    sessions: zh ? '总会话' : 'Sessions',
    avgLen: zh ? '平均 Prompt 长度' : 'Avg prompt length',
    ratio: zh ? '平均 输出/输入' : 'Avg output/input',
    efficient: zh ? '高效会话' : 'Efficient',
    wasteful: zh ? '低效会话' : 'Wasteful',
    emptyPatterns: zh ? '暂无符合条件的会话' : 'No matching sessions',
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    apiGet<PromptInsightsPayload>('/api/analytics/prompt-insights?days=30')
      .then(setData)
      .catch(() => setError(t('cost.error')))
      .finally(() => setLoading(false))
  }, [t])

  const tipMessage = (tip: PromptInsightsPayload['tips'][0]) =>
    locale === 'zh' ? tip.messageZh : tip.messageEn

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

  if (loading) {
    return <PromptSkeleton />
  }

  if (error || !data) {
    return (
      <FadeIn>
        <div className="card p-6 text-center text-slate-500">{error ?? t('cost.error')}</div>
      </FadeIn>
    )
  }

  const { summary, tips, patterns } = data

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
