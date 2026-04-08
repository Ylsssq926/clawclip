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
  const { t, locale } = useI18n()
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [knowledgeInitialQuery, setKnowledgeInitialQuery] = useState('')
  const [replayInitialSessionId, setReplayInitialSessionId] = useState('')
  const [dataBannerMode, setDataBannerMode] = useState<DataBannerMode>('loading')
  const [showRealDataBanner, setShowRealDataBanner] = useState(false)

  useEffect(() => {
    let hideTimer: number | null = null

    apiGetSafe<{ hasRealSessionData?: boolean }>('/api/status')
      .then(status => {
        if (status?.hasRealSessionData) {
          setDataBannerMode('real')
          setShowRealDataBanner(true)
          hideTimer = window.setTimeout(() => setShowRealDataBanner(false), 3000)
          return
        }

        setDataBannerMode('demo')
      })
      .catch(() => {
        setDataBannerMode('demo')
      })

    return () => {
      if (hideTimer != null) {
        window.clearTimeout(hideTimer)
      }
    }
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
  const isEnglish = locale === 'en'
  const isDemo = dataBannerMode === 'demo'
  const showStatusBanner = isDemo || (dataBannerMode === 'real' && showRealDataBanner)
  const statusBannerText = isDemo
    ? (isEnglish
        ? '📋 Demo data · connect logs to switch'
        : '📋 演示数据 · 接入日志后自动切换')
    : dataBannerMode === 'real'
      ? (isEnglish ? '✅ Real data connected' : '✅ 已连接真实数据')
      : ''
  const sidebarDesktopHeightClass = showStatusBanner ? 'lg:h-[calc(100vh-49px-33px)]' : 'lg:h-[calc(100vh-49px)]'
  const contentMinHeightClass = showStatusBanner ? 'min-h-[calc(100vh-49px-33px)]' : 'min-h-[calc(100vh-49px)]'

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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clawclip-tour-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.32, ease: [0.25, 0.4, 0.25, 1] }}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/60"
          >
            <h2 id="clawclip-tour-title" className="text-lg font-semibold text-slate-900 mb-4">
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
                      i < tourStep && 'bg-cyan-500/50',
                      i === tourStep && 'bg-gradient-to-r from-blue-500 to-cyan-500',
                      i > tourStep && 'bg-slate-200',
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-500 tabular-nums shrink-0" aria-live="polite">
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
                className="text-sm text-slate-500 leading-relaxed mb-6 min-h-[4.5rem]"
              >
                {t(TOUR_KEYS[tourStep])}
              </motion.p>
            </AnimatePresence>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={finishTour}
                className="text-xs text-slate-500 hover:text-slate-900 transition-colors rounded-lg px-1 py-0.5 -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {t('app.tour.skip')}
              </button>
              <button
                type="button"
                onClick={onTourNext}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-[box-shadow,opacity] duration-200 hover:opacity-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {tourStep >= TOUR_KEYS.length - 1 ? t('app.tour.done') : t('app.tour.next')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showStatusBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.25, 0.4, 0.25, 1] }}
            className={cn(
              'overflow-hidden border-b',
              isDemo ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200',
            )}
          >
            <div className="px-6 py-2">
              <span className={cn('text-xs font-medium', isDemo ? 'text-[#3b82c4]' : 'text-emerald-700')}>
                {statusBannerText}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f8fafc]/80 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(v => !v)}
              className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-xl shrink-0">🍤</span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight text-slate-900 truncate">{t('app.name')}</h1>
              <p className="text-[10px] text-slate-500 leading-none truncate">{t('app.subtitle')}{isDemo ? ' Demo' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-600 hover:text-[#3b82c4] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('app.back')}</span>
            </button>
            <LanguageSwitcher />
            <span className="text-[10px] text-slate-600 font-mono">v{APP_VERSION}</span>
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
            'w-56 shrink-0 border-r border-slate-200 py-4 px-3 flex flex-col bg-[#f8fafc] z-40 transition-transform duration-200 overflow-y-auto',
            'fixed top-[49px] h-[calc(100vh-49px)] lg:sticky lg:top-[49px] lg:translate-x-0',
            sidebarDesktopHeightClass,
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex-1 space-y-4">
            {navigationGroups.map(group => (
              <section key={group.id} className="space-y-1">
                <p
                  className={cn(
                    'px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.24em]',
                    group.id === 'core' ? 'text-[#3b82c4]' : 'text-slate-400',
                  )}
                >
                  {t(group.titleKey)}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map(tab => {
                    const isActive = activeTab === tab.id
                    const isCoreGroup = group.id === 'core'

                    return (
                      <li key={tab.id}>
                        <button
                          type="button"
                          onClick={() => navigateTab(tab.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                            isActive
                              ? 'bg-blue-50 text-[#3b82c4] shadow-sm'
                              : isCoreGroup
                                ? 'text-slate-700 hover:text-slate-900 hover:bg-white'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
                          )}
                        >
                          <tab.icon className={cn('w-[18px] h-[18px]', isActive && 'text-[#3b82c4]')} />
                          {t(tab.nameKey)}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-200">
            <p className="text-[11px] text-slate-600 px-3">{t('app.lobster')}</p>
          </div>
        </nav>

        <main className={cn('flex-1 p-4 sm:p-8 overflow-auto w-0', contentMinHeightClass)}>
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
