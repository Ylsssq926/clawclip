import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Replay from './pages/Replay'
import Benchmark from './pages/Benchmark'
import CostMonitor from './pages/CostMonitor'
import SkillManager from './pages/SkillManager'
import TemplateMarket from './pages/TemplateMarket'
import { LayoutDashboard, Play, Trophy, DollarSign, Puzzle, Store } from 'lucide-react'
import { cn } from './lib/cn'

export type Tab = 'dashboard' | 'replay' | 'benchmark' | 'cost' | 'skills' | 'templates'

const tabs = [
  { id: 'dashboard' as const, name: '仪表盘', icon: LayoutDashboard },
  { id: 'replay' as const, name: '回放', icon: Play },
  { id: 'benchmark' as const, name: '评测', icon: Trophy },
  { id: 'cost' as const, name: '费用', icon: DollarSign },
  { id: 'skills' as const, name: 'Skills', icon: Puzzle },
  { id: 'templates' as const, name: '模板', icon: Store },
]

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="min-h-screen bg-[#050816] text-slate-200 bg-dots bg-ambient">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050816]/80 backdrop-blur-xl border-b border-white/[0.06] px-6 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-lg shadow-lg shadow-orange-500/20">
              🍤
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">虾片</h1>
              <p className="text-[10px] text-slate-500 leading-none">ClawClip</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-600 font-mono">v0.8.0</span>
        </div>
      </header>

      <div className="flex max-w-screen-2xl mx-auto">
        {/* Sidebar */}
        <nav className="w-56 shrink-0 sticky top-[49px] h-[calc(100vh-49px)] border-r border-white/[0.06] py-4 px-3 flex flex-col">
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
                  <tab.icon className={cn('w-[18px] h-[18px]', activeTab === tab.id && 'text-orange-400')} />
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
          <div className="pt-4 border-t border-white/[0.06]">
            <p className="text-[11px] text-slate-600 px-3">🍤 龙虾待命中</p>
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1 p-8 min-h-[calc(100vh-49px)] overflow-auto">
          {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === 'replay' && <Replay />}
          {activeTab === 'benchmark' && <Benchmark />}
          {activeTab === 'cost' && <CostMonitor />}
          {activeTab === 'skills' && <SkillManager />}
          {activeTab === 'templates' && <TemplateMarket />}
        </main>
      </div>
    </div>
  )
}

export default App
