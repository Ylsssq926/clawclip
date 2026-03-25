import { Activity, DollarSign, Puzzle, Wifi, WifiOff, ArrowRight, Sparkles, Cloud, Clock, Bot } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Tab } from '../App'
import WordCloud, { type KeywordItem } from '../components/WordCloud'
import { useI18n, type Locale } from '../lib/i18n'
import { formatDuration, formatRelativeTime, sessionMetaSubtitle } from '../lib/formatSession'
import { cn } from '../lib/cn'
import type { SessionMeta } from '../types/session'
import { apiGetSafe } from '../lib/api'

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
  hasRealSessionData?: boolean
  ecosystemNotes?: EcosystemNote[]
}

interface CostSummary {
  totalCost: number
  totalTokens: number
  trend: 'up' | 'down' | 'stable'
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
}

export default function Dashboard({ onNavigate }: Props) {
  const { t, locale } = useI18n()
  const [status, setStatus] = useState<StatusData | null>(null)
  const [cost, setCost] = useState<CostSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [keywords, setKeywords] = useState<KeywordItem[]>([])
  const [kwLoading, setKwLoading] = useState(true)
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)

  useEffect(() => {
    Promise.all([apiGetSafe('/api/status'), apiGetSafe('/api/cost/summary?days=30')])
      .then(([s, c]) => {
        setStatus(s as StatusData | null); setCost(c as CostSummary | null)
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
      sub: cost ? `${cost.totalTokens.toLocaleString()} ${t('replay.list.tokensUnit')}` : null,
      icon: DollarSign,
      variant: 'card-cyan',
      color: 'text-cyan-400',
      iconColor: 'text-cyan-400',
    },
    {
      label: t('dashboard.stat.skillsLabel'),
      value: String(status?.skillCount ?? 0),
      sub: t('dashboard.stat.skillsSub'),
      icon: Puzzle,
      variant: 'card-blue',
      color: 'text-blue-400',
      iconColor: 'text-blue-400',
    },
    {
      label: t('dashboard.stat.sessionsLabel'),
      value: String(status?.totalSessionFiles ?? 0),
      sub: status?.hasRealSessionData ? t('compat.data.real') : t('compat.data.demo'),
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
          <span className="text-white">{t('dashboard.greeting.suffix')}</span>
        </h2>
        <p className="text-slate-500 mt-2 text-sm">
          {status?.running
            ? t('dashboard.hero.running').replace('{skills}', String(status.skillCount))
            : t('dashboard.hero.offline')}
        </p>
      </div>

      {!loading && status && !status.hasRealSessionData && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90 animate-fade-in">
          {t('demo.hint.dashboard')}
        </div>
      )}

      {!loading && status && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm animate-fade-in',
            status.hasRealSessionData
              ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
              : 'border-amber-500/25 bg-amber-500/[0.06]',
          )}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
            <span className={status.hasRealSessionData ? 'text-emerald-300/90' : 'text-amber-200/90'}>
              {status.hasRealSessionData ? t('compat.data.real') : t('compat.data.demo')}
            </span>
            <span className="text-xs text-slate-500">
              {t('compat.sessions')}: <span className="text-slate-400 font-mono">{status.totalSessionFiles ?? 0}</span>
            </span>
          </div>
          {(status.dataRoots?.length ?? 0) > 0 && (
            <div className="mt-2 pt-2 border-t border-white/[0.06]">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">{t('compat.roots')}</p>
              <div className="flex flex-wrap gap-2">
                {status.dataRoots!.map(r => (
                  <span
                    key={r.id}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                    title={r.homeDir}
                  >
                    <span className="text-slate-300">{r.label}</span>
                    <span className="text-slate-600 mx-1">·</span>
                    {r.sessionJsonlFiles} jsonl
                    {r.hasConfig ? <span className="text-emerald-500/80 ml-1">●</span> : <span className="text-slate-600 ml-1">○</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(status.ecosystemNotes?.length ?? 0) > 0 && (
            <div className="mt-2 pt-2 border-t border-white/[0.06]">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">
                {t('compat.ecosystem')}
              </p>
              <ul className="space-y-1.5 text-[11px] text-slate-500 leading-snug">
                {status.ecosystemNotes!.map((n, i) => (
                  <li
                    key={`${n.rootId ?? 'note'}-${i}`}
                    className={n.severity === 'warn' ? 'text-amber-200/85' : undefined}
                  >
                    {locale === 'en' || locale === 'de' || locale === 'fr' || locale === 'es' ? n.messageEn : n.messageZh}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {fetchError && (
        <div className="text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/10 rounded-lg px-4 py-2 animate-fade-in">
          {locale === 'en' ? 'Could not connect to backend — stats may be stale or unavailable.' : '无法连接后端服务，统计数据可能不可用。'}
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
            <div className={`text-2xl font-bold ${c.color} tracking-tight`}>{c.value}</div>
            {c.sub && <p className="text-xs text-slate-600 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{t('dashboard.quick')}</h3>
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
              <h4 className="font-semibold text-white mb-1">{item.title}</h4>
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
            className="card p-4 text-left group hover:bg-white/[0.04] transition-colors flex items-center gap-3"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{item.title}</span>
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
            <h4 className="text-sm font-semibold text-slate-400">{t('dashboard.keywords')}</h4>
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
            <p className="text-xs text-slate-600 py-8 text-center">{t('dashboard.keywords.empty')}</p>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="lg:col-span-3 card p-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-slate-400">{t('dashboard.recent')}</h4>
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
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate group-hover:text-white transition-colors">
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
