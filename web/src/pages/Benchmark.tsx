import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Zap, Play, RefreshCw, Shield, Search, Code, Pen, Wrench, Coins, TrendingUp, Share2, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import FadeIn from '../components/ui/FadeIn'
import GlowCard from '../components/ui/GlowCard'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import { cn } from '../lib/cn'
import { useI18n, formatI18n, localizeBenchmarkDimensionDetail } from '../lib/i18n'
import { apiGet, apiPost, apiGetSafe, ApiError } from '../lib/api'
import { getSupportingElementPriority } from './supportingElementPriority'
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
  evidence?: string
  evidenceEn?: string
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
  dataCutoffAt?: string
  sampleCountConfidence?: 'low' | 'medium' | 'high'
}

interface BenchmarkMeta {
  dataSource?: 'demo' | 'real'
  dataCutoffAt?: string
  sampleCountConfidence?: 'low' | 'medium' | 'high'
}

interface BenchmarkProofDeltas {
  score: number
  tokens: number
  cost: number
  costPct?: number
  tokensPct?: number
}

interface BenchmarkProof {
  latest: BenchmarkResult
  previous: BenchmarkResult | null
  deltas: BenchmarkProofDeltas | null
  verdictZh?: string
  verdictEn?: string
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
  S: { bg: 'bg-gradient-to-br from-[#3b82c4]/25 via-cyan-600/15 to-teal-600/10', text: 'text-blue-600', glow: 'shadow-cyan-500/10 shadow-lg' },
  A: { bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/10', text: 'text-green-400', glow: 'shadow-green-500/10 shadow-md' },
  B: { bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10', text: 'text-blue-400', glow: '' },
  C: { bg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/10', text: 'text-slate-500', glow: '' },
  D: { bg: 'bg-gradient-to-br from-red-500/20 to-red-500/10', text: 'text-red-400', glow: '' },
}

const PRIMARY_SERIES_COLOR = '#3b82c4'
const COMPARE_SERIES_COLOR = '#06b6d4'
const BENCHMARK_PRIMARY_BUTTON_CLASS = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#3b82c4] px-8 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#2f6fa8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82c4]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none'
const BENCHMARK_SECONDARY_BUTTON_CLASS = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82c4]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400'

const chartTooltipProps = {
  contentStyle: {
    background: 'rgba(248,250,252,0.96)',
    border: '1px solid rgba(226,232,240,0.9)',
    borderRadius: 12,
    backdropFilter: 'blur(12px)',
  } as const,
  labelStyle: { color: '#64748b' } as const,
  itemStyle: { color: '#0f172a' } as const,
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

function toIntlLocale(locale: string): string {
  if (locale === 'zh') return 'zh-CN'
  if (locale === 'ja') return 'ja-JP'
  if (locale === 'ko') return 'ko-KR'
  if (locale === 'es') return 'es-ES'
  if (locale === 'fr') return 'fr-FR'
  if (locale === 'de') return 'de-DE'
  return 'en-US'
}

function dimLabel(
  d: { dimension: string; label: string; labelEn?: string },
  t: (key: string) => string,
): string {
  const key = `benchmark.dimension.${d.dimension}`
  const translated = t(key)
  return translated !== key ? translated : (d.labelEn || d.label)
}

function dimEvidence(d: { evidence?: string; evidenceEn?: string }, zh: boolean): string {
  const raw = zh ? (d.evidence || '') : (d.evidenceEn || d.evidence || '')
  return raw.trim()
}

function dimEvidenceFallback(
  d: { score: number; maxScore: number },
  t: (key: string) => string,
): string {
  return formatI18n(t('benchmark.dimension.currentScore'), { score: d.score, maxScore: d.maxScore })
}

function formatFreshnessTime(value: string | undefined, locale: string): string {
  if (!value) return '--'
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return '--'

  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

function formatConfidenceLabel(
  value: 'low' | 'medium' | 'high' | undefined,
  t: (key: string) => string,
): string {
  if (!value) return '--'
  return t(`benchmark.confidence.${value}`)
}

function formatProofTime(value: string, locale: string): string {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return '--'

  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

function localizeBenchmarkSummary(
  summary: string,
  summaryEn: string | undefined,
  t: (key: string) => string,
): string {
  const source = summaryEn || summary
  const key = {
    'First contact — the Agent doesn\'t quite know what to do yet.': 'benchmark.summary.firstContact',
    'Starting to take shape, but still weak across all dimensions.': 'benchmark.summary.takingShape',
    'Broke through D-rank into C-rank — starting to find the groove.': 'benchmark.summary.enteredC',
    'Just getting started — still adapting, rough around the edges in every dimension.': 'benchmark.summary.justStarted',
    'Progress! Tool use and safety improved noticeably, but writing and coding still need work.': 'benchmark.summary.progress',
    'Things are getting steadier — tool flow and safety feel more natural, while writing and retrieval are catching up.': 'benchmark.summary.gettingSteadier',
    'It keeps getting smoother — tool use is already quite mature, and the overall profile is nearing the upper tier.': 'benchmark.summary.nearingUpperTier',
    'Only a final push away from the upper tier — tool use is strong, and coding plus retrieval have improved noticeably.': 'benchmark.summary.finalPush',
    '初次接触，Agent 还不知道该干什么。': 'benchmark.summary.firstContact',
    '开始有模有样了，但各维度都还很弱。': 'benchmark.summary.takingShape',
    '突破 D 段进入 C 段，开始找到感觉。': 'benchmark.summary.enteredC',
    '刚开始跑，还在适应中，各方面都比较生疏。': 'benchmark.summary.justStarted',
    '有进步了！工具调用和安全性提升明显，但写作和代码还需要练。': 'benchmark.summary.progress',
    '开始稳起来了！工具链和安全性更顺手，写作与检索也在追赶。': 'benchmark.summary.gettingSteadier',
    '越跑越顺了！工具调用已经很成熟，整体表现逼近高段位。': 'benchmark.summary.nearingUpperTier',
    '离高段位只差一口气了！工具调用很强，代码和检索也明显长进。': 'benchmark.summary.finalPush',
  }[source]

  return key ? t(key) : source
}

function resolveProofVerdictKey(scoreDelta: number, costDelta: number): string {
  if (scoreDelta >= 0 && costDelta < 0) return 'benchmark.proof.verdict.keepLowerCost'
  if (scoreDelta > 0 && costDelta > 0) return 'benchmark.proof.verdict.qualityUpCostUp'
  if (scoreDelta < 0 && costDelta < 0) return 'benchmark.proof.verdict.costDownQualityDown'
  if (scoreDelta < 0 && costDelta >= 0) return 'benchmark.proof.verdict.neither'
  if (scoreDelta > 0 && costDelta === 0) return 'benchmark.proof.verdict.qualityUpFlatCost'
  if (scoreDelta === 0 && costDelta > 0) return 'benchmark.proof.verdict.flatQualityCostUp'
  return 'benchmark.proof.verdict.smallChange'
}

function BenchmarkTips() {
  const { t } = useI18n()

  return (
    <details className={cn('px-3 py-2 text-left', getSupportingElementPriority('benchmarkSupportCard').className)}>
      <summary className={cn('cursor-pointer font-medium', getSupportingElementPriority('benchmarkHelpAction').className)}>
        {t('benchmark.help.title')}
      </summary>
      <p className={cn('mt-2', getSupportingElementPriority('benchmarkSupportNote').className)}>
        {t('benchmark.help.body')}
      </p>
    </details>
  )
}

function formatSignedInteger(value: number): string {
  if (value === 0) return '0'
  return `${value > 0 ? '+' : ''}${Math.round(value).toLocaleString()}`
}

function formatSignedCurrency(value: number): string {
  const abs = Math.abs(value).toFixed(2)
  if (value === 0) return '$0.00'
  return `${value > 0 ? '+' : '-'}$${abs}`
}

function formatSignedPercent(value: number | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null
  const digits = Math.abs(value) >= 10 ? 0 : 1
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`
}

function getDeltaState(value: number, prefersLower = false): 'positive' | 'negative' | 'neutral' {
  if (value === 0) return 'neutral'
  const improved = prefersLower ? value < 0 : value > 0
  return improved ? 'positive' : 'negative'
}

export default function Benchmark() {
  const { t, locale } = useI18n()
  const isZh = locale.startsWith('zh')
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [history, setHistory] = useState<BenchmarkResult[]>([])
  const [compareId, setCompareId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showDimTrend, setShowDimTrend] = useState(false)
  const [benchmarkMeta, setBenchmarkMeta] = useState<BenchmarkMeta | null>(null)
  const [proof, setProof] = useState<BenchmarkProof | null>(null)
  const [showRadarHelp, setShowRadarHelp] = useState(false)
  const [showCurveHelp, setShowCurveHelp] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [latest, histBody, meta, proofBody] = await Promise.all([
        apiGet<BenchmarkResult>('/api/benchmark/latest').catch((e) =>
          e instanceof ApiError && e.status === 404 ? null : Promise.reject(e),
        ),
        apiGet<{ results?: BenchmarkResult[] }>('/api/benchmark/history'),
        apiGetSafe<BenchmarkMeta>('/api/benchmark/meta'),
        apiGet<BenchmarkProof>('/api/benchmark/proof').catch((e) =>
          e instanceof ApiError && e.status === 404 ? null : Promise.reject(e),
        ),
      ])
      setBenchmarkMeta(meta)
      setProof(proofBody)
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

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(null), 3000)
    return () => window.clearTimeout(timer)
  }, [successMessage])

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
        subject: dimLabel(d, t),
        score: d.score,
        compareScore: other?.score,
        fullMark: 100,
      }
    })
  }, [result, compareResult, t])

  const runBenchmark = async () => {
    setRunning(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const data = await apiPost<BenchmarkResult>('/api/benchmark/run')
      setResult(data)
      setCompareId(null)
      const [histBody, meta, proofBody] = await Promise.all([
        apiGetSafe<{ results?: BenchmarkResult[] }>('/api/benchmark/history'),
        apiGetSafe<BenchmarkMeta>('/api/benchmark/meta'),
        apiGetSafe<BenchmarkProof>('/api/benchmark/proof'),
      ])
      if (meta) setBenchmarkMeta(meta)
      setProof(proofBody)
      if (histBody) setHistory(Array.isArray(histBody.results) ? histBody.results : [])
      setSuccessMessage(formatI18n(t('benchmark.success.complete'), { score: data.overallScore }))
    } catch {
      setError(t('benchmark.error.run'))
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    if (result && compareId === result.id) setCompareId(null)
  }, [result, compareId])

  const dateLocale = toIntlLocale(locale)
  const dataSource = benchmarkMeta?.dataSource === 'real' ? 'real' : benchmarkMeta?.dataSource === 'demo' ? 'demo' : null
  const benchmarkCutoffLabel = formatFreshnessTime(result?.dataCutoffAt ?? benchmarkMeta?.dataCutoffAt, locale)
  const benchmarkConfidenceLabel = formatConfidenceLabel(result?.sampleCountConfidence ?? benchmarkMeta?.sampleCountConfidence, t)
  const proofLatest = proof?.latest ?? result
  const proofPrevious = proof?.previous ?? null
  const proofDeltas = proof?.deltas ?? null
  const proofVerdict = proofDeltas ? t(resolveProofVerdictKey(proofDeltas.score, proofDeltas.cost)) : t('benchmark.proof.verdict.smallChange')
  const summaryText = result ? localizeBenchmarkSummary(result.summary, result.summaryEn, t) : ''
  const proofMetricCards = proofLatest && proofPrevious && proofDeltas
    ? [
        {
          key: 'score',
          label: t('benchmark.proof.score'),
          latestValue: `${proofLatest.overallScore}${t('benchmark.scoreUnit')}`,
          previousValue: `${proofPrevious.overallScore}${t('benchmark.scoreUnit')}`,
          deltaValue: proofDeltas.score,
          deltaLabel: `${proofDeltas.score > 0 ? '+' : ''}${proofDeltas.score}${t('benchmark.scoreUnit')}`,
          pctLabel: null,
          prefersLower: false,
        },
        {
          key: 'tokens',
          label: t('benchmark.proof.tokens'),
          latestValue: proofLatest.totalTokens.toLocaleString(),
          previousValue: proofPrevious.totalTokens.toLocaleString(),
          deltaValue: proofDeltas.tokens,
          deltaLabel: formatSignedInteger(proofDeltas.tokens),
          pctLabel: formatSignedPercent(proofDeltas.tokensPct),
          prefersLower: true,
        },
        {
          key: 'cost',
          label: t('benchmark.proof.cost'),
          latestValue: `$${proofLatest.totalCost.toFixed(2)}`,
          previousValue: `$${proofPrevious.totalCost.toFixed(2)}`,
          deltaValue: proofDeltas.cost,
          deltaLabel: formatSignedCurrency(proofDeltas.cost),
          pctLabel: formatSignedPercent(proofDeltas.costPct),
          prefersLower: true,
        },
      ]
    : []

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
        <p className="text-slate-500 text-sm mb-8">{t('benchmark.subtitle')}</p>
        <FadeIn className="flex flex-col items-center justify-center py-16">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            <TrendingUp className="w-8 h-8 text-accent" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">{t('benchmark.empty.title')}</h3>
          <p className="text-slate-500 text-sm mb-6 text-center max-w-md">
            {t('benchmark.empty.desc')}
          </p>
          <button type="button" onClick={runBenchmark} disabled={running} className={BENCHMARK_PRIMARY_BUTTON_CLASS}>
            {running ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> {t('benchmark.running')}
              </>
            ) : (
              <>
                <Play className="w-5 h-5" /> {t('benchmark.runStart')}
              </>
            )}
          </button>
        </FadeIn>
      </div>
    )
  }

  const rankStyle = RANK_STYLES[result?.rank || 'C'] || RANK_STYLES.C
  const compareOptions = result ? history.filter(h => h.id !== result.id) : []
  const curveNote = dataSource === 'demo' ? t('benchmark.curve.demo') : dataSource === 'real' ? t('benchmark.curve.real') : ''

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold mb-1">{t('nav.benchmark')}</h2>
          <p className="text-slate-500 text-sm">{t('benchmark.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {result && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <a
                href={`/share/benchmark/${encodeURIComponent(result.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2', getSupportingElementPriority('benchmarkShareAction').className)}
              >
                <Share2 className="w-3.5 h-3.5" /> {t('benchmark.share')}
              </a>
              {dataSource === 'demo' && (
                <span className={getSupportingElementPriority('benchmarkSupportNote').className}>({t('benchmark.demoBadge')})</span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={runBenchmark}
            disabled={running}
            className={BENCHMARK_SECONDARY_BUTTON_CLASS}
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
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-500/30 rounded-xl p-4 mb-6 text-red-600 text-sm">{error}</div>}

      {dataSource === 'demo' && (
        <div className={cn('mb-4 px-4 py-3', getSupportingElementPriority('benchmarkSupportCard').className)}>
          <p className={getSupportingElementPriority('benchmarkSupportNote').className}>{t('demo.hint.benchmark')}</p>
        </div>
      )}

      {result && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className={getSupportingElementPriority('benchmarkSupportChip').className}>
              {formatI18n(t('benchmark.meta.latestSessions'), { count: result.totalSessions })}
            </span>
            <span className={getSupportingElementPriority('benchmarkSupportChip').className}>
              {t('benchmark.meta.dataCutoff')} <span className="font-medium text-slate-700">{benchmarkCutoffLabel}</span>
            </span>
            <span className={getSupportingElementPriority('benchmarkSupportChip').className}>
              {t('benchmark.meta.confidence')} <span className="font-medium text-slate-700">{benchmarkConfidenceLabel}</span>
            </span>
          </div>
          {successMessage && (
            <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              {successMessage}
            </div>
          )}
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
                  <span className="text-4xl font-bold text-slate-900 tabular-nums">
                    <AnimatedCounter value={result.overallScore} duration={1500} decimals={0} />
                  </span>
                  <span className="text-slate-500">/ 100</span>
                  <Trophy className="w-5 h-5 text-accent ml-1" />
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{summaryText}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-200">
              <div>
                <span className="text-xs text-slate-500">{t('benchmark.metric.sessions')}</span>
                <div className="text-lg font-semibold text-slate-900">{result.totalSessions}</div>
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
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Zap className="w-5 h-5 text-accent" />
                  <span>{t('benchmark.proof.section.title')}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('benchmark.proof.section.body')}
                </p>
              </div>
            </div>

            {proofLatest && proofPrevious && proofDeltas ? (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
                    {t('benchmark.proof.latest')} · {formatProofTime(proofLatest.runAt, locale)}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
                    {t('benchmark.proof.previous')} · {formatProofTime(proofPrevious.runAt, locale)}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {proofMetricCards.map(card => {
                    const state = getDeltaState(card.deltaValue, card.prefersLower)
                    const DeltaIcon = card.deltaValue > 0 ? ArrowUpRight : card.deltaValue < 0 ? ArrowDownRight : Minus
                    const toneClass = state === 'positive'
                      ? 'border-emerald-200 bg-emerald-50/80'
                      : state === 'negative'
                        ? 'border-rose-200 bg-rose-50/80'
                        : 'border-slate-200 bg-slate-50/80'
                    const badgeClass = state === 'positive'
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                      : state === 'negative'
                        ? 'border-rose-200 bg-rose-100 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-500'

                    return (
                      <div key={card.key} className={`rounded-xl border p-4 ${toneClass}`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{card.latestValue}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatI18n(t('benchmark.proof.prevShort'), { value: card.previousValue })}
                            </p>
                          </div>
                          <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                            <DeltaIcon className="w-3.5 h-3.5" />
                            <span>{card.deltaLabel}</span>
                          </div>
                        </div>
                        <p className="mt-3 text-[11px] text-slate-500">
                          {card.pctLabel
                            ? formatI18n(t('benchmark.proof.vsPrevious'), { value: card.pctLabel })
                            : (card.key === 'score'
                                ? t('benchmark.proof.higherBetter')
                                : t('benchmark.proof.lowerBetter'))}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-blue-700">{t('benchmark.proof.verdictLabel')}</p>
                  <p className="mt-1 text-sm leading-relaxed text-blue-900">{proofVerdict}</p>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  {t('benchmark.proof.runAgainTitle')}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {proofLatest
                    ? formatI18n(t('benchmark.proof.runAgainBodyLatest'), { time: formatProofTime(proofLatest.runAt, locale) })
                    : t('benchmark.proof.runAgainBodyEmpty')}
                </p>
              </div>
            )}
          </div>

          <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <span>{t('benchmark.radar.title')}</span>
                </h3>
                {compareResult && (
                  <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                    {t('benchmark.compare.against')}
                    <span className="font-medium text-slate-700">
                      {formatRunDate(compareResult.runAt)} · {compareResult.rank}{t('benchmark.rankSuffix')} · {compareResult.overallScore}{t('benchmark.scoreUnit')}
                    </span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowRadarHelp(v => !v)}
                className={cn('shrink-0 flex items-center gap-1 transition-colors', getSupportingElementPriority('benchmarkHelpAction').className)}
              >
                {showRadarHelp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {t('benchmark.radar.toggle')}
              </button>
            </div>
            <p className={cn('mb-4', getSupportingElementPriority('benchmarkSupportNote').className)}>{t('benchmark.radar.short')}</p>
            {showRadarHelp && (
              <p className={cn('mb-4 p-3', getSupportingElementPriority('benchmarkSupportCard').className, getSupportingElementPriority('benchmarkSupportNote').className)}>
                {t('benchmark.radar.long')}
              </p>
            )}
            <div className="h-[320px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="rgba(148,163,184,0.2)" />
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
                  const label = `${dimLabel(d, t)} ${diff > 0 ? '+' : ''}${diff}`
                  if (diff > 0) {
                    return (
                      <span key={d.dimension} className="text-[11px] px-2.5 py-1 rounded-full border border-green-500/20 text-green-600/90">
                        {label} ↑
                      </span>
                    )
                  }
                  if (diff < 0) {
                    return (
                      <span key={d.dimension} className="text-[11px] px-2.5 py-1 rounded-full border border-red-500/20 text-red-500/80">
                        {label} ↓
                      </span>
                    )
                  }
                  return (
                    <span key={d.dimension} className="text-[11px] px-2.5 py-1 rounded-full border border-surface-border text-slate-500/80">
                      {dimLabel(d, t)} 0 —
                    </span>
                  )
                })}
              </div>
            )}

            <div className="space-y-4">
              {(result.dimensions ?? []).map(dim => {
                const Icon = DIMENSION_ICONS[dim.dimension] || Zap
                const color = DIMENSION_COLORS[dim.dimension] || 'text-slate-500'
                const evidenceText = dimEvidence(dim, isZh) || dimEvidenceFallback(dim, t)
                return (
                  <div key={dim.dimension}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-sm font-medium text-slate-500">{dimLabel(dim, t)}</span>
                    </div>
                    <ScoreBar score={dim.score} color={color} />
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('benchmark.dimension.whyThisScore')}</p>
                      <p className="text-xs leading-relaxed text-slate-500">{evidenceText}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">{localizeBenchmarkDimensionDetail(dim, locale, t)}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold">{t('benchmark.curve.title')}</h3>
                  {overallTrendData.length > 0 && (
                    <span className={getSupportingElementPriority('benchmarkSupportChip').className}>
                      {formatI18n(t('benchmark.curve.points'), { count: overallTrendData.length })}
                    </span>
                  )}
                </div>
                <p className={cn('mt-1', getSupportingElementPriority('benchmarkSupportNote').className)}>{t('benchmark.curve.oneLiner')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCurveHelp(v => !v)}
                className={cn('shrink-0 flex items-center gap-1 self-start transition-colors', getSupportingElementPriority('benchmarkHelpAction').className)}
              >
                {showCurveHelp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {t('benchmark.curve.toggle')}
              </button>
            </div>
            {curveNote && <p className={cn('mb-3', getSupportingElementPriority('benchmarkSupportNote').className)}>{curveNote}</p>}
            {showCurveHelp && (
              <p className={cn('mb-4 p-3', getSupportingElementPriority('benchmarkSupportCard').className, getSupportingElementPriority('benchmarkSupportNote').className)}>
                {t('benchmark.curve.long')}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-4">
              <label className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
                <span>{t('benchmark.compare.label')}</span>
                <select
                  value={compareId ?? ''}
                  onChange={e => setCompareId(e.target.value || null)}
                  className="glass-raised border border-surface-border rounded-lg px-3 py-2 text-slate-800 text-sm min-w-[200px] max-w-full bg-white"
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
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

            <p className={cn('mb-2', getSupportingElementPriority('benchmarkSupportNote').className)}>{t('benchmark.dimTrend.hint')}</p>
            <button
              type="button"
              onClick={() => setShowDimTrend(v => !v)}
              className={cn('flex items-center gap-2 mt-2 mb-2 transition-colors', getSupportingElementPriority('benchmarkHelpAction').className)}
            >
              {showDimTrend ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {t('benchmark.dimTrend')}
            </button>

            {showDimTrend && dimKeys.length > 0 && dimTrendData.length > 0 && (
              <div className="h-[300px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dimTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip {...chartTooltipProps} />
                    <Legend
                      wrapperStyle={{ color: '#94a3b8', fontSize: 11 }}
                      formatter={(value, entry) => {
                        const key = String((entry as { dataKey?: string }).dataKey ?? value)
                        const dim = result.dimensions.find(d => d.dimension === key)
                        return dim ? dimLabel(dim, t) : String(value)
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
                          name={dim ? dimLabel(dim, t) : key}
                        />
                      )
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="glass-raised rounded-xl p-5 border border-surface-border mb-4">
            <div className="flex items-start gap-3">
              <div className={cn('p-2', getSupportingElementPriority('benchmarkSupportCard').className)}>
                <Zap className="w-4 h-4 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-slate-700">
                  {t('benchmark.footer')}
                </p>
                {result.runAt && (
                  <p className={cn('mt-2', getSupportingElementPriority('benchmarkSupportNote').className)}>
                    {t('benchmark.lastRun')}: {new Date(result.runAt).toLocaleString(dateLocale)}
                  </p>
                )}
              </div>
            </div>
            <div className={cn('mt-3 px-3 py-2 text-left', getSupportingElementPriority('benchmarkSupportCard').className)}>
              <p className="text-[11px] font-medium text-slate-500 mb-1">{t('savings.hint.title')}</p>
              <p className={getSupportingElementPriority('benchmarkSupportNote').className}>{t('savings.hint.body')}</p>
            </div>
            <div className="mt-3">
              <BenchmarkTips />
            </div>
          </div>
        </>
      )}
    </div>
  )
}