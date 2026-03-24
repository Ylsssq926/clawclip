import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Locale = 'zh' | 'en'

const zh: Record<string, string> = {
  'app.name': '虾片',
  'app.subtitle': 'ClawClip',
  'app.demo': 'DEMO',
  'app.demo.desc': '你正在浏览演示数据 · 本地部署后可查看真实 Agent 数据',
  'app.demo.desc.en': 'Viewing demo data · Deploy locally to see real Agent data',
  'app.back': '返回首页',
  'app.lobster': '🍤 龙虾待命中',
  'nav.dashboard': '仪表盘',
  'nav.replay': '回放',
  'nav.benchmark': '评测',
  'nav.cost': '费用',
  'nav.skills': 'Skills',
  'nav.templates': '模板',
  'nav.knowledge': '知识库',
  'nav.leaderboard': '排行榜',
  'landing.tagline': '支持 OpenClaw / ZeroClaw 及所有兼容 Agent 框架',
  'landing.hero.line1': '你的 AI Agent',
  'landing.hero.line2': '到底干了什么？',
  'landing.hero.desc': '虾片 (ClawClip) 把无聊的 Agent 日志变成好看的时间轴回放，给你的龙虾做六维体检打分，顺便看看钱都花哪了。',
  'landing.cta.demo': '体验 Demo',
  'landing.cta.source': '查看源码',
  'landing.features': '核心功能',
  'landing.features.sub': '装好龙虾，打开虾片，一切尽在掌握',
  'landing.preview.title': '想看看效果？',
  'landing.preview.desc': '内置 8 条真实场景的 Demo 会话——小红书文案、代码调试、竞品分析、翻译……不用安装，直接体验。',
  'landing.preview.cta': '进入 Demo 演示',
  'landing.install': '三步安装',
  'landing.install.sub': '本地部署，数据完全在你手里',
  'landing.install.s1': '克隆仓库',
  'landing.install.s2': '安装依赖',
  'landing.install.s3': '启动服务',
  'feat.replay': '会话回放',
  'feat.replay.desc': '把 AI Agent 的 JSONL 日志变成可交互的时间轴——每一步思考、工具调用、结果、花费，一目了然。',
  'feat.benchmark': '六维评测',
  'feat.benchmark.desc': '离线分析历史会话，从写作、代码、工具、检索、安全、性价比六个维度给你的 Agent 打分。不调 API，不花钱。',
  'feat.cost': '成本监控',
  'feat.cost.desc': '逐日 Token 趋势、模型费用对比、预算告警、高消耗排行。每分钱花到哪了，清清楚楚。',
  'feat.wordcloud': '词云与标签',
  'feat.wordcloud.desc': '自动提取会话关键词生成词云，按主题/工具/模型着色。会话自动标签，快速筛选。',
  'highlight.compat': '支持 OpenClaw / ZeroClaw 及所有兼容框架',
  'highlight.local': '纯本地运行，数据不出你的电脑',
  'highlight.free': '评测离线分析，零 API 成本',
  'highlight.demo': '内置 Demo 数据，无需安装即可体验',
  'dashboard.greeting.morning': '早上好',
  'dashboard.greeting.afternoon': '下午好',
  'dashboard.greeting.evening': '晚上好',
  'dashboard.greeting.night': '夜深了',
  'dashboard.greeting.suffix': '，主人',
  'dashboard.status.running': '运行中',
  'dashboard.status.offline': '未连接',
  'dashboard.status.checking': '--',
  'dashboard.quick': '快捷操作',
  'dashboard.keywords': '热门关键词',
  'dashboard.recent': '最近活动',
  'dashboard.recent.all': '查看全部 →',
}

const en: Record<string, string> = {
  'app.name': 'ClawClip',
  'app.subtitle': '虾片',
  'app.demo': 'DEMO',
  'app.demo.desc': 'Viewing demo data · Deploy locally to see real Agent data',
  'app.back': 'Back to Home',
  'app.lobster': '🍤 Lobster on standby',
  'nav.dashboard': 'Dashboard',
  'nav.replay': 'Replay',
  'nav.benchmark': 'Benchmark',
  'nav.cost': 'Cost',
  'nav.skills': 'Skills',
  'nav.templates': 'Templates',
  'nav.knowledge': 'Knowledge',
  'nav.leaderboard': 'Leaderboard',
  'landing.tagline': 'Works with OpenClaw / ZeroClaw and all compatible Agent frameworks',
  'landing.hero.line1': 'What did your AI Agent',
  'landing.hero.line2': 'actually do?',
  'landing.hero.desc': 'ClawClip turns boring Agent logs into beautiful timeline replays, benchmarks your Agent across 6 dimensions, and tracks where your money went.',
  'landing.cta.demo': 'Try Demo',
  'landing.cta.source': 'View Source',
  'landing.features': 'Core Features',
  'landing.features.sub': 'Install your Agent, open ClawClip, see everything',
  'landing.preview.title': 'Want to see it in action?',
  'landing.preview.desc': '8 built-in demo sessions — copywriting, code debugging, competitive analysis, translation... No install needed.',
  'landing.preview.cta': 'Enter Demo',
  'landing.install': '3-Step Install',
  'landing.install.sub': 'Deploy locally, your data stays with you',
  'landing.install.s1': 'Clone repo',
  'landing.install.s2': 'Install deps',
  'landing.install.s3': 'Start server',
  'feat.replay': 'Session Replay',
  'feat.replay.desc': 'Turn JSONL logs into an interactive timeline — every thought, tool call, result, and cost at a glance.',
  'feat.benchmark': '6-Dimension Benchmark',
  'feat.benchmark.desc': 'Offline analysis of session history. Score your Agent on writing, coding, tools, search, safety, and cost efficiency. No API calls, no cost.',
  'feat.cost': 'Cost Monitor',
  'feat.cost.desc': 'Daily token trends, model cost comparison, budget alerts, top spending tasks. Every penny tracked.',
  'feat.wordcloud': 'Word Cloud & Tags',
  'feat.wordcloud.desc': 'Auto-extract keywords into a visual cloud, colored by topic/tool/model. Auto-tag sessions for quick filtering.',
  'highlight.compat': 'Works with OpenClaw / ZeroClaw and all compatible frameworks',
  'highlight.local': 'Runs locally, your data never leaves your machine',
  'highlight.free': 'Offline analysis, zero API cost',
  'highlight.demo': 'Built-in demo data, try without installing',
  'dashboard.greeting.morning': 'Good morning',
  'dashboard.greeting.afternoon': 'Good afternoon',
  'dashboard.greeting.evening': 'Good evening',
  'dashboard.greeting.night': 'Late night',
  'dashboard.greeting.suffix': '',
  'dashboard.status.running': 'Running',
  'dashboard.status.offline': 'Offline',
  'dashboard.status.checking': '--',
  'dashboard.quick': 'Quick Actions',
  'dashboard.keywords': 'Trending Keywords',
  'dashboard.recent': 'Recent Activity',
  'dashboard.recent.all': 'View all →',
}

const locales: Record<Locale, Record<string, string>> = { zh, en }

interface I18nContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'zh',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('clawclip-lang') : null
    if (saved === 'en') return 'en'
    return 'zh'
  })

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('clawclip-lang', l)
  }, [])

  const t = useCallback((key: string) => {
    return locales[locale]?.[key] ?? locales.zh[key] ?? key
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  return (
    <button
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]"
      title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      {locale === 'zh' ? 'EN' : '中'}
    </button>
  )
}
