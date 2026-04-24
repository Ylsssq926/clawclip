import { Activity, AlertTriangle, ArrowRight, Bot, ChevronDown, ChevronUp, Cloud, DollarSign, Play, Trophy, Wifi, WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Tab } from '../App'
import WordCloud, { type KeywordItem } from '../components/WordCloud'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import { cn } from '../lib/cn'
import { formatDuration, formatRelativeTime, sessionMetaSubtitle } from '../lib/formatSession'
import { useI18n, type Locale } from '../lib/i18n'
import { apiGetSafe } from '../lib/api'
import { readDashboardDiagnosticsDismissed, writeDashboardDiagnosticsDismissed } from '../lib/dashboardDiagnosticsPreference'
import type { SessionMeta } from '../types/session'

interface LobsterDataRootStatus {
  id: string
  label: string
  homeDir: string
  sessionJsonlFiles: number
  hasConfig: boolean
  configPath: string
  skillsCount: number
}

interface EcosystemNote {
  severity: 'info' | 'warn'
  rootId?: string
  messageZh: string
  messageEn: string
}

interface StatusData {
  running: boolean
  version: string
  skillCount: number
  channels: string[]
  cliCommand?: 'openclaw' | 'zeroclaw' | null
  dataRoots?: LobsterDataRootStatus[]
  totalSessionFiles?: number
  parsableSessionCount?: number
  unparsableJsonlFileCount?: number
  hasRealSessionData?: boolean
  sessionDataHintZh?: string
  sessionDataHintEn?: string
  ecosystemNotes?: EcosystemNote[]
  latestSessionAt?: string
  latestRealSessionAt?: string
  lastStatusCheckedAt?: string
}

interface CostSummary {
  totalCost: number
  totalTokens: number
  trend: 'up' | 'down' | 'stable'
}

const DEMO_COST_SUMMARY: CostSummary = {
  totalCost: 0.04,
  totalTokens: 30705,
  trend: 'up',
}

type TokenWasteIssueType = 'retry-loop' | 'long-prompt' | 'verbose-output' | 'expensive-model' | 'context-bloat'

interface TokenWasteReport {
  summary: {
    estimatedWasteTokens: number
    estimatedWasteCost: number
    signals: number
    topIssue?: TokenWasteIssueType
    usingDemo: boolean
  }
}

interface DashboardBenchmarkSnapshot {
  overallScore: number
  totalCost: number
}

interface DashboardBenchmarkProof {
  latest: DashboardBenchmarkSnapshot
  previous: DashboardBenchmarkSnapshot | null
  deltas: {
    score: number
    cost: number
  } | null
  sampleComparison?: boolean
}

function formatWasteCost(value: number): string {
  if (value >= 1) return value.toFixed(2)
  if (value >= 0.1) return value.toFixed(3)
  return value.toFixed(4)
}

function formatSignedDashboardInteger(value: number): string {
  if (value === 0) return '0'
  return `${value > 0 ? '+' : ''}${Math.round(value)}`
}

function formatSignedDashboardCurrency(value: number): string {
  if (value === 0) return '$0.00'
  return `${value > 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`
}

const DASHBOARD_NUMBER_LOCALE: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
}

function formatDashboardNumber(value: number, locale: Locale): string {
  return value.toLocaleString(DASHBOARD_NUMBER_LOCALE[locale] ?? DASHBOARD_NUMBER_LOCALE.en)
}

function fillI18nTemplate(template: string, values: Record<string, string | number>): string {
  let next = template
  for (const [key, value] of Object.entries(values)) {
    next = next.split(`{${key}}`).join(String(value))
  }
  return next
}

function getTokenWasteIssueLabel(issue: TokenWasteIssueType | undefined, t: (key: string) => string): string {
  switch (issue) {
    case 'retry-loop':
      return t('dashboard.tokenWaste.retryLoop')
    case 'long-prompt':
      return t('dashboard.tokenWaste.longPrompt')
    case 'verbose-output':
      return t('dashboard.tokenWaste.verboseOutput')
    case 'expensive-model':
      return t('dashboard.tokenWaste.expensiveModel')
    case 'context-bloat':
      return t('dashboard.tokenWaste.contextBloat')
    default:
      return t('dashboard.tokenWaste.none')
  }
}

interface ReplayDiagnosticsSession {
  id: string
  agentName: string
  totalLines: number
  parsedLines: number
  skippedLines: number
  errorSamples?: string[]
}

interface ReplayDiagnosticsData {
  totalJsonlFiles: number
  parsableCount: number
  sessions: ReplayDiagnosticsSession[]
}

function sessionListTitle(s: SessionMeta, t: (key: string) => string): string {
  const fromStore = s.sessionLabel?.trim()
  const fromTranscript = s.summary?.trim()
  const text = (fromStore || fromTranscript || '').slice(0, 80)
  if (text) return text
  return t('dashboard.session.fallbackTitle')
}

interface Props {
  onNavigate: (tab: Tab) => void
  onKnowledgeSearch: (query: string) => void
  onOpenReplaySession: (sessionId: string) => void
}

export default function Dashboard({ onNavigate, onKnowledgeSearch, onOpenReplaySession }: Props) {
  const { t, locale } = useI18n()
  const [status, setStatus] = useState<StatusData | null>(null)
  const [cost, setCost] = useState<CostSummary | null>(null)
  const [tokenWaste, setTokenWaste] = useState<TokenWasteReport | null>(null)
  const [benchmarkProof, setBenchmarkProof] = useState<DashboardBenchmarkProof | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [keywords, setKeywords] = useState<KeywordItem[]>([])
  const [kwLoading, setKwLoading] = useState(true)
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [diagnostics, setDiagnostics] = useState<ReplayDiagnosticsData | null>(null)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [diagnosticsDismissed, setDiagnosticsDismissed] = useState(() => readDashboardDiagnosticsDismissed())

  useEffect(() => {
    Promise.allSettled([apiGetSafe('/api/status'), apiGetSafe('/api/cost/summary?days=30')])
      .then((results) => {
        const s = results[0].status === 'fulfilled' ? results[0].value : null
        const c = results[1].status === 'fulfilled' ? results[1].value : null
        
        const nextStatus = s as StatusData | null
        const nextCost = c as CostSummary | null
        const shouldUseDemoCost =
          !nextStatus?.hasRealSessionData &&
          (!nextCost || ((nextCost.totalCost ?? 0) <= 0 && (nextCost.totalTokens ?? 0) <= 0))

        setStatus(nextStatus)
        setCost(shouldUseDemoCost ? DEMO_COST_SUMMARY : nextCost)
        if (!s && !c) setFetchError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    apiGetSafe<{ keywords: KeywordItem[] }>('/api/analytics/keywords?days=30&limit=40')
      .then(data => setKeywords(Array.isArray(data?.keywords) ? data.keywords : []))
      .finally(() => setKwLoading(false))
  }, [])

  useEffect(() => {
    apiGetSafe<SessionMeta[]>('/api/replay/sessions?limit=5')
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .finally(() => setSessionsLoading(false))
  }, [])

  useEffect(() => {
    apiGetSafe<TokenWasteReport>('/api/analytics/token-waste?days=30')
      .then(data => {
        if (!data?.summary) {
          setTokenWaste(null)
          return
        }
        setTokenWaste(data)
      })
  }, [])

  useEffect(() => {
    apiGetSafe<DashboardBenchmarkProof>('/api/benchmark/proof')
      .then(data => {
        if (!data?.latest) {
          setBenchmarkProof(null)
          return
        }
        setBenchmarkProof(data)
      })
  }, [])

  useEffect(() => {
    apiGetSafe<ReplayDiagnosticsData>('/api/replay/diagnostics')
      .then(data => {
        if (!data || !Array.isArray(data.sessions)) {
          setDiagnostics(null)
          return
        }
        setDiagnostics(data)
      })
  }, [])

  const jsonlTotal = status?.totalSessionFiles ?? 0
  const parsableCount = status?.parsableSessionCount ?? 0
  const hasJsonlButUnparsed = Boolean(status) && jsonlTotal > 0 && parsableCount === 0 && !status?.hasRealSessionData
  const diagnosticSessions = diagnostics?.sessions ?? []
  const highlightDiagnostics = diagnosticSessions.length > 0 && !diagnosticsDismissed
  const hasConnectedSessions = Boolean(status?.hasRealSessionData)
  const sessionCountLabel = formatDashboardNumber(parsableCount, locale)
  const diagnosticCountLabel = formatDashboardNumber(diagnosticSessions.length, locale)
  const latestSession = sessions[0] ?? null
  const latestSessionSubtitle = latestSession ? sessionMetaSubtitle(latestSession, locale) : null
  const benchmarkLatest = benchmarkProof?.latest ?? null
  const benchmarkDeltas = benchmarkProof?.deltas ?? null
  const isSampleBenchmarkProof = Boolean(benchmarkProof?.sampleComparison)
  const hasWasteSignals = Boolean(tokenWaste && tokenWaste.summary.signals > 0)
  const demoDataSuffix = tokenWaste?.summary.usingDemo ? t('dashboard.common.demoDataSuffix') : ''

  const connectionBadgeText = hasConnectedSessions
    ? fillI18nTemplate(
        t(parsableCount === 1 ? 'dashboard.connection.badge.connected.one' : 'dashboard.connection.badge.connected.other'),
        { count: sessionCountLabel },
      )
    : hasJsonlButUnparsed
      ? t('dashboard.connection.processing')
      : t('dashboard.connection.demo')
  const connectionTitle = hasJsonlButUnparsed
    ? t('dashboard.connection.processing')
    : t('dashboard.connection.demoTitle')
  const connectionBody = hasJsonlButUnparsed
    ? t('dashboard.connection.processingHint')
    : t('dashboard.connection.demoHint')

  const decisionBodyKey = hasConnectedSessions
    ? 'dashboard.entry.body.connected'
    : hasJsonlButUnparsed
      ? 'dashboard.entry.body.processing'
      : 'dashboard.entry.body.demo'

  let benchmarkTitle = t('dashboard.entry.benchmark.pendingTitle')
  let benchmarkBody = t('dashboard.entry.benchmark.pendingBody')
  let benchmarkTone = 'border-slate-200 bg-white text-slate-900'

  if (benchmarkDeltas && !isSampleBenchmarkProof) {
    if (benchmarkDeltas.score > 0 && benchmarkDeltas.cost > 0) {
      benchmarkTitle = t('dashboard.entry.benchmark.costTitle')
      benchmarkBody = t('dashboard.entry.benchmark.costBody')
      benchmarkTone = 'border-amber-200 bg-amber-50/70 text-amber-900'
    } else if (benchmarkDeltas.score < 0 || (benchmarkDeltas.score === 0 && benchmarkDeltas.cost >= 0)) {
      benchmarkTitle = t('dashboard.entry.benchmark.riskTitle')
      benchmarkBody = t('dashboard.entry.benchmark.riskBody')
      benchmarkTone = 'border-rose-200 bg-rose-50/75 text-rose-900'
    } else {
      benchmarkTitle = t('dashboard.entry.benchmark.goodTitle')
      benchmarkBody = t('dashboard.entry.benchmark.goodBody')
      benchmarkTone = 'border-emerald-200 bg-emerald-50/75 text-emerald-900'
    }
  } else if (benchmarkLatest) {
    benchmarkTitle = isSampleBenchmarkProof ? t('dashboard.connection.demo') : t('dashboard.entry.benchmark.waitTitle')
    benchmarkBody = isSampleBenchmarkProof ? t('demo.hint.benchmark') : t('dashboard.entry.benchmark.waitBody')
    benchmarkTone = 'border-slate-200 bg-white text-slate-900'
  }

  let issueTitle = t('dashboard.issue.analyzingTitle')
  let issueBody = t('dashboard.issue.analyzingBody')
  let issueCta = t('dashboard.entry.issue.cta.cost')
  let issueTone = 'border-amber-200 bg-amber-50/70 text-amber-900'
  let handleIssueAction = () => onNavigate('cost')

  if (tokenWaste) {
    if (hasWasteSignals) {
      issueTitle = getTokenWasteIssueLabel(tokenWaste.summary.topIssue, t)
      issueBody = fillI18nTemplate(t('dashboard.issue.wasteSignalsBody'), {
        count: formatDashboardNumber(tokenWaste.summary.signals, locale),
        suffix: demoDataSuffix,
      })
      issueCta = t('dashboard.entry.issue.cta.cost')
      issueTone = 'border-amber-200 bg-amber-50/70 text-amber-900'
      handleIssueAction = () => onNavigate('cost')
    } else if (highlightDiagnostics) {
      issueTitle = t('dashboard.issue.cleanupTitle')
      issueBody = fillI18nTemplate(t('dashboard.issue.cleanupBody'), {
        count: diagnosticCountLabel,
      })
      issueCta = t('dashboard.entry.issue.cta.replayStatus')
      issueTone = 'border-amber-200 bg-amber-50/70 text-amber-900'
      handleIssueAction = () => onNavigate('replay')
    } else if (!hasConnectedSessions) {
      issueTitle = connectionTitle
      issueBody = connectionBody
      issueCta = t('dashboard.entry.issue.cta.replay')
      issueTone = 'border-slate-200 bg-white text-slate-900'
      handleIssueAction = () => onNavigate('replay')
    } else {
      issueTitle = t('dashboard.issue.noneTitle')
      issueBody = t('dashboard.issue.noneBody')
      issueCta = t('dashboard.entry.issue.cta.replay')
      issueTone = 'border-slate-200 bg-white text-slate-900'
      handleIssueAction = () => {
        if (latestSession) {
          onOpenReplaySession(latestSession.id)
          return
        }
        onNavigate('replay')
      }
    }
  }

  const spendTitle = tokenWaste
    ? hasWasteSignals
      ? `$${formatWasteCost(tokenWaste.summary.estimatedWasteCost)}`
      : t('dashboard.spend.noneTitle')
    : t('dashboard.spend.analyzingTitle')
  const spendBody = tokenWaste
    ? hasWasteSignals
      ? fillI18nTemplate(t('dashboard.spend.wasteBody'), {
          tokens: formatDashboardNumber(tokenWaste.summary.estimatedWasteTokens, locale),
          tokensUnit: t('replay.list.tokensUnit'),
          issue: getTokenWasteIssueLabel(tokenWaste.summary.topIssue, t),
          suffix: demoDataSuffix,
        })
      : fillI18nTemplate(t('dashboard.spend.totalCostBody'), {
          cost: (cost?.totalCost ?? 0).toFixed(2),
        })
    : t('dashboard.spend.analyzingBody')

  const diagnosticsTitle = highlightDiagnostics
    ? fillI18nTemplate(t('dashboard.diagnostics.pendingTitle'), {
        count: diagnosticCountLabel,
      })
    : diagnosticsDismissed && diagnosticSessions.length > 0
      ? t('dashboard.diagnostics.dismissedTitle')
      : t('dashboard.diagnostics.emptyTitle')
  const diagnosticsBody = highlightDiagnostics
    ? t('dashboard.diagnostics.pendingBody')
    : diagnosticsDismissed && diagnosticSessions.length > 0
      ? t('dashboard.diagnostics.dismissedBody')
      : t('dashboard.diagnostics.emptyBody')

  const summaryCards = [
    {
      label: t('dashboard.stat.cli'),
      value: loading ? t('dashboard.status.checking') : status?.cliCommand ?? t('compat.cli.none'),
      sub: loading
        ? t('dashboard.stat.cli.sub')
        : [
            status?.running ? t('dashboard.status.running') : t('dashboard.status.offline'),
            status?.version && status.version !== 'unknown' ? `v${status.version}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || null,
      icon: status?.running ? Wifi : WifiOff,
      numValue: null as number | null,
      numPrefix: undefined as string | undefined,
      numDecimals: undefined as number | undefined,
      tone: 'text-slate-900',
      iconTone: status?.running ? 'text-emerald-500' : 'text-slate-400',
    },
    {
      label: t('dashboard.stat.monthCost'),
      value: `$${(cost?.totalCost ?? 0).toFixed(2)}`,
      sub: cost ? `${formatDashboardNumber(cost.totalTokens, locale)} ${t('replay.list.tokensUnit')}` : null,
      icon: DollarSign,
      numValue: cost?.totalCost ?? 0,
      numPrefix: '$',
      numDecimals: 2,
      tone: 'text-[#3b82c4]',
      iconTone: 'text-[#3b82c4]',
    },
    {
      label: t('dashboard.stat.sessionsLabel'),
      value: loading ? t('dashboard.status.checking') : String(hasConnectedSessions ? parsableCount : 0),
      sub: loading
        ? null
        : hasConnectedSessions
          ? t('dashboard.stat.sessions.realSub')
          : hasJsonlButUnparsed
            ? t('dashboard.stat.sessions.processingSub')
            : t('dashboard.stat.sessions.demoSub'),
      icon: Activity,
      numValue: hasConnectedSessions ? parsableCount : 0,
      numPrefix: undefined as string | undefined,
      numDecimals: 0,
      tone: 'text-slate-900',
      iconTone: 'text-slate-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="animate-fade-in space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3b82c4]">
          {t('dashboard.entry.eyebrow')}
        </p>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('dashboard.entry.title')}</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{t(decisionBodyKey)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
            <Play className="h-3.5 w-3.5 text-[#3b82c4]" />
            {t('dashboard.entry.chain.replay')}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
            <Trophy className="h-3.5 w-3.5 text-[#3b82c4]" />
            {t('dashboard.entry.chain.benchmark')}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
            <DollarSign className="h-3.5 w-3.5 text-[#3b82c4]" />
            {t('dashboard.entry.chain.cost')}
          </span>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <button
            type="button"
            onClick={() => {
              if (latestSession) {
                onOpenReplaySession(latestSession.id)
                return
              }
              onNavigate('replay')
            }}
            className="rounded-3xl border border-[#3b82c4]/15 bg-gradient-to-br from-white via-blue-50/80 to-cyan-50/70 p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#3b82c4]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
          >
            <div className="flex h-full flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3b82c4]/10 text-[#3b82c4]">
                    <Play className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3b82c4]">
                        {t('dashboard.entry.latest')}
                      </p>
                      
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {status?.running ? t('dashboard.status.running') : t('dashboard.status.offline')}
                    </p>
                  </div>
                </div>

                {sessionsLoading ? (
                  <div className="space-y-3">
                    <div className="skeleton h-8 w-2/3 rounded-xl" />
                    <div className="skeleton h-4 w-full rounded-lg" />
                    <div className="skeleton h-4 w-4/5 rounded-lg" />
                    <div className="flex gap-2 pt-2">
                      <div className="skeleton h-8 w-24 rounded-full" />
                      <div className="skeleton h-8 w-20 rounded-full" />
                      <div className="skeleton h-8 w-24 rounded-full" />
                    </div>
                  </div>
                ) : latestSession ? (
      <div className="space-y-3">

                    <div>
                      <h3 className="text-2xl font-semibold leading-tight text-slate-900">
                        {sessionListTitle(latestSession, t)}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {latestSessionSubtitle ?? (latestSession.summary?.trim() || t('dashboard.entry.latest.fallbackSummary'))}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-white/90 px-3 py-1">{latestSession.agentName}</span>
                      <span className="rounded-full bg-white/90 px-3 py-1">{formatDuration(latestSession.durationMs, locale)}</span>
                      <span className="rounded-full bg-white/90 px-3 py-1">{formatRelativeTime(latestSession.startTime, locale)}</span>
                      <span className="rounded-full bg-white/90 px-3 py-1">{latestSession.stepCount} {t('replay.list.steps')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold leading-tight text-slate-900">
                      {t('dashboard.entry.latest.emptyTitle')}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">{t('dashboard.entry.latest.emptyBody')}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 text-sm font-medium text-[#3b82c4]">
                <span>{t('dashboard.entry.latest.cta')}</span>
                <div className="flex items-center gap-2">
                  {latestSession ? (
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-mono text-slate-600">
                      ${latestSession.totalCost.toFixed(3)}
                    </span>
                  ) : null}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </button>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onNavigate('benchmark')}
              className={cn(
                'rounded-3xl border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
                benchmarkTone,
              )}
            >
              <div className="flex h-full flex-col justify-between gap-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Trophy className="h-4 w-4" />
                    <span>{t('dashboard.entry.benchmark')}</span>
                    
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold leading-tight">{benchmarkTitle}</h3>
                    <p className="text-sm leading-relaxed text-current/80">{benchmarkBody}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm font-medium text-current">
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    {benchmarkLatest ? (
                      <span className="rounded-full bg-white/75 px-3 py-1 text-current/85">
                        {benchmarkLatest.overallScore}{t('benchmark.scoreUnit')}
                      </span>
                    ) : null}
                    {benchmarkDeltas && !isSampleBenchmarkProof ? (
                      <span className="rounded-full bg-white/75 px-3 py-1 text-current/85">
                        {t('benchmark.proof.score')} {formatSignedDashboardInteger(benchmarkDeltas.score)}{t('benchmark.scoreUnit')}
                      </span>
                    ) : null}
                    {benchmarkDeltas && !isSampleBenchmarkProof ? (
                      <span className="rounded-full bg-white/75 px-3 py-1 text-current/85">
                        {t('benchmark.proof.cost')} {formatSignedDashboardCurrency(benchmarkDeltas.cost)}
                      </span>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1">
                    {t('dashboard.entry.benchmark.cta')}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('cost')}
              className="rounded-3xl border border-[#3b82c4]/15 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#3b82c4]/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
            >
              <div className="flex h-full flex-col justify-between gap-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#3b82c4]">
                    <DollarSign className="h-4 w-4" />
                    <span>{t('dashboard.entry.spend')}</span>
                    
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold leading-tight text-slate-900">{spendTitle}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{spendBody}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-[#3b82c4]">
                  {t('dashboard.entry.spend.cta')}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleIssueAction}
              className={cn(
                'rounded-3xl border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
                issueTone,
              )}
            >
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{t('dashboard.entry.issue')}</span>
                  </div>
                  <h3 className="text-base font-semibold leading-tight">{issueTitle}</h3>
                  <p className="text-sm leading-relaxed text-current/80">{issueBody}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-current">
                  {issueCta}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <section className="card p-5 animate-fade-in">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-cyan-500" />
          <h3 className="text-sm font-semibold text-slate-500">{t('dashboard.keywords')}</h3>
        </div>
        <div className="mt-3">
          {kwLoading ? (
            <div className="space-y-2.5">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-7 w-full" />
              <div className="skeleton h-5 w-1/2" />
            </div>
          ) : keywords.length > 0 ? (
            <WordCloud keywords={keywords} onWordClick={onKnowledgeSearch} height={140} />
          ) : (
            <p className="py-6 text-center text-xs text-slate-600">{t('dashboard.keywords.empty')}</p>
          )}
        </div>
      </section>

      <section className="card p-5 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3b82c4]">
              {t('dashboard.replay.entryTitle')}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{t('dashboard.recent')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('dashboard.replay.entryBody')}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('replay')}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-[#3b82c4]/30 hover:text-[#3b82c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
          >
            {t('dashboard.recent.all')}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-4">
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(item => <div key={item} className="skeleton h-20 w-full rounded-2xl" />)}
            </div>
          ) : sessions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              {t('dashboard.recent.empty')}
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 5).map(session => {
                const subtitle = sessionMetaSubtitle(session, locale)

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onOpenReplaySession(session.id)}
                    className="group w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#3b82c4]/30 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-[#3b82c4]">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 transition-colors group-hover:text-[#3b82c4]">
                          {sessionListTitle(session, t)}
                        </p>
                        {subtitle ? (
                          <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span>{session.agentName}</span>
                          <span>·</span>
                          <span>{formatDuration(session.durationMs, locale)}</span>
                          <span>·</span>
                          <span>{formatRelativeTime(session.startTime, locale)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-3 pl-2">
                        <span className="text-xs font-mono text-slate-500">${session.totalCost.toFixed(3)}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#3b82c4]">
                          {t('dashboard.replay.open')}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 animate-fade-in">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{t('dashboard.summary.title')}</p>
          <p className="mt-1 text-sm text-slate-600">{t('dashboard.summary.subtitle')}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {summaryCards.map(card => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</span>
                <card.icon className={cn('h-4 w-4', card.iconTone)} />
              </div>
              <div className={cn('mt-3 text-2xl font-semibold tracking-tight', card.tone)}>
                {!loading && card.numValue != null
                  ? <AnimatedCounter value={card.numValue} prefix={card.numPrefix} decimals={card.numDecimals} duration={800} />
                  : card.value}
              </div>
              {card.sub ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{card.sub}</p> : null}
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between xl:flex-col xl:items-start">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {t('dashboard.connection.label')}
                </p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">
                  {hasConnectedSessions ? t('dashboard.connection.connected') : connectionTitle}
                </h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {hasConnectedSessions ? t('dashboard.connection.connectedHint') : connectionBody}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                  hasConnectedSessions
                    ? 'bg-emerald-500/10 text-emerald-700'
                    : hasJsonlButUnparsed
                      ? 'bg-amber-500/10 text-amber-700'
                      : 'bg-blue-500/10 text-[#3b82c4]',
                )}
              >
                {connectionBadgeText}
              </span>
            </div>
          </div>

          <div
            className={cn(
              'rounded-3xl border p-5 shadow-sm',
              highlightDiagnostics ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200 bg-white',
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between xl:flex-col xl:items-start">
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn('mt-0.5 h-4 w-4 shrink-0', highlightDiagnostics ? 'text-amber-700' : 'text-slate-400')} />
                <div>
                  <p className={cn('text-[11px] font-semibold uppercase tracking-[0.24em]', highlightDiagnostics ? 'text-amber-700/80' : 'text-slate-500')}>
                    {t('dashboard.diagnostics.section')}
                  </p>
                  <h4 className={cn('mt-2 text-base font-semibold', highlightDiagnostics ? 'text-amber-900' : 'text-slate-900')}>
                    {diagnosticsTitle}
                  </h4>
                  <p className={cn('mt-1 text-sm leading-relaxed', highlightDiagnostics ? 'text-amber-800/80' : 'text-slate-600')}>
                    {diagnosticsBody}
                  </p>
                </div>
              </div>

              {highlightDiagnostics ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDiagnosticsOpen(open => !open)}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-400/20 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                  >
                    {diagnosticsOpen ? t('dashboard.diagnostics.toggle.hide') : t('dashboard.diagnostics.toggle.show')}
                    {diagnosticsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiagnosticsOpen(false)
                      setDiagnosticsDismissed(true)
                      writeDashboardDiagnosticsDismissed(true)
                    }}
                    className="rounded-lg p-1 text-amber-700/80 transition-colors hover:bg-amber-400/10 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                    aria-label={t('dashboard.diagnostics.dismissAria')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>

            {highlightDiagnostics && diagnosticsOpen ? (
              <div className="mt-4 space-y-2 border-t border-amber-400/20 pt-4">
                {diagnosticSessions.map(session => (
                  <div key={session.id} className="rounded-2xl border border-amber-400/20 bg-white/60 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium text-amber-900">{session.agentName}</span>
                      <span className="text-[11px] text-amber-800/70">
                        {fillI18nTemplate(t('dashboard.diagnostics.metrics'), {
                          total: formatDashboardNumber(session.totalLines, locale),
                          parsed: formatDashboardNumber(session.parsedLines, locale),
                          skipped: formatDashboardNumber(session.skippedLines, locale),
                        })}
                      </span>
                    </div>
                    <p className="mt-1 break-all font-mono text-[11px] text-amber-800/60">{session.id}</p>
                    {session.errorSamples?.length ? (
                      <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-amber-800/80">
                        {session.errorSamples.map(sample => (
                          <li key={`${session.id}-${sample}`} className="break-words">
                            • {sample}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {fetchError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
            {t('dashboard.error.backend')}
          </div>
        ) : null}
      </section>

    </div>
  )
}
