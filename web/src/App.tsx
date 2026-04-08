import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Landing from './pages/Landing'
import ErrorBoundary from './components/ErrorBoundary'
import { LayoutDashboard, Play, Trophy, DollarSign, Puzzle, Store, ArrowLeft, Database, Medal, Menu, X, Lightbulb, GitCompareArrows } from 'lucide-react'
import { cn } from './lib/cn'
import { buildAppNavigationGroups, ALL_NAV_TAB_IDS } from './lib/appNavigationGroups'
import { useI18n, LanguageSwitcher } from './lib/i18n'
import { apiGetSafe } from './lib/api'

declare const __APP_VERSION__: string
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.1.0'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Replay = lazy(() => import('./pages/Replay'))
const Benchmark = lazy(() => import('./pages/Benchmark'))
const CostMonitor = lazy(() => import('./pages/CostMonitor'))
const PromptInsight = lazy(() => import('./pages/PromptInsight'))
const Compare = lazy(() => import('./pages/Compare'))
const SkillManager = lazy(() => import('./pages/SkillManager'))
const TemplateMarket = lazy(() => import('./pages/TemplateMarket'))
const Knowledge = lazy(() => import('./pages/Knowledge'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))

export type Tab = (typeof ALL_NAV_TAB_IDS)[number]

const tabs = [
  { id: 'dashboard' as const, nameKey: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'replay' as const, nameKey: 'nav.replay', icon: Play },
  { id: 'benchmark' as const, nameKey: 'nav.benchmark', icon: Trophy },
  { id: 'cost' as const, nameKey: 'nav.cost', icon: DollarSign },
  { id: 'prompt' as const, nameKey: 'nav.prompt', icon: Lightbulb },
  { id: 'compare' as const, nameKey: 'nav.compare', icon: GitCompareArrows },
  { id: 'knowledge' as const, nameKey: 'nav.knowledge', icon: Database },
  { id: 'templates' as const, nameKey: 'nav.templates', icon: Store },
  { id: 'skills' as const, nameKey: 'nav.skills', icon: Puzzle },
  { id: 'leaderboard' as const, nameKey: 'nav.leaderboard', icon: Medal },
] as const

const navigationGroups = buildAppNavigationGroups(tabs)

const TOUR_KEYS = ['app.tour.s1', 'app.tour.s2', 'app.tour.s3', 'app.tour.s4'] as const

type DataBannerMode = 'loading' | 'demo' | 'real'

function TabFallback() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
      <div className="skeleton h-64 rounded-xl" />
    </div>
  )
}

function AppShell({ onBackToLanding, initialTab = 'replay' }: { onBackToLanding: () => void; initialTab?: Tab }) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [knowledgeInitialQuery, setKnowledgeInitialQuery] = useState('')
  const [replayInitialSessionId, setReplayInitialSessionId] = useState('')
  const [dataBannerMode, setDataBannerMode] = useState<DataBannerMode>('loading')

  useEffect(() => {
    apiGetSafe<{ hasRealSessionData?: boolean }>('/api/status')
      .then(status => {
        setDataBannerMode(status?.hasRealSessionData ? 'real' : 'demo')
      })
      .catch(() => {
        setDataBannerMode('demo')
      })
  }, [])

  const [showTour, setShowTour] = useState(() => {
    if (initialTab !== 'dashboard') {
      return false
    }

    try {
      return localStorage.getItem('clawclip-tour-done') !== '1'
    } catch {
      return false
    }
  })
  const [tourStep, setTourStep] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isDemo = dataBannerMode === 'demo'
  const showStatusBadge = dataBannerMode !== 'loading'
  const statusBadgeText = isDemo ? t('app.demo') : t('app.realData')

  const navigateTab = useCallback((tab: Tab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
    if (tab !== 'knowledge') {
      setKnowledgeInitialQuery('')
    }
    if (tab !== 'replay') {
      setReplayInitialSessionId('')
    }
  }, [])

  const openKnowledgeSearch = useCallback((query: string) => {
    setKnowledgeInitialQuery(query)
    navigateTab('knowledge')
  }, [navigateTab])

  const setReplayTargetSession = useCallback((sessionId: string) => {
    setReplayInitialSessionId(sessionId)
  }, [])

  const openReplaySession = useCallback((sessionId: string) => {
    setReplayTargetSession(sessionId)
    navigateTab('replay')
  }, [navigateTab, setReplayTargetSession])

  const clearReplayInitialSession = useCallback(() => {
    setReplayInitialSessionId('')
  }, [])

  const finishTour = useCallback(() => {
    try {
      localStorage.setItem('clawclip-tour-done', '1')
    } catch {
      /* ignore */
    }
    setShowTour(false)
  }, [])

  const onTourNext = () => {
    if (tourStep >= TOUR_KEYS.length - 1) finishTour()
    else setTourStep(s => s + 1)
  }

  useEffect(() => {
    if (!showTour) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishTour()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showTour, finishTour])

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <AnimatePresence>
        {showTour && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/22 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clawclip-tour-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.32, ease: [0.25, 0.4, 0.25, 1] }}
            className="w-full max-w-sm rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-xl shadow-slate-900/8"
          >
            <h2 id="clawclip-tour-title" className="mb-4 text-base font-semibold text-slate-900">
              {t('app.tour.title')}
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex flex-1 items-center gap-1.5 min-w-0"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={TOUR_KEYS.length}
                aria-valuenow={tourStep + 1}
                aria-label="Tour progress"
              >
                {TOUR_KEYS.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-200',
                      i < tourStep && 'bg-slate-300',
                      i === tourStep && 'bg-slate-500',
                      i > tourStep && 'bg-slate-200',
                    )}
                  />
                ))}
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-slate-400" aria-live="polite">
                {tourStep + 1}/{TOUR_KEYS.length}
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={tourStep}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.22, ease: [0.25, 0.4, 0.25, 1] }}
                className="mb-5 min-h-[4.25rem] text-[13px] leading-relaxed text-slate-500"
              >
                {t(TOUR_KEYS[tourStep])}
              </motion.p>
            </AnimatePresence>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={finishTour}
                className="-ml-1 rounded-lg px-1 py-0.5 text-[11px] text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {t('app.tour.skip')}
              </button>
              <button
                type="button"
                onClick={onTourNext}
                className="rounded-lg border border-slate-200 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-white shadow-sm shadow-slate-900/10 transition-colors duration-200 hover:bg-slate-900 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {tourStep >= TOUR_KEYS.length - 1 ? t('app.tour.done') : t('app.tour.next')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-[#f8fafc]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(v => !v)}
              className="-ml-1 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/80 p-1.5 shadow-sm shadow-slate-200/50 ring-1 ring-slate-200/80">
              <img src="/luelan-logo.png" alt="" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">{t('app.name')}</h1>
              <div className="flex min-w-0 items-center gap-1.5 text-[10px] leading-none text-slate-500">
                <p className="truncate">{t('app.subtitle')}</p>
                {showStatusBadge && (
                  <span
                    className={cn(
                      'inline-flex max-w-full items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium',
                      isDemo
                        ? 'border-blue-200/70 bg-blue-50/60 text-blue-700/75'
                        : 'border-emerald-200/70 bg-emerald-50/60 text-emerald-700/75',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', isDemo ? 'bg-blue-400/80' : 'bg-emerald-400/80')} />
                    <span className="truncate">{statusBadgeText}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/70 px-1.5 py-1 shadow-sm shadow-slate-200/40">
              <button
                type="button"
                onClick={onBackToLanding}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-slate-500 transition-colors hover:bg-slate-100/80 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8fafc]"
              >
                <ArrowLeft className="h-3 w-3" />
                <span className="hidden md:inline">{t('app.back')}</span>
              </button>
              <span className="h-3.5 w-px bg-slate-200/80" />
              <div className="[&_select]:border-transparent [&_select]:bg-transparent [&_select]:py-1 [&_select]:pl-5 [&_select]:pr-1 [&_select]:text-[11px] [&_select]:text-slate-500 [&_select]:shadow-none [&_select]:transition-colors [&_select]:hover:text-slate-700 [&_select]:focus-visible:ring-1 [&_select]:focus-visible:ring-slate-300/80 [&_select]:focus-visible:ring-offset-0 [&_span]:text-[10px] [&_span]:text-slate-400">
                <LanguageSwitcher />
              </div>
              <span className="hidden h-3.5 w-px bg-slate-200/80 sm:block" />
              <span className="hidden px-1 font-mono text-[10px] text-slate-400 sm:inline">v{APP_VERSION}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex max-w-screen-2xl mx-auto relative">
        <nav
          className={cn(
            'fixed top-[49px] z-40 flex h-[calc(100vh-49px)] w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-[#f8fafc] px-3 py-4 transition-transform duration-200 lg:sticky lg:top-[49px] lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex-1 space-y-4">
            {navigationGroups.map(group => (
              <section
                key={group.id}
                className={cn(
                  'space-y-1',
                  group.tone === 'overview' && 'rounded-2xl bg-white/55 p-1.5',
                  group.tone === 'secondary' && 'rounded-2xl border border-slate-200/70 bg-white/40 p-2',
                )}
              >
                <p
                  className={cn(
                    'px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em]',
                    group.tone === 'primary' && 'text-[#3b82c4]',
                    group.tone === 'overview' && 'text-slate-400',
                    group.tone === 'secondary' && 'text-slate-400/90',
                  )}
                >
                  {t(group.titleKey)}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map(tab => {
                    const isActive = activeTab === tab.id
                    const isPrimaryGroup = group.tone === 'primary'
                    const isToolGroup = group.tone === 'secondary'

                    return (
                      <li key={tab.id}>
                        <button
                          type="button"
                          onClick={() => navigateTab(tab.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 font-medium transition-all duration-150',
                            isToolGroup ? 'py-2 text-[12px]' : 'py-2.5 text-[13px]',
                            isActive
                              ? isPrimaryGroup
                                ? 'bg-blue-50 text-[#3b82c4] shadow-sm'
                                : 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80'
                              : isPrimaryGroup
                                ? 'text-slate-700 hover:bg-white hover:text-slate-900'
                                : isToolGroup
                                  ? 'text-slate-500 hover:bg-white/80 hover:text-slate-800'
                                  : 'text-slate-600 hover:bg-white hover:text-slate-900',
                          )}
                        >
                          <tab.icon
                            className={cn(
                              'h-[18px] w-[18px]',
                              isActive
                                ? isPrimaryGroup
                                  ? 'text-[#3b82c4]'
                                  : 'text-slate-500'
                                : isToolGroup
                                  ? 'text-slate-400'
                                  : 'text-slate-500',
                            )}
                          />
                          {t(tab.nameKey)}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-4">
            <p className="px-3 text-[10px] font-medium tracking-[0.08em] text-slate-400">{t('app.lobster')}</p>
          </div>
        </nav>

        <main className="min-h-[calc(100vh-49px)] w-0 flex-1 overflow-auto p-4 sm:p-8">
          <ErrorBoundary>
            <Suspense fallback={<TabFallback />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
                >
                  {activeTab === 'dashboard' && (
                    <Dashboard
                      onNavigate={navigateTab}
                      onKnowledgeSearch={openKnowledgeSearch}
                      onOpenReplaySession={openReplaySession}
                    />
                  )}
                  {activeTab === 'replay' && (
                    <Replay
                      initialSessionId={replayInitialSessionId}
                      onInitialSessionHandled={clearReplayInitialSession}
                    />
                  )}
                  {activeTab === 'benchmark' && <Benchmark />}
                  {activeTab === 'leaderboard' && <Leaderboard />}
                  {activeTab === 'cost' && <CostMonitor onOpenReplaySession={openReplaySession} />}
                  {activeTab === 'prompt' && <PromptInsight />}
                  {activeTab === 'compare' && <Compare />}
                  {activeTab === 'skills' && <SkillManager />}
                  {activeTab === 'templates' && <TemplateMarket />}
                  {activeTab === 'knowledge' && (
                    <Knowledge
                      initialQuery={knowledgeInitialQuery}
                      navigateTab={navigateTab}
                      onSelectReplaySession={setReplayTargetSession}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [landingTab, setLandingTab] = useState<Tab>('replay')

  if (showLanding) {
    return <ErrorBoundary><Landing onEnterDemo={(tab) => { setLandingTab(tab ?? 'replay'); setShowLanding(false) }} /></ErrorBoundary>
  }

  return <AppShell initialTab={landingTab} onBackToLanding={() => setShowLanding(true)} />
}

export default App
