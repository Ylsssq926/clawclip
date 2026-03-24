import { useState } from 'react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Replay from './pages/Replay'
import Benchmark from './pages/Benchmark'
import CostMonitor from './pages/CostMonitor'
import SkillManager from './pages/SkillManager'
import TemplateMarket from './pages/TemplateMarket'
import Knowledge from './pages/Knowledge'
import Leaderboard from './pages/Leaderboard'
import { LayoutDashboard, Play, Trophy, DollarSign, Puzzle, Store, ArrowLeft, Database, Medal } from 'lucide-react'
import { cn } from './lib/cn'
import { useI18n, LanguageSwitcher } from './lib/i18n'

export type Tab =
  | 'dashboard'
  | 'replay'
  | 'benchmark'
  | 'leaderboard'
  | 'cost'
  | 'skills'
  | 'templates'
  | 'knowledge'

const tabs = [
  { id: 'dashboard' as const, nameKey: 'nav.dashboard', icon: LayoutDashboard },
  { id: 'replay' as const, nameKey: 'nav.replay', icon: Play },
  { id: 'benchmark' as const, nameKey: 'nav.benchmark', icon: Trophy },
  { id: 'leaderboard' as const, nameKey: 'nav.leaderboard', icon: Medal },
  { id: 'cost' as const, nameKey: 'nav.cost', icon: DollarSign },
  { id: 'skills' as const, nameKey: 'nav.skills', icon: Puzzle },
  { id: 'templates' as const, nameKey: 'nav.templates', icon: Store },
  { id: 'knowledge' as const, nameKey: 'nav.knowledge', icon: Database },
]

function App() {
  const { t } = useI18n()
  const [showLanding, setShowLanding] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('replay')

  if (showLanding) {
    return <Landing onEnterDemo={() => setShowLanding(false)} />
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 bg-dots bg-ambient">
      {/* Demo banner */}
      <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent border-b border-blue-500/10 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{t('app.demo')}</span>
          <span className="text-xs text-slate-400">{t('app.demo.desc')}</span>
        </div>
        <button
          onClick={() => setShowLanding(true)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> {t('app.back')}
        </button>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0b1120]/80 backdrop-blur-xl border-b border-white/[0.08] px-6 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-xl">🍤</span>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">{t('app.name')}</h1>
              <p className="text-[10px] text-slate-500 leading-none">{t('app.subtitle')} Demo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <span className="text-[10px] text-slate-600 font-mono">v0.8.2</span>
          </div>
        </div>
      </header>

      <div className="flex max-w-screen-2xl mx-auto">
        {/* Sidebar */}
        <nav className="w-56 shrink-0 sticky top-[49px] h-[calc(100vh-49px-33px)] border-r border-white/[0.08] py-4 px-3 flex flex-col">
          <ul className="space-y-0.5 flex-1">
            {tabs.map(tab => (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
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

        {/* Main */}
        <main className="flex-1 p-8 min-h-[calc(100vh-49px-33px)] overflow-auto">
          {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === 'replay' && <Replay />}
          {activeTab === 'benchmark' && <Benchmark />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'cost' && <CostMonitor />}
          {activeTab === 'skills' && <SkillManager />}
          {activeTab === 'templates' && <TemplateMarket />}
          {activeTab === 'knowledge' && <Knowledge />}
        </main>
      </div>
    </div>
  )
}

export default App
