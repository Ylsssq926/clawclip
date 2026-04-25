import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, Pause, RotateCcw, Bot, Clock, ChevronDown, ChevronUp, Share2, Download, FileText, Lightbulb, AlertTriangle, ThumbsUp } from 'lucide-react'
import { cn } from '../lib/cn'
import { useI18n, formatI18n } from '../lib/i18n'
import { formatDuration, formatRelativeTime, sessionMetaSubtitle } from '../lib/formatSession'
import { getReplayDetailSections } from './replayDetailSections'
import { getSupportingElementPriority } from './supportingElementPriority'
import type { Tab } from '../App'
import type { SessionMeta } from '../types/session'
import { apiGet, apiGetSafe, apiPost, parseApiErrorMessage } from '../lib/api'

const TAG_ALL = '__all__'

type ReplaySpeed = 'slow' | 'normal' | 'fast'

const SPEED_MAP: Record<ReplaySpeed, number> = {
  slow: 1200,
  normal: 700,
  fast: 300,
}

function normalizeReplayText(text?: string): string {
  const raw = (text ?? '').replace(/\r/g, '').trim()
  if (!raw) return ''

  const withoutEnvelope = raw
    .replace(/^Sender \(untrusted metadata\):\s*```[\s\S]*?```\s*/i, '')
    .replace(/^\[[^\]]+\]\s*/, '')

  const flattened = withoutEnvelope
    .replace(/```[^\n]*\n?/g, ' ')
    .replace(/```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  return flattened || raw.replace(/\s+/g, ' ').trim()
}

function replaySessionTitle(m: SessionMeta, untitled: string): string {
  const label = normalizeReplayText(m.sessionLabel)
  const summary = normalizeReplayText(m.summary)
  return (label || summary).slice(0, 120) || untitled
}

function replaySessionSummary(m: SessionMeta): string {
  const label = normalizeReplayText(m.sessionLabel)
  const summary = normalizeReplayText(m.summary)
  if (!summary || summary === label) return ''
  return summary.slice(0, 180)
}

function dataSourceBadge(src?: string): string {
  if (!src || src === 'demo') return 'Demo'
  const map: Record<string, string> = {
    openclaw: 'OpenClaw',
    zeroclaw: 'ZeroClaw',
    claw: 'Claw',
  }
  return map[src] ?? src
}

interface SessionStep {
  index: number
  timestamp: string
  type: 'thinking' | 'tool_call' | 'tool_result' | 'response' | 'user' | 'system' | 'error'
  content: string
  model?: string
  toolName?: string
  toolInput?: string
  toolOutput?: string
  error?: string
  isError?: boolean
  reasoning?: string
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

interface ReplayToast {
  tone: 'success' | 'error'
  message: string
}

function formatStepOffset(stepTime: string, startTime: string): string {
  const diff = new Date(stepTime).getTime() - new Date(startTime).getTime()
  const sec = Math.max(0, Math.floor(diff / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `+${m}:${s.toString().padStart(2, '0')}`
}

const LOCALE_MAP: Record<string, string> = {
  zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
  es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
}

function toLocaleNum(n: number, locale: string) {
  return n.toLocaleString(LOCALE_MAP[locale] ?? 'en-US')
}

const STEP_STYLES: Record<SessionStep['type'], { color: string; border: string; bg: string }> = {
  user:        { color: 'text-[#3b82c4]',    border: 'border-l-[#3b82c4]',    bg: 'bg-blue-50' },
  thinking:    { color: 'text-slate-500',    border: 'border-l-slate-300',    bg: 'bg-slate-50' },
  tool_call:   { color: 'text-violet-700',   border: 'border-l-violet-400',   bg: 'bg-violet-50/60' },
  tool_result: { color: 'text-emerald-700',  border: 'border-l-emerald-400',  bg: 'bg-emerald-50/60' },
  response:    { color: 'text-[#3b82c4]',    border: 'border-l-[#3b82c4]',    bg: 'bg-blue-50' },
  system:      { color: 'text-slate-500',    border: 'border-l-slate-300',    bg: 'bg-slate-50' },
  error:       { color: 'text-orange-700',   border: 'border-l-orange-400',   bg: 'bg-orange-50' },
}

function CollapsibleText({
  text,
  maxLines = 3,
  expandLabel,
  collapseLabel,
}: {
  text: string
  maxLines?: number
  expandLabel: string
  collapseLabel: string
}) {
  const [expanded, setExpanded] = useState(false)
  const lines = text.split('\n')
  const needsCollapse = lines.length > maxLines || text.length > 200

  if (!needsCollapse) return <pre className="text-sm text-slate-500 whitespace-pre-wrap break-words">{text}</pre>

  return (
    <div>
      <pre className={`text-sm text-slate-500 whitespace-pre-wrap break-words ${!expanded ? 'line-clamp-3' : ''}`}>{text}</pre>
      <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs text-accent hover:opacity-80 mt-1 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1">
        {expanded ? <><ChevronUp className="w-3 h-3" />{collapseLabel}</> : <><ChevronDown className="w-3 h-3" />{expandLabel}</>}
      </button>
    </div>
  )
}

function ReasoningBlock({ reasoning }: { reasoning: string }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const label = t('replay.reasoning')

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
      >
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        <span>{label}</span>
      </button>
      {expanded && (
        <div className="state-surface mt-2 px-3 py-2.5 text-sm text-slate-700">
          <pre className="whitespace-pre-wrap break-words font-sans leading-6">{reasoning}</pre>
        </div>
      )}
    </div>
  )
}

function StepCard({ step, startTime, totalCost = 0 }: { step: SessionStep; startTime: string; totalCost?: number }) {
  const { t, locale } = useI18n()
  const tokens = step.inputTokens + step.outputTokens
  const typeKey = `replay.step.${step.type}`
  const defaultLabel = step.type === 'error' ? t('replay.step.error') : t('replay.step.system')
  const stepLabel = t(typeKey) !== typeKey ? t(typeKey) : defaultLabel
  const isHighCost = totalCost > 0 && step.cost / totalCost > 0.3
  const toolFailurePattern = /error|failed|failure|失败|异常/i
  const hasError = Boolean(step.isError || step.error)
  const isToolFailure =
    (step.type === 'tool_result' || step.type === 'tool_call')
    && (toolFailurePattern.test(`${step.content} ${step.toolOutput ?? ''} ${step.error ?? ''}`) || hasError)
  const isFailureStep = hasError || isToolFailure
  const baseConfig = STEP_STYLES[step.type] || STEP_STYLES.system
  const config = isFailureStep ? STEP_STYLES.error : baseConfig
  const primaryContent = step.reasoning && step.content.trim() === step.reasoning.trim() ? '' : step.content

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex gap-2.5"
    >
      <div className="flex w-11 shrink-0 flex-col items-center">
        <span className="font-mono text-[10px] text-slate-400">{formatStepOffset(step.timestamp, startTime)}</span>
        <div className={`mt-1.5 h-2.5 w-2.5 rounded-full border ${config.border.replace('border-l-', 'border-')} ${config.bg}`} />
        <div className="flex-1 w-px bg-surface-border" />
      </div>
      <div
        className={cn(
          'mb-2.5 flex-1 rounded-lg border border-l-4 bg-white px-3.5 py-2.5 shadow-[0_8px_24px_-24px_rgba(15,23,42,0.18)]',
          isFailureStep && 'border-orange-300 bg-orange-100/80',
          config.border,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${config.color}`}>{stepLabel}</span>
            {step.toolName && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
                {step.toolName}
              </span>
            )}
            {step.model && <span className="text-[11px] text-slate-400">{step.model}</span>}
          </div>
          {(isHighCost || isToolFailure) && (
            <div className="flex items-center gap-2 text-[11px]">
              {isHighCost && (
                <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-orange-700">
                  {t('replay.badge.highCost')}
                </span>
              )}
              {isToolFailure && (
                <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-orange-700">
                  {t('replay.badge.callFailed')}
                </span>
              )}
            </div>
          )}
        </div>

        {primaryContent && (
          <div className="mt-2 min-w-0">
            <CollapsibleText text={primaryContent} expandLabel={t('replay.expand')} collapseLabel={t('replay.collapse')} />
          </div>
        )}
        {step.reasoning && <ReasoningBlock reasoning={step.reasoning} />}

        {(step.toolInput || step.toolOutput) && (
          <div className="mt-2 grid gap-1.5">
            {step.toolInput && (
              <div className="state-surface px-3 py-2 text-xs text-slate-600">
                <span className="font-medium text-slate-500">{t('replay.io.in')}</span>
                <div className="mt-1">
                  <CollapsibleText
                    text={step.toolInput}
                    maxLines={2}
                    expandLabel={t('replay.expand')}
                    collapseLabel={t('replay.collapse')}
                  />
                </div>
              </div>
            )}
            {step.toolOutput && (
              <div className="state-surface px-3 py-2 text-xs text-slate-600">
                <span className="font-medium text-slate-500">{t('replay.io.out')}</span>
                <div className="mt-1">
                  <CollapsibleText
                    text={step.toolOutput}
                    maxLines={2}
                    expandLabel={t('replay.expand')}
                    collapseLabel={t('replay.collapse')}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {(tokens > 0 || step.cost > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[10px] text-slate-400">
            {tokens > 0 && <span>{toLocaleNum(tokens, locale)} {t('replay.list.tokensUnit')}</span>}
            {step.cost > 0 && <span>${step.cost.toFixed(4)}</span>}
          </div>
        )}
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

function isAbortError(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'AbortError'
}

interface ReplayProps {
  initialSessionId?: string
  onInitialSessionHandled?: () => void
  onNavigate?: (tab: Tab) => void
}

export default function Replay({ initialSessionId, onInitialSessionHandled, onNavigate }: ReplayProps) {
  const { t, locale } = useI18n()
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [sessionTags, setSessionTags] = useState<Record<string, string[]>>({})
  const [tagInfos, setTagInfos] = useState<TagInfo[]>([])
  const [selectedTag, setSelectedTag] = useState(TAG_ALL)
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)
  const [replay, setReplay] = useState<SessionReplay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [insights, setInsights] = useState<Array<{ type: string; stepIndex?: number; titleZh: string; titleEn: string; descZh: string; descEn: string }>>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [demoReplayHint, setDemoReplayHint] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [visibleSteps, setVisibleSteps] = useState(0)
  const [speed, setSpeed] = useState<ReplaySpeed>('normal')
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(false)
  const [savingEval, setSavingEval] = useState(false)
  const [evalToast, setEvalToast] = useState<ReplayToast | null>(null)
  const lastVisibleStepRef = useRef<HTMLDivElement | null>(null)
  const currentSessionIdRef = useRef<string | null>(null)

  const resetEvalFeedback = useCallback(() => {
    setSavingEval(false)
    setEvalToast(null)
  }, [])

  const tagColorByTag = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of tagInfos) m.set(t.tag, t.color)
    return m
  }, [tagInfos])

  const filteredSessions = useMemo(() => {
    if (selectedTag === TAG_ALL) return sessions
    return sessions.filter(s => sessionTags[s.id]?.includes(selectedTag))
  }, [sessions, sessionTags, selectedTag])

  useEffect(() => {
    if (view !== 'list') return
    
    let cancelled = false
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
      apiGet<SessionMeta[]>('/api/replay/sessions?limit=20'),
      apiGetSafe<{ hasRealSessionData?: boolean }>('/api/status')
        .then(s => !(s?.hasRealSessionData ?? false)),
      apiGetSafe<Record<string, unknown>>('/api/analytics/session-tags')
        .then(data => parseSessionTags(data))
        .catch(() => ({} as Record<string, string[]>)),
      apiGetSafe<TagInfo[]>('/api/analytics/tags')
        .then(data => (Array.isArray(data) ? data : []))
        .catch(() => [] as TagInfo[]),
    ])
      .then(([sess, isDemoData, st, tags]) => {
        if (cancelled) return
        setSessions(Array.isArray(sess) ? sess : [])
        setDemoReplayHint(Boolean(isDemoData) && Array.isArray(sess) && sess.length > 0)
        setSessionTags(st)
        setTagInfos(tags)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('replay.error.list'))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    
    return () => {
      cancelled = true
    }
  }, [view, t])

  useEffect(() => {
    if (!evalToast) return
    const timer = window.setTimeout(() => setEvalToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [evalToast])

  const openSession = useCallback((id: string) => {
    resetEvalFeedback()
    currentSessionIdRef.current = id
    setOpenSessionId(id)
    setView('detail')
    setLoading(true)
    setError(null)
    setReplay(null)
    setInsights([])
    setInsightsLoading(true)
    setInsightsOpen(false)
    setAutoPlay(false)
    setVisibleSteps(0)
    setSpeed('normal')
    setShowAllSteps(false)
    setControlsVisible(false)
  }, [resetEvalFeedback])

  useEffect(() => {
    if (view !== 'detail' || !openSessionId) return

    const id = openSessionId
    const encoded = encodeURIComponent(id)
    const controller = new AbortController()

    const loadReplay = async () => {
      try {
        return await apiGet<SessionReplay>(`/api/replay/sessions/${encoded}`, { signal: controller.signal })
      } catch (error) {
        if (isAbortError(error)) throw error
        return await apiGet<SessionReplay>(`/api/knowledge/session/${encoded}`, { signal: controller.signal })
      }
    }

    const loadInsights = async () => {
      const replayInsights = await apiGetSafe<{ insights: typeof insights }>(
        `/api/replay/sessions/${encoded}/insights`,
        { signal: controller.signal },
      )
      if (replayInsights) return replayInsights
      return apiGetSafe<{ insights: typeof insights }>(`/api/knowledge/session/${encoded}/insights`, {
        signal: controller.signal,
      })
    }

    void loadReplay()
      .then(data => {
        if (controller.signal.aborted || currentSessionIdRef.current !== id) return
        setReplay(data)
      })
      .catch(error => {
        if (controller.signal.aborted || isAbortError(error) || currentSessionIdRef.current !== id) return
        setError(t('replay.error.detail'))
      })
      .finally(() => {
        if (controller.signal.aborted || currentSessionIdRef.current !== id) return
        setLoading(false)
      })

    void loadInsights()
      .then(d => {
        if (controller.signal.aborted || currentSessionIdRef.current !== id) return
        setInsights(Array.isArray(d?.insights) ? d.insights : [])
      })
      .catch(error => {
        if (controller.signal.aborted || isAbortError(error) || currentSessionIdRef.current !== id) return
      })
      .finally(() => {
        if (controller.signal.aborted || currentSessionIdRef.current !== id) return
        setInsightsLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [openSessionId, view, t])

  useEffect(() => {
    const nextSessionId = initialSessionId?.trim()
    if (!nextSessionId) return
    openSession(nextSessionId)
    onInitialSessionHandled?.()
  }, [initialSessionId, onInitialSessionHandled, openSession])

  useEffect(() => {
    if (view !== 'detail') return
    if (!replay) {
      setAutoPlay(false)
      setVisibleSteps(0)
      setSpeed('normal')
      setShowAllSteps(false)
      setControlsVisible(false)
      return
    }

    const totalSteps = replay.steps.length
    setSpeed('normal')
    setShowAllSteps(false)
    setControlsVisible(false)

    if (totalSteps === 0) {
      setAutoPlay(false)
      setVisibleSteps(0)
      return
    }

    setAutoPlay(true)
    setVisibleSteps(1)
  }, [view, replay?.meta.id, replay?.steps.length])

  useEffect(() => {
    if (view !== 'detail' || !replay || showAllSteps || !autoPlay) return
    const totalSteps = replay.steps.length
    if (totalSteps === 0 || visibleSteps >= totalSteps) return

    const timer = window.setInterval(() => {
      setVisibleSteps(current => Math.min(current + 1, totalSteps))
    }, SPEED_MAP[speed])

    return () => window.clearInterval(timer)
  }, [view, replay?.meta.id, replay?.steps.length, autoPlay, showAllSteps, speed, visibleSteps])

  useEffect(() => {
    if (view !== 'detail' || !replay || showAllSteps) return
    const totalSteps = replay.steps.length
    if (totalSteps === 0 || visibleSteps < totalSteps) return

    setAutoPlay(false)
    setControlsVisible(true)
  }, [view, replay?.meta.id, replay?.steps.length, showAllSteps, visibleSteps])

  useEffect(() => {
    if (view !== 'detail' || !replay || showAllSteps || !autoPlay) return
    lastVisibleStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [view, replay?.meta.id, visibleSteps, showAllSteps, autoPlay])

  if (view === 'detail') {
    const totalSteps = replay?.steps.length ?? 0
    const playbackCount = totalSteps > 0
      ? showAllSteps
        ? totalSteps
        : Math.min(Math.max(visibleSteps, 1), totalSteps)
      : 0
    const playbackProgress = totalSteps > 0 ? playbackCount / totalSteps : 0
    const displayedSteps = replay
      ? showAllSteps
        ? replay.steps
        : replay.steps.slice(0, playbackCount)
      : []
    const parseDiagnostics = replay?.meta.parseDiagnostics
    const parseDiagnosticsNotices = [
      (parseDiagnostics?.skippedLines ?? 0) > 0
        ? formatI18n(t('replay.parse.skipped'), { count: parseDiagnostics?.skippedLines ?? 0 })
        : null,
      (parseDiagnostics?.multilineRecovered ?? 0) > 0
        ? formatI18n(t('replay.parse.multilineRecovered'), { count: parseDiagnostics?.multilineRecovered ?? 0 })
        : null,
    ].filter((notice): notice is string => Boolean(notice))
    const detailSections = getReplayDetailSections({ insightsLoading, insightCount: insights.length })

    const handleReplay = () => {
      if (!replay || totalSteps === 0) return
      setShowAllSteps(false)
      setVisibleSteps(1)
      setAutoPlay(true)
      setControlsVisible(true)
    }

    const handleTogglePlayback = () => {
      if (!replay || totalSteps === 0) return
      if (showAllSteps || playbackCount >= totalSteps) {
        handleReplay()
        return
      }
      setAutoPlay(current => !current)
    }

    const handleShowAllSteps = () => {
      if (!replay || totalSteps === 0) return
      setShowAllSteps(true)
      setVisibleSteps(totalSteps)
      setAutoPlay(false)
      setControlsVisible(true)
    }

    const hasFailedSteps = replay?.steps.some(step => {
      const toolFailurePattern = /error|failed|failure|失败|异常/i
      const hasError = Boolean(step.isError || step.error)
      const isToolFailure =
        (step.type === 'tool_result' || step.type === 'tool_call')
        && (toolFailurePattern.test(`${step.content} ${step.toolOutput ?? ''} ${step.error ?? ''}`) || hasError)
      return hasError || isToolFailure
    }) ?? false

    const handleSaveAsEval = async () => {
      if (!replay || !hasFailedSteps || savingEval) return
      setSavingEval(true)
      setEvalToast(null)
      try {
        await apiPost<{ id: string }>('/api/eval/cases', { sessionId: replay.meta.id })
        setEvalToast({ tone: 'success', message: t('replay.saveAsEval.success') })
      } catch (err) {
        setEvalToast({
          tone: 'error',
          message: parseApiErrorMessage(err, t('replay.saveAsEval.error')),
        })
      } finally {
        setSavingEval(false)
      }
    }

    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              resetEvalFeedback()
              currentSessionIdRef.current = null
              setOpenSessionId(null)
              setView('list')
              setReplay(null)
              setInsights([])
              setInsightsLoading(false)
              setAutoPlay(false)
              setVisibleSteps(0)
              setSpeed('normal')
              setShowAllSteps(false)
              setControlsVisible(false)
            }}
            className="flex items-center gap-2 text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
          >
            <ArrowLeft className="h-4 w-4" /> {t('replay.back')}
          </button>
          {replay && (
            <div className="flex items-center gap-2">
              {hasFailedSteps && (
                <button
                  type="button"
                  onClick={handleSaveAsEval}
                  disabled={savingEval}
                  title={t('replay.saveAsEval.hint')}
                  className={cn(
                    'inline-flex items-center rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
                    savingEval
                      ? 'cursor-wait border-emerald-200/80 bg-emerald-50/80 text-emerald-500'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100/70',
                  )}
                >
                  {t('replay.saveAsEval')}
                </button>
              )}
              <details className="relative">
                <summary className="details-summary-reset inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-700">
                  <Share2 className="h-3.5 w-3.5" />
                  {t('replay.actions.more')}
                </summary>
                <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/8">
                  <a
                    href={`/api/knowledge/export/${encodeURIComponent(replay.meta.id)}?format=json`}
                    download
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#3b82c4]"
                  >
                    <Download className="h-3.5 w-3.5" /> {t('replay.actions.exportJson')}
                  </a>
                  <a
                    href={`/api/knowledge/export/${encodeURIComponent(replay.meta.id)}?format=markdown`}
                    download
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#3b82c4]"
                  >
                    <FileText className="h-3.5 w-3.5" /> {t('replay.actions.exportMd')}
                  </a>
                  <a
                    href={`/share/replay/${encodeURIComponent(replay.meta.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#3b82c4]"
                  >
                    <Share2 className="h-3.5 w-3.5" /> {t('replay.share')}
                  </a>
                </div>
              </details>
            </div>
          )}
        </div>

        {evalToast && (
          <div
            role={evalToast.tone === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={cn(
              'pointer-events-none fixed bottom-6 right-6 z-40 max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg shadow-slate-900/10',
              evalToast.tone === 'success'
                ? 'border-emerald-500/25 bg-emerald-50 text-emerald-700'
                : 'border-red-500/25 bg-red-50 text-red-700',
            )}
          >
            {evalToast.message}
          </div>
        )}

        {loading && <DetailSkeleton />}
        {error && <div className="bg-red-50 border border-red-500/30 rounded-xl p-4 mb-6 text-red-700 text-sm">{error}</div>}

        {replay && (
          <>
            <div className="glass-raised rounded-2xl p-5 mb-6 border border-surface-border border-accent/15">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h2 className="text-lg font-bold text-slate-900 truncate min-w-0 flex-1">{replaySessionTitle(replay.meta, t('replay.untitled'))}</h2>
                <span className={cn(getSupportingElementPriority('replayMetaBadge').className, 'shrink-0')}>
                  {dataSourceBadge(replay.meta.dataSource)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">{t('replay.metric.agent')}</span>
                  <div className="text-slate-900 font-medium">{replay.meta.agentName}</div>
                </div>
                <div>
                  <span className="text-slate-500">{t('replay.metric.time')}</span>
                  <div className="text-slate-900 font-medium">{formatDuration(replay.meta.durationMs, locale)}</div>
                </div>
                <div>
                  <span className="text-slate-500">{t('replay.metric.cost')}</span>
                  <div className="font-medium text-[#3b82c4]">${replay.meta.totalCost.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-slate-500">{t('replay.metric.tokens')}</span>
                  <div className="text-blue-400 font-medium">{toLocaleNum(replay.meta.totalTokens, locale)}</div>
                </div>
              </div>

              {(replaySessionSummary(replay.meta) || replay.meta.sessionKey || Boolean(replay.meta.modelUsed?.length) || parseDiagnosticsNotices.length > 0) && (
                <div className={cn('mt-3 border-t border-dashed border-slate-200/80 pt-3 space-y-1.5', getSupportingElementPriority('replayDetailMeta').className)}>
                  {replaySessionSummary(replay.meta) && (
                    <p className="line-clamp-1 text-slate-500/90">{replaySessionSummary(replay.meta)}</p>
                  )}
                  {Boolean(replay.meta.modelUsed?.length) && (
                    <p className="line-clamp-1">{t('replay.meta.models')} · {(replay.meta.modelUsed ?? []).join(' / ')}</p>
                  )}
                  {replay.meta.sessionKey && (
                    <p className="font-mono truncate opacity-80" title={replay.meta.sessionKey}>{replay.meta.sessionKey}</p>
                  )}
                  {parseDiagnosticsNotices.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500/90">
                      {parseDiagnosticsNotices.map(notice => (
                        <span key={notice}>{notice}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {detailSections.map(sectionId => {
              if (sectionId === 'timeline') {
                if (totalSteps === 0) {
                  return (
                    <section key={sectionId} className="mb-6 text-center py-12 text-slate-500 text-sm">
                      {t('replay.empty.steps')}
                    </section>
                  )
                }

                return (
                  <section key={sectionId} className="mb-4">
                    {!controlsVisible && (
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/80">
                            <motion.div
                              className="h-full rounded-full bg-[#3b82c4]"
                              animate={{ width: `${playbackProgress * 100}%` }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                            />
                          </div>
                          <span className="shrink-0 font-mono text-[11px] text-slate-400">
                            {playbackCount}/{totalSteps}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleShowAllSteps}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#3b82c4]/25 hover:text-[#3b82c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                        >
                          {t('replay.autoplay.viewAll')}
                        </button>
                      </div>
                    )}

                    <div className="space-y-3">
                      {displayedSteps.map(step => {
                        const isLastVisibleStep = displayedSteps[displayedSteps.length - 1]?.index === step.index
                        return (
                          <div key={step.index} ref={isLastVisibleStep ? lastVisibleStepRef : undefined}>
                            <StepCard
                              step={step}
                              startTime={replay.meta.startTime}
                              totalCost={replay.meta.totalCost}
                            />
                          </div>
                        )
                      })}
                    </div>

                    {controlsVisible && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleTogglePlayback}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#3b82c4]/25 hover:text-[#3b82c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                          >
                            {autoPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            <span>{autoPlay ? t('replay.autoplay.pause') : t('replay.autoplay.play')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleReplay}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#3b82c4]/25 hover:text-[#3b82c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>{t('replay.autoplay.replay')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleShowAllSteps}
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#3b82c4]/25 hover:text-[#3b82c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                          >
                            {t('replay.autoplay.viewAll')}
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {(['slow', 'normal', 'fast'] as const).map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setSpeed(option)}
                              className={cn(
                                'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
                                speed === option
                                  ? 'border-[#3b82c4]/20 bg-[#3b82c4]/10 text-[#3b82c4]'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
                              )}
                            >
                              {t(`replay.autoplay.${option}`)}
                            </button>
                          ))}
                          <span className="ml-1 font-mono text-[11px] text-slate-400">
                            {playbackCount}/{totalSteps}
                          </span>
                        </div>
                      </div>
                    )}
                  </section>
                )
              }

              return (
                <section key={sectionId} className="mb-6">
                  <button
                    type="button"
                    onClick={() => setInsightsOpen(v => !v)}
                    className={cn('flex items-center gap-2 font-medium transition-colors mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1', getSupportingElementPriority('replayInsightToggle').className)}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    {t('replay.insights.title')}
                    {insightsLoading && ` (${t('replay.insights.loadingShort')})`}
                    {!insightsLoading && insights.length > 0 && ` (${insights.length})`}
                    {insightsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {insightsOpen && (
                    <div className="space-y-2">
                      {insightsLoading && (
                        <div className={cn('rounded-xl border p-4 text-sm', getSupportingElementPriority('replayInsightCard').className)}>
                          {t('replay.insights.loading')}
                        </div>
                      )}

                      {!insightsLoading && insights.map((ins, i) => {
                        const Icon = ins.type === 'good' ? ThumbsUp : ins.type === 'warning' ? AlertTriangle : Lightbulb
                        const accentClass = ins.type === 'good'
                          ? 'border-l-[#3b82c4]/35 text-[#3b82c4]'
                          : ins.type === 'warning'
                            ? 'border-l-amber-300 text-amber-700'
                            : 'border-l-slate-300 text-slate-700'
                        return (
                          <div key={i} className={cn('rounded-xl border border-l-4 p-4', getSupportingElementPriority('replayInsightCard').className, accentClass)}>
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="text-sm font-medium text-slate-700">{locale === 'zh' ? ins.titleZh : ins.titleEn}</span>
                              {ins.stepIndex != null && (
                                <span className="text-[10px] text-slate-400 ml-auto">
                                  {formatI18n(t('replay.insights.stepLabel'), { index: ins.stepIndex + 1 })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed ml-6">{locale === 'zh' ? ins.descZh : ins.descEn}</p>
                          </div>
                        )
                      })}
                      {!insightsLoading && insights.length > 0 && (
                        <div className="ml-6 flex flex-wrap items-center gap-4 pt-1">
                          <button
                            type="button"
                            onClick={() => onNavigate?.('benchmark')}
                            className="text-sm font-medium text-slate-500 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                          >
                            {locale === 'zh' ? '去 Benchmark 验证' : 'Validate in Benchmark'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate?.('cost')}
                            className="text-sm font-medium text-slate-500 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                          >
                            {locale === 'zh' ? '查看成本报告' : 'View cost report'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )
            })}
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">{t('replay.title')}</h2>
      <p className="text-slate-500 text-sm mb-6">{t('replay.subtitle')}</p>

      {demoReplayHint && (
        <p className="mb-4 text-xs text-amber-700/80">
          {t('demo.hint.replay')}
        </p>
      )}

      {!loading && !error && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSelectedTag(TAG_ALL)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
              selectedTag === TAG_ALL ? 'bg-accent text-white' : 'glass-raised text-slate-500 hover:text-slate-900 hover:bg-surface-overlay',
            )}
          >
            {t('replay.tag.all')}
          </button>
          {tagInfos.map(ti => (
            <button
              key={ti.tag}
              type="button"
              onClick={() => setSelectedTag(ti.tag)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
                selectedTag === ti.tag
                  ? 'bg-[#3b82c4] text-white'
                  : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900',
              )}
            >
              {ti.tag}
            </button>
          ))}
        </div>
      )}

      {loading && <ListSkeleton />}
      {error && <div className="bg-red-50 border border-red-500/30 rounded-xl p-4 mb-6 text-red-700 text-sm">{error}</div>}

      {!loading && !error && sessions.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg mb-1">{t('replay.empty.title')}</p>
          <p className="text-sm">{t('replay.empty.hint')}</p>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && filteredSessions.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">{t('replay.empty.filtered')}</div>
      )}

      {!loading && !error && filteredSessions.length > 0 && (
        <div className="space-y-3">
          {filteredSessions.map(session => {
            const lineSub = sessionMetaSubtitle(session, locale)
            const summaryPreview = replaySessionSummary(session)
            return (
              <div key={session.id} className="card w-full">
                <button
                  type="button"
                  onClick={() => openSession(session.id)}
                  className="group w-full rounded-xl border-0 bg-transparent p-5 text-left text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 pr-4">
                      <h3 className="truncate font-medium text-slate-900 transition-colors group-hover:text-[#3b82c4]">
                        {replaySessionTitle(session, t('replay.untitled'))}
                      </h3>
                      {lineSub && (
                        <p className={cn('mt-0.5 truncate', getSupportingElementPriority('replayListMeta').className)}>{lineSub}</p>
                      )}
                      {summaryPreview && (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">
                          {summaryPreview}
                        </p>
                      )}
                    </div>
                    <div className={cn('flex shrink-0 items-center gap-1.5', getSupportingElementPriority('replayListMeta').className)}>
                      <span>{dataSourceBadge(session.dataSource)}</span>
                      <span>{formatRelativeTime(session.startTime, locale)}</span>
                    </div>
                  </div>
                  <div className={cn('mb-3 flex flex-wrap items-center gap-4', getSupportingElementPriority('replayListMeta').className)}>
                    <span className="flex items-center gap-1"><Bot className="h-3 w-3" />{session.agentName}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(session.durationMs, locale)}</span>
                    <span className="flex items-center gap-1"><Play className="h-3 w-3" />{session.stepCount} {t('replay.list.steps')}</span>
                  </div>
                  <div className={cn('flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-slate-200/80 pt-3', getSupportingElementPriority('replayListMeta').className)}>
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {Boolean(session.modelUsed?.length) && (
                        <span className="max-w-full truncate">
                          {(session.modelUsed ?? []).slice(0, 3).join(' / ')}
                        </span>
                      )}
                      {(sessionTags[session.id] ?? []).map(tag => {
                        const tagColor = tagColorByTag.get(tag) ?? '#94a3b8'
                        return (
                          <span
                            key={tag}
                            className="rounded-full px-2 py-0.5"
                            style={{ backgroundColor: `${tagColor}16`, color: tagColor }}
                          >
                            {tag}
                          </span>
                        )
                      })}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span>
                        {toLocaleNum(session.totalTokens, locale)} {t('replay.list.tokensUnit')}
                      </span>
                      <span>${session.totalCost.toFixed(4)}</span>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
