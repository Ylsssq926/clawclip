import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  Trophy, 
  Github, 
  MessageCircle, 
  ArrowRight, 
  Terminal, 
  Eye, 
  Coins, 
  Check, 
  Copy, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Layers, 
  TrendingDown, 
  Code2
} from 'lucide-react'
import type { Tab } from '../App'
import { useI18n, LanguageSwitcher } from '../lib/i18n'
import { getLandingDemoMedia } from './getLandingDemoMedia'
import { getLandingHeroOverlays } from './landingHeroOverlay'

interface Props {
  onEnterDemo: (tab?: Tab) => void
}

const FLOW_STEPS = [
  {
    tab: 'replay' as const,
    icon: Eye,
    titleKey: 'nav.replay',
    descKey: 'landing.feature.replay.desc',
    badgeKey: 'landing.feature.replay.note',
    iconBg: 'bg-blue-500/10 text-blue-600',
    borderHover: 'hover:border-blue-500/40',
    bullets: [
      '逐帧拆解思维链与工具调用',
      '精准标记无效重试与停滞步骤',
      '清晰展示每一步的 Token 与耗时'
    ],
    bulletsEn: [
      'Step-by-step reasoning & tool inspection',
      'Pinpoint spinning retries & dead ends',
      'Per-step token & latency breakdown'
    ]
  },
  {
    tab: 'benchmark' as const,
    icon: Trophy,
    titleKey: 'nav.benchmark',
    descKey: 'landing.feature.benchmark.desc',
    badgeKey: 'landing.feature.benchmark.note',
    iconBg: 'bg-cyan-500/10 text-cyan-600',
    borderHover: 'hover:border-cyan-500/40',
    bullets: [
      '七维雷达启发式综合能力诊断',
      '新旧版本并排 A/B 验证对比',
      '用事实判断改动是优化还是劣化'
    ],
    bulletsEn: [
      '7-dimensional radar behavioral scoring',
      'Side-by-side A/B version evaluation',
      'Proof of true improvement vs regression'
    ]
  },
  {
    tab: 'cost' as const,
    icon: Coins,
    titleKey: 'nav.cost',
    descKey: 'landing.feature.cost.desc',
    badgeKey: 'landing.feature.cost.note',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    borderHover: 'hover:border-emerald-500/40',
    bullets: [
      '多模型与任务维度花费拆解',
      '定位上下文膨胀与高价模型错配',
      '一键生成可落地的平替降本配置'
    ],
    bulletsEn: [
      'Per-model & per-task cost breakdown',
      'Flag prompt bloat & model mismatch',
      'Actionable savings & model right-sizing'
    ]
  },
] as const

const PREVIEW_CARDS = [
  {
    icon: Zap,
    titleKey: 'landing.preview.card.retries.title',
    descKey: 'landing.preview.card.retries.desc',
    iconBg: 'bg-amber-500/10 text-amber-600',
  },
  {
    icon: Layers,
    titleKey: 'landing.preview.card.risk.title',
    descKey: 'landing.preview.card.risk.desc',
    iconBg: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: TrendingDown,
    titleKey: 'landing.preview.card.cost.title',
    descKey: 'landing.preview.card.cost.desc',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
  },
] as const

export default function Landing({ onEnterDemo }: Props) {
  const { t, locale } = useI18n()
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)

  const copy = (key: string) => t(key)
  const brandName = locale === 'zh' ? `${t('app.name')}（ClawClip）` : t('app.name')
  const heroMedia = getLandingDemoMedia(locale)
  const heroOverlays = getLandingHeroOverlays()

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCmd(id)
      setTimeout(() => setCopiedCmd(null), 2000)
    })
  }

  const isZh = locale === 'zh'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fafcff] text-slate-800 antialiased selection:bg-blue-500/15 selection:text-slate-900">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-grid-subtle">
        <div className="absolute left-1/2 top-0 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-200/35 via-cyan-100/20 to-transparent blur-[120px]" />
        <div className="absolute right-[5%] top-[30%] h-[450px] w-[450px] rounded-full bg-cyan-100/30 blur-[130px]" />
        <div className="absolute bottom-[-100px] left-[10%] h-[500px] w-[500px] rounded-full bg-emerald-100/25 blur-[140px]" />
      </div>

      {/* Modern Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-md backdrop-saturate-150">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5 lg:px-12">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm border border-slate-200/80">
              <img src="/clawclip-logo-64.png" alt="ClawClip Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900">{brandName}</span>
              <span className="hidden sm:inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600 border border-slate-200/60">
                v2.5.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <a
              href="https://github.com/Ylsssq926/clawclip"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 transition-colors hover:text-blue-600"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <div className="h-4 w-px bg-slate-200" />
            <LanguageSwitcher variant="landing" />
            <button
              type="button"
              onClick={() => onEnterDemo('dashboard')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {isZh ? '工作台' : 'Workspace'}
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-16 lg:px-12 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            {/* Top Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm shadow-blue-500/5">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span>{copy('landing.hero.eyebrow')}</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-5xl lg:leading-[1.12]">
              {copy('landing.hero.title')}
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-600">
              {copy('landing.hero.kicker')}
            </p>

            {/* Meta badges */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 border border-slate-200/80 shadow-xs text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                {isZh ? '100% 本地解析' : '100% Local Parsing'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 border border-slate-200/80 shadow-xs text-slate-700">
                <Code2 className="h-3.5 w-3.5 text-blue-600" />
                {isZh ? '原生适配 OpenClaw / ZeroClaw' : 'OpenClaw & ZeroClaw Ready'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 border border-slate-200/80 shadow-xs text-slate-700">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                {isZh ? '即装即用 · 零侵入' : 'Zero Config · Non-intrusive'}
              </span>
            </div>

            {/* CTA Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => onEnterDemo('replay')}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-card transition-all duration-200 hover:bg-slate-800 hover:shadow-card-hover hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Play className="h-4 w-4 fill-current text-cyan-300" />
                <span>{copy('landing.cta.demoPrimary')}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-white" />
              </button>

              <a
                href="https://github.com/Ylsssq926/clawclip"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-medium text-slate-700 border border-slate-200/90 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 active:scale-[0.99]"
              >
                <Github className="h-4 w-4" />
                <span>{copy('landing.hero.source')}</span>
              </a>
            </div>

            {/* Quick Install Pill */}
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 p-1.5 pl-3 shadow-xs max-w-md backdrop-blur-xs">
              <Terminal className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="font-mono text-xs text-slate-600 truncate select-all">
                npm i -g @clawclip/cli && clawclip
              </span>
              <button
                type="button"
                onClick={() => handleCopy('npm i -g @clawclip/cli && clawclip', 'hero-cli')}
                className="ml-auto flex h-7 items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 text-[11px] font-medium text-slate-700 transition-colors shrink-0"
                title="Copy install command"
              >
                {copiedCmd === 'hero-cli' ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span className="text-emerald-600">{isZh ? '已复制' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-slate-500" />
                    <span>{isZh ? '复制' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Right Hero Visual Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-3 shadow-2xl shadow-slate-300/40 backdrop-blur-xl">
              {/* Top Window Bar */}
              <div className="mb-3 flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  <span className="ml-2 font-mono text-[11px] text-slate-400">clawclip-session-diag.jsonl</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {copy('landing.hero.media.badge')}
                </div>
              </div>

              {/* Inner Media Frame */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-950">
                <img
                  src={heroMedia.src}
                  alt={heroMedia.alt}
                  loading="eager"
                  className="w-full object-cover transition-transform duration-500 hover:scale-[1.01]"
                />

                {/* Overlays on media */}
                {heroOverlays.map(overlay => (
                  <div
                    key={overlay.id}
                    className={`pointer-events-none absolute ${overlay.positionClassName}`}
                  >
                    <div className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/85 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        {t(overlay.labelKey as never)}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-cyan-400" />
                      <span className="font-mono text-cyan-300 font-semibold">{copy(overlay.valueKey)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Caption */}
              <div className="mt-3 flex items-center justify-between px-2 text-xs text-slate-500">
                <span className="truncate">{copy('landing.hero.media.caption')}</span>
                <span className="font-mono text-[11px] text-slate-400 shrink-0">100% Offline</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3 Core Pillars Section (Flow Steps) */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-2xl">
            <span className="badge-pill badge-blue">{copy('landing.flow.eyebrow')}</span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              {copy('landing.flow.title')}
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              {copy('landing.flow.subtitle')}
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {FLOW_STEPS.map((step, index) => (
              <motion.div
                key={step.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
                className={`group card-modern flex flex-col justify-between p-7 ${step.borderHover}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.iconBg}`}>
                      <step.icon className="h-6 w-6" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-400">
                      STEP 0{index + 1}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="inline-flex rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {copy(step.badgeKey)}
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">{t(step.titleKey)}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                      {copy(step.descKey)}
                    </p>
                  </div>

                  <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
                    {(isZh ? step.bullets : step.bulletsEn).map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <button
                    type="button"
                    onClick={() => onEnterDemo(step.tab)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition-all group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-700"
                  >
                    <span>{isZh ? `体验 ${t(step.titleKey)}` : `Explore ${t(step.titleKey)}`}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Interactive Scenario Comparison & Aha-Moment */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-20">
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 shadow-card lg:p-12">
          <div className="max-w-3xl">
            <span className="badge-pill badge-cyan">{copy('landing.preview.eyebrow')}</span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              {copy('landing.preview.title')}
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              {copy('landing.preview.desc')}
            </p>
          </div>

          {/* Side-by-side Before vs After Cards */}
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {/* Before Card */}
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/30 p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  {isZh ? '优化前：黑盒盲调' : 'Before: Blind Trial'}
                </span>
                <span className="font-mono text-xs text-rose-600/80">{isZh ? '高耗低效' : 'Inefficient'}</span>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-800">
                {isZh 
                  ? '修改 Prompt 后全靠体感猜测，高价模型空转，重试死循环悄悄烧掉预算。' 
                  : 'Guessing outcomes after prompt edits, premium models idling, and silent retry loops draining budget.'}
              </p>
              <div className="mt-5 space-y-2 font-mono text-xs text-slate-600 border-t border-rose-200/50 pt-4">
                <div className="flex justify-between py-1 border-b border-rose-100">
                  <span>Token 消耗:</span>
                  <span className="text-rose-600 font-semibold">4,820 tokens (膨胀)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rose-100">
                  <span>异常重试:</span>
                  <span className="text-rose-600 font-semibold">3 次原地空转</span>
                </div>
                <div className="flex justify-between py-1 border-b border-rose-100">
                  <span>单次成本:</span>
                  <span className="text-rose-600 font-semibold">$0.084 (溢出)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>综合评分:</span>
                  <span className="text-slate-500">54 / 100</span>
                </div>
              </div>
            </div>

            {/* After Card */}
            <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {isZh ? '优化后：ClawClip 诊断调优' : 'After: ClawClip Verified'}
                </span>
                <span className="font-mono text-xs text-emerald-700 font-semibold">-76% Token 支出</span>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-800">
                {isZh
                  ? '精简上下文，裁剪多余工具定义，精准选用平价模型，零失败稳定通过。'
                  : 'Streamlined context, pruned bloated tool schemas, right-sized models with zero failures.'}
              </p>
              <div className="mt-5 space-y-2 font-mono text-xs text-slate-600 border-t border-emerald-200/60 pt-4">
                <div className="flex justify-between py-1 border-b border-emerald-100">
                  <span>Token 消耗:</span>
                  <span className="text-emerald-700 font-semibold">1,150 tokens (-76%)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-100">
                  <span>异常重试:</span>
                  <span className="text-emerald-700 font-semibold">0 次 (直达终点)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-100">
                  <span>单次成本:</span>
                  <span className="text-emerald-700 font-semibold">$0.012 (-85%)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>综合评分:</span>
                  <span className="text-emerald-700 font-bold">88 / 100 (+34分)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Three preview pills */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PREVIEW_CARDS.map((card, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <card.icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{copy(card.titleKey)}</h4>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{copy(card.descKey)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Developer Quote */}
          <div className="mt-8 rounded-2xl bg-slate-900 p-5 text-center text-slate-200 sm:p-6">
            <p className="text-sm sm:text-base font-medium italic">
              {copy('landing.preview.quote')}
            </p>
          </div>
        </div>
      </section>

      {/* Installation & Quick Start Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-20">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-card lg:p-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Terminal className="h-4 w-4" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{t('landing.install')}</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">{copy('landing.install.sub')}</p>
            </div>
            <span className="badge-pill badge-emerald self-start sm:self-auto">
              <ShieldCheck className="h-3.5 w-3.5" />
              {copy('landing.install.badge')}
            </span>
          </div>

          {/* Steps Grid */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                step: '01',
                title: isZh ? '克隆开源仓库' : 'Clone Repo',
                cmd: 'git clone https://github.com/Ylsssq926/clawclip.git\ncd clawclip',
              },
              {
                step: '02',
                title: isZh ? '安装项目依赖' : 'Install Dependencies',
                cmd: 'npm install',
              },
              {
                step: '03',
                title: isZh ? '启动本地诊断台' : 'Start Diagnostic Bench',
                cmd: 'npm start\n# → http://localhost:8080',
              },
            ].map((item, idx) => (
              <div key={idx} className="relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-blue-600">STEP {item.step}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.cmd, `step-${idx}`)}
                      className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-600 border border-slate-200 shadow-xs hover:bg-slate-50"
                    >
                      {copiedCmd === `step-${idx}` ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600">{isZh ? '已复制' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-slate-400" />
                          <span>{isZh ? '复制' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h4>
                </div>

                <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950 p-3 font-mono text-xs text-slate-100 leading-relaxed">
                  {item.cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 lg:px-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-14 text-center shadow-2xl lg:px-16">
          <div className="absolute inset-0 bg-grid-subtle opacity-10" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              {isZh ? '开始为你的 Agent 做一次全面体检' : 'Diagnose and Right-Size Your Agent Today'}
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-300">
              {isZh 
                ? '无需任何云端凭证，开箱即用，直接连接本地日志查看深度诊断报告。'
                : 'Zero credentials required. Runs entirely on your local machine with instant insights.'}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => onEnterDemo('dashboard')}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-400 hover:scale-105 active:scale-95"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{isZh ? '打开演示工作台' : 'Launch Demo Workspace'}</span>
              </button>
              <a
                href="https://github.com/Ylsssq926/clawclip"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-xs transition-all hover:bg-white/20"
              >
                <Github className="h-4 w-4" />
                <span>GitHub Star ⭐</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-white px-6 py-10 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white p-1 shadow-xs border border-slate-200">
              <img src="/clawclip-logo-32.png" alt="" className="h-full w-full object-contain" />
            </div>
            <span className="text-sm font-semibold text-slate-800">{brandName}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-600">
            <a
              href="https://github.com/Ylsssq926/clawclip"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-blue-600"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
            <a
              href="https://luelanai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-blue-600"
            >
              {copy('landing.footer.more')}
            </a>
            <span className="flex items-center gap-1.5 text-slate-500">
              <MessageCircle className="h-4 w-4 text-blue-500" />
              <span>QQ: 892555092</span>
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {t('landing.footer.brand')}
          </p>
        </div>
      </footer>
    </div>
  )
}
