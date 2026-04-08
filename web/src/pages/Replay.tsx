import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, Bot, Clock, ChevronDown, ChevronUp, Share2, Download, FileText, Lightbulb, AlertTriangle, ThumbsUp } from 'lucide-react'
import FadeIn from '../components/ui/FadeIn'
import GlowCard from '../components/ui/GlowCard'
import { cn } from '../lib/cn'
import { useI18n } from '../lib/i18n'
import { formatDuration, formatRelativeTime, sessionMetaSubtitle } from '../lib/formatSession'
import { getReplayDetailSections } from './replayDetailSections'
import { getSupportingElementPriority } from './supportingElementPriority'
import type { SessionMeta } from '../types/session'
import { apiGet, apiGetSafe } from '../lib/api'

const TAG_ALL = '__all__'

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

function formatStepOffset(stepTime: string, startTime: string): string {
  const diff = new Date(stepTime).getTime() - new Date(startTime).getTime()
  const sec = Math.max(0, Math.floor(diff / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `+${m}:${s.toString().padStart(2, '0')}`
}

const STEP_STYLES: Record<SessionStep['type'], { color: string; border: string; bg: string }> = {
  user:        { color: 'text-blue-400',   border: 'border-l-blue-500',   bg: 'bg-blue-500/10' },
  thinking:    { color: 'text-purple-400', border: 'border-l-purple-500', bg: 'bg-purple-500/10' },
  tool_call:   { color: 'text-cyan-400',   border: 'border-l-cyan-500',   bg: 'bg-cyan-500/10' },
  tool_result: { color: 'text-green-400',  border: 'border-l-green-500',  bg: 'bg-green-500/10' },
  response:    { color: 'text-blue-400',   border: 'border-l-blue-500',   bg: 'bg-blue-500/10' },
  system:      { color: 'text-slate-500',  border: 'border-l-slate-500',  bg: 'bg-slate-500/10' },
  error:       { color: 'text-red-500',    border: 'border-l-red-500',    bg: 'bg-red-500/10' },
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
      <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs text-accent hover:opacity-80 mt-1 flex items-center gap-1">
        {expanded ? <><ChevronUp className="w-3 h-3" />{collapseLabel}</> : <><ChevronDown className="w-3 h-3" />{expandLabel}</>}
      </button>
    </div>
  )
}

function ReasoningBlock({ reasoning }: { reasoning: string }) {
  const { locale } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const label = locale.startsWith('zh') ? '思考过程' : 'Reasoning'

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-800 transition-colors"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>{label}</span>
      </button>
      {expanded && (
        <div className="mt-2 bg-purple-50 border-l-4 border-purple-300 p-3 rounded text-sm text-slate-700">
          <pre className="whitespace-pre-wrap break-words font-sans">{reasoning}</pre>
        </div>
      )}
    </div>
  )
}

function StepCard({ step, startTime, totalCost = 0 }: { step: SessionStep; startTime: string; totalCost?: number }) {
  const { t, locale } = useI18n()
  const isZh = locale.startsWith('zh')
  const tokens = step.inputTokens + step.outputTokens
  const typeKey = `replay.step.${step.type}`
  const defaultLabel = step.type === 'error' ? (isZh ? '错误' : 'Error') : t('replay.step.system')
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
        <div
          className={cn(
            'flex-1 glass-raised rounded-xl p-4 border border-l-4 mb-3',
            isFailureStep ? 'border-red-200/80 bg-red-50/60 shadow-sm shadow-red-100/60' : 'border-surface-border',
            config.border,
          )}
        >
          <div className="flex items-center justify-between mb-2 gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className={`text-sm font-medium ${config.color}`}>{stepLabel}</span>
              {step.toolName && <span className="text-xs px-2 py-0.5 bg-surface-overlay rounded-full text-slate-500 border border-surface-border">{step.toolName}</span>}
              {step.model && <span className="text-xs text-slate-500">{step.model}</span>}
              {isHighCost && (
                <span className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded">
                  {isZh ? '高成本' : 'High cost'}
                </span>
              )}
              {isToolFailure && (
                <span className="bg-red-50 text-red-600 text-xs px-2 py-0.5 rounded border border-red-200">
                  {isZh ? '调用失败' : 'Call failed'}
                </span>
              )}
            </div>
            {tokens > 0 && (
              <span className="text-xs text-slate-500 shrink-0">
                {tokens.toLocaleString()} {t('replay.list.tokensUnit')} · ${step.cost.toFixed(4)}
              </span>
            )}
          </div>
          {primaryContent && (
            <div className="min-w-0">
              <CollapsibleText text={primaryContent} expandLabel={t('replay.expand')} collapseLabel={t('replay.collapse')} />
            </div>
          )}
          {step.reasoning && <ReasoningBlock reasoning={step.reasoning} />}
          {step.toolInput && (
            <div className="mt-2 p-2 glass-raised rounded text-xs border border-surface-border">
              <span className="text-slate-500">{t('replay.io.in')}: </span>
              <CollapsibleText
                text={step.toolInput}
                maxLines={2}
                expandLabel={t('replay.expand')}
                collapseLabel={t('replay.collapse')}
              />
            </div>
          )}
          {step.toolOutput && (
            <div className="mt-2 p-2 glass-raised rounded text-xs border border-surface-border">
              <span className="text-slate-500">{t('replay.io.out')}: </span>
              <CollapsibleText
                text={step.toolOutput}
                maxLines={2}
                expandLabel={t('replay.expand')}
                collapseLabel={t('replay.collapse')}
              />
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

interface ReplayProps {
  initialSessionId?: string
  onInitialSessionHandled?: () => void
}

export default function Replay({ initialSessionId, onInitialSessionHandled }: ReplayProps) {
  const { t, locale } = useI18n()
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [sessionTags, setSessionTags] = useState<Record<string, string[]>>({})
  const [tagInfos, setTagInfos] = useState<TagInfo[]>([])
  const [selectedTag, setSelectedTag] = useState(TAG_ALL)
  const [replay, setReplay] = useState<SessionReplay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [insights, setInsights] = useState<Array<{ type: string; stepIndex?: number; titleZh: string; titleEn: string; descZh: string; descEn: string }>>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [demoReplayHint, setDemoReplayHint] = useState(false)

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
        setSessions(Array.isArray(sess) ? sess : [])
        setDemoReplayHint(Boolean(isDemoData) && Array.isArray(sess) && sess.length > 0)
        setSessionTags(st)
        setTagInfos(tags)
      })
      .catch(() => setError(t('replay.error.list')))
      .finally(() => setLoading(false))
  }, [view, t])

  const openSession = useCallback((id: string) => {
    setView('detail')
    setLoading(true)
    setError(null)
    setReplay(null)
    setInsights([])
    setInsightsLoading(true)
    setInsightsOpen(false)
    const encoded = encodeURIComponent(id)

    const loadReplay = async () => {
      try {
        return await apiGet<SessionReplay>(`/api/replay/sessions/${encoded}`)
      } catch {
        return await apiGet<SessionReplay>(`/api/knowledge/session/${encoded}`)
      }
    }

    const loadInsights = async () => {
      const replayInsights = await apiGetSafe<{ insights: typeof insights }>(`/api/replay/sessions/${encoded}/insights`)
      if (replayInsights) return replayInsights
      return apiGetSafe<{ insights: typeof insights }>(`/api/knowledge/session/${encoded}/insights`)
    }

    void loadReplay()
      .then(setReplay)
      .catch(() => setError(t('replay.error.detail')))
      .finally(() => setLoading(false))

    void loadInsights()
      .then(d => {
        setInsights(Array.isArray(d?.insights) ? d.insights : [])
      })
      .finally(() => setInsightsLoading(false))
  }, [t])

  useEffect(() => {
    const nextSessionId = initialSessionId?.trim()
    if (!nextSessionId) return
    openSession(nextSessionId)
    onInitialSessionHandled?.()
  }, [initialSessionId, onInitialSessionHandled, openSession])

  if (view === 'detail') {
    const totalSteps = replay?.steps.length ?? 0
    const isZh = locale.startsWith('zh')
    const parseDiagnostics = replay?.meta.parseDiagnostics
    const parseDiagnosticsNotices = [
      (parseDiagnostics?.skippedLines ?? 0) > 0
        ? (isZh
          ? `解析时跳过了 ${parseDiagnostics?.skippedLines ?? 0} 行`
          : `Skipped ${parseDiagnostics?.skippedLines ?? 0} lines while parsing`)
        : null,
      (parseDiagnostics?.multilineRecovered ?? 0) > 0
        ? (isZh
          ? `恢复了 ${parseDiagnostics?.multilineRecovered ?? 0} 处多行 JSON`
          : `Recovered ${parseDiagnostics?.multilineRecovered ?? 0} multiline JSON blocks`)
        : null,
    ].filter((notice): notice is string => Boolean(notice))
    const detailSections = getReplayDetailSections({ insightsLoading, insightCount: insights.length })

    return (
      <div>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <button type="button" onClick={() => { setView('list'); setReplay(null) }} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t('replay.back')}
          </button>
          {replay && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <a
                href={`/api/knowledge/export/${encodeURIComponent(replay.meta.id)}?format=json`}
                download
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-blue-400 card transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> JSON
              </a>
              <a
                href={`/api/knowledge/export/${encodeURIComponent(replay.meta.id)}?format=markdown`}
                download
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-blue-400 card transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> MD
              </a>
              <a
                href={`/share/replay/${encodeURIComponent(replay.meta.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:opacity-90 rounded-lg text-sm font-medium transition-opacity text-white"
              >
                <Share2 className="w-4 h-4" /> {t('replay.share')}
              </a>
            </div>
          )}
        </div>

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
                  <div className="text-accent font-medium">${replay.meta.totalCost.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-slate-500">{t('replay.metric.tokens')}</span>
                  <div className="text-blue-400 font-medium">{replay.meta.totalTokens.toLocaleString()}</div>
                </div>
              </div>

              {(replaySessionSummary(replay.meta) || replay.meta.sessionKey || Boolean(replay.meta.modelUsed?.length) || parseDiagnosticsNotices.length > 0) && (
                <div className={cn('mt-3 border-t border-dashed border-slate-200/80 pt-3 space-y-1.5', getSupportingElementPriority('replayDetailMeta').className)}>
                  {replaySessionSummary(replay.meta) && (
                    <p className="line-clamp-1 text-slate-500/90">{replaySessionSummary(replay.meta)}</p>
                  )}
                  {Boolean(replay.meta.modelUsed?.length) && (
                    <p className="line-clamp-1">{isZh ? '模型' : 'Models'} · {(replay.meta.modelUsed ?? []).join(' / ')}</p>
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
                  <section key={sectionId} className="mb-4 space-y-3">
                    {replay.steps.map(step => (
                      <StepCard key={step.index} step={step} startTime={replay.meta.startTime} totalCost={replay.meta.totalCost} />
                    ))}
                  </section>
                )
              }

              return (
                <section key={sectionId} className="mb-6">
                  <button
                    type="button"
                    onClick={() => setInsightsOpen(v => !v)}
                    className={cn('flex items-center gap-2 font-medium transition-colors mb-3', getSupportingElementPriority('replayInsightToggle').className)}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    {locale === 'zh'
                      ? `运行分析${insightsLoading ? '（整理中）' : insights.length > 0 ? `（${insights.length}）` : ''}`
                      : `Run Analysis${insightsLoading ? ' (Loading)' : insights.length > 0 ? ` (${insights.length})` : ''}`}
                    {insightsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {insightsOpen && (
                    <div className="space-y-2">
                      {insightsLoading && (
                        <div className={cn('rounded-xl border p-4 text-sm', getSupportingElementPriority('replayInsightCard').className)}>
                          {locale === 'zh' ? '正在整理这次运行…' : 'Analyzing this run…'}
                        </div>
                      )}

                      {!insightsLoading && insights.map((ins, i) => {
                        const Icon = ins.type === 'good' ? ThumbsUp : ins.type === 'warning' ? AlertTriangle : Lightbulb
                        const accentClass = ins.type === 'good'
                          ? 'border-l-emerald-300 text-emerald-700'
                          : ins.type === 'warning'
                            ? 'border-l-amber-300 text-amber-700'
                            : 'border-l-blue-300 text-blue-700'
                        return (
                          <div key={i} className={cn('rounded-xl border border-l-4 p-4', getSupportingElementPriority('replayInsightCard').className, accentClass)}>
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-4 h-4 shrink-0" />
                              <span className="text-sm font-medium text-slate-700">{locale === 'zh' ? ins.titleZh : ins.titleEn}</span>
                              {ins.stepIndex != null && (
                                <span className="text-[10px] text-slate-400 ml-auto">Step {ins.stepIndex + 1}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed ml-6">{locale === 'zh' ? ins.descZh : ins.descEn}</p>
                          </div>
                        )
                      })}
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
              'px-4 py-2 rounded-lg text-sm transition-colors',
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
                'px-4 py-2 rounded-lg text-sm transition-colors',
                selectedTag === ti.tag ? 'bg-accent text-white' : 'glass-raised text-slate-500 hover:text-slate-900 hover:bg-surface-overlay',
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
          {filteredSessions.map((session, index) => {
            const lineSub = sessionMetaSubtitle(session, locale)
            const summaryPreview = replaySessionSummary(session)
            return (
            <FadeIn key={session.id} delay={Math.min(index * 0.05, 0.5)}>
              <GlowCard className="w-full hover:border-accent/30">
                <button
                  type="button"
                  onClick={() => openSession(session.id)}
                  className="w-full rounded-xl p-5 text-left group bg-transparent border-0 text-inherit cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0 pr-4">
                      <h3 className="font-medium text-slate-900 group-hover:text-accent transition-colors truncate">
                        {replaySessionTitle(session, t('replay.untitled'))}
                      </h3>
                      {lineSub && (
                        <p className={cn('truncate mt-0.5', getSupportingElementPriority('replayListMeta').className)}>{lineSub}</p>
                      )}
                      {summaryPreview && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                          {summaryPreview}
                        </p>
                      )}
                    </div>
                    <div className={cn('flex items-center gap-1.5 shrink-0', getSupportingElementPriority('replayListMeta').className)}>
                      <span>{dataSourceBadge(session.dataSource)}</span>
                      <span>{formatRelativeTime(session.startTime, locale)}</span>
                    </div>
                  </div>
                  <div className={cn('flex items-center gap-4 mb-3', getSupportingElementPriority('replayListMeta').className)}>
                    <span className="flex items-center gap-1"><Bot className="w-3 h-3" />{session.agentName}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(session.durationMs, locale)}</span>
                    <span className="flex items-center gap-1"><Play className="w-3 h-3" />{session.stepCount} {t('replay.list.steps')}</span>
                  </div>
                  <div className={cn('flex items-center justify-between flex-wrap gap-2 border-t border-dashed border-slate-200/80 pt-3', getSupportingElementPriority('replayListMeta').className)}>
                    <div className="flex flex-wrap gap-1.5 items-center min-w-0">
                      {Boolean(session.modelUsed?.length) && (
                        <span className="truncate max-w-full">
                          {(session.modelUsed ?? []).slice(0, 3).join(' / ')}
                        </span>
                      )}
                      {(sessionTags[session.id] ?? []).map(tag => {
                        const tagColor = tagColorByTag.get(tag) ?? '#94a3b8'
                        return (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${tagColor}16`, color: tagColor }}
                          >
                            {tag}
                          </span>
                        )
                      })}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span>
                        {session.totalTokens.toLocaleString()} {t('replay.list.tokensUnit')}
                      </span>
                      <span>${session.totalCost.toFixed(4)}</span>
                    </div>
                  </div>
                </button>
              </GlowCard>
            </FadeIn>
            )
          })}
        </div>
      )}
    </div>
  )
}
