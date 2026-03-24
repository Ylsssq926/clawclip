import { useState, useEffect } from 'react'
import { ArrowLeft, Play, Brain, Wrench, CheckCircle, Bot, MessageSquare, Settings, Clock, ChevronDown, ChevronUp, Zap } from 'lucide-react'

interface SessionMeta {
  id: string
  agentName: string
  startTime: string
  endTime: string
  durationMs: number
  totalCost: number
  totalTokens: number
  modelUsed: string[]
  stepCount: number
  summary: string
}

interface SessionStep {
  index: number
  timestamp: string
  type: 'thinking' | 'tool_call' | 'tool_result' | 'response' | 'user' | 'system'
  content: string
  model?: string
  toolName?: string
  toolInput?: string
  toolOutput?: string
  inputTokens: number
  outputTokens: number
  cost: number
  durationMs: number
}

interface SessionReplay {
  meta: SessionMeta
  steps: SessionStep[]
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}秒`
  const min = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${min}分${s}秒` : `${min}分`
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

function formatStepOffset(stepTime: string, startTime: string): string {
  const diff = new Date(stepTime).getTime() - new Date(startTime).getTime()
  const sec = Math.max(0, Math.floor(diff / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `+${m}:${s.toString().padStart(2, '0')}`
}

const STEP_CONFIG: Record<string, { color: string; border: string; bg: string; icon: typeof Brain; label: string }> = {
  user:        { color: 'text-blue-400',   border: 'border-l-blue-500',   bg: 'bg-blue-500/10',   icon: MessageSquare, label: '用户' },
  thinking:    { color: 'text-purple-400', border: 'border-l-purple-500', bg: 'bg-purple-500/10', icon: Brain,          label: '思考' },
  tool_call:   { color: 'text-orange-400', border: 'border-l-orange-500', bg: 'bg-orange-500/10', icon: Wrench,         label: '工具调用' },
  tool_result: { color: 'text-green-400',  border: 'border-l-green-500',  bg: 'bg-green-500/10',  icon: CheckCircle,    label: '工具结果' },
  response:    { color: 'text-orange-400', border: 'border-l-orange-500', bg: 'bg-orange-500/10', icon: Bot,            label: '回复' },
  system:      { color: 'text-slate-400',  border: 'border-l-slate-500',  bg: 'bg-slate-500/10',  icon: Settings,       label: '系统' },
}

function CollapsibleText({ text, maxLines = 3 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false)
  const lines = text.split('\n')
  const needsCollapse = lines.length > maxLines || text.length > 200

  if (!needsCollapse) return <pre className="text-sm text-slate-300 whitespace-pre-wrap break-words">{text}</pre>

  return (
    <div>
      <pre className={`text-sm text-slate-300 whitespace-pre-wrap break-words ${!expanded ? 'line-clamp-3' : ''}`}>{text}</pre>
      <button onClick={() => setExpanded(!expanded)} className="text-xs text-orange-400 hover:text-orange-300 mt-1 flex items-center gap-1">
        {expanded ? <><ChevronUp className="w-3 h-3" /> 收起</> : <><ChevronDown className="w-3 h-3" /> 展开全部</>}
      </button>
    </div>
  )
}

function StepCard({ step, startTime }: { step: SessionStep; startTime: string }) {
  const config = STEP_CONFIG[step.type] || STEP_CONFIG.system
  const Icon = config.icon
  const tokens = step.inputTokens + step.outputTokens

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0 w-16">
        <span className="text-xs text-slate-500 font-mono">{formatStepOffset(step.timestamp, startTime)}</span>
        <div className={`w-3 h-3 rounded-full mt-2 ${config.bg} border-2 ${config.border.replace('border-l-', 'border-')}`} />
        <div className="flex-1 w-px bg-[#334155]" />
      </div>
      <div className={`flex-1 bg-[#1e293b] rounded-xl p-4 border border-[#334155] border-l-4 ${config.border} mb-3`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${config.bg}`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
            {step.toolName && <span className="text-xs px-2 py-0.5 bg-[#334155] rounded-full text-slate-400">{step.toolName}</span>}
            {step.model && <span className="text-xs text-slate-500">{step.model}</span>}
          </div>
          {tokens > 0 && (
            <span className="text-xs text-slate-500">{tokens.toLocaleString()} tokens · ¥{step.cost.toFixed(4)}</span>
          )}
        </div>
        {step.content && <CollapsibleText text={step.content} />}
        {step.toolInput && (
          <div className="mt-2 p-2 bg-[#0f172a] rounded text-xs">
            <span className="text-slate-500">输入: </span>
            <CollapsibleText text={step.toolInput} maxLines={2} />
          </div>
        )}
        {step.toolOutput && (
          <div className="mt-2 p-2 bg-[#0f172a] rounded text-xs">
            <span className="text-slate-500">输出: </span>
            <CollapsibleText text={step.toolOutput} maxLines={2} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function Replay() {
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [replay, setReplay] = useState<SessionReplay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (view === 'list') {
      setLoading(true)
      setError(null)
      fetch('/api/replay/sessions?limit=20')
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
        .then(setSessions)
        .catch(() => setError('获取会话列表失败，请检查后端是否运行'))
        .finally(() => setLoading(false))
    }
  }, [view])

  const openSession = (id: string) => {
    setView('detail')
    setLoading(true)
    setError(null)
    setReplay(null)
    fetch(`/api/replay/sessions/${encodeURIComponent(id)}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setReplay)
      .catch(() => setError('获取会话详情失败'))
      .finally(() => setLoading(false))
  }

  if (view === 'detail') {
    return (
      <div>
        <button onClick={() => { setView('list'); setReplay(null) }} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>

        {loading && <div className="text-center py-12 text-slate-500">加载中...</div>}
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>}

        {replay && (
          <>
            <div className="bg-gradient-to-r from-orange-500/10 via-red-500/5 to-transparent rounded-2xl p-6 mb-6 border border-orange-500/20">
              <h2 className="text-lg font-bold mb-3 truncate">{replay.meta.summary}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Agent</span>
                  <div className="text-white font-medium">{replay.meta.agentName}</div>
                </div>
                <div>
                  <span className="text-slate-500">用时</span>
                  <div className="text-white font-medium">{formatDuration(replay.meta.durationMs)}</div>
                </div>
                <div>
                  <span className="text-slate-500">花费</span>
                  <div className="text-orange-400 font-medium">¥{replay.meta.totalCost.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-slate-500">Token</span>
                  <div className="text-blue-400 font-medium">{replay.meta.totalTokens.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {replay.meta.modelUsed.map(m => (
                  <span key={m} className="text-xs px-2 py-1 bg-[#334155] rounded-full text-slate-300">{m}</span>
                ))}
              </div>
            </div>

            <div className="mb-4">
              {replay.steps.map(step => (
                <StepCard key={step.index} step={step} startTime={replay.meta.startTime} />
              ))}
            </div>

            <div className="bg-[#1e293b] rounded-xl p-5 border border-[#334155] text-center">
              <Zap className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                本次会话共 <span className="text-white font-medium">{replay.meta.stepCount} 步</span>，
                用时 <span className="text-white font-medium">{formatDuration(replay.meta.durationMs)}</span>，
                花费 <span className="text-orange-400 font-medium">¥{replay.meta.totalCost.toFixed(4)}</span>
              </p>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">会话回放</h2>
      <p className="text-slate-400 text-sm mb-6">看看龙虾都干了些什么 🍤</p>

      {loading && <div className="text-center py-12 text-slate-500">加载中...</div>}
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>}

      {!loading && sessions.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <span className="text-4xl mb-3 block">🎬</span>
          <p className="text-lg mb-1">暂无会话记录</p>
          <p className="text-sm">启动 OpenClaw 执行几个任务后，这里就会出现精彩回放！</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => openSession(session.id)}
              className="w-full bg-[#1e293b] rounded-xl p-5 border border-[#334155] hover:border-orange-500/30 transition-all text-left group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-white group-hover:text-orange-400 transition-colors truncate pr-4">
                  {session.summary || '无标题会话'}
                </h3>
                <span className="text-xs text-slate-500 shrink-0">{formatRelativeTime(session.startTime)}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                <span className="flex items-center gap-1"><Bot className="w-3 h-3" />{session.agentName}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(session.durationMs)}</span>
                <span className="flex items-center gap-1"><Play className="w-3 h-3" />{session.stepCount} 步</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {session.modelUsed.slice(0, 3).map(m => (
                    <span key={m} className="text-xs px-2 py-0.5 bg-[#334155] rounded-full text-slate-400">{m}</span>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-blue-400">{session.totalTokens.toLocaleString()} tokens</span>
                  <span className="text-orange-400 font-medium">¥{session.totalCost.toFixed(4)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
