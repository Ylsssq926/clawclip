import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Replay from './pages/Replay'
import Benchmark from './pages/Benchmark'
import CostMonitor from './pages/CostMonitor'
import SkillManager from './pages/SkillManager'
import TemplateMarket from './pages/TemplateMarket'
import { LayoutDashboard, Play, Trophy, DollarSign, Puzzle, Store, Settings } from 'lucide-react'

export type Tab = 'dashboard' | 'replay' | 'benchmark' | 'cost' | 'skills' | 'templates'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const tabs = [
    { id: 'dashboard' as const, name: '仪表盘', icon: LayoutDashboard },
    { id: 'replay' as const, name: '回放', icon: Play },
    { id: 'benchmark' as const, name: '评测', icon: Trophy },
    { id: 'cost' as const, name: '费用', icon: DollarSign },
    { id: 'skills' as const, name: 'Skills', icon: Puzzle },
    { id: 'templates' as const, name: '模板', icon: Store },
  ]

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <header className="bg-[#1e293b] border-b border-[#334155] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍤</span>
            <div>
              <h1 className="text-xl font-bold">虾片</h1>
              <p className="text-xs text-slate-400">ClawClip</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">v0.3.0</span>
            <button type="button" disabled className="p-2 rounded-lg transition-colors opacity-50 cursor-not-allowed" title="设置功能即将上线">
              <Settings className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="w-52 bg-[#1e293b] min-h-[calc(100vh-72px)] p-4 border-r border-[#334155] shrink-0">
          <ul className="space-y-1">
            {tabs.map(tab => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm ${
                    activeTab === tab.id
                      ? 'bg-orange-500/10 text-orange-400 font-medium'
                      : 'text-slate-400 hover:bg-[#334155] hover:text-white'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-8 px-4">
            <div className="text-xs text-slate-600 leading-relaxed">
              AI Agent 回放 · 评测 · 成本优化
            </div>
          </div>
        </nav>

        <main className="flex-1 p-6 overflow-auto">
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
