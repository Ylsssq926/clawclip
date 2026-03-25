import { useMemo, useState } from 'react'
import FadeIn from '../components/ui/FadeIn'
import { cn } from '../lib/cn'
import { apiPost, parseApiErrorMessage } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { formatDuration } from '../lib/formatSession'

interface CompareSession {
  id: string
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

const BAR_COLORS = [
  'bg-blue-500',
  'bg-cyan-400',
  'bg-emerald-400',
  'bg-amber-400',
  'bg-violet-400',
]

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
    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden mt-1.5">
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
          <h2 className="text-xl font-semibold text-white tracking-tight">{t('compare.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('compare.hint')}</p>
        </div>

        <div className="card p-5 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            {slots.map((value, i) => (
              <label key={i} className="flex flex-col gap-1.5 min-w-[180px] flex-1">
                <span className="text-[11px] text-slate-500 uppercase tracking-wide">
                  {t('compare.placeholder')} {i + 1}
                </span>
                <input
                  type="text"
                  value={value}
                  onChange={e => setSlot(i, e.target.value)}
                  className="rounded-xl border border-white/[0.1] bg-[#0f172a] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
                  placeholder={t('compare.placeholder')}
                  autoComplete="off"
                />
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
                  ? 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                  : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]',
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
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>

        {loading && (
          <div className="card p-5 space-y-3 animate-fade-in">
            <div className="skeleton h-5 w-48 rounded-lg" />
            <div className="skeleton h-36 w-full rounded-xl" />
            <div className="skeleton h-36 w-full rounded-xl" />
          </div>
        )}

        {!loading && partialWarning && sessions && sessions.length > 0 && (
          <p className="text-sm text-amber-400/90">{t('compare.warn.partial')}</p>
        )}

        {!loading && sessions && sessions.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium w-40">{t('compare.col.metric')}</th>
                    {sessions.map((s, i) => (
                      <th key={s.id + String(i)} className="text-left py-3 px-4 text-slate-300 font-medium min-w-[140px]">
                        <span className="line-clamp-2" title={s.id}>
                          {s.label || s.id}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowDefs.map(row => (
                    <tr key={row.key} className="border-b border-white/[0.06] last:border-0">
                      <td className="py-3 px-4 text-slate-500 align-top">{row.label}</td>
                      {sessions.map((s, col) => {
                        const color = BAR_COLORS[col % BAR_COLORS.length]
                        const showBar = row.kind === 'numeric' && row.getValue && row.maxKey
                        const max = showBar ? maxima[row.maxKey!] : 0
                        const val = row.getValue?.(s) ?? 0
                        return (
                          <td key={`${row.key}-${s.id}-${col}`} className="py-3 px-4 align-top">
                            <div className="text-slate-200 tabular-nums break-words">{row.format(s)}</div>
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
        )}

        {!loading && sessions && sessions.length === 0 && (
          <p className="text-sm text-slate-500">{t('compare.empty')}</p>
        )}
      </div>
    </FadeIn>
  )
}
