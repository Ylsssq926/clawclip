import { useEffect, useId, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Trophy, BarChart3, Github, MessageCircle, ArrowRight, Terminal, Zap, Eye, Shield, Coins, Medal, TrendingUp, GitCompareArrows, Database } from 'lucide-react'
import type { Tab } from '../App'
import { useI18n, LanguageSwitcher } from '../lib/i18n'

interface Props {
  onEnterDemo: (tab?: Tab) => void
}

const CURVE_Y_AXIS_LABEL: Record<string, string> = {
  zh: '评分',
  en: 'Score',
  ja: 'スコア',
  ko: '점수',
  es: 'Puntuación',
  fr: 'Score',
  de: 'Score',
}

const LANDING_LOCAL_COPY = {
  zh: {
    'landing.hero.title': '看清发生了什么，再判断优化值不值。',
    'landing.hero.kicker': '虾片不是只存日志。它会把一次运行整理成证据链，用 Agent 成绩单判断这次有没有顶住，再把成本摆出来，让你知道这次优化到底值不值。',
    'landing.hero.meta': '运行洞察 · Agent 成绩单 · 成本报告 — 会话分析在本地完成，Agent 运行数据不上传',
    'landing.feature.replay.desc': '把关键步骤、工具调用、重试和报错串成证据链，先看清这次到底发生了什么',
    'landing.feature.benchmark.desc': '用六维启发式信号判断这次运行有没有顶住，不只看它最后有没有跑通',
    'landing.feature.cost.desc': '按模型、任务和花费拆开成本，判断这次提升到底配不配得上这笔账单',
    'landing.feature.prompt.desc': '看更多 Token、更长 Prompt 和更重上下文，到底有没有换来足够结果',
    'landing.feature.compare.desc': '把优化前后并排摆开，确认变好的是结果，不是只是把账单换个地方烧',
    'landing.feature.resources': '模板库 + 知识库',
    'landing.feature.resources.desc': '把跑通过的模板和历史会话沉淀下来，让下一轮迭代少一点重复试错',
    'landing.radar.title': '六维表现雷达',
    'landing.radar.subtitle': '把有没有顶住和该不该继续优化，放在同一张图里看',
    'landing.radar.badge': '会话分析在本地',
    'landing.radar.signalTitle': '重点盯住的成本漏洞',
  },
  en: {
    'landing.hero.title': 'See what actually happened, then judge whether the change was worth it.',
    'landing.hero.kicker': 'ClawClip does more than store logs. It turns each run into an evidence trail, uses the Agent Scorecard to show whether the run held up, and puts cost on the table so you can tell whether the optimization was actually worth it.',
    'landing.hero.meta': 'Run Insights · Agent Scorecard · Cost Report — Session analysis stays local, and agent run data is not uploaded',
    'landing.feature.replay.desc': 'Turn key steps, tool calls, retries, and failures into one evidence trail so you can see what actually happened',
    'landing.feature.benchmark.desc': 'Use six heuristic signals to judge whether the run held up, not just whether it technically finished',
    'landing.feature.cost.desc': 'Break spend down by model, task, and usage so you can tell whether the gain justified the bill',
    'landing.feature.prompt.desc': 'Check whether extra tokens, longer prompts, and heavier context bought enough result to earn their keep',
    'landing.feature.compare.desc': 'Put before and after side by side so you can confirm the improvement is real, not just the bill moving elsewhere',
    'landing.feature.resources': 'Template Library + Knowledge',
    'landing.feature.resources.desc': 'Keep proven templates and local run history reusable so the next iteration starts with less repeated trial and error',
    'landing.radar.title': 'Six-dimension radar',
    'landing.radar.subtitle': 'Read whether the run held up and what deserves the next fix in one view',
    'landing.radar.badge': 'Session analysis stays local',
    'landing.radar.signalTitle': 'Cost leaks we track',
  },
} as const

const RADAR_METRICS = [
  { key: 'writing', labelZh: '写作', labelEn: 'Writing', score: 68 },
  { key: 'coding', labelZh: '编程', labelEn: 'Coding', score: 49 },
  { key: 'tools', labelZh: '工具', labelEn: 'Tools', score: 91 },
  { key: 'search', labelZh: '检索', labelEn: 'Search', score: 56 },
  { key: 'safety', labelZh: '安全', labelEn: 'Safety', score: 85 },
  { key: 'value', labelZh: '性价比', labelEn: 'Value', score: 82 },
] as const

const RADAR_LEVELS = [0.25, 0.5, 0.75, 1] as const
const RADAR_CENTER = 120
const RADAR_RADIUS = 78
const RADAR_WASTE_SIGNALS: Record<'zh' | 'en', string[]> = {
  zh: ['重试循环', '长 Prompt', '上下文膨胀', '高价模型误配'],
  en: ['Retry churn', 'Long prompts', 'Context bloat', 'Premium model mismatch'],
}

function getRadarPoint(index: number, scale: number) {
  const angle = (Math.PI * 2 * index) / RADAR_METRICS.length - Math.PI / 2
  return {
    x: RADAR_CENTER + Math.cos(angle) * RADAR_RADIUS * scale,
    y: RADAR_CENTER + Math.sin(angle) * RADAR_RADIUS * scale,
  }
}

function toSvgPoint(point: { x: number; y: number }) {
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`
}

function getRadarLabelAnchor(index: number) {
  if (index === 0 || index === 3) return 'middle'
  return index < 3 ? 'start' : 'end'
}

function getRadarLabelBaseline(index: number) {
  if (index === 0) return 'alphabetic'
  if (index === 3) return 'hanging'
  return 'middle'
}

const FEATURES = [
  {
    icon: Eye,
    tab: 'replay' as const,
    titleKey: 'nav.replay',
    descKey: 'landing.feature.replay.desc',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Coins,
    tab: 'cost' as const,
    titleKey: 'nav.cost',
    descKey: 'landing.feature.cost.desc',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Trophy,
    tab: 'benchmark' as const,
    titleKey: 'feat.benchmark',
    descKey: 'landing.feature.benchmark.desc',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Zap,
    tab: 'prompt' as const,
    titleKey: 'nav.prompt',
    descKey: 'landing.feature.prompt.desc',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: GitCompareArrows,
    tab: 'compare' as const,
    titleKey: 'nav.compare',
    descKey: 'landing.feature.compare.desc',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    icon: Database,
    tab: 'knowledge' as const,
    titleKey: 'landing.feature.resources',
    descKey: 'landing.feature.resources.desc',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
] as const

const HIGHLIGHTS = [
  { icon: Eye, textKey: 'highlight.compat' as const },
  { icon: Shield, textKey: 'highlight.local' as const },
  { icon: Coins, textKey: 'highlight.free' as const },
  { icon: Zap, textKey: 'highlight.demo' as const },
]

export default function Landing({ onEnterDemo }: Props) {
  const { t, locale } = useI18n()
  const [radarReady, setRadarReady] = useState(false)
  const copyLocale = locale === 'zh' ? 'zh' : 'en'
  const copy = (key: string) => (LANDING_LOCAL_COPY[copyLocale] as Record<string, string>)[key] ?? t(key as never)
  const radarWasteSignals = RADAR_WASTE_SIGNALS[copyLocale]
  const radarId = useId().replace(/:/g, '')

  useEffect(() => {
    const frame = requestAnimationFrame(() => setRadarReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const radarGridPolygons = RADAR_LEVELS.map(level =>
    RADAR_METRICS.map((_, index) => toSvgPoint(getRadarPoint(index, level))).join(' '),
  )
  const radarDataPoints = RADAR_METRICS.map((metric, index) => ({
    ...metric,
    label: copyLocale === 'zh' ? metric.labelZh : metric.labelEn,
    point: getRadarPoint(index, metric.score / 100),
    labelPoint: getRadarPoint(index, 1.2),
  }))
  const radarShapePoints = radarDataPoints.map(({ point }) => toSvgPoint(point)).join(' ')

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-slate-50 text-slate-800 overflow-hidden">
      {/* Ambient orbs — absolute so they don't overlap on scroll */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] left-[15%] w-[700px] h-[700px] bg-blue-200/20 rounded-full blur-[120px]" />
        <div className="absolute top-[60%] right-[10%] w-[500px] h-[500px] bg-cyan-100/15 rounded-full blur-[100px]" />
        <div className="absolute top-[35%] right-[5%] w-[300px] h-[300px] bg-emerald-100/10 rounded-full blur-[80px]" />
      </div>

      {/* Nav — sticky glass bar for scroll stability */}
      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/75 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/65">
        <nav className="relative flex flex-wrap items-center justify-between gap-3 px-6 lg:px-16 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍤</span>
              <span className="text-lg font-bold text-slate-900">{t('app.name')}</span>
              <span className="text-xs text-slate-500">ClawClip</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Ylsssq926/clawclip"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-accent transition-colors px-3 py-2 rounded-lg hover:bg-blue-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
            >
              <Github className="w-4 h-4" /> GitHub
            </a>
            <LanguageSwitcher variant="landing" />
            <button
              type="button"
              onClick={() => onEnterDemo()}
              className="text-sm font-medium px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-cyan-500 text-white shadow-md shadow-[#3b82c4]/35 hover:shadow-lg hover:shadow-[#3b82c4]/45 transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white/90"
            >
              {t('landing.cta.demo')}
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 pt-20 pb-24 lg:pt-28 lg:pb-32">
        <div className="grid items-center gap-12 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight text-slate-900 mb-5">
              {copy('landing.hero.title')}
            </h1>
            <p className="text-lg lg:text-xl text-slate-700 leading-relaxed mb-3">
              {copy('landing.hero.kicker')}
            </p>
            <p className="text-sm lg:text-base text-slate-500 leading-relaxed max-w-xl mb-10">
              {copy('landing.hero.meta')}
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => onEnterDemo()}
                className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-accent to-cyan-500 text-white font-semibold text-base shadow-lg shadow-[#3b82c4]/35 hover:shadow-xl hover:shadow-[#3b82c4]/45 transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white/90"
              >
                <Play className="w-5 h-5" />
                {t('landing.cta.demo')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="https://github.com/Ylsssq926/clawclip"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-8 py-4 rounded-2xl border border-accent/15 text-slate-700 font-medium text-base bg-white/60 hover:bg-accent/5 hover:border-accent/25 transition-[transform,background-color,border-color] duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white/90"
              >
                <Github className="w-5 h-5" />
                {t('landing.cta.source')}
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
            className="w-full max-w-[460px] md:ml-auto"
          >
            <div className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-white/80 p-5 shadow-[0_24px_80px_-48px_rgba(59,130,196,0.55)] backdrop-blur-xl sm:p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-400/5 to-transparent" />
              <div className="relative">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{copy('landing.radar.title')}</p>
                    <p className="text-xs text-slate-500">{copy('landing.radar.subtitle')}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600">
                    {copy('landing.radar.badge')}
                  </span>
                </div>

                <svg viewBox="0 0 240 240" className="w-full">
                  <defs>
                    <linearGradient id={`${radarId}-fill`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="rgba(59,130,196,0.35)" />
                      <stop offset="100%" stopColor="rgba(6,182,212,0.12)" />
                    </linearGradient>
                  </defs>

                  {radarGridPolygons.map((points, index) => (
                    <polygon
                      key={points}
                      points={points}
                      fill="none"
                      stroke={index === radarGridPolygons.length - 1 ? 'rgba(148,163,184,0.28)' : 'rgba(148,163,184,0.18)'}
                      strokeWidth={index === radarGridPolygons.length - 1 ? '1.2' : '1'}
                    />
                  ))}

                  {RADAR_METRICS.map((_, index) => {
                    const outerPoint = getRadarPoint(index, 1)
                    return (
                      <line
                        key={`axis-${index}`}
                        x1={RADAR_CENTER}
                        y1={RADAR_CENTER}
                        x2={outerPoint.x}
                        y2={outerPoint.y}
                        stroke="rgba(148,163,184,0.22)"
                        strokeWidth="1"
                      />
                    )
                  })}

                  <g
                    className="transition-[transform,opacity] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      transformOrigin: `${RADAR_CENTER}px ${RADAR_CENTER}px`,
                      transformBox: 'fill-box',
                      transform: radarReady ? 'scale(1)' : 'scale(0)',
                      opacity: radarReady ? 1 : 0.12,
                    }}
                  >
                    <polygon
                      points={radarShapePoints}
                      fill={`url(#${radarId}-fill)`}
                      stroke="rgb(59 130 246)"
                      strokeWidth="2.5"
                    />

                    {radarDataPoints.map(({ key, point }) => (
                      <g key={key}>
                        <circle cx={point.x} cy={point.y} r="4.5" fill="white" stroke="rgb(59 130 246)" strokeWidth="2" />
                        <circle cx={point.x} cy={point.y} r="1.5" fill="rgb(59 130 246)" />
                      </g>
                    ))}
                  </g>

                  <circle cx={RADAR_CENTER} cy={RADAR_CENTER} r="3.5" fill="rgb(59 130 246)" />

                  {radarDataPoints.map(({ key, label, score, labelPoint }, index) => (
                    <text
                      key={`label-${key}`}
                      x={labelPoint.x}
                      y={labelPoint.y}
                      textAnchor={getRadarLabelAnchor(index)}
                      dominantBaseline={getRadarLabelBaseline(index)}
                    >
                      <tspan className="fill-slate-500" fontSize="10">{label}</tspan>
                      <tspan x={labelPoint.x} dy="14" className="fill-slate-800" fontSize="11" fontWeight="700">{score}</tspan>
                    </text>
                  ))}
                </svg>

                <div className="mt-5 border-t border-slate-200/70 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {copy('landing.radar.signalTitle')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {radarWasteSignals.map(signal => (
                      <span
                        key={signal}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
          className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {HIGHLIGHTS.map((h, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3">
              <h.icon className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="text-xs text-slate-400">{t(h.textKey)}</span>
            </div>
          ))}
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className="mt-12 flex flex-wrap justify-center gap-8 lg:gap-16"
        >
          {[
            { num: String(radarWasteSignals.length), labelKey: 'landing.stats.wasteSignals' as const },
            { num: '6', labelKey: 'landing.stats.dimensions' as const },
            { num: '7', labelKey: 'landing.stats.languages' as const },
            { num: '0', labelKey: 'landing.stats.apicost' as const },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="bg-gradient-to-r from-accent to-cyan-500 bg-clip-text text-3xl font-black text-transparent lg:text-4xl">
                {s.num === '0' ? '$0' : s.num}
              </div>
              <div className="mt-1 text-xs text-slate-500">{t(s.labelKey)}</div>
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
            ).map(({ step, icon: Ico, titleKey, descKey }, i) => (
              <motion.div
                key={titleKey}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -3, scale: 1.02 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
                className="rounded-2xl border border-blue-100 bg-blue-50 p-5 hover:border-blue-200 cursor-default"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-accent tabular-nums">0{step}</span>
                  <Ico className="w-4 h-4 text-cyan-600 shrink-0" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">{t(titleKey)}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{t(descKey)}</p>
              </motion.div>
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

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.button
              key={f.titleKey}
              type="button"
              onClick={() => onEnterDemo(f.tab)}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, boxShadow: '0 12px 32px -8px rgba(59,130,196,0.15)' }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
              className="cursor-pointer rounded-2xl border border-blue-100 bg-white p-6 text-left shadow-sm hover:border-blue-300"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${f.iconBg}`}>
                  <f.icon className={`h-5 w-5 ${f.iconColor}`} />
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-900">{copy(f.titleKey)}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{copy(f.descKey)}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Leaderboard + Evolution Curve highlight */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
            className="bg-gradient-to-br from-amber-50 via-white to-rose-50 border border-amber-200/60 rounded-2xl p-8 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Medal className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t('landing.leaderboard.title')}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">{t('landing.leaderboard.desc')}</p>
            <div className="space-y-2 mb-6">
              {[
                { rank: '🥇', name: 'AgentPro', score: 92.4 },
                { rank: '🥈', name: 'CodeWizard', score: 87.1 },
                { rank: '🥉', name: 'TaskMaster', score: 83.8 },
              ].map((e, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/80 border border-amber-100">
                  <span className="text-lg">{e.rank}</span>
                  <span className="text-sm font-medium text-slate-800 flex-1">{e.name}</span>
                  <span className="text-sm font-bold text-amber-600 tabular-nums">{e.score}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onEnterDemo('leaderboard')}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-md shadow-amber-400/30 hover:shadow-lg hover:shadow-amber-400/40 transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50/90"
            >
              {t('landing.leaderboard.cta')}
            </button>
          </motion.div>

          {/* Evolution Curve */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
            className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 border border-blue-200/60 rounded-2xl p-8 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t('landing.curve.title')}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">{t('landing.curve.desc')}</p>
            <div className="flex-1 flex items-end">
              <svg viewBox="0 0 320 120" className="w-full h-32">
                <defs>
                  <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(59,130,196,0.3)" />
                    <stop offset="100%" stopColor="rgba(59,130,196,0)" />
                  </linearGradient>
                </defs>
                <path d="M0,110 Q40,100 80,85 T160,60 T240,35 T320,15" fill="none" stroke="rgba(59,130,196,0.5)" strokeWidth="2" strokeDasharray="4 3" />
                <path d="M0,105 Q40,95 80,78 T160,52 T240,28 T320,10" fill="none" stroke="rgba(59,130,196,0.9)" strokeWidth="2.5" />
                <path d="M0,105 Q40,95 80,78 T160,52 T240,28 T320,10 L320,120 L0,120 Z" fill="url(#curveGrad)" />
                {[
                  [20, 100], [60, 90], [100, 75], [140, 62], [180, 48],
                  [220, 38], [260, 26], [300, 14],
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="3.5" fill="white" stroke="rgba(59,130,196,0.8)" strokeWidth="2" />
                ))}
                <text x="8" y="12" fontSize="9" fill="rgba(100,116,139,0.6)">{CURVE_Y_AXIS_LABEL[locale] ?? CURVE_Y_AXIS_LABEL.en}</text>
                <text x="280" y="118" fontSize="9" fill="rgba(100,116,139,0.6)">{t('landing.curve.axis')}</text>
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="relative z-10 bg-gradient-to-b from-white via-slate-100 to-[#0b1120]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-transparent via-[#3b82c4]/5 to-transparent" />

        {/* Demo Preview */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-16 pb-24 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-slate-900 via-[#0f172a] to-[#0b1120] shadow-[0_30px_100px_-40px_rgba(11,17,32,0.85)]"
          >
            <div className="border-b border-white/10 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent p-8 text-center lg:p-12">
              <h2 className="text-2xl font-bold text-slate-50 lg:text-3xl mb-3">{t('landing.preview.title')}</h2>
              <p className="mx-auto mb-8 max-w-md text-slate-300">
                {t('landing.preview.desc')}
              </p>
              <button
                type="button"
                onClick={() => onEnterDemo()}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-accent to-cyan-500 text-white font-semibold shadow-lg shadow-[#3b82c4]/35 hover:shadow-xl hover:shadow-[#3b82c4]/45 transition-[transform,box-shadow] duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a]"
              >
                <Play className="w-5 h-5" />
                {t('landing.preview.cta')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            {/* Mock dashboard */}
            <div className="px-8 lg:px-12 pb-8 pt-6">
              <div className="rounded-t-xl border border-white/10 border-b-0 bg-gradient-to-b from-slate-900 to-slate-800 p-6 space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 h-6 rounded-md bg-slate-700/50 max-w-xs" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: t('dashboard.stat.cli'), value: '🟢 Online' },
                    { label: t('dashboard.stat.monthCost'), value: '$3.42' },
                    { label: copyLocale === 'zh' ? 'Token 浪费' : 'Token waste', value: '$0.91' },
                    { label: copyLocale === 'zh' ? '优先修复' : 'Fix first', value: copyLocale === 'zh' ? '重试循环' : 'Retry churn' },
                  ].map((cell, i) => (
                    <div key={i} className="rounded-lg bg-slate-700/40 border border-slate-600/30 p-3">
                      <div className="text-[10px] text-slate-500 mb-1 truncate">{cell.label}</div>
                      <div className="text-sm font-bold text-slate-200">{cell.value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8 rounded-lg bg-slate-700/30 border border-slate-600/30 p-3 h-28">
                    <div className="text-[10px] text-slate-500 mb-2">{t('cost.chart.title')}</div>
                    <div className="flex items-end gap-1 h-16">
                      {[40, 65, 50, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-accent to-cyan-400 opacity-70" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-4 rounded-lg bg-slate-700/30 border border-slate-600/30 p-3 h-28">
                    <div className="text-[10px] text-slate-500 mb-2">{t('benchmark.curve.title')}</div>
                    <div className="flex items-center justify-center h-16">
                      <svg viewBox="0 0 100 100" className="w-16 h-16">
                        <polygon points="50,10 90,35 80,80 20,80 10,35" fill="none" stroke="rgba(100,116,139,0.3)" strokeWidth="1" />
                        <polygon points="50,25 75,40 70,70 30,70 25,40" fill="rgba(59,130,196,0.2)" stroke="rgba(59,130,196,0.6)" strokeWidth="1.5" />
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
              <Terminal className="w-5 h-5 text-accent" />
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-50">{t('landing.install')}</h2>
            </div>
            <p className="text-slate-300 mb-8">{t('landing.install.sub')}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { step: '01', cmd: 'git clone https://github.com/Ylsssq926/clawclip.git\ncd clawclip', labelKey: 'landing.install.s1' as const },
              { step: '02', cmd: 'npm install', labelKey: 'landing.install.s2' as const },
              { step: '03', cmd: 'npm start\n# → http://localhost:8080', labelKey: 'landing.install.s3' as const },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-36px_rgba(11,17,32,0.9)] backdrop-blur-sm"
              >
                <div className="mb-4 text-3xl font-black bg-gradient-to-r from-accent to-cyan-400 bg-clip-text text-transparent">{s.step}</div>
                <p className="mb-3 text-sm font-medium text-slate-100">{t(s.labelKey)}</p>
                <pre className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/70 p-3 font-mono text-xs leading-relaxed text-slate-200">
                  {s.cmd}
                </pre>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 bg-[#0b1120]/80 py-12 px-6 lg:px-16 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-300">{t('app.name')}</span>
              <span className="text-xs text-slate-500">ClawClip</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="https://github.com/Ylsssq926/clawclip" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors flex items-center gap-1.5">
                <Github className="w-4 h-4" /> GitHub
              </a>
              <a href="https://luelan.online" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                更多作品
              </a>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> {t('landing.footer.qq')}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              {t('landing.footer.brand')}
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
