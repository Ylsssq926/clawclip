import { useState, useEffect } from 'react'
import { Trophy, Zap, Play, RefreshCw, Shield, Search, Code, Pen, Wrench, Coins, TrendingUp } from 'lucide-react'

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

const RANK_STYLES: Record<string, { bg: string; text: string; glow: string }> = {
  S: { bg: 'bg-gradient-to-br from-yellow-500/30 to-orange-500/20', text: 'text-yellow-400', glow: 'shadow-yellow-500/20 shadow-lg' },
  A: { bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/10', text: 'text-green-400', glow: 'shadow-green-500/10 shadow-md' },
  B: { bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10', text: 'text-blue-400', glow: '' },
  C: { bg: 'bg-gradient-to-br from-slate-500/20 to-slate-500/10', text: 'text-slate-400', glow: '' },
  D: { bg: 'bg-gradient-to-br from-red-500/20 to-red-500/10', text: 'text-red-400', glow: '' },
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

export default function Benchmark() {
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLatest = () => {
    setLoading(true)
    setError(null)
    fetch('/api/benchmark/latest')
      .then(r => {
        if (r.status === 404) return null
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setResult)
      .catch(() => setError('获取评测结果失败'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLatest() }, [])

  const runBenchmark = async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/benchmark/run', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch {
      setError('评测执行失败，请检查后端是否运行')
    } finally {
      setRunning(false)
    }
  }

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
            {running ? <><RefreshCw className="w-5 h-5 animate-spin" /> 评测中...</> : <><Play className="w-5 h-5" /> 开始评测</>}
          </button>
        </div>
      </div>
    )
  }

  const rankStyle = RANK_STYLES[result?.rank || 'C'] || RANK_STYLES.C

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">能力评测</h2>
          <p className="text-slate-400 text-sm">给你的龙虾做个体检，看看它到底行不行</p>
        </div>
        <button
          onClick={runBenchmark}
          disabled={running}
          className="px-4 py-2 bg-[#1e293b] hover:bg-[#334155] disabled:opacity-50 rounded-lg text-sm transition-colors flex items-center gap-2 border border-[#334155]"
        >
          {running ? <><RefreshCw className="w-4 h-4 animate-spin" /> 评测中...</> : <><RefreshCw className="w-4 h-4" /> 重新评测</>}
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>}

      {result && (
        <>
          {/* 成绩单大卡 */}
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

          {/* 六维雷达 - 用柱状展示 */}
          <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155] mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              六维能力详情
            </h3>
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

          {/* 底部提示 */}
          <div className="bg-[#1e293b] rounded-xl p-5 border border-[#334155] text-center">
            <Zap className="w-5 h-5 text-orange-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              评测基于本地 Agent 日志离线分析，不调用任何 API，不产生费用。
              使用龙虾越多，评测越准确。
            </p>
            {result.runAt && (
              <p className="text-xs text-slate-600 mt-1">
                上次评测: {new Date(result.runAt).toLocaleString('zh-CN')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
