import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, Pause, Brain, Wrench, CheckCircle, Bot, MessageSquare, Settings, Clock, ChevronDown, ChevronUp, Zap, Share2 } from 'lucide-react'
import FadeIn from '../components/ui/FadeIn'
import GlowCard from '../components/ui/GlowCard'
import { cn } from '../lib/cn'

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

interface TagInfo {
  tag: string
  sessionCount: number
  color: string
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
  tool_call:   { color: 'text-orange-400', border: 'border-l-orange-500', bg: 'bg-accent-dim',     icon: Wrench,         label: '工具调用' },
  tool_result: { color: 'text-green-400',  border: 'border-l-green-500',  bg: 'bg-green-500/10',  icon: CheckCircle,    label: '工具结果' },
  response:    { color: 'text-orange-400', border: 'border-l-orange-500', bg: 'bg-accent-dim',     icon: Bot,            label: '回复' },
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
      <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs text-accent hover:opacity-80 mt-1 flex items-center gap-1">
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(step.index * 0.04, 0.5), type: 'spring', stiffness: 380, damping: 28 }}
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center shrink-0 w-16">
          <span className="text-xs text-slate-500 font-mono">{formatStepOffset(step.timestamp, startTime)}</span>
          <div className={`w-3 h-3 rounded-full mt-2 ${config.bg} border-2 ${config.border.replace('border-l-', 'border-')}`} />
          <div className="flex-1 w-px bg-surface-border" />
        </div>
        <div className={cn('flex-1 glass-raised rounded-xl p-4 border border-surface-border border-l-4 mb-3', config.border)}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${config.bg}`}>
                <Icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
              {step.toolName && <span className="text-xs px-2 py-0.5 bg-surface-overlay rounded-full text-slate-400 border border-surface-border">{step.toolName}</span>}
              {step.model && <span className="text-xs text-slate-500">{step.model}</span>}
            </div>
            {tokens > 0 && (
              <span className="text-xs text-slate-500">{tokens.toLocaleString()} tokens · ¥{step.cost.toFixed(4)}</span>
            )}
          </div>
          {step.content && <CollapsibleText text={step.content} />}
          {step.toolInput && (
            <div className="mt-2 p-2 glass-raised rounded text-xs border border-surface-border">
              <span className="text-slate-500">输入: </span>
              <CollapsibleText text={step.toolInput} maxLines={2} />
            </div>
          )}
          {step.toolOutput && (
            <div className="mt-2 p-2 glass-raised rounded text-xs border border-surface-border">
              <span className="text-slate-500">输出: </span>
              <CollapsibleText text={step.toolOutput} maxLines={2} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-xl border border-surface-border overflow-hidden glass-raised p-5 space-y-3">
          <div className="skeleton h-5 w-3/4 max-w-md" />
          <div className="skeleton h-4 w-1/3 max-w-xs" />
          <div className="flex gap-2">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
          <div className="skeleton h-4 w-full max-w-lg" />
        </div>
      ))}
    </div>
  )
}

const SPEED_MAP = { slow: 2000, normal: 1000, fast: 500 } as const

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="glass-raised rounded-2xl p-6 border border-surface-border space-y-4">
        <div className="skeleton h-7 w-2/3 max-w-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-3 w-12" />
              <div className="skeleton h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="flex gap-4">
          <div className="w-16 flex flex-col items-center gap-2">
            <div className="skeleton h-3 w-10" />
            <div className="skeleton w-3 h-3 rounded-full" />
            <div className="flex-1 w-px skeleton min-h-[80px]" />
          </div>
          <div className="flex-1 glass-raised rounded-xl p-4 border border-surface-border space-y-3">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-16 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Replay() {
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [sessionTags, setSessionTags] = useState<Record<string, string[]>>({})
  const [tagInfos, setTagInfos] = useState<TagInfo[]>([])
  const [selectedTag, setSelectedTag] = useState('全部')
  const [replay, setReplay] = useState<SessionReplay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [autoPlay, setAutoPlay] = useState(false)
  /** 自动播放模式下已展示的步数（1..n）；手动「查看全部」时不用 slice */
  const [visibleSteps, setVisibleSteps] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  const [showAllSteps, setShowAllSteps] = useState(false)
  const lastStepRef = useRef<HTMLDivElement | null>(null)

  const tagColorByTag = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of tagInfos) m.set(t.tag, t.color)
    return m
  }, [tagInfos])

  const filteredSessions = useMemo(() => {
    if (selectedTag === '全部') return sessions
    return sessions.filter(s => sessionTags[s.id]?.includes(selectedTag))
  }, [sessions, sessionTags, selectedTag])

  useEffect(() => {
    if (view !== 'list') return
    setLoading(true)
    setError(null)
    const parseSessionTags = (data: unknown): Record<string, string[]> => {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
      const out: Record<string, string[]> = {}
      for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        out[k] = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
      }
      return out
    }
    Promise.all([
      fetch('/api/replay/sessions?limit=20').then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<SessionMeta[]>
      }),
      fetch('/api/analytics/session-tags')
        .then(r => (r.ok ? r.json() : null))
        .then(data => parseSessionTags(data))
        .catch(() => ({} as Record<string, string[]>)),
      fetch('/api/analytics/tags')
        .then(r => (r.ok ? r.json() : null))
        .then(data => (Array.isArray(data) ? (data as TagInfo[]) : []))
        .catch(() => [] as TagInfo[]),
    ])
      .then(([sess, st, tags]) => {
        setSessions(Array.isArray(sess) ? sess : [])
        setSessionTags(st)
        setTagInfos(tags)
      })
      .catch(() => setError('获取会话列表失败，请检查后端是否运行'))
      .finally(() => setLoading(false))
  }, [view])

  useEffect(() => {
    if (view !== 'detail') return
    if (!replay) {
      setAutoPlay(false)
      setVisibleSteps(0)
      setCurrentStep(0)
      setShowAllSteps(false)
      return
    }
    if (!replay.steps.length) {
      setShowAllSteps(false)
      setAutoPlay(false)
      setVisibleSteps(0)
      setCurrentStep(0)
      return
    }
    setShowAllSteps(false)
    setAutoPlay(true)
    setVisibleSteps(1)
    setCurrentStep(1)
    setSpeed('normal')
  }, [view, replay])

  useEffect(() => {
    if (view !== 'detail' || !replay || showAllSteps || !autoPlay) return
    const total = replay.steps.length
    if (total === 0) return
    if (visibleSteps >= total) {
      setAutoPlay(false)
      setCurrentStep(total)
      return
    }
    const ms = SPEED_MAP[speed]
    const id = window.setInterval(() => {
      setVisibleSteps(v => {
        const next = v + 1
        if (next >= total) {
          setCurrentStep(total)
          setAutoPlay(false)
          return total
        }
        setCurrentStep(next)
        return next
      })
    }, ms)
    return () => window.clearInterval(id)
  }, [view, replay?.meta.id, replay?.steps.length, showAllSteps, autoPlay, speed, visibleSteps])

  useEffect(() => {
    if (view !== 'detail' || !replay || showAllSteps) return
    if (!autoPlay) return
    const el = lastStepRef.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [view, replay?.meta.id, visibleSteps, autoPlay, showAllSteps])

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
    const totalSteps = replay?.steps.length ?? 0
    const progressStep =
      showAllSteps || totalSteps === 0
        ? totalSteps
        : Math.min(Math.max(visibleSteps, currentStep, 1), totalSteps)
    const progressPct = totalSteps > 0 ? (progressStep / totalSteps) * 100 : 0
    const displayedSteps =
      showAllSteps || totalSteps === 0 ? (replay?.steps ?? []) : replay!.steps.slice(0, Math.max(visibleSteps, 1))
    const playbackComplete =
      totalSteps > 0 && (showAllSteps || (!autoPlay && visibleSteps >= totalSteps))

    const togglePlay = () => {
      if (!replay || totalSteps === 0) return
      if (showAllSteps) {
        setShowAllSteps(false)
        setVisibleSteps(1)
        setCurrentStep(1)
        setAutoPlay(true)
        return
      }
      if (!autoPlay && visibleSteps >= totalSteps) {
        setVisibleSteps(1)
        setCurrentStep(1)
        setAutoPlay(true)
        return
      }
      setAutoPlay(a => !a)
    }

    const restartPlayback = () => {
      if (!replay || totalSteps === 0) return
      setShowAllSteps(false)
      setVisibleSteps(1)
      setCurrentStep(1)
      setAutoPlay(true)
    }

    const showAll = () => {
      if (!replay || totalSteps === 0) return
      setShowAllSteps(true)
      setAutoPlay(false)
      setVisibleSteps(totalSteps)
      setCurrentStep(totalSteps)
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => { setView('list'); setReplay(null) }} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> 返回列表
          </button>
          {replay && (
            <a
              href={`/share/replay/${encodeURIComponent(replay.meta.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:opacity-90 rounded-lg text-sm font-medium transition-opacity text-white"
            >
              <Share2 className="w-4 h-4" /> 分享卡片
            </a>
          )}
        </div>

        {loading && <DetailSkeleton />}
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>}

        {replay && (
          <>
            <div className="glass-raised rounded-2xl p-6 mb-6 border border-surface-border border-accent/20">
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
                  <div className="text-accent font-medium">¥{replay.meta.totalCost.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-slate-500">Token</span>
                  <div className="text-blue-400 font-medium">{replay.meta.totalTokens.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {replay.meta.modelUsed.map(m => (
                  <span key={m} className="text-xs px-2 py-1 bg-surface-overlay rounded-full text-slate-300 border border-surface-border">{m}</span>
                ))}
              </div>
            </div>

            {totalSteps > 0 && (
              <div className="glass-raised rounded-xl p-4 mb-6 border border-surface-border flex flex-wrap items-center gap-3 md:gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="shrink-0 p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                  aria-label={autoPlay && !showAllSteps ? '暂停' : '播放'}
                >
                  {autoPlay && !showAllSteps ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                <div className="flex-1 min-w-[120px] h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>

                <span className="text-xs text-slate-500 tabular-nums shrink-0">
                  {progressStep}/{totalSteps}
                </span>

                <div className="flex gap-1 shrink-0">
                  {(['slow', 'normal', 'fast'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={cn(
                        'text-[10px] px-2 py-1 rounded transition-colors',
                        speed === s ? 'bg-blue-500/20 text-blue-400' : 'text-slate-600 hover:text-slate-400',
                      )}
                    >
                      {s === 'slow' ? '0.5x' : s === 'normal' ? '1x' : '2x'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={restartPlayback}
                  className="text-xs text-slate-500 hover:text-blue-400 transition-colors shrink-0"
                >
                  重新播放
                </button>

                <button type="button" onClick={showAll} className="text-xs text-slate-500 hover:text-blue-400 transition-colors shrink-0">
                  查看全部
                </button>
              </div>
            )}

            <div className="mb-4">
              {displayedSteps.map((step, idx) => {
                const isLast = idx === displayedSteps.length - 1
                const useStepMotion = !showAllSteps && totalSteps > 0

                return (
                  <div key={step.index} ref={isLast ? lastStepRef : undefined}>
                    {useStepMotion ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      >
                        <StepCard step={step} startTime={replay.meta.startTime} />
                      </motion.div>
                    ) : (
                      <StepCard step={step} startTime={replay.meta.startTime} />
                    )}
                  </div>
                )
              })}
            </div>

            {playbackComplete && (
              <div className="glass-raised rounded-xl p-5 border border-surface-border text-center border-cyan-500/20">
                <Zap className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  本次会话共 <span className="text-white font-medium">{replay.meta.stepCount} 步</span>，
                  用时 <span className="text-white font-medium">{formatDuration(replay.meta.durationMs)}</span>，
                  花费 <span className="text-emerald-400 font-medium">¥{replay.meta.totalCost.toFixed(4)}</span>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">会话回放</h2>
      <p className="text-slate-400 text-sm mb-6">看看龙虾都干了些什么 🍤</p>

      {!loading && !error && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSelectedTag('全部')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm transition-colors',
              selectedTag === '全部' ? 'bg-accent text-white' : 'glass-raised text-slate-400 hover:text-white hover:bg-surface-overlay',
            )}
          >
            全部
          </button>
          {tagInfos.map(t => (
            <button
              key={t.tag}
              type="button"
              onClick={() => setSelectedTag(t.tag)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm transition-colors',
                selectedTag === t.tag ? 'bg-accent text-white' : 'glass-raised text-slate-400 hover:text-white hover:bg-surface-overlay',
              )}
            >
              {t.tag}
            </button>
          ))}
        </div>
      )}

      {loading && <ListSkeleton />}
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm">{error}</div>}

      {!loading && !error && sessions.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <span className="text-4xl mb-3 block">🎬</span>
          <p className="text-lg mb-1">暂无会话记录</p>
          <p className="text-sm">启动 OpenClaw 执行几个任务后，这里就会出现精彩回放！</p>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && filteredSessions.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">该标签下暂无会话</div>
      )}

      {!loading && !error && filteredSessions.length > 0 && (
        <div className="space-y-3">
          {filteredSessions.map((session, index) => (
            <FadeIn key={session.id} delay={Math.min(index * 0.05, 0.5)}>
              <GlowCard className="w-full hover:border-accent/30">
                <button
                  type="button"
                  onClick={() => openSession(session.id)}
                  className="w-full rounded-xl p-5 text-left group bg-transparent border-0 text-inherit cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white group-hover:text-accent transition-colors truncate pr-4">
                      {session.summary || '无标题会话'}
                    </h3>
                    <span className="text-xs text-slate-500 shrink-0">{formatRelativeTime(session.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1"><Bot className="w-3 h-3" />{session.agentName}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(session.durationMs)}</span>
                    <span className="flex items-center gap-1"><Play className="w-3 h-3" />{session.stepCount} 步</span>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {session.modelUsed.slice(0, 3).map(m => (
                        <span key={m} className="text-xs px-2 py-0.5 bg-surface-overlay rounded-full text-slate-400 border border-surface-border">{m}</span>
                      ))}
                      {(sessionTags[session.id] ?? []).map(tag => {
                        const tagColor = tagColorByTag.get(tag) ?? '#94a3b8'
                        return (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${tagColor}20`, color: tagColor }}
                          >
                            {tag}
                          </span>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="text-blue-400">{session.totalTokens.toLocaleString()} tokens</span>
                      <span className="text-accent font-medium">¥{session.totalCost.toFixed(4)}</span>
                    </div>
                  </div>
                </button>
              </GlowCard>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  )
}
