import { motion } from 'framer-motion'
import { Play, Trophy, Github, MessageCircle, ArrowRight, Terminal, Eye, Shield, Coins } from 'lucide-react'
import type { Tab } from '../App'
import { useI18n, LanguageSwitcher } from '../lib/i18n'

interface Props {
  onEnterDemo: (tab?: Tab) => void
}

const LANDING_LOCAL_COPY = {
  zh: {
    'landing.hero.eyebrow': 'Replay · Scorecard · Cost',
    'landing.hero.title': '看清发生了什么，再判断这次值不值。',
    'landing.hero.kicker': '把一次 Agent 运行收成三件事：先回放证据链，再看有没有顶住，最后判断这笔优化账该不该继续付。',
    'landing.hero.meta': '会话分析在本地完成，Agent 运行数据不上传。',
    'landing.cta.demoPrimary': '看示例回放',
    'landing.panel.title': '一次运行，三张答案',
    'landing.panel.subtitle': '更像产品，不像说明书',
    'landing.panel.badge': '分析留在本地',
    'landing.panel.evidence': '运行证据链',
    'landing.panel.score.note': '工具和安全顶住了，但检索波动还大。',
    'landing.panel.score.badge': '基本顶住',
    'landing.panel.cost.note': '先修重试循环，再决定要不要继续加料。',
    'landing.panel.cost.badge': '先止损',
    'landing.panel.summary.replay': '关键步骤一眼看清',
    'landing.panel.summary.score': '知道有没有顶住',
    'landing.panel.summary.cost': '知道优化值不值',
    'landing.feature.replay.desc': '把步骤、工具调用、重试和报错串成一条证据链。',
    'landing.feature.benchmark.desc': '用六维信号判断这次运行到底有没有顶住。',
    'landing.feature.cost.desc': '把模型、任务和花费拆开，判断优化值不值。',
    'landing.flow.title': '首页只讲这一条主线',
    'landing.flow.subtitle': '回放、判断、算账，三步收口。',
    'landing.flow.replay.outcome': '看清发生了什么',
    'landing.flow.benchmark.outcome': '判断有没有顶住',
    'landing.flow.cost.outcome': '知道值不值继续优化',
    'landing.preview.eyebrow': '产品预览',
    'landing.preview.title': '一个页面，把证据、分数和账单摆在一起',
    'landing.preview.desc': '不是八个入口堆在首页，而是先把这次运行看明白。',
    'landing.install.sub': '本地跑起来，再接入你的 JSONL 日志。',
  },
  en: {
    'landing.hero.eyebrow': 'Replay · Scorecard · Cost',
    'landing.hero.title': 'See what happened, then decide whether it was worth it.',
    'landing.hero.kicker': 'ClawClip reduces one agent run to three answers: replay the evidence trail, judge whether it held up, then decide whether the optimization earned its cost.',
    'landing.hero.meta': 'Session analysis stays local and agent run data is not uploaded.',
    'landing.cta.demoPrimary': 'Try Demo replay',
    'landing.panel.title': 'One run, three answers',
    'landing.panel.subtitle': 'More product, less explanation',
    'landing.panel.badge': 'Local-only analysis',
    'landing.panel.evidence': 'Run evidence trail',
    'landing.panel.score.note': 'Tools and safety held up, but retrieval is still noisy.',
    'landing.panel.score.badge': 'Mostly held',
    'landing.panel.cost.note': 'Cut retry churn first, then decide whether more spend is justified.',
    'landing.panel.cost.badge': 'Trim first',
    'landing.panel.summary.replay': 'See the key steps fast',
    'landing.panel.summary.score': 'Know whether it held',
    'landing.panel.summary.cost': 'Know whether it paid off',
    'landing.feature.replay.desc': 'Turn steps, tool calls, retries, and failures into one evidence trail.',
    'landing.feature.benchmark.desc': 'Use six signals to judge whether this run actually held up.',
    'landing.feature.cost.desc': 'Break spend down by model, task, and usage to judge the payoff.',
    'landing.flow.title': 'One storyline, three moves',
    'landing.flow.subtitle': 'Replay it. Judge it. Price it.',
    'landing.flow.replay.outcome': 'See what happened',
    'landing.flow.benchmark.outcome': 'Judge whether it held',
    'landing.flow.cost.outcome': 'Know whether it was worth it',
    'landing.preview.eyebrow': 'Product preview',
    'landing.preview.title': 'One screen for evidence, score, and cost',
    'landing.preview.desc': 'Not eight homepages stacked together. Just the run, the score, and the bill.',
    'landing.install.sub': 'Run it locally, then point it at your JSONL logs.',
  },
} as const

const FLOW_STEPS = [
  {
    icon: Eye,
    titleKey: 'nav.replay',
    descKey: 'landing.feature.replay.desc',
    outcomeKey: 'landing.flow.replay.outcome',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Trophy,
    titleKey: 'nav.benchmark',
    descKey: 'landing.feature.benchmark.desc',
    outcomeKey: 'landing.flow.benchmark.outcome',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Coins,
    titleKey: 'nav.cost',
    descKey: 'landing.feature.cost.desc',
    outcomeKey: 'landing.flow.cost.outcome',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
] as const

const HERO_PANEL_EVENTS: Record<'zh' | 'en', Array<{ label: string; detail: string }>> = {
  zh: [
    { label: '接收用户任务', detail: 'refund-bot / session_248' },
    { label: '工具调用重试 2 次', detail: 'search_products → search_products' },
    { label: '切到更贵模型', detail: 'gpt-4.1-mini → gpt-4.1' },
    { label: '回答成功，但成本偏高', detail: '$3.42 · Token waste $0.91' },
  ],
  en: [
    { label: 'User task received', detail: 'refund-bot / session_248' },
    { label: 'Tool retried twice', detail: 'search_products → search_products' },
    { label: 'Moved to pricier model', detail: 'gpt-4.1-mini → gpt-4.1' },
    { label: 'Answer succeeded, but spend is high', detail: '$3.42 · Token waste $0.91' },
  ],
}

export default function Landing({ onEnterDemo }: Props) {
  const { t, locale } = useI18n()
  const copyLocale = locale === 'zh' ? 'zh' : 'en'
  const copy = (key: string) => (LANDING_LOCAL_COPY[copyLocale] as Record<string, string>)[key] ?? t(key as never)
  const heroEvents = HERO_PANEL_EVENTS[copyLocale]
  const panelSummaries = [
    { icon: Eye, label: t('nav.replay'), value: copy('landing.panel.summary.replay') },
    { icon: Trophy, label: t('nav.benchmark'), value: copy('landing.panel.summary.score') },
    { icon: Coins, label: t('nav.cost'), value: copy('landing.panel.summary.cost') },
  ] as const

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-blue-50/30 to-slate-50 text-slate-800">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[12%] top-[4%] h-[640px] w-[640px] rounded-full bg-blue-200/20 blur-[120px]" />
        <div className="absolute right-[8%] top-[48%] h-[420px] w-[420px] rounded-full bg-cyan-100/20 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/75 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/65">
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-4 lg:px-16">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍤</span>
            <span className="text-lg font-bold text-slate-900">{t('app.name')}</span>
            <span className="text-xs text-slate-500">ClawClip</span>
          </div>
          <LanguageSwitcher variant="landing" />
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-16 lg:px-16 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
            className="max-w-2xl"
          >
            <div className="inline-flex rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm shadow-blue-100/50">
              {copy('landing.hero.eyebrow')}
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-6xl lg:leading-[1.05]">
              {copy('landing.hero.title')}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-700 lg:text-xl">
              {copy('landing.hero.kicker')}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-500 lg:text-base">
              {copy('landing.hero.meta')}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => onEnterDemo('replay')}
                className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-accent to-cyan-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#3b82c4]/35 transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.02] hover:shadow-xl hover:shadow-[#3b82c4]/45 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white/90"
              >
                <Play className="h-5 w-5" />
                {copy('landing.cta.demoPrimary')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href="https://github.com/Ylsssq926/clawclip"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-accent/15 bg-white/70 px-8 py-4 text-base font-medium text-slate-700 transition-[transform,background-color,border-color] duration-200 hover:border-accent/25 hover:bg-accent/5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white/90"
              >
                <Github className="h-5 w-5" />
                {t('landing.cta.source')}
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.25, 0.4, 0.25, 1] }}
            className="w-full max-w-[480px] lg:ml-auto"
          >
            <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-white/85 p-5 shadow-[0_24px_80px_-48px_rgba(59,130,196,0.55)] backdrop-blur-xl sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{copy('landing.panel.title')}</p>
                  <p className="text-xs text-slate-500">{copy('landing.panel.subtitle')}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600">
                  {copy('landing.panel.badge')}
                </span>
              </div>

              <div className="rounded-[24px] border border-slate-800/80 bg-slate-950 p-4 text-slate-100 shadow-inner shadow-black/20 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <div className="ml-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] text-slate-400">
                    session_248 · clawclip://demo/replay
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {copy('landing.panel.evidence')}
                    </p>
                    <div className="mt-4 space-y-3">
                      {heroEvents.map((event, index) => (
                        <div key={event.label} className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${index === heroEvents.length - 1 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                            0{index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-100">{event.label}</p>
                            <p className="text-xs leading-relaxed text-slate-400">{event.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-cyan-200">
                        <Trophy className="h-4 w-4" />
                        {t('nav.benchmark')}
                      </div>
                      <div className="mt-3 flex items-end gap-3">
                        <span className="text-3xl font-bold text-white">74</span>
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                          {copy('landing.panel.score.badge')}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-slate-300">{copy('landing.panel.score.note')}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
                        <Coins className="h-4 w-4" />
                        {t('nav.cost')}
                      </div>
                      <div className="mt-3 flex items-end gap-3">
                        <span className="text-3xl font-bold text-white">$3.42</span>
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200">
                          {copy('landing.panel.cost.badge')}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-slate-300">{copy('landing.panel.cost.note')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {panelSummaries.map(item => (
                  <div key={item.label} className="rounded-2xl border border-blue-100 bg-white/80 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <item.icon className="h-4 w-4 text-slate-400" />
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-900 lg:text-3xl">{copy('landing.flow.title')}</h2>
            <p className="mt-3 text-slate-500">{copy('landing.flow.subtitle')}</p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {FLOW_STEPS.map((step, index) => (
              <motion.div
                key={step.titleKey}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-2xl border border-blue-100 bg-white/85 p-6 shadow-sm shadow-blue-100/40"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.iconBg}`}>
                    <step.icon className={`h-5 w-5 ${step.iconColor}`} />
                  </div>
                  <span className="text-xs font-mono text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{copy(step.titleKey)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy(step.descKey)}</p>
                <div className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {copy(step.outcomeKey)}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.28)]"
        >
          <div className="flex flex-col gap-4 border-b border-slate-200/80 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-accent">{copy('landing.preview.eyebrow')}</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 lg:text-3xl">{copy('landing.preview.title')}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 lg:text-base">{copy('landing.preview.desc')}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
              {[t('nav.replay'), t('nav.benchmark'), t('nav.cost')].map(item => (
                <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-b from-slate-900 via-[#0f172a] to-[#0b1120] px-6 pb-6 pt-5 lg:px-8 lg:pb-8">
            <div className="rounded-t-xl border border-white/10 border-b-0 bg-gradient-to-b from-slate-900 to-slate-800 p-6">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="h-6 max-w-xs flex-1 rounded-md bg-slate-700/50" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: t('dashboard.stat.cli'), value: '🟢 Online' },
                  { label: t('dashboard.stat.monthCost'), value: '$3.42' },
                  { label: copyLocale === 'zh' ? 'Token 浪费' : 'Token waste', value: '$0.91' },
                  { label: copyLocale === 'zh' ? '优先修复' : 'Fix first', value: copyLocale === 'zh' ? '重试循环' : 'Retry churn' },
                ].map(cell => (
                  <div key={cell.label} className="rounded-lg border border-slate-600/30 bg-slate-700/40 p-3">
                    <div className="mb-1 text-[10px] text-slate-500">{cell.label}</div>
                    <div className="text-sm font-bold text-slate-200">{cell.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
                <div className="rounded-lg border border-slate-600/30 bg-slate-700/30 p-4">
                  <div className="mb-3 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{t('nav.replay')}</span>
                    <span>session_248</span>
                  </div>
                  <div className="space-y-3">
                    {heroEvents.map((event, index) => (
                      <div key={event.label} className="flex items-start gap-3">
                        <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                        <div>
                          <div className="text-sm font-medium text-slate-200">{event.label}</div>
                          <div className="text-xs text-slate-500">{event.detail}</div>
                        </div>
                        <div className="ml-auto text-[10px] text-slate-600">0{index + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-600/30 bg-slate-700/30 p-4">
                    <div className="mb-2 flex items-center gap-2 text-[10px] text-slate-500">
                      <Shield className="h-3.5 w-3.5" />
                      {t('nav.benchmark')}
                    </div>
                    <div className="text-2xl font-bold text-slate-100">74 / 100</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
                      <span className="rounded-full bg-slate-800 px-2 py-1">Tools 91</span>
                      <span className="rounded-full bg-slate-800 px-2 py-1">Safety 85</span>
                      <span className="rounded-full bg-slate-800 px-2 py-1">Search 56</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-600/30 bg-slate-700/30 p-4">
                    <div className="mb-2 text-[10px] text-slate-500">{t('cost.chart.title')}</div>
                    <div className="flex h-16 items-end gap-1">
                      {[40, 65, 50, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((height, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-t bg-gradient-to-t from-accent to-cyan-400 opacity-70"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <div className="relative z-10 bg-gradient-to-b from-transparent via-slate-100/40 to-[#0b1120]">
        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1120] p-6 shadow-[0_24px_80px_-48px_rgba(11,17,32,0.85)] lg:p-8"
          >
            <div className="flex items-center gap-3">
              <Terminal className="h-5 w-5 text-accent" />
              <h2 className="text-xl font-bold text-slate-50 lg:text-2xl">{t('landing.install')}</h2>
            </div>
            <p className="mt-3 text-sm text-slate-300">{copy('landing.install.sub')}</p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { step: '01', cmd: 'git clone https://github.com/Ylsssq926/clawclip.git\ncd clawclip', labelKey: 'landing.install.s1' as const },
                { step: '02', cmd: 'npm install', labelKey: 'landing.install.s2' as const },
                { step: '03', cmd: 'npm start\n# → http://localhost:8080', labelKey: 'landing.install.s3' as const },
              ].map(item => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <div className="mb-3 text-xs font-mono text-accent">{item.step}</div>
                  <p className="mb-3 text-sm font-medium text-slate-100">{t(item.labelKey)}</p>
                  <pre className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/70 p-3 font-mono text-xs leading-relaxed text-slate-200">
                    {item.cmd}
                  </pre>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <footer className="border-t border-white/10 bg-[#0b1120]/80 px-6 py-12 backdrop-blur-sm lg:px-16">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">{t('app.name')}</span>
              <span className="text-xs text-slate-500">ClawClip</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a
                href="https://github.com/Ylsssq926/clawclip"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition-colors hover:text-accent"
              >
                <Github className="h-4 w-4" /> GitHub
              </a>
              <a
                href="https://luelan.online"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-accent"
              >
                更多作品
              </a>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" /> {t('landing.footer.qq')}
              </span>
            </div>

            <p className="text-xs text-slate-500">{t('landing.footer.brand')}</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
