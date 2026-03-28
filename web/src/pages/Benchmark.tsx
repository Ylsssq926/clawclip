import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Zap, Play, RefreshCw, Shield, Search, Code, Pen, Wrench, Coins, TrendingUp, Share2, ChevronDown, ChevronRight } from 'lucide-react'
import FadeIn from '../components/ui/FadeIn'
import GlowCard from '../components/ui/GlowCard'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import GradientText from '../components/ui/GradientText'
import ShimmerButton from '../components/ui/ShimmerButton'
import { useI18n } from '../lib/i18n'
import { apiGet, apiPost, apiGetSafe, ApiError } from '../lib/api'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts'

interface DimensionScore {
  dimension: string
  label: string
  labelEn?: string
  score: number
  maxScore: number
  details: string
  detailsEn?: string
}

interface BenchmarkResult {
  id: string
  runAt: string
  overallScore: number
  rank: string
  dimensions: DimensionScore[]
  totalSessions: number
  totalTokens: number
  totalCost: number
  avgCostPerSession: number
  topModel: string
  summary: string
  summaryEn?: string
}

const DIMENSION_ICONS: Record<string, typeof Pen> = {
  writing: Pen,
  coding: Code,
  toolUse: Wrench,
  search: Search,
  safety: Shield,
  costEfficiency: Coins,
}

const DIMENSION_COLORS: Record<string, string> = {
  writing: 'text-pink-400',
  coding: 'text-blue-400',
  toolUse: 'text-cyan-400',
  search: 'text-cyan-400',
  safety: 'text-green-400',
  costEfficiency: 'text-yellow-400',
}

const DIMENSION_LINE_STROKES: Record<string, string> = {
  writing: '#f472b6',
  coding: '#60a5fa',
  toolUse: '#fb923c',
  search: '#22d3ee',
  safety: '#4ade80',
  costEfficiency: '#facc15',
}

const RANK_STYLES: Record<string, { bg: string; text: string; glow: string }> = {
  S: { bg: 'bg-gradient-to-br from-[#3b82c4]/25 via-cyan-600/15 to-teal-600/10', text: 'text-blue-300', glow: 'shadow-cyan-500/10 shadow-lg' },
  A: { bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/10', text: 'text-green-400', glow: 'shadow-green-500/10 shadow-md' },
  B: { bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10', text: 'text-blue-400', glow: '' },
  C: { bg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/10', text: 'text-slate-400', glow: '' },
  D: { bg: 'bg-gradient-to-br from-red-500/20 to-red-500/10', text: 'text-red-400', glow: '' },
}

const PRIMARY_SERIES_COLOR = '#3b82c4'
const COMPARE_SERIES_COLOR = '#06b6d4'

const chartTooltipProps = {
  contentStyle: {
    background: 'rgba(17,24,39,0.9)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    backdropFilter: 'blur(12px)',
  } as const,
  labelStyle: { color: '#94a3b8' } as const,
  itemStyle: { color: '#e2e8f0' } as const,
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  const barColor = score >= 80 ? 'bg-brand-green' : score >= 60 ? 'bg-brand-blue' : score >= 40 ? 'bg-accent' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-surface-overlay rounded-full h-2.5 border border-surface-border">
        <div className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold w-8 text-right ${color}`}>{score}</span>
    </div>
  )
}

function formatRunDate(runAt: string) {
  const d = new Date(runAt)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}/${day}`
}

function mergeTimelineHistory(history: BenchmarkResult[], latest: BenchmarkResult | null): BenchmarkResult[] {
  const byId = new Map<string, BenchmarkResult>()
  for (const h of history) byId.set(h.id, h)
  if (latest) byId.set(latest.id, latest)
  return Array.from(byId.values()).sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime())
}

function dimLabel(d: { label: string; labelEn?: string }, zh: boolean): string {
  return zh ? d.label : (d.labelEn || d.label)
}

export default function Benchmark() {
  const { t, locale } = useI18n()
  const isZh = locale === 'zh'
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [history, setHistory] = useState<BenchmarkResult[]>([])
  const [compareId, setCompareId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDimTrend, setShowDimTrend] = useState(false)
  const [dataSource, setDataSource] = useState<'demo' | 'real' | null>(null)
  const [showRadarHelp, setShowRadarHelp] = useState(false)
  const [showCurveHelp, setShowCurveHelp] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [latest, histBody, meta] = await Promise.all([
        apiGet<BenchmarkResult>('/api/benchmark/latest').catch((e) =>
          e instanceof ApiError && e.status === 404 ? null : Promise.reject(e),
        ),
        apiGet<{ results?: BenchmarkResult[] }>('/api/benchmark/history'),
        apiGetSafe<{ dataSource?: string }>('/api/benchmark/meta'),
      ])
      setDataSource(meta?.dataSource === 'real' ? 'real' : 'demo')
      setResult(latest)
      setHistory(Array.isArray(histBody.results) ? histBody.results : [])
    } catch {
      setError(t('benchmark.error.load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const compareResult = useMemo(
    () => (compareId ? history.find(h => h.id === compareId) ?? null : null),
    [compareId, history],
  )

  const timeline = useMemo(() => mergeTimelineHistory(history, result), [history, result])

  const overallTrendData = useMemo(
    () =>
      timeline.map(h => ({
        date: formatRunDate(h.runAt),
        overallScore: h.overallScore,
        rank: h.rank,
      })),
    [timeline],
  )

  const dimKeys = useMemo(() => {
    const first = timeline[0]
    if (!first) return [] as string[]
    return (first.dimensions ?? []).map(d => d.dimension)
  }, [timeline])

  const dimTrendData = useMemo(() => {
    return timeline.map(h => {
      const row: Record<string, string | number> = { date: formatRunDate(h.runAt) }
      for (const d of h.dimensions) {
        row[d.dimension] = d.score
      }
      return row
    })
  }, [timeline])

  const radarData = useMemo(() => {
    if (!result) return []
    return (result.dimensions ?? []).map(d => {
      const other = compareResult?.dimensions?.find(x => x.dimension === d.dimension)
      return {
        subject: dimLabel(d, isZh),
        score: d.score,
        compareScore: other?.score,
        fullMark: 100,
      }
    })
  }, [result, compareResult])

  const runBenchmark = async () => {
    setRunning(true)
    setError(null)
    try {
      const data = await apiPost<BenchmarkResult>('/api/benchmark/run')
      setResult(data)
      setCompareId(null)
      const [histBody, meta] = await Promise.all([
        apiGetSafe<{ results?: BenchmarkResult[] }>('/api/benchmark/history'),
        apiGetSafe<{ dataSource?: string }>('/api/benchmark/meta'),
      ])
      if (meta) setDataSource(meta.dataSource === 'real' ? 'real' : 'demo')
      if (histBody) setHistory(Array.isArray(histBody.results) ? histBody.results : [])
    } catch {
      setError(t('benchmark.error.run'))
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    if (result && compareId === result.id) setCompareId(null)
  }, [result, compareId])

  const dateLocale =
    locale === 'zh' ? 'zh-CN'
    : locale === 'en' ? 'en-US'
    : locale === 'ja' ? 'ja-JP'
    : locale === 'ko' ? 'ko-KR'
    : locale === 'de' ? 'de-DE'
    : locale === 'fr' ? 'fr-FR'
    : 'es-ES'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-48 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  if (!result && !error) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-1">{t('nav.benchmark')}</h2>
        <p className="text-slate-400 text-sm mb-8">{t('benchmark.subtitle')}</p>

        <FadeIn className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-6">🩺</div>
          <h3 className="text-xl font-semibold mb-2">
            <GradientText animate={false}>{t('benchmark.empty.title')}</GradientText>
          </h3>
          <p className="text-slate-400 text-sm mb-6 text-center max-w-md">
            {t('benchmark.empty.desc')}
          </p>
          <ShimmerButton variant="primary" onClick={runBenchmark} disabled={running} className="px-8 py-3 rounded-xl text-base">
            {running ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> {t('benchmark.running')}
              </>
            ) : (
              <>
                <Play className="w-5 h-5" /> {t('benchmark.runStart')}
              </>
            )}
          </ShimmerButton>
        </FadeIn>
      </div>
    )
  }

  const rankStyle = RANK_STYLES[result?.rank || 'C'] || RANK_STYLES.C
  const compareOptions = result ? history.filter(h => h.id !== result.id) : []
  const curveNote = dataSource === 'demo' ? t('benchmark.curve.demo') : dataSource === 'real' ? t('benchmark.curve.real') : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">{t('nav.benchmark')}</h2>
          <p className="text-slate-400 text-sm">{t('benchmark.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <a
              href={`/share/benchmark/${encodeURIComponent(result.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-accent hover:opacity-90 rounded-lg text-sm font-medium transition-opacity text-white flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" /> {t('benchmark.share')}
            </a>
          )}
          <ShimmerButton
            variant="secondary"
            onClick={runBenchmark}
            disabled={running}
            className="px-4 py-2 rounded-lg text-sm"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> {t('benchmark.running')}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> {t('benchmark.rerun')}
              </>
            )}
          </ShimmerButton>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>}

      {dataSource === 'demo' && (
        <div className="mb-4 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] px-4 py-3 text-xs text-cyan-200/90">
          {t('demo.hint.benchmark')}
        </div>
      )}

      {result && (
        <>
          <GlowCard className={`rounded-2xl mb-6 ${rankStyle.bg} ${rankStyle.glow} border-surface-border`}>
            <div className="p-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <motion.div
                  className={`text-6xl font-black ${rankStyle.text}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                >
                  {result.rank}
                </motion.div>
                <div className="text-xs text-slate-500 mt-1">{t('benchmark.rankLabel')}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-white tabular-nums">
                    <AnimatedCounter value={result.overallScore} duration={1500} decimals={0} />
                  </span>
                  <span className="text-slate-500">/ 100</span>
                  <Trophy className="w-5 h-5 text-accent ml-1" />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{isZh ? result.summary : (result.summaryEn || result.summary)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10">
              <div>
                <span className="text-xs text-slate-500">{t('benchmark.metric.sessions')}</span>
                <div className="text-lg font-semibold text-white">{result.totalSessions}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('benchmark.metric.tokens')}</span>
                <div className="text-lg font-semibold text-blue-400">{result.totalTokens.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('benchmark.metric.cost')}</span>
                <div className="text-lg font-semibold text-accent">${result.totalCost.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">{t('benchmark.metric.model')}</span>
                <div className="text-lg font-semibold text-green-400">{result.topModel}</div>
              </div>
            </div>
            </div>
          </GlowCard>

          <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <GradientText animate={false}>{t('benchmark.radar.title')}</GradientText>
              </h3>
              <button
                type="button"
                onClick={() => setShowRadarHelp(v => !v)}
                className="text-xs text-accent hover:opacity-80 shrink-0 flex items-center gap-1"
              >
                {showRadarHelp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {t('benchmark.radar.toggle')}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">{t('benchmark.radar.short')}</p>
            {showRadarHelp && (
              <p className="text-xs text-slate-400 mb-4 leading-relaxed border border-white/[0.06] rounded-lg p-3 bg-white/[0.02]">
                {t('benchmark.radar.long')}
              </p>
            )}
            <div className="h-[320px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} />
                  <Radar
                    name={t('benchmark.legend.current')}
                    dataKey="score"
                    stroke={PRIMARY_SERIES_COLOR}
                    strokeWidth={2}
                    fill={PRIMARY_SERIES_COLOR}
                    fillOpacity={0.3}
                  />
                  {compareResult && (
                    <Radar
                      name={t('benchmark.legend.compare')}
                      dataKey="compareScore"
                      stroke={COMPARE_SERIES_COLOR}
                      strokeWidth={2}
                      fill={COMPARE_SERIES_COLOR}
                      fillOpacity={0.2}
                    />
                  )}
                  <Tooltip {...chartTooltipProps} />
                  {compareResult && <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />}
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {compareResult && (
              <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-surface-border">
                {(result.dimensions ?? []).map(d => {
                  const other = (compareResult.dimensions ?? []).find(x => x.dimension === d.dimension)
                  const prev = other?.score ?? d.score
                  const diff = d.score - prev
                  const label = `${dimLabel(d, isZh)} ${diff > 0 ? '+' : ''}${diff}`
                  if (diff > 0) {
                    return (
                      <span key={d.dimension} className="text-xs px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30">
                        {label} ↑
                      </span>
                    )
                  }
                  if (diff < 0) {
                    return (
                      <span key={d.dimension} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30">
                        {label} ↓
                      </span>
                    )
                  }
                  return (
                    <span key={d.dimension} className="text-xs px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-500 border border-surface-border">
                      {dimLabel(d, isZh)} 0 —
                    </span>
                  )
                })}
              </div>
            )}

            <div className="space-y-4">
              {(result.dimensions ?? []).map(dim => {
                const Icon = DIMENSION_ICONS[dim.dimension] || Zap
                const color = DIMENSION_COLORS[dim.dimension] || 'text-slate-400'
                return (
                  <div key={dim.dimension}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-sm font-medium text-slate-300">{dim.label}</span>
                    </div>
                    <ScoreBar score={dim.score} color={color} />
                    <p className="text-xs text-slate-500 mt-1">{isZh ? dim.details : (dim.detailsEn || dim.details)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
              <div>
                <h3 className="text-lg font-semibold">{t('benchmark.curve.title')}</h3>
                <p className="text-xs text-slate-500 mt-1">{t('benchmark.curve.oneLiner')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCurveHelp(v => !v)}
                className="text-xs text-accent hover:opacity-80 shrink-0 flex items-center gap-1 self-start"
              >
                {showCurveHelp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {t('benchmark.curve.toggle')}
              </button>
            </div>
            {curveNote && <p className="text-xs text-blue-200/80 mb-3">{curveNote}</p>}
            {showCurveHelp && (
              <p className="text-xs text-slate-400 mb-4 leading-relaxed border border-white/[0.06] rounded-lg p-3 bg-white/[0.02]">
                {t('benchmark.curve.long')}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-4">
              <label className="flex items-center gap-2 text-sm text-slate-400 shrink-0">
                <span>{t('benchmark.compare.label')}</span>
                <select
                  value={compareId ?? ''}
                  onChange={e => setCompareId(e.target.value || null)}
                  className="glass-raised border border-surface-border rounded-lg px-3 py-2 text-slate-200 text-sm min-w-[200px] max-w-full bg-surface-raised"
                >
                  <option value="">{t('benchmark.compare.none')}</option>
                  {compareOptions.map(h => (
                    <option key={h.id} value={h.id}>
                      {formatRunDate(h.runAt)} · {h.rank}{t('benchmark.rankSuffix')} · {h.overallScore}{t('benchmark.scoreUnit')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {overallTrendData.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">{t('benchmark.noHistory')}</p>
            ) : (
              <div className="h-[280px] w-full mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overallTrendData} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip {...chartTooltipProps} />
                    <Line type="monotone" dataKey="overallScore" stroke={PRIMARY_SERIES_COLOR} strokeWidth={2} dot={{ r: 4, fill: PRIMARY_SERIES_COLOR }} name={t('benchmark.line.overall')}>
                      <LabelList
                        dataKey="rank"
                        position="top"
                        offset={10}
                        style={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-2">{t('benchmark.dimTrend.hint')}</p>
            <button
              type="button"
              onClick={() => setShowDimTrend(v => !v)}
              className="flex items-center gap-2 text-sm text-accent hover:opacity-80 mt-2 mb-2 transition-opacity"
            >
              {showDimTrend ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {t('benchmark.dimTrend')}
            </button>

            {showDimTrend && dimKeys.length > 0 && dimTrendData.length > 0 && (
              <div className="h-[300px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dimTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip {...chartTooltipProps} />
                    <Legend
                      wrapperStyle={{ color: '#94a3b8', fontSize: 11 }}
                      formatter={(value, entry) => {
                        const key = String((entry as { dataKey?: string }).dataKey ?? value)
                        const dim = result.dimensions.find(d => d.dimension === key)
                        return dim?.label ?? String(value)
                      }}
                    />
                    {dimKeys.map(key => {
                      const dim = timeline[0]?.dimensions.find(d => d.dimension === key)
                      const stroke = DIMENSION_LINE_STROKES[key] ?? '#94a3b8'
                      return (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={stroke}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name={dim?.label ?? key}
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="glass-raised rounded-xl p-5 border border-surface-border text-center mb-4">
            <Zap className="w-5 h-5 text-accent mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              {t('benchmark.footer')}
            </p>
            <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left">
              <p className="text-[11px] font-medium text-slate-400 mb-1">{t('savings.hint.title')}</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">{t('savings.hint.body')}</p>
            </div>
            {result.runAt && (
              <p className="text-xs text-slate-600 mt-3">
                {t('benchmark.lastRun')}: {new Date(result.runAt).toLocaleString(dateLocale)}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
