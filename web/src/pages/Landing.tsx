import { motion } from 'framer-motion'
import { Play, Trophy, BarChart3, Cloud, Github, MessageCircle, ArrowRight, Terminal, Zap, Eye, Shield, Coins, BookOpen, LayoutGrid } from 'lucide-react'
import { useI18n, LanguageSwitcher } from '../lib/i18n'

interface Props {
  onEnterDemo: () => void
}

const FEATURES = [
  {
    icon: Play,
    titleKey: 'feat.replay',
    descKey: 'feat.replay.desc',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Trophy,
    titleKey: 'feat.benchmark',
    descKey: 'feat.benchmark.desc',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
  {
    icon: BarChart3,
    titleKey: 'feat.cost',
    descKey: 'feat.cost.desc',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Cloud,
    titleKey: 'feat.wordcloud',
    descKey: 'feat.wordcloud.desc',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: BookOpen,
    titleKey: 'feat.knowledge',
    descKey: 'feat.knowledge.desc',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: Trophy,
    titleKey: 'feat.leaderboard',
    descKey: 'feat.leaderboard.desc',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    icon: LayoutGrid,
    titleKey: 'feat.templates',
    descKey: 'feat.templates.desc',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    icon: Coins,
    titleKey: 'feat.savings',
    descKey: 'feat.savings.desc',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
] as const

const HIGHLIGHTS = [
  { icon: Eye, textKey: 'highlight.compat' as const },
  { icon: Shield, textKey: 'highlight.local' as const },
  { icon: Coins, textKey: 'highlight.free' as const },
  { icon: Zap, textKey: 'highlight.demo' as const },
]

export default function Landing({ onEnterDemo }: Props) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white text-slate-800 overflow-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[15%] w-[700px] h-[700px] bg-blue-200/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[20%] w-[500px] h-[500px] bg-cyan-100/15 rounded-full blur-[100px]" />
        <div className="absolute top-[40%] right-[5%] w-[300px] h-[300px] bg-emerald-100/10 rounded-full blur-[80px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-16 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍤</span>
            <span className="text-lg font-bold text-slate-900">虾片</span>
            <span className="text-xs text-slate-500">ClawClip</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Ylsssq926/clawclip"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
          >
            <Github className="w-4 h-4" /> GitHub
          </a>
          <LanguageSwitcher />
          <button
            onClick={onEnterDemo}
            className="text-sm font-medium px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-300/40 hover:shadow-blue-300/50 transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            {t('landing.cta.demo')}
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs text-blue-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            {t('landing.tagline')}
          </div>

          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            <span className="text-slate-900">{t('landing.hero.line1')}</span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{t('landing.hero.line2')}</span>
          </h1>

          <p className="text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl mb-10">
            {t('landing.hero.desc')}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={onEnterDemo}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-base shadow-xl shadow-blue-300/40 hover:shadow-blue-300/50 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Play className="w-5 h-5" />
              {t('landing.cta.demo')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="https://github.com/Ylsssq926/clawclip"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-8 py-4 rounded-2xl border border-blue-100 text-slate-700 font-medium text-base hover:bg-blue-50 hover:border-blue-200 transition-all"
            >
              <Github className="w-5 h-5" />
              {t('landing.cta.source')}
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
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-100 bg-white">
              <h.icon className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-400">{t(h.textKey)}</span>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Data journey */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">{t('landing.journey.title')}</h2>
          <p className="text-slate-500 mb-10 max-w-2xl leading-relaxed">{t('landing.journey.sub')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(
              [
                { step: 1, icon: Terminal, titleKey: 'landing.journey.s1t' as const, descKey: 'landing.journey.s1d' as const },
                { step: 2, icon: Play, titleKey: 'landing.journey.s2t' as const, descKey: 'landing.journey.s2d' as const },
                { step: 3, icon: Trophy, titleKey: 'landing.journey.s3t' as const, descKey: 'landing.journey.s3d' as const },
                { step: 4, icon: BarChart3, titleKey: 'landing.journey.s4t' as const, descKey: 'landing.journey.s4d' as const },
              ] as const
            ).map(({ step, icon: Ico, titleKey, descKey }) => (
              <div
                key={titleKey}
                className="rounded-2xl border border-blue-100 bg-blue-50 p-5 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-blue-600 tabular-nums">0{step}</span>
                  <Ico className="w-4 h-4 text-cyan-600 shrink-0" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{t(titleKey)}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
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
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3">{t('landing.features')}</h2>
          <p className="text-slate-500 mb-12">{t('landing.features.sub')}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.titleKey}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6 hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl ${f.iconBg} flex items-center justify-center shrink-0`}>
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{t(f.titleKey)}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{t(f.descKey)}</p>
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
          className="bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-8 lg:p-12 text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-3">{t('landing.preview.title')}</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {t('landing.preview.desc')}
            </p>
            <button
              onClick={onEnterDemo}
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-xl shadow-blue-300/40 hover:shadow-blue-300/50 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Play className="w-5 h-5" />
              {t('landing.preview.cta')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          {/* Mock dashboard */}
          <div className="px-8 lg:px-12 pb-2">
            <div className="rounded-t-xl border border-blue-100 border-b-0 bg-gradient-to-b from-slate-900 to-slate-800 p-6 space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 h-6 rounded-md bg-slate-700/50 max-w-xs" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {['🟢 Running', '¥3.42', '15 Skills', '8 Sessions'].map((cell, i) => (
                  <div key={i} className="rounded-lg bg-slate-700/40 border border-slate-600/30 p-3">
                    <div className="text-[10px] text-slate-500 mb-1">{['Status', 'Cost', 'Skills', 'Sessions'][i]}</div>
                    <div className="text-sm font-bold text-slate-200">{cell}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8 rounded-lg bg-slate-700/30 border border-slate-600/30 p-3 h-28">
                  <div className="text-[10px] text-slate-500 mb-2">Token Trend</div>
                  <div className="flex items-end gap-1 h-16">
                    {[40, 65, 50, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-cyan-400 opacity-70" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="col-span-4 rounded-lg bg-slate-700/30 border border-slate-600/30 p-3 h-28">
                  <div className="text-[10px] text-slate-500 mb-2">Radar</div>
                  <div className="flex items-center justify-center h-16">
                    <svg viewBox="0 0 100 100" className="w-16 h-16">
                      <polygon points="50,10 90,35 80,80 20,80 10,35" fill="none" stroke="rgba(100,116,139,0.3)" strokeWidth="1" />
                      <polygon points="50,25 75,40 70,70 30,70 25,40" fill="rgba(59,130,246,0.2)" stroke="rgba(59,130,246,0.6)" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
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
            <Terminal className="w-5 h-5 text-emerald-600" />
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">{t('landing.install')}</h2>
          </div>
          <p className="text-slate-500 mb-8">{t('landing.install.sub')}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { step: '01', cmd: 'git clone https://github.com/Ylsssq926/clawclip.git\ncd clawclip', labelKey: 'landing.install.s1' as const },
            { step: '02', cmd: 'npm install', labelKey: 'landing.install.s2' as const },
            { step: '03', cmd: 'npm run build && npm start\n# 打开 http://localhost:8080', labelKey: 'landing.install.s3' as const },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-white border border-blue-100 rounded-2xl shadow-sm p-6"
            >
              <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">{s.step}</div>
              <p className="text-sm font-medium text-slate-900 mb-3">{t(s.labelKey)}</p>
              <pre className="text-xs text-slate-700 bg-slate-100 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">
                {s.cmd}
              </pre>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-slate-50 py-12 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">虾片</span>
            <span className="text-xs text-slate-400">ClawClip</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="https://github.com/Ylsssq926/clawclip" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
              <Github className="w-4 h-4" /> GitHub
            </a>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> QQ 群 892555092
            </span>
          </div>

          <p className="text-xs text-slate-400">
            掠蓝蓝蓝 出品 · 虾片 ClawClip 🍤
          </p>
        </div>
      </footer>
    </div>
  )
}
