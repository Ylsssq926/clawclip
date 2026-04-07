import { Activity, AlertTriangle, Bot, ChevronDown, ChevronUp, Clock, Cloud, DollarSign, Puzzle, Sparkles, Wifi, WifiOff, X, ArrowRight } from 'lucide-react'
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

type DataRootHealth = 'healthy' | 'warning' | 'empty'

function getDataRootHealth(root: LobsterDataRootStatus): DataRootHealth {
  if (root.sessionJsonlFiles > 0 && root.hasConfig) return 'healthy'
  if (root.sessionJsonlFiles === 0 && !root.hasConfig) return 'empty'
  return 'warning'
}

function sessionListTitle(s: SessionMeta, locale: Locale): string {
  const fromStore = s.sessionLabel?.trim()
  const fromTranscript = s.summary?.trim()
  const t = (fromStore || fromTranscript || '').slice(0, 80)
  if (t) return t
  return locale === 'en' ? 'Session' : '会话'
}

function formatFreshnessTime(value: string | undefined, locale: Locale): string {
  if (!value) return '--'
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return '--'

  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(timestamp)
}

interface Props {
  onNavigate: (tab: Tab) => void
  onKnowledgeSearch: (query: string) => void
}

export default function Dashboard({ onNavigate, onKnowledgeSearch }: Props) {
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
  const [dataGuideOpen, setDataGuideOpen] = useState(false)

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
  const dataRoots = status?.dataRoots ?? []
  const isEnglish = locale === 'en'
  const connectionSummary = status?.hasRealSessionData
    ? (isEnglish ? '✅ Connected to real session data' : '✅ 已接入真实会话数据')
    : hasJsonlButUnparsed
      ? (isEnglish ? '⚠️ JSONL files found, but none are parsable yet' : '⚠️ 已发现 JSONL，但暂时无法解析为可展示会话')
      : (isEnglish ? '📋 Currently showing demo data' : '📋 当前展示的是演示数据')
  const latestSessionLabel = formatFreshnessTime(status?.latestRealSessionAt ?? status?.latestSessionAt, locale)
  const statusCheckedLabel = formatFreshnessTime(status?.lastStatusCheckedAt, locale)
  const tokenWasteSummaryText = tokenWaste
    ? `${locale === 'en' ? 'Estimated waste' : '预计浪费'} $${formatWasteCost(tokenWaste.summary.estimatedWasteCost)} / ${tokenWaste.summary.estimatedWasteTokens.toLocaleString()} tokens`
    : (locale === 'en' ? 'Analyzing last 30 days…' : '正在分析最近 30 天…')
  const tokenWasteSubText = tokenWaste
    ? tokenWaste.summary.signals > 0
      ? `${locale === 'en' ? 'Top issue:' : '最主要问题：'} ${getTokenWasteIssueLabel(tokenWaste.summary.topIssue, locale)}${tokenWaste.summary.usingDemo ? (locale === 'en' ? ' · Demo data' : ' · Demo 数据') : ''}`
      : `${locale === 'en' ? 'No major waste signals detected' : '暂未发现明显浪费信号'}${tokenWaste.summary.usingDemo ? (locale === 'en' ? ' · Demo data' : ' · Demo 数据') : ''}`
    : (locale === 'en' ? 'Scanning retry loops, prompt overhead, and model waste' : '正在扫描重试循环、Prompt 冗余和模型浪费')

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
      label: t('dashboard.stat.skillsLabel'),
      value: String(status?.skillCount ?? 0),
      numValue: status?.skillCount ?? 0,
      sub: t('dashboard.stat.skillsSub'),
      icon: Puzzle,
      variant: 'card-blue',
      color: 'text-blue-400',
      iconColor: 'text-blue-400',
    },
    {
      label: t('dashboard.stat.sessionsLabel'),
      value:
        loading
          ? t('dashboard.status.checking')
          : jsonlTotal > 0
            ? `${parsableCount} / ${jsonlTotal}`
            : String(jsonlTotal),
      sub: loading
        ? null
        : status?.hasRealSessionData
          ? t('compat.data.real')
          : hasJsonlButUnparsed
            ? locale === 'en'
              ? 'Parsable sessions / JSONL files on disk'
              : '可解析会话数 / 磁盘上的 jsonl 文件数'
            : t('compat.data.demo'),
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
          {status?.running
            ? t('dashboard.hero.running').replace('{skills}', String(status.skillCount))
            : t('dashboard.hero.offline')}
        </p>
      </div>

      {!loading && status && (
        <div className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm animate-fade-in">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {isEnglish ? 'Data connection status' : '数据接入状态'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    status.hasRealSessionData
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : hasJsonlButUnparsed
                        ? 'bg-amber-500/10 text-amber-700'
                        : 'bg-blue-500/10 text-[#3b82c4]',
                  )}
                >
                  {connectionSummary}
                </span>
                <span className="text-xs text-slate-500">
                  {isEnglish ? 'Parsable sessions / JSONL files:' : '可解析会话 / JSONL 文件：'}
                  <span className="ml-1 font-mono text-slate-700">
                    {jsonlTotal > 0 ? `${parsableCount} / ${jsonlTotal}` : jsonlTotal}
                  </span>
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div>{isEnglish ? 'Scanned data roots' : '已扫描数据根'}</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{dataRoots.length}</div>
            </div>
          </div>

          {(status.sessionDataHintZh || status.sessionDataHintEn) && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              {isEnglish
                ? status.sessionDataHintEn ?? status.sessionDataHintZh
                : status.sessionDataHintZh ?? status.sessionDataHintEn}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {dataRoots.length > 0 ? (
              dataRoots.map(root => {
                const health = getDataRootHealth(root)
                const healthMeta =
                  health === 'healthy'
                    ? {
                        icon: '✅',
                        label: isEnglish ? 'Healthy' : '正常',
                        tone: 'border-emerald-200 bg-emerald-50',
                        text: 'text-emerald-700',
                      }
                    : health === 'warning'
                      ? {
                          icon: '⚠️',
                          label: isEnglish ? 'Needs attention' : '有问题',
                          tone: 'border-amber-200 bg-amber-50',
                          text: 'text-amber-700',
                        }
                      : {
                          icon: '❌',
                          label: isEnglish ? 'No data' : '无数据',
                          tone: 'border-slate-200 bg-slate-50',
                          text: 'text-slate-600',
                        }

                return (
                  <div key={root.id} className={cn('rounded-xl border p-4', healthMeta.tone)}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base">{healthMeta.icon}</span>
                          <span className="text-sm font-semibold text-slate-900">{root.label}</span>
                          <span className={cn('text-xs font-medium', healthMeta.text)}>{healthMeta.label}</span>
                        </div>
                        <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-slate-600">
                          <li>
                            {isEnglish ? 'Path:' : '路径：'}
                            <span className="ml-1 break-all font-mono text-[11px] text-slate-700">{root.homeDir}</span>
                          </li>
                          <li>
                            {isEnglish ? 'JSONL files:' : 'JSONL 文件数：'}
                            <span className="ml-1 font-medium text-slate-900">{root.sessionJsonlFiles}</span>
                          </li>
                          <li>
                            {isEnglish ? 'Config file:' : '配置文件：'}
                            <span className="ml-1 font-medium text-slate-900">
                              {root.hasConfig ? (isEnglish ? 'Detected' : '已发现') : (isEnglish ? 'Missing' : '未发现')}
                            </span>
                          </li>
                        </ul>
                      </div>
                      <div className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-right text-xs text-slate-500 sm:min-w-[110px]">
                        <div>{isEnglish ? 'Config status' : '配置状态'}</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {root.hasConfig ? (isEnglish ? 'Ready' : '就绪') : (isEnglish ? 'Missing' : '缺失')}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                {isEnglish ? 'No data roots were detected yet.' : '暂未扫描到可用的数据根。'}
              </div>
            )}
          </div>

          {(status.ecosystemNotes?.length ?? 0) > 0 && (
            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {isEnglish ? 'Ecosystem notes' : '生态提示'}
              </p>
              {status.ecosystemNotes!.map((note, index) => (
                <div
                  key={`${note.rootId ?? 'note'}-${index}`}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-xs leading-relaxed',
                    note.severity === 'warn'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-blue-200 bg-blue-50 text-[#3b82c4]',
                  )}
                >
                  <span className="mr-2">{note.severity === 'warn' ? '⚠️' : 'ℹ️'}</span>
                  {isEnglish ? note.messageEn : note.messageZh}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setDataGuideOpen(open => !open)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
            >
              <span>{isEnglish ? 'How to connect real data' : '如何接入真实数据'}</span>
              {dataGuideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {dataGuideOpen && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                <ol className="space-y-2 list-decimal pl-5 leading-relaxed">
                  <li>{isEnglish ? 'Install OpenClaw / ZeroClaw and run a few tasks.' : '安装 OpenClaw / ZeroClaw 并运行几个任务。'}</li>
                  <li>{isEnglish ? 'Session logs are usually saved under ~/.openclaw/ or ~/.zeroclaw/.' : '会话日志通常会自动保存到 ~/.openclaw/ 或 ~/.zeroclaw/。'}</li>
                  <li>{isEnglish ? 'Restart ClawClip and the real data will appear automatically.' : '重启虾片后即可自动看到真实数据。'}</li>
                </ol>
                <p className="mt-3 text-xs text-slate-500">
                  {isEnglish ? 'Custom data directory:' : '自定义数据目录：'}
                  <span className="ml-1 font-mono text-slate-700">CLAWCLIP_LOBSTER_DIRS</span>
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-500">
            <p>{isEnglish ? 'Latest session:' : '最近会话：'} <span className="font-medium text-slate-700">{latestSessionLabel}</span></p>
            <p>{isEnglish ? 'Status checked:' : '状态检查：'} <span className="font-medium text-slate-700">{statusCheckedLabel}</span></p>
          </div>
        </div>
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
                    ? `${diagnosticSessions.length} sessions have parsing issues`
                    : `${diagnosticSessions.length} 个会话存在解析问题`}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700/70">
                  {locale === 'en'
                    ? `Parsable sessions: ${diagnostics?.parsableCount ?? 0} / JSONL files: ${diagnostics?.totalJsonlFiles ?? 0}`
                    : `可解析会话：${diagnostics?.parsableCount ?? 0} / JSONL 文件：${diagnostics?.totalJsonlFiles ?? 0}`}
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
              {locale === 'en' ? '🔥 Token Waste' : '🔥 Token 浪费'}
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">{tokenWasteSummaryText}</p>
            <p className="mt-1 text-sm text-slate-600">{tokenWasteSubText}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#3b82c4]">
            {locale === 'en' ? 'Open cost diagnostics' : '查看成本诊断'}
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </button>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t('dashboard.quick')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              tab: 'replay' as const,
              icon: '🎬',
              title: t('replay.title'),
              desc: t('replay.subtitle'),
              color: 'card-blue',
              textColor: 'text-blue-400',
            },
            {
              tab: 'cost' as const,
              icon: '📊',
              title: t('cost.title'),
              desc: t('cost.empty.desc'),
              color: 'card-blue',
              textColor: 'text-blue-400',
            },
            {
              tab: 'benchmark' as const,
              icon: '🏆',
              title: t('nav.benchmark'),
              desc: t('benchmark.subtitle'),
              color: 'card-purple',
              textColor: 'text-violet-400',
            },
          ].map((item, i) => (
            <button
              key={item.tab}
              onClick={() => onNavigate(item.tab)}
              className={`${item.color} p-6 text-left group transition-transform duration-200 hover:scale-[1.02] animate-fade-in`}
              style={{ animationDelay: `${200 + i * 80}ms` }}
            >
              <span className="text-3xl block mb-3">{item.icon}</span>
              <h4 className="font-semibold text-slate-900 mb-1">{item.title}</h4>
              <p className="text-xs text-slate-500 mb-3">{item.desc}</p>
              <span className={`${item.textColor} text-xs font-medium flex items-center gap-1 group-hover:gap-2 transition-all`}>
                {t('dashboard.quick.open')} <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Secondary quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '300ms' }}>
        {([
          { tab: 'knowledge' as const, icon: '📚', title: t('nav.knowledge') },
          { tab: 'leaderboard' as const, icon: '🥇', title: t('nav.leaderboard') },
          { tab: 'templates' as const, icon: '📦', title: t('nav.templates') },
          { tab: 'skills' as const, icon: '🧩', title: t('nav.skills') },
        ] as const).map((item) => (
          <button
            key={item.tab}
            onClick={() => onNavigate(item.tab)}
            className="card p-4 text-left group hover:bg-slate-100 transition-colors flex items-center gap-3"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm text-slate-500 group-hover:text-slate-900 transition-colors">{item.title}</span>
            <ArrowRight className="w-3 h-3 text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>

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
                  onClick={() => onNavigate('replay')}
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
