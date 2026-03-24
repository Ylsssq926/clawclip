import { Activity, DollarSign, Puzzle, Wifi, WifiOff, ArrowRight, Sparkles, Cloud, Clock, Bot } from 'lucide-react'
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

interface SessionMeta {
  id: string
  agentName: string
  startTime: string
  durationMs: number
  totalCost: number
  totalTokens: number
  modelUsed: string[]
  stepCount: number
  summary: string
}

interface Props {
  onNavigate: (tab: Tab) => void
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}秒`
  return `${Math.floor(sec / 60)}分${sec % 60}秒`
}

export default function Dashboard({ onNavigate }: Props) {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [cost, setCost] = useState<CostSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [keywords, setKeywords] = useState<KeywordItem[]>([])
  const [kwLoading, setKwLoading] = useState(true)
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  useEffect(() => {
    const safeFetch = async (url: string) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        return await res.json()
      } catch { return null }
    }
    Promise.all([safeFetch('/api/status'), safeFetch('/api/cost/summary?days=30')])
      .then(([s, c]) => { setStatus(s); setCost(c) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/analytics/keywords?days=30&limit=40')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setKeywords(Array.isArray(d.keywords) ? d.keywords : []))
      .catch(() => setKeywords([]))
      .finally(() => setKwLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/replay/sessions?limit=5')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false))
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

  const statCards = [
    {
      label: 'OpenClaw 状态',
      value: loading ? '--' : status?.running ? '运行中' : '未连接',
      sub: status?.version && status.version !== 'unknown' ? `v${status.version}` : null,
      icon: status?.running ? Wifi : WifiOff,
      variant: status?.running ? 'card-green' : 'card',
      color: status?.running ? 'text-emerald-400' : 'text-slate-500',
      iconColor: status?.running ? 'text-emerald-400' : 'text-slate-500',
    },
    {
      label: '本月费用',
      value: `¥${(cost?.totalCost ?? 0).toFixed(2)}`,
      sub: cost ? `${cost.totalTokens.toLocaleString()} tokens` : null,
      icon: DollarSign,
      variant: 'card-orange',
      color: 'text-orange-400',
      iconColor: 'text-orange-400',
    },
    {
      label: '已装 Skills',
      value: String(status?.skillCount ?? 0),
      sub: '个技能',
      icon: Puzzle,
      variant: 'card-blue',
      color: 'text-blue-400',
      iconColor: 'text-blue-400',
    },
    {
      label: '已连接平台',
      value: String(status?.channels?.length ?? 0),
      sub: status?.channels?.length ? status.channels.join(', ') : '无',
      icon: Activity,
      variant: 'card-purple',
      color: 'text-violet-400',
      iconColor: 'text-violet-400',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="animate-fade-in">
        <h2 className="text-3xl font-bold tracking-tight">
          <span className="text-gradient">{greeting}</span>
          <span className="text-white">，主人</span>
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          {status?.running
            ? `你的龙虾正在工作中，已装备 ${status.skillCount} 个技能`
            : '你的龙虾还没上线，启动 OpenClaw 后我就能帮你干活了'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <div key={c.label} className={`${c.variant} p-5 animate-fade-in`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{c.label}</span>
              <c.icon className={`w-4 h-4 ${c.iconColor}`} />
            </div>
            <div className={`text-2xl font-bold ${c.color} tracking-tight`}>{c.value}</div>
            {c.sub && <p className="text-xs text-slate-600 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">快捷操作</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { tab: 'replay' as const, icon: '🎬', title: '会话回放', desc: '看看龙虾每一步在干什么', color: 'card-orange', textColor: 'text-orange-400' },
            { tab: 'cost' as const, icon: '📊', title: '费用监控', desc: '看看钱都花哪了', color: 'card-blue', textColor: 'text-blue-400' },
            { tab: 'benchmark' as const, icon: '🏆', title: '能力评测', desc: '给龙虾做六维体检', color: 'card-purple', textColor: 'text-violet-400' },
          ].map((item, i) => (
            <button
              key={item.tab}
              onClick={() => onNavigate(item.tab)}
              className={`${item.color} p-6 text-left group transition-transform duration-200 hover:scale-[1.02] animate-fade-in`}
              style={{ animationDelay: `${200 + i * 80}ms` }}
            >
              <span className="text-3xl block mb-3">{item.icon}</span>
              <h4 className="font-semibold text-white mb-1">{item.title}</h4>
              <p className="text-xs text-slate-500 mb-3">{item.desc}</p>
              <span className={`${item.textColor} text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all`}>
                查看 <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Two column: Word Cloud + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Word Cloud */}
        <div className="lg:col-span-2 card p-6 animate-fade-in" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Cloud className="w-4 h-4 text-orange-400" />
            <h4 className="text-sm font-semibold text-slate-400">热门关键词</h4>
          </div>
          {kwLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-5 w-1/2" />
              <div className="skeleton h-7 w-2/3" />
            </div>
          ) : keywords.length > 0 ? (
            <WordCloud keywords={keywords} onWordClick={() => onNavigate('replay')} height={200} />
          ) : (
            <p className="text-xs text-slate-600 py-8 text-center">暂无数据</p>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="lg:col-span-3 card p-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <h4 className="text-sm font-semibold text-slate-400">最近活动</h4>
            </div>
            <button onClick={() => onNavigate('replay')} className="text-xs text-slate-600 hover:text-orange-400 transition-colors">
              查看全部 →
            </button>
          </div>
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full" />)}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-slate-600 py-8 text-center">暂无会话记录</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 5).map(s => (
                <button
                  key={s.id}
                  onClick={() => onNavigate('replay')}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate group-hover:text-white transition-colors">
                      {s.summary?.slice(0, 50) || '会话'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5">
                      <span>{s.agentName}</span>
                      <span>·</span>
                      <span>{formatDuration(s.durationMs)}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(s.startTime)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-orange-400/80 font-mono shrink-0">¥{s.totalCost.toFixed(3)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
