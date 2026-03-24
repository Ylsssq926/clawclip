import { motion } from 'framer-motion'
import { Play, Trophy, BarChart3, Cloud, Github, MessageCircle, ArrowRight, Terminal, Zap, Eye, Shield, Coins } from 'lucide-react'

interface Props {
  onEnterDemo: () => void
}

const FEATURES = [
  {
    icon: Play,
    title: '会话回放',
    desc: '把 AI Agent 的 JSONL 日志变成可交互的时间轴——每一步思考、工具调用、结果、花费，一目了然。',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
  {
    icon: Trophy,
    title: '六维评测',
    desc: '离线分析历史会话，从写作、代码、工具、检索、安全、性价比六个维度给你的 Agent 打分。不调 API，不花钱。',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
  },
  {
    icon: BarChart3,
    title: '成本监控',
    desc: '逐日 Token 趋势、模型费用对比、预算告警、高消耗排行。每分钱花到哪了，清清楚楚。',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Cloud,
    title: '词云与标签',
    desc: '自动提取会话关键词生成词云，按主题/工具/模型着色。会话自动标签，快速筛选。',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
]

const HIGHLIGHTS = [
  { icon: Eye, text: '支持 OpenClaw / ZeroClaw 及所有兼容框架' },
  { icon: Shield, text: '纯本地运行，数据不出你的电脑' },
  { icon: Coins, text: '评测离线分析，零 API 成本' },
  { icon: Zap, text: '内置 Demo 数据，无需安装即可体验' },
]

export default function Landing({ onEnterDemo }: Props) {
  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 overflow-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[15%] w-[700px] h-[700px] bg-blue-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[20%] w-[500px] h-[500px] bg-cyan-500/[0.03] rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[5%] w-[300px] h-[300px] bg-emerald-500/[0.02] rounded-full blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-16 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/luelan-logo.png" alt="掠蓝" className="h-14 w-auto -my-3 object-contain" />
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Ylsssq926/clawclip"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.05]"
          >
            <Github className="w-4 h-4" /> GitHub
          </a>
          <button
            onClick={onEnterDemo}
            className="text-sm font-medium px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            体验 Demo
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/[0.06] text-xs text-blue-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            支持 OpenClaw / ZeroClaw 及所有兼容 Agent 框架
          </div>

          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            <span className="text-white">你的 AI Agent</span>
            <br />
            <span className="text-gradient">到底干了什么？</span>
          </h1>

          <p className="text-lg lg:text-xl text-slate-400 leading-relaxed max-w-2xl mb-10">
            虾片 (ClawClip) 把无聊的 Agent 日志变成好看的时间轴回放，
            给你的龙虾做六维体检打分，顺便看看钱都花哪了。
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={onEnterDemo}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-base shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Play className="w-5 h-5" />
              体验 Demo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="https://github.com/Ylsssq926/clawclip"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-8 py-4 rounded-2xl border border-white/10 text-slate-300 font-medium text-base hover:bg-white/[0.04] hover:border-white/20 transition-all"
            >
              <Github className="w-5 h-5" />
              查看源码
            </a>
          </div>
        </motion.div>

        {/* Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {HIGHLIGHTS.map((h, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <h.icon className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-400">{h.text}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">核心功能</h2>
          <p className="text-slate-500 mb-12">装好龙虾，打开虾片，一切尽在掌握</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="card p-6 hover:border-white/[0.15] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl ${f.iconBg} flex items-center justify-center shrink-0`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Demo Preview */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="card overflow-hidden"
        >
          <div className="p-8 lg:p-12 text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">想看看效果？</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              内置 8 条真实场景的 Demo 会话——小红书文案、代码调试、竞品分析、翻译……不用安装，直接体验。
            </p>
            <button
              onClick={onEnterDemo}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Play className="w-5 h-5" />
              进入 Demo 演示
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          {/* Fake preview */}
          <div className="px-8 lg:px-12 pb-2">
            <div className="rounded-t-xl border border-white/[0.08] border-b-0 bg-gradient-to-b from-white/[0.03] to-transparent p-6 space-y-4">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/40" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                <div className="w-3 h-3 rounded-full bg-green-500/40" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {['运行中', '¥3.42', '15 技能', '3 平台'].map((t, i) => (
                  <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-[10px] text-slate-600 mb-1">指标</div>
                    <div className="text-sm font-bold text-white">{t}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['🎬 会话回放', '🏆 能力评测', '📊 费用趋势'].map((t, i) => (
                  <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                    <div className="text-xs text-slate-400">{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Install */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h2 className="text-2xl lg:text-3xl font-bold text-white">三步安装</h2>
          </div>
          <p className="text-slate-500 mb-8">本地部署，数据完全在你手里</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { step: '01', cmd: 'git clone https://github.com/Ylsssq926/clawclip.git\ncd clawclip', label: '克隆仓库' },
            { step: '02', cmd: 'npm install', label: '安装依赖' },
            { step: '03', cmd: 'npm run build && npm start\n# 打开 http://localhost:8080', label: '启动服务' },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="card p-6"
            >
              <div className="text-3xl font-black text-gradient mb-4">{s.step}</div>
              <p className="text-sm font-medium text-white mb-3">{s.label}</p>
              <pre className="text-xs text-slate-400 bg-black/30 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">
                {s.cmd}
              </pre>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-12 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/luelan-logo.png" alt="掠蓝" className="h-10 w-auto -my-2 opacity-60" />
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="https://github.com/Ylsssq926/clawclip" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Github className="w-4 h-4" /> GitHub
            </a>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> QQ 群 892555092
            </span>
          </div>

          <p className="text-xs text-slate-600">
            虾片 ClawClip · 🍤
          </p>
        </div>
      </footer>
    </div>
  )
}
