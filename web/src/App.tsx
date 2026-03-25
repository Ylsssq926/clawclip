import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Landing from './pages/Landing'
import ErrorBoundary from './components/ErrorBoundary'
import { LayoutDashboard, Play, Trophy, DollarSign, Puzzle, Store, ArrowLeft, Database, Medal, Menu, X, Lightbulb, GitCompareArrows } from 'lucide-react'
import { cn } from './lib/cn'
import { useI18n, LanguageSwitcher } from './lib/i18n'

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

export type Tab =
  | 'dashboard'
  | 'replay'
  | 'benchmark'
  | 'leaderboard'
  | 'cost'
  | 'prompt'
  | 'compare'
  | 'skills'
  | 'templates'
  | 'knowledge'

const tabs = [
  { id: 'dashboard' as const, nameKey: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'replay' as const, nameKey: 'nav.replay', icon: Play },
  { id: 'benchmark' as const, nameKey: 'nav.benchmark', icon: Trophy },
  { id: 'leaderboard' as const, nameKey: 'nav.leaderboard', icon: Medal },
  { id: 'cost' as const, nameKey: 'nav.cost', icon: DollarSign },
  { id: 'prompt' as const, nameKey: 'nav.prompt', icon: Lightbulb },
  { id: 'compare' as const, nameKey: 'nav.compare', icon: GitCompareArrows },
  { id: 'skills' as const, nameKey: 'nav.skills', icon: Puzzle },
  { id: 'templates' as const, nameKey: 'nav.templates', icon: Store },
  { id: 'knowledge' as const, nameKey: 'nav.knowledge', icon: Database },
] as const

const TOUR_KEYS = ['app.tour.s1', 'app.tour.s2', 'app.tour.s3', 'app.tour.s4'] as const

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

function AppShell({ onBackToLanding }: { onBackToLanding: () => void }) {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [isDemo, setIsDemo] = useState(true)

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.ok ? r.json() : null)
      .then((s: { hasRealSessionData?: boolean } | null) => {
        if (s?.hasRealSessionData) setIsDemo(false)
      })
      .catch(() => {})
  }, [])

  const [showTour, setShowTour] = useState(() => {
    try {
      return localStorage.getItem('clawclip-tour-done') !== '1'
    } catch {
      return false
    }
  })
  const [tourStep, setTourStep] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigateTab = useCallback((tab: Tab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
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

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 bg-dots bg-ambient">
      <AnimatePresence>
        {showTour && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clawclip-tour-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0f172a] p-6 shadow-xl"
          >
            <h2 id="clawclip-tour-title" className="text-lg font-semibold text-white mb-3">
              {t('app.tour.title')}
            </h2>
            <AnimatePresence mode="wait">
              <motion.p
                key={tourStep}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-slate-400 leading-relaxed mb-6 min-h-[4.5rem]"
              >
                {t(TOUR_KEYS[tourStep])}
              </motion.p>
            </AnimatePresence>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={finishTour}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {t('app.tour.skip')}
              </button>
              <button
                type="button"
                onClick={onTourNext}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 hover:opacity-95 transition-opacity"
              >
                {tourStep >= TOUR_KEYS.length - 1 ? t('app.tour.done') : t('app.tour.next')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent border-b border-blue-500/10 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isDemo && (
            <>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{t('app.demo')}</span>
              <span className="text-xs text-slate-400">{t('app.demo.desc')}</span>
            </>
          )}
          {!isDemo && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">{t('app.realData')}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onBackToLanding}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> {t('app.back')}
        </button>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0b1120]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(v => !v)}
              className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-xl">🍤</span>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">{t('app.name')}</h1>
              <p className="text-[10px] text-slate-500 leading-none">{t('app.subtitle')}{isDemo ? ' Demo' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            'w-56 shrink-0 border-r border-white/[0.08] py-4 px-3 flex flex-col bg-[#0b1120] z-40 transition-transform duration-200 overflow-y-auto',
            'fixed top-[49px] h-[calc(100vh-49px)] lg:sticky lg:top-[49px] lg:h-[calc(100vh-49px-33px)] lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <ul className="space-y-0.5 flex-1">
            {tabs.map(tab => (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => navigateTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                    activeTab === tab.id
                      ? 'bg-white/[0.06] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]',
                  )}
                >
                  <tab.icon className={cn('w-[18px] h-[18px]', activeTab === tab.id && 'text-blue-400')} />
                  {t(tab.nameKey)}
                </button>
              </li>
            ))}
          </ul>
          <div className="pt-4 border-t border-white/[0.08]">
            <p className="text-[11px] text-slate-600 px-3">{t('app.lobster')}</p>
          </div>
        </nav>

        <main className="flex-1 p-4 sm:p-8 min-h-[calc(100vh-49px-33px)] overflow-auto w-0">
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
                  {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
                  {activeTab === 'replay' && <Replay />}
                  {activeTab === 'benchmark' && <Benchmark />}
                  {activeTab === 'leaderboard' && <Leaderboard />}
                  {activeTab === 'cost' && <CostMonitor />}
                  {activeTab === 'prompt' && <PromptInsight />}
                  {activeTab === 'compare' && <Compare />}
                  {activeTab === 'skills' && <SkillManager />}
                  {activeTab === 'templates' && <TemplateMarket />}
                  {activeTab === 'knowledge' && <Knowledge />}
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

  if (showLanding) {
    return <ErrorBoundary><Landing onEnterDemo={() => setShowLanding(false)} /></ErrorBoundary>
  }

  return <AppShell onBackToLanding={() => setShowLanding(true)} />
}

export default App
