import { Activity, AlertTriangle, Bot, ChevronDown, ChevronUp, Clock, Cloud, DollarSign, Wifi, WifiOff, X, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Tab } from '../App'
import WordCloud, { type KeywordItem } from '../components/WordCloud'
import { useI18n, type Locale } from '../lib/i18n'
import { formatDuration, formatRelativeTime, sessionMetaSubtitle } from '../lib/formatSession'
import { cn } from '../lib/cn'
import type { SessionMeta } from '../types/session'
import { apiGetSafe } from '../lib/api'
import AnimatedCounter from '../components/ui/AnimatedCounter'

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

function formatWasteCost(value: number): string {
  if (value >= 1) return value.toFixed(2)
  if (value >= 0.1) return value.toFixed(3)
  return value.toFixed(4)
}

function getTokenWasteIssueLabel(issue: TokenWasteIssueType | undefined, locale: Locale): string {
  switch (issue) {
    case 'retry-loop':
      return locale === 'en' ? 'Tool retry loop' : '工具重试循环'
    case 'long-prompt':
      return locale === 'en' ? 'Long prompt, weak payoff' : '长 Prompt 低产出'
    case 'verbose-output':
      return locale === 'en' ? 'Overly verbose output' : '输出明显过长'
    case 'expensive-model':
      return locale === 'en' ? 'Premium model on a light task' : '高价模型用在轻任务'
    case 'context-bloat':
      return locale === 'en' ? 'Context bloat' : '上下文膨胀'
    default:
      return locale === 'en' ? 'No major issue yet' : '暂未发现明显问题'
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

function sessionListTitle(s: SessionMeta, locale: Locale): string {
  const fromStore = s.sessionLabel?.trim()
  const fromTranscript = s.summary?.trim()
  const t = (fromStore || fromTranscript || '').slice(0, 80)
  if (t) return t
  return locale === 'en' ? 'Session' : '会话'
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
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [keywords, setKeywords] = useState<KeywordItem[]>([])
  const [kwLoading, setKwLoading] = useState(true)
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [diagnostics, setDiagnostics] = useState<ReplayDiagnosticsData | null>(null)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [diagnosticsDismissed, setDiagnosticsDismissed] = useState(false)

  useEffect(() => {
    Promise.all([apiGetSafe('/api/status'), apiGetSafe('/api/cost/summary?days=30')])
      .then(([s, c]) => {
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
      .then(d => setKeywords(Array.isArray(d?.keywords) ? d.keywords : []))
      .finally(() => setKwLoading(false))
  }, [])

  useEffect(() => {
    apiGetSafe<SessionMeta[]>('/api/replay/sessions?limit=5')
      .then(d => setSessions(Array.isArray(d) ? d : []))
      .finally(() => setSessionsLoading(false))
  }, [])

  useEffect(() => {
    apiGetSafe<TokenWasteReport>('/api/analytics/token-waste?days=30')
      .then(d => {
        if (!d?.summary) {
          setTokenWaste(null)
          return
        }
        setTokenWaste(d)
      })
  }, [])

  useEffect(() => {
    apiGetSafe<ReplayDiagnosticsData>('/api/replay/diagnostics')
      .then(d => {
        if (!d || !Array.isArray(d.sessions)) {
          setDiagnostics(null)
          return
        }
        setDiagnostics(d)
      })
  }, [])

  const jsonlTotal = status?.totalSessionFiles ?? 0
  const parsableCount = status?.parsableSessionCount ?? 0
  /** 磁盘有 .jsonl 但解析不出步骤（与「无日志仅用 Demo」区分） */
  const hasJsonlButUnparsed =
    Boolean(status) && jsonlTotal > 0 && parsableCount === 0 && !status?.hasRealSessionData
  const diagnosticSessions = diagnostics?.sessions ?? []
  const showDiagnosticsBanner = !diagnosticsDismissed && diagnosticSessions.length > 0
  const isEnglish = locale === 'en'
  const hasConnectedSessions = Boolean(status?.hasRealSessionData)
  const sessionCountLabel = parsableCount.toLocaleString(isEnglish ? 'en-US' : 'zh-CN')
  const connectionBadgeText = hasConnectedSessions
    ? `${t('dashboard.connection.connected')} · ${sessionCountLabel} ${isEnglish ? `session${parsableCount === 1 ? '' : 's'}` : '个会话'}`
    : hasJsonlButUnparsed
      ? t('dashboard.connection.processing')
      : t('dashboard.connection.demo')
  const connectionTitle = hasJsonlButUnparsed
    ? t('dashboard.connection.processing')
    : t('dashboard.connection.demoTitle')
  const connectionBody = hasJsonlButUnparsed
    ? t('dashboard.connection.processingHint')
    : t('dashboard.connection.demoHint')
  const tokenWasteSummaryText = tokenWaste
    ? `${locale === 'en' ? 'Money likely wasted in last 30 days:' : '最近 30 天可能白花的钱：'} $${formatWasteCost(tokenWaste.summary.estimatedWasteCost)} / ${tokenWaste.summary.estimatedWasteTokens.toLocaleString()} tokens`
    : (locale === 'en' ? 'Analyzing last 30 days…' : '正在分析最近 30 天…')
  const tokenWasteSubText = tokenWaste
    ? tokenWaste.summary.signals > 0
      ? `${locale === 'en' ? 'Worth checking first:' : '最值得先看的问题：'} ${getTokenWasteIssueLabel(tokenWaste.summary.topIssue, locale)}${tokenWaste.summary.usingDemo ? (locale === 'en' ? ' · Demo data' : ' · Demo 数据') : ''}`
      : `${locale === 'en' ? 'No obvious wasted spend found' : '暂未发现明显白花的钱'}${tokenWaste.summary.usingDemo ? (locale === 'en' ? ' · Demo data' : ' · Demo 数据') : ''}`
    : (locale === 'en' ? 'Checking retries, prompt bloat, and model mismatch' : '正在找重试循环、Prompt 冗余和模型错配')
  const tokenWasteCardValue = tokenWaste
    ? `$${formatWasteCost(tokenWaste.summary.estimatedWasteCost)}`
    : (locale === 'en' ? 'Analyzing…' : '分析中…')
  const tokenWasteCardSub = tokenWaste
    ? tokenWaste.summary.signals > 0
      ? `${tokenWaste.summary.estimatedWasteTokens.toLocaleString()} tokens · ${getTokenWasteIssueLabel(tokenWaste.summary.topIssue, locale)}${tokenWaste.summary.usingDemo ? (locale === 'en' ? ' · Demo' : ' · Demo') : ''}`
      : `${locale === 'en' ? 'No obvious wasted spend yet' : '暂未发现明显白花的钱'}${tokenWaste.summary.usingDemo ? (locale === 'en' ? ' · Demo' : ' · Demo') : ''}`
    : (locale === 'en' ? 'Spend most likely being wasted this month' : '本月最可能白花的那部分')

  const hour = new Date().getHours()
  const greetingKey =
    hour < 6
      ? 'dashboard.greeting.night'
      : hour < 12
        ? 'dashboard.greeting.morning'
        : hour < 18
          ? 'dashboard.greeting.afternoon'
          : 'dashboard.greeting.evening'

  const statCards = [
    {
      label: t('dashboard.stat.cli'),
      value: loading
        ? t('dashboard.status.checking')
        : status?.cliCommand
          ? status.cliCommand
          : t('compat.cli.none'),
      sub: loading
        ? t('dashboard.stat.cli.sub')
        : [
            status?.running ? t('dashboard.status.running') : t('dashboard.status.offline'),
            status?.version && status.version !== 'unknown' ? `v${status.version}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || null,
      icon: status?.running ? Wifi : WifiOff,
      variant: status?.running ? 'card-green' : 'card',
      color: status?.running ? 'text-emerald-400' : 'text-slate-500',
      iconColor: status?.running ? 'text-emerald-400' : 'text-slate-500',
    },
    {
      label: t('dashboard.stat.monthCost'),
      value: `$${(cost?.totalCost ?? 0).toFixed(2)}`,
      numValue: cost?.totalCost ?? 0,
      numPrefix: '$',
      numDecimals: 2,
      sub: cost ? `${cost.totalTokens.toLocaleString()} ${t('replay.list.tokensUnit')}` : null,
      icon: DollarSign,
      variant: 'card-cyan',
      color: 'text-cyan-400',
      iconColor: 'text-cyan-400',
    },
    {
      label: locale === 'en' ? 'Likely wasted spend' : '白花的钱',
      value: tokenWasteCardValue,
      sub: tokenWasteCardSub,
      icon: AlertTriangle,
      variant: 'card-blue',
      color: 'text-blue-400',
      iconColor: 'text-blue-400',
    },
    {
      label: t('dashboard.stat.sessionsLabel'),
      value: loading ? t('dashboard.status.checking') : String(hasConnectedSessions ? parsableCount : 0),
      numValue: hasConnectedSessions ? parsableCount : 0,
      sub: loading
        ? null
        : hasConnectedSessions
          ? t('dashboard.stat.sessions.realSub')
          : hasJsonlButUnparsed
            ? t('dashboard.stat.sessions.processingSub')
            : t('dashboard.stat.sessions.demoSub'),
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
          <span className="text-gradient">{t(greetingKey)}</span>
          <span className="text-slate-900">{t('dashboard.greeting.suffix')}</span>
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          {status?.running ? t('dashboard.hero.running') : t('dashboard.hero.offline')}
        </p>
      </div>

      {!loading && status && (
        hasConnectedSessions ? (
          <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm animate-fade-in">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-900">{t('dashboard.connection.label')}</p>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
                  {connectionBadgeText}
                </span>
              </div>
              <p className="text-sm text-slate-500">{t('dashboard.connection.connectedHint')}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {t('dashboard.connection.label')}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{connectionTitle}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{connectionBody}</p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                  hasJsonlButUnparsed ? 'bg-amber-500/10 text-amber-700' : 'bg-blue-500/10 text-[#3b82c4]',
                )}
              >
                {connectionBadgeText}
              </span>
            </div>
          </div>
        )
      )}

      {fetchError && (
        <div className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/10 rounded-lg px-4 py-2 animate-fade-in">
          {t('dashboard.error.backend')}
        </div>
      )}

      {showDiagnosticsBanner && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 text-sm animate-fade-in">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="font-medium text-amber-700">
                  {locale === 'en'
                    ? `${diagnosticSessions.length} sessions are not ready to show yet`
                    : `${diagnosticSessions.length} 个会话暂时还不能完整展示`}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700/70">
                  {locale === 'en'
                    ? 'ClawClip found the runs, and they will appear in Replay automatically after cleanup.'
                    : '虾片已经发现这些运行，整理完成后会自动出现在运行洞察里。'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDiagnosticsOpen(open => !open)}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-400/20 px-2.5 py-1 text-xs text-amber-700 transition-colors hover:bg-amber-400/10"
              >
                {diagnosticsOpen
                  ? locale === 'en'
                    ? 'Hide details'
                    : '收起详情'
                  : locale === 'en'
                    ? 'View details'
                    : '查看详情'}
                {diagnosticsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setDiagnosticsDismissed(true)}
                className="rounded-lg p-1 text-amber-700/80 transition-colors hover:bg-amber-400/10 hover:text-amber-800"
                aria-label={locale === 'en' ? 'Dismiss diagnostics' : '关闭诊断提示'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {diagnosticsOpen && (
            <div className="mt-3 space-y-2 border-t border-amber-400/15 pt-3">
              {diagnosticSessions.map(session => (
                <div key={session.id} className="rounded-lg border border-amber-400/10 bg-black/10 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-amber-800">{session.agentName}</span>
                    <span className="text-[11px] text-amber-700/70">
                      {locale === 'en'
                        ? `total ${session.totalLines} · parsed ${session.parsedLines} · skipped ${session.skippedLines}`
                        : `总计 ${session.totalLines} · 解析 ${session.parsedLines} · 跳过 ${session.skippedLines}`}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-[11px] text-amber-700/55">{session.id}</p>
                  {session.errorSamples?.length ? (
                    <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-amber-700/80">
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
          )}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => (
          <div key={c.label} className={`${c.variant} p-5 animate-fade-in`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{c.label}</span>
              <c.icon className={`w-4 h-4 ${c.iconColor}`} />
            </div>
            <div className={`text-2xl font-bold ${c.color} tracking-tight`}>
              {!loading && c.numValue != null
                ? <AnimatedCounter value={c.numValue} prefix={c.numPrefix} decimals={c.numDecimals} duration={800} />
                : c.value}
            </div>
            {c.sub && <p className="text-xs text-slate-600 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onNavigate('cost')}
        className="w-full rounded-2xl border border-[#3b82c4]/15 bg-gradient-to-r from-[#3b82c4]/10 via-cyan-500/10 to-teal-500/10 p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#3b82c4]/30 hover:shadow-md animate-fade-in"
        style={{ animationDelay: '220ms' }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3b82c4]">
              {locale === 'en' ? 'Likely wasted spend' : '白花的钱'}
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{tokenWasteSummaryText}</p>
            <p className="mt-1 text-sm text-slate-600">{tokenWasteSubText}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#3b82c4]">
            {locale === 'en' ? 'See where to cut spend' : '看看哪里还能省'}
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </button>

      {/* Two column: Word Cloud + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Word Cloud */}
        <div className="lg:col-span-2 card p-6 animate-fade-in" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Cloud className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-slate-500">{t('dashboard.keywords')}</h4>
          </div>
          {kwLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-8 w-full" />
              <div className="skeleton h-5 w-1/2" />
              <div className="skeleton h-7 w-2/3" />
            </div>
          ) : keywords.length > 0 ? (
            <WordCloud keywords={keywords} onWordClick={onKnowledgeSearch} height={200} />
          ) : (
            <p className="text-xs text-slate-600 py-8 text-center">{t('dashboard.keywords.empty')}</p>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="lg:col-span-3 card p-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-slate-500">{t('dashboard.recent')}</h4>
            </div>
            <button onClick={() => onNavigate('replay')} className="text-xs text-slate-600 hover:text-blue-400 transition-colors">
              {t('dashboard.recent.all')}
            </button>
          </div>
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full" />)}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-slate-600 py-8 text-center">{t('dashboard.recent.empty')}</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 5).map(s => {
                const sub = sessionMetaSubtitle(s, locale)
                return (
                <button
                  key={s.id}
                  onClick={() => onOpenReplaySession(s.id)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate group-hover:text-slate-900 transition-colors">
                      {sessionListTitle(s, locale).slice(0, 50)}
                    </p>
                    {sub && (
                      <p className="text-[10px] text-slate-600 truncate mt-0.5">{sub}</p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-0.5">
                      <span>{s.agentName}</span>
                      <span>·</span>
                      <span>{formatDuration(s.durationMs, locale)}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(s.startTime, locale)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-cyan-400/80 font-mono shrink-0">${s.totalCost.toFixed(3)}</span>
                </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
