import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import FadeIn from '../components/ui/FadeIn'
import GlowCard from '../components/ui/GlowCard'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import { cn } from '../lib/cn'
import { useI18n } from '../lib/i18n'

interface DailyData {
  date: string
  cost: number
  totalTokens: number
}

interface CostSummary {
  totalCost: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  trend: 'up' | 'down' | 'stable'
  comparedToLastMonth: number
  budget: { isAlert: boolean; percentage: number; message: string }
  topTasks: { taskId: string; taskName: string; cost: number; tokens: number }[]
}

const chartTooltipStyle = {
  background: 'rgba(17,24,39,0.9)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
} as const

function CostSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="glass-raised rounded-xl p-5 border border-surface-border space-y-3">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-9 w-32" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="glass-raised rounded-xl p-6 border border-surface-border">
        <div className="skeleton h-6 w-28 mb-4" />
        <div className="skeleton h-[300px] w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function CostMonitor() {
  const { t } = useI18n()
  const [daily, setDaily] = useState<DailyData[]>([])
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [demoCostHint, setDemoCostHint] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const safeFetch = async (url: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    }

    Promise.all([
      safeFetch(`/api/cost/daily?days=${days}`),
      safeFetch(`/api/cost/summary?days=${days}`),
      fetch('/api/status')
        .then(r => (r.ok ? r.json() : null))
        .then((s: { hasRealSessionData?: boolean } | null) => !(s?.hasRealSessionData ?? false))
        .catch(() => true),
    ])
      .then(([d, s, isDemo]) => {
        setDaily(d)
        setSummary(s)
        setDemoCostHint(Boolean(isDemo))
      })
      .catch(() => {
        setError(t('cost.error'))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [days, t])

  const TrendIcon = summary?.trend === 'up' ? TrendingUp : summary?.trend === 'down' ? TrendingDown : Minus
  const trendColor = summary?.trend === 'up' ? 'text-red-400' : summary?.trend === 'down' ? 'text-green-400' : 'text-slate-400'

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold">{t('cost.title')}</h2>
        <div className="flex gap-2">
          {([7, 14, 30] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                days === d ? 'bg-accent text-white' : 'glass-raised text-slate-400 hover:text-white hover:bg-surface-overlay',
              )}
            >
              {t('cost.days').replace('{n}', String(d))}
            </button>
          ))}
        </div>
      </div>

      {demoCostHint && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
          {t('demo.hint.cost')}
        </div>
      )}

      {loading && <CostSkeleton />}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">
          {error}
        </div>
      )}

      {!loading && summary?.budget?.isAlert && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-red-300 text-sm">{summary.budget.message}</span>
        </div>
      )}

      {!loading && (
        <FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <GlowCard>
              <div className="p-5">
                <span className="text-sm text-slate-400">{t('cost.card.total')}</span>
                <div className="text-2xl font-bold text-accent mt-1 tabular-nums">
                  <AnimatedCounter value={summary?.totalCost ?? 0} prefix="¥" decimals={2} duration={1000} />
                </div>
                <div className={`flex items-center gap-1 mt-1 text-xs ${trendColor}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span>
                    {t('cost.card.mom').replace('{n}', String(summary?.comparedToLastMonth?.toFixed(1) ?? '0'))}
                  </span>
                </div>
              </div>
            </GlowCard>
            <GlowCard>
              <div className="p-5">
                <span className="text-sm text-slate-400">{t('cost.card.tokens')}</span>
                <div className="text-2xl font-bold text-blue-400 mt-1 tabular-nums">
                  <AnimatedCounter value={summary?.totalTokens ?? 0} decimals={0} duration={1000} />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {t('cost.card.inOut')
                    .replace('{in}', String(summary?.inputTokens?.toLocaleString() ?? 0))
                    .replace('{out}', String(summary?.outputTokens?.toLocaleString() ?? 0))}
                </div>
              </div>
            </GlowCard>
            <GlowCard>
              <div className="p-5">
                <span className="text-sm text-slate-400">{t('cost.card.budget')}</span>
                <div className="text-2xl font-bold text-purple-400 mt-1 tabular-nums">
                  <AnimatedCounter value={summary?.budget?.percentage ?? 0} decimals={1} suffix="%" duration={1000} />
                </div>
                <div className="w-full bg-surface-overlay rounded-full h-2 mt-2 border border-surface-border">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (summary?.budget?.percentage || 0) > 80 ? 'bg-red-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(summary?.budget?.percentage || 0, 100)}%` }}
                  />
                </div>
              </div>
            </GlowCard>
          </div>

          <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
            <h3 className="text-lg font-semibold mb-4">{t('cost.trend.title')}</h3>
            {summary && summary.totalCost === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <span className="text-4xl mb-3">📉</span>
                <p className="text-lg mb-1">{t('cost.empty.title')}</p>
                <p className="text-sm text-center max-w-md">{t('cost.empty.desc')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="cost" stroke="#f97316" strokeWidth={2} dot={false} name={t('cost.chart.series')} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {summary?.topTasks && summary.topTasks.length > 0 && (
            <div className="glass-raised rounded-xl p-6 border border-surface-border">
              <h3 className="text-lg font-semibold mb-4">{t('cost.topTasks')}</h3>
              <div className="space-y-3">
                {summary.topTasks.slice(0, 5).map((task, i) => (
                  <div key={task.taskId} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-sm w-6">{i + 1}.</span>
                      <span className="text-sm truncate max-w-[300px]">{task.taskName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-accent font-medium">¥{task.cost.toFixed(4)}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        {task.tokens.toLocaleString()} {t('replay.list.tokensUnit')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FadeIn>
      )}
    </div>
  )
}
