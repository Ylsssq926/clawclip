import { motion } from 'framer-motion'
import { Play, Trophy, Github, MessageCircle, ArrowRight, Terminal, Eye, Coins } from 'lucide-react'
import type { Tab } from '../App'
import { useI18n, LanguageSwitcher } from '../lib/i18n'
import { getLandingDemoMedia } from './getLandingDemoMedia'
import { getLandingHeroOverlays } from './landingHeroOverlay'

interface Props {
  onEnterDemo: (tab?: Tab) => void
}

const FLOW_STEPS = [
  {
    icon: Eye,
    titleKey: 'nav.replay',
    descKey: 'landing.feature.replay.desc',
    noteKey: 'landing.feature.replay.note',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    cardTint: 'from-blue-100/80 via-white to-white',
  },
  {
    icon: Trophy,
    titleKey: 'nav.benchmark',
    descKey: 'landing.feature.benchmark.desc',
    noteKey: 'landing.feature.benchmark.note',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    cardTint: 'from-cyan-100/80 via-white to-white',
  },
  {
    icon: Coins,
    titleKey: 'nav.cost',
    descKey: 'landing.feature.cost.desc',
    noteKey: 'landing.feature.cost.note',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    cardTint: 'from-emerald-100/80 via-white to-white',
  },
] as const

const PREVIEW_CARDS = [
  {
    icon: Eye,
    titleKey: 'landing.preview.card.retries.title',
    descKey: 'landing.preview.card.retries.desc',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Trophy,
    titleKey: 'landing.preview.card.risk.title',
    descKey: 'landing.preview.card.risk.desc',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Coins,
    titleKey: 'landing.preview.card.cost.title',
    descKey: 'landing.preview.card.cost.desc',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
] as const

export default function Landing({ onEnterDemo }: Props) {
  const { t, locale } = useI18n()
  const copy = (key: string) => t(key)
  const brandName = locale === 'zh' ? `${t('app.name')}（ClawClip）` : t('app.name')
  const heroMedia = getLandingDemoMedia(locale)
  const heroOverlays = getLandingHeroOverlays()

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-[#f5fbff] to-slate-50 text-slate-800">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[3%] h-[680px] w-[680px] rounded-full bg-blue-200/25 blur-[140px]" />
        <div className="absolute right-[6%] top-[36%] h-[420px] w-[420px] rounded-full bg-cyan-100/35 blur-[110px]" />
        <div className="absolute bottom-[-120px] left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-emerald-100/30 blur-[110px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/78 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/68">
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-4 lg:px-16">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/85 p-1.5 shadow-sm shadow-slate-200/50 ring-1 ring-slate-200/80">
              <img src="/clawclip-logo.png" alt="" className="h-full w-full object-contain" />
            </div>
            <span className="truncate text-lg font-bold text-slate-900">{brandName}</span>
          </div>
          <LanguageSwitcher variant="landing" />
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-18 pt-16 lg:px-16 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
            className="max-w-2xl"
          >
            <div className="inline-flex rounded-full border border-blue-100 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm shadow-blue-100/60">
              {copy('landing.hero.eyebrow')}
            </div>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-6xl lg:leading-[1.04]">
              {copy('landing.hero.title')}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-700 lg:text-xl">
              {copy('landing.hero.kicker')}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-500 lg:text-base">
              {copy('landing.hero.meta')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
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
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white/90"
              >
                <Github className="h-4 w-4" />
                {copy('landing.hero.source')}
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.25, 0.4, 0.25, 1] }}
            className="w-full max-w-[640px] lg:ml-auto"
          >
            <div className="relative overflow-hidden rounded-[32px] border border-white/85 bg-white/82 p-3 shadow-[0_30px_100px_-58px_rgba(15,23,42,0.38)] backdrop-blur-xl sm:p-4">
              <div className="absolute inset-x-14 top-3 h-20 rounded-full bg-cyan-200/38 blur-3xl" />
              <div className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950/98 p-3 sm:p-4">
                <div className="mb-3 flex items-center gap-2 px-1 text-slate-400">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <div className="ml-3 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
                    {copy('landing.hero.media.badge')}
                  </div>
                </div>
                <div className="relative">
                  <img
                    src={heroMedia.src}
                    alt={heroMedia.alt}
                    loading="eager"
                    className="w-full rounded-[22px] border border-white/10 bg-slate-900 object-cover shadow-[0_20px_60px_-36px_rgba(34,211,238,0.22)]"
                  />
                  {heroOverlays.map(overlay => (
                    <div
                      key={overlay.id}
                      className={`pointer-events-none absolute ${overlay.positionClassName}`}
                    >
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] font-medium text-slate-200/90 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.92)] backdrop-blur-md">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t(overlay.labelKey as never)}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-cyan-400/65" />
                        <span className="text-[11px] text-slate-200/85">{copy(overlay.valueKey)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-4 px-1 text-xs leading-relaxed text-slate-500 sm:px-2">
                {copy('landing.hero.media.caption')}
              </p>
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
            <p className="text-sm font-semibold text-accent">{copy('landing.flow.eyebrow')}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 lg:text-3xl">{copy('landing.flow.title')}</h2>
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
                className={`rounded-[28px] border border-blue-100/70 bg-gradient-to-br ${step.cardTint} p-6 shadow-[0_18px_60px_-45px_rgba(59,130,196,0.55)]`}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${step.iconBg}`}>
                    <step.icon className={`h-5 w-5 ${step.iconColor}`} />
                  </div>
                  <span className="text-xs font-mono text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{t(step.titleKey)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy(step.descKey)}</p>
                <div className="mt-5 inline-flex rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm shadow-blue-100/70">
                  {copy(step.noteKey)}
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
          className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/82 p-6 shadow-[0_28px_90px_-60px_rgba(15,23,42,0.28)] backdrop-blur-xl lg:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
            <div className="max-w-xl">
              <p className="text-sm font-semibold text-accent">{copy('landing.preview.eyebrow')}</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 lg:text-3xl">{copy('landing.preview.title')}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-500 lg:text-base">{copy('landing.preview.desc')}</p>

              <div className="mt-6 rounded-[28px] bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.7)]">
                <p className="text-sm leading-relaxed text-slate-100">{copy('landing.preview.quote')}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {PREVIEW_CARDS.map((card, index) => (
                <motion.div
                  key={card.titleKey}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-5 shadow-sm shadow-slate-200/70"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconBg}`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{copy(card.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy(card.descKey)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="rounded-[28px] border border-blue-100/70 bg-white/72 p-6 shadow-[0_20px_70px_-50px_rgba(59,130,196,0.45)] backdrop-blur-xl lg:p-8"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 lg:text-2xl">{t('landing.install')}</h2>
                  <p className="mt-1 text-sm text-slate-500">{copy('landing.install.sub')}</p>
                </div>
              </div>
            </div>
            <span className="inline-flex w-fit rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 text-xs font-medium text-accent">
              {copy('landing.install.badge')}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { step: '01', cmd: 'git clone https://github.com/Ylsssq926/clawclip.git\ncd clawclip', labelKey: 'landing.install.s1' as const },
              { step: '02', cmd: 'npm install', labelKey: 'landing.install.s2' as const },
              { step: '03', cmd: 'npm start\n# → http://localhost:8080', labelKey: 'landing.install.s3' as const },
            ].map(item => (
              <div
                key={item.step}
                className="rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-sm shadow-blue-100/70"
              >
                <div className="mb-3 text-xs font-mono text-accent">{item.step}</div>
                <p className="mb-3 text-sm font-medium text-slate-900">{t(item.labelKey)}</p>
                <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950/95 p-3 font-mono text-xs leading-relaxed text-slate-100">
                  {item.cmd}
                </pre>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white/72 px-6 py-10 backdrop-blur-sm lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/85 p-1.5 shadow-sm shadow-slate-200/50 ring-1 ring-slate-200/80">
              <img src="/clawclip-logo.png" alt="" className="h-full w-full object-contain" />
            </div>
            <span className="truncate text-sm font-medium text-slate-700">{brandName}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500 md:justify-end">
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
              {copy('landing.footer.more')}
            </a>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> {t('landing.footer.qq')}
            </span>
          </div>

          <p className="text-xs text-slate-500">{t('landing.footer.brand')}</p>
        </div>
      </footer>
    </div>
  )
}
