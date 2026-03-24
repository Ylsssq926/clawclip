import { useState, useEffect, useMemo, useCallback } from 'react'
import { Trophy, Zap, Play, RefreshCw, Shield, Search, Code, Pen, Wrench, Coins, TrendingUp, Share2, ChevronDown, ChevronRight } from 'lucide-react'
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
  score: number
  maxScore: number
  details: string
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
  toolUse: 'text-orange-400',
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
  S: { bg: 'bg-gradient-to-br from-yellow-500/30 to-orange-500/20', text: 'text-yellow-400', glow: 'shadow-yellow-500/20 shadow-lg' },
  A: { bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/10', text: 'text-green-400', glow: 'shadow-green-500/10 shadow-md' },
  B: { bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10', text: 'text-blue-400', glow: '' },
  C: { bg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/10', text: 'text-slate-400', glow: '' },
  D: { bg: 'bg-gradient-to-br from-red-500/20 to-red-500/10', text: 'text-red-400', glow: '' },
}

const chartTooltipProps = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8 } as const,
  labelStyle: { color: '#94a3b8' } as const,
  itemStyle: { color: '#e2e8f0' } as const,
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  const barColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-blue-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-[#334155] rounded-full h-2.5">
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

export default function Benchmark() {
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [history, setHistory] = useState<BenchmarkResult[]>([])
  const [compareId, setCompareId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDimTrend, setShowDimTrend] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [latestRes, histRes] = await Promise.all([fetch('/api/benchmark/latest'), fetch('/api/benchmark/history')])
      if (latestRes.status === 404) {
        setResult(null)
      } else {
        if (!latestRes.ok) throw new Error(`最新评测 HTTP ${latestRes.status}`)
        const latest: BenchmarkResult = await latestRes.json()
        setResult(latest)
      }
      if (!histRes.ok) throw new Error(`历史记录 HTTP ${histRes.status}`)
      const histBody: { results?: BenchmarkResult[] } = await histRes.json()
      setHistory(Array.isArray(histBody.results) ? histBody.results : [])
    } catch {
      setError('获取评测数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

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
    return first.dimensions.map(d => d.dimension)
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
    return result.dimensions.map(d => {
      const other = compareResult?.dimensions.find(x => x.dimension === d.dimension)
      return {
        subject: d.label,
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
      const res = await fetch('/api/benchmark/run', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: BenchmarkResult = await res.json()
      setResult(data)
      setCompareId(null)
      const histRes = await fetch('/api/benchmark/history')
      if (histRes.ok) {
        const histBody: { results?: BenchmarkResult[] } = await histRes.json()
        setHistory(Array.isArray(histBody.results) ? histBody.results : [])
      }
    } catch {
      setError('评测执行失败，请检查后端是否运行')
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    if (result && compareId === result.id) setCompareId(null)
  }, [result, compareId])

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-1">能力评测</h2>
        <div className="text-center py-12 text-slate-500">加载中...</div>
      </div>
    )
  }

  if (!result && !error) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-1">能力评测</h2>
        <p className="text-slate-400 text-sm mb-8">给你的龙虾做个体检，看看它到底行不行</p>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-6xl mb-6">🩺</div>
          <h3 className="text-xl font-semibold mb-2">还没做过评测</h3>
          <p className="text-slate-400 text-sm mb-6 text-center max-w-md">
            评测会分析你的 Agent 历史会话数据，从中文写作、代码、工具调用、检索、安全、性价比六个维度打分。不会调用任何 API，不花钱。
          </p>
          <button
            onClick={runBenchmark}
            disabled={running}
            className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-base font-medium transition-colors flex items-center gap-2"
          >
            {running ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> 评测中...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" /> 开始评测
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  const rankStyle = RANK_STYLES[result?.rank || 'C'] || RANK_STYLES.C
  const compareOptions = result ? history.filter(h => h.id !== result.id) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">能力评测</h2>
          <p className="text-slate-400 text-sm">给你的龙虾做个体检，看看它到底行不行</p>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <a
              href={`/share/benchmark/${encodeURIComponent(result.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" /> 分享成绩单
            </a>
          )}
          <button
            onClick={runBenchmark}
            disabled={running}
            className="px-4 py-2 bg-[#1e293b] hover:bg-[#334155] disabled:opacity-50 rounded-lg text-sm transition-colors flex items-center gap-2 border border-[#334155]"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> 评测中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> 重新评测
              </>
            )}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>}

      {result && (
        <>
          {/* 区域1: 成绩单大卡 */}
          <div className={`rounded-2xl p-6 mb-6 border border-[#334155] ${rankStyle.bg} ${rankStyle.glow}`}>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={`text-6xl font-black ${rankStyle.text}`}>{result.rank}</div>
                <div className="text-xs text-slate-500 mt-1">评级</div>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-white">{result.overallScore}</span>
                  <span className="text-slate-500">/ 100</span>
                  <Trophy className="w-5 h-5 text-orange-400 ml-1" />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{result.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10">
              <div>
                <span className="text-xs text-slate-500">分析会话</span>
                <div className="text-lg font-semibold text-white">{result.totalSessions}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">总 Token</span>
                <div className="text-lg font-semibold text-blue-400">{result.totalTokens.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">总花费</span>
                <div className="text-lg font-semibold text-orange-400">¥{result.totalCost.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500">常用模型</span>
                <div className="text-lg font-semibold text-green-400">{result.topModel}</div>
              </div>
            </div>
          </div>

          {/* 区域2: 六维雷达 */}
          <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155] mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              六维能力雷达
            </h3>
            <div className="h-[320px] w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 10 }} />
                  <Radar
                    name="当前"
                    dataKey="score"
                    stroke="#f97316"
                    strokeWidth={2}
                    fill="#f97316"
                    fillOpacity={0.3}
                  />
                  {compareResult && (
                    <Radar
                      name="对比"
                      dataKey="compareScore"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="#3b82f6"
                      fillOpacity={0.2}
                    />
                  )}
                  <Tooltip {...chartTooltipProps} />
                  {compareResult && <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />}
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {compareResult && (
              <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-[#334155]">
                {result.dimensions.map(d => {
                  const other = compareResult.dimensions.find(x => x.dimension === d.dimension)
                  const prev = other?.score ?? d.score
                  const diff = d.score - prev
                  const label = `${d.label} ${diff > 0 ? '+' : ''}${diff}`
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
                    <span key={d.dimension} className="text-xs px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-500 border border-[#334155]">
                      {d.label} 0 —
                    </span>
                  )
                })}
              </div>
            )}

            <div className="space-y-4">
              {result.dimensions.map(dim => {
                const Icon = DIMENSION_ICONS[dim.dimension] || Zap
                const color = DIMENSION_COLORS[dim.dimension] || 'text-slate-400'
                return (
                  <div key={dim.dimension}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-sm font-medium text-slate-300">{dim.label}</span>
                    </div>
                    <ScoreBar score={dim.score} color={color} />
                    <p className="text-xs text-slate-500 mt-1">{dim.details}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 区域3+4: 对比下拉 + 进化曲线 */}
          <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155] mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold">能力进化曲线</h3>
              <label className="flex items-center gap-2 text-sm text-slate-400 shrink-0">
                <span>对比历史评测</span>
                <select
                  value={compareId ?? ''}
                  onChange={e => setCompareId(e.target.value || null)}
                  className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-slate-200 text-sm min-w-[200px] max-w-full"
                >
                  <option value="">不对比</option>
                  {compareOptions.map(h => (
                    <option key={h.id} value={h.id}>
                      {formatRunDate(h.runAt)} · {h.rank}档 · {h.overallScore}分
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {overallTrendData.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">暂无历史数据，多跑几次评测后可见趋势</p>
            ) : (
              <div className="h-[280px] w-full mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overallTrendData} margin={{ top: 28, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip {...chartTooltipProps} />
                    <Line type="monotone" dataKey="overallScore" stroke="#f97316" strokeWidth={2} dot={{ r: 4, fill: '#f97316' }} name="综合分">
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

            <button
              type="button"
              onClick={() => setShowDimTrend(v => !v)}
              className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 mt-4 mb-2 transition-colors"
            >
              {showDimTrend ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              查看各维度趋势
            </button>

            {showDimTrend && dimKeys.length > 0 && dimTrendData.length > 0 && (
              <div className="h-[300px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dimTrendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
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

          <div className="bg-[#1e293b] rounded-xl p-5 border border-[#334155] text-center">
            <Zap className="w-5 h-5 text-orange-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              评测基于本地 Agent 日志离线分析，不调用任何 API，不产生费用。使用龙虾越多，评测越准确。
            </p>
            {result.runAt && (
              <p className="text-xs text-slate-600 mt-1">上次评测: {new Date(result.runAt).toLocaleString('zh-CN')}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
