import { Activity, DollarSign, Puzzle, Wifi, WifiOff, ArrowRight, Sparkles, Cloud } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Tab } from '../App'
import WordCloud, { type KeywordItem } from '../components/WordCloud'

interface StatusData {
  running: boolean
  version: string
  skillCount: number
  channels: string[]
}

interface CostSummary {
  totalCost: number
  totalTokens: number
  trend: 'up' | 'down' | 'stable'
}

interface Props {
  onNavigate: (tab: Tab) => void
}

export default function Dashboard({ onNavigate }: Props) {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [cost, setCost] = useState<CostSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [keywords, setKeywords] = useState<KeywordItem[]>([])
  const [kwLoading, setKwLoading] = useState(true)
  const [kwError, setKwError] = useState<string | null>(null)

  useEffect(() => {
    const safeFetch = async (url: string) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        return await res.json()
      } catch {
        return null
      }
    }

    Promise.all([
      safeFetch('/api/status'),
      safeFetch('/api/cost/summary?days=30'),
    ]).then(([s, c]) => {
      setStatus(s)
      setCost(c)
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    setKwLoading(true)
    setKwError(null)
    fetch('/api/analytics/keywords?days=30&limit=40')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{ keywords?: KeywordItem[] }>
      })
      .then(data => {
        if (cancelled) return
        setKeywords(Array.isArray(data.keywords) ? data.keywords : [])
      })
      .catch(() => {
        if (!cancelled) {
          setKwError('关键词加载失败')
          setKeywords([])
        }
      })
      .finally(() => {
        if (!cancelled) setKwLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

  const cards = [
    {
      title: 'OpenClaw 状态',
      value: loading ? '检测中...' : status?.running ? '运行中' : '未连接',
      icon: status?.running ? Wifi : WifiOff,
      color: status?.running ? 'text-green-400' : 'text-slate-500',
      bg: status?.running ? 'bg-green-500/10' : 'bg-slate-500/10',
      sub: status?.version && status.version !== 'unknown' ? `v${status.version}` : '',
    },
    {
      title: '本月费用',
      value: cost ? `¥${cost.totalCost.toFixed(2)}` : '¥0.00',
      icon: DollarSign,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      sub: cost ? `${cost.totalTokens.toLocaleString()} tokens` : '',
    },
    {
      title: '已装 Skills',
      value: status?.skillCount?.toString() || '0',
      icon: Puzzle,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      sub: '个技能',
    },
    {
      title: '已连接平台',
      value: status?.channels?.length?.toString() || '0',
      icon: Activity,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      sub: status?.channels?.length ? status.channels.join(', ') : '无',
    },
  ]

  return (
    <div>
      {/* 欢迎区 */}
      <div className="bg-gradient-to-r from-orange-500/10 via-red-500/5 to-transparent rounded-2xl p-6 mb-6 border border-orange-500/20">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🦞</div>
          <div>
            <h2 className="text-2xl font-bold">{greeting}，主人</h2>
            <p className="text-slate-400 mt-1">
              {status?.running
                ? `你的龙虾正在工作中，已装备 ${status.skillCount} 个技能`
                : '你的龙虾还没上线，启动 OpenClaw 后我就能帮你干活了'}
            </p>
          </div>
        </div>
      </div>

      {/* 状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(card => (
          <div key={card.title} className="bg-[#1e293b] rounded-xl p-5 border border-[#334155]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            {card.sub && <div className="text-xs text-slate-500 mt-1">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* 快捷操作 - 大卡片 */}
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-orange-400" />
        让龙虾帮你做点什么？
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => onNavigate('replay')}
          className="group bg-gradient-to-br from-orange-500/20 to-yellow-500/10 rounded-xl p-6 border border-orange-500/20 hover:border-orange-500/50 transition-all text-left"
        >
          <div className="text-3xl mb-3">🎬</div>
          <h4 className="font-semibold text-lg mb-1">会话回放</h4>
          <p className="text-sm text-slate-400 mb-3">看看龙虾每一步都在干什么，思考了什么，花了多少钱</p>
          <span className="text-orange-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            查看回放 <ArrowRight className="w-4 h-4" />
          </span>
        </button>

        <button
          onClick={() => onNavigate('cost')}
          className="group bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl p-6 border border-blue-500/20 hover:border-blue-500/50 transition-all text-left"
        >
          <div className="text-3xl mb-3">📊</div>
          <h4 className="font-semibold text-lg mb-1">费用监控</h4>
          <p className="text-sm text-slate-400 mb-3">看看龙虾花了多少钱，哪个模型最烧钱，预算还剩多少</p>
          <span className="text-blue-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            查看详情 <ArrowRight className="w-4 h-4" />
          </span>
        </button>

        <button
          onClick={() => onNavigate('skills')}
          className="group bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all text-left"
        >
          <div className="text-3xl mb-3">🧩</div>
          <h4 className="font-semibold text-lg mb-1">技能管理</h4>
          <p className="text-sm text-slate-400 mb-3">给龙虾装备新技能，或者卸掉不需要的，让它更专注</p>
          <span className="text-purple-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
            管理技能 <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </div>

      {/* 词云 - 龙虾最近都在忙什么 */}
      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h4 className="font-semibold mb-4 text-slate-300 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-orange-400" />
          龙虾最近都在忙什么
        </h4>
        {kwLoading && (
          <div className="flex items-center justify-center min-h-[200px] text-sm text-slate-500">加载中...</div>
        )}
        {!kwLoading && kwError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">{kwError}</div>
        )}
        {!kwLoading && !kwError && (
          <WordCloud
            keywords={keywords}
            onWordClick={word => {
              console.log('replay search (reserved):', word)
              onNavigate('replay')
            }}
          />
        )}
      </div>
    </div>
  )
}
