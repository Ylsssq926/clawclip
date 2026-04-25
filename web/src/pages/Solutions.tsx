import { useState, useEffect } from 'react'
import { useI18n } from '../lib/i18n'
import { cn } from '../lib/cn'
import { ExternalLink, Copy, Check, Wrench, Zap, Server, Settings } from 'lucide-react'
import { apiGetSafe } from '../lib/api'

interface Solution {
  id: string
  title: string
  titleZh: string
  description: string
  descriptionZh: string
  type: 'free-tier' | 'tool' | 'local-model' | 'config'
  effort: 'low' | 'medium' | 'high'
  savingsEstimate: string
  tool?: {
    name: string
    github?: string
    docs?: string
    installCmd?: string
  }
  freeTier?: {
    provider: string
    model: string
    freeLimit: string
    url: string
    signupUrl?: string
    requiresCreditCard?: boolean
  }
  configSnippet?: string
  tags: string[]
}

interface OllamaStatus {
  available: boolean
  models?: string[]
}

const SOLUTION_TYPE_ICONS = {
  'free-tier': Zap,
  'tool': Wrench,
  'local-model': Server,
  'config': Settings,
}

export default function Solutions() {
  const { t, locale } = useI18n()
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({ available: false })
  const [filterType, setFilterType] = useState<'all' | Solution['type']>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    // 获取所有解决方案
    apiGetSafe<Solution[]>('/api/solutions/all')
      .then((data) => {
        if (data) setSolutions(data)
      })
      .catch(() => {
        setSolutions([])
      })

    // 检测 Ollama
    apiGetSafe<OllamaStatus>('/api/solutions/check-ollama')
      .then((status) => {
        if (status) setOllamaStatus(status)
      })
      .catch(() => {
        setOllamaStatus({ available: false })
      })
  }, [])

  const filteredSolutions = solutions.filter((s) => {
    if (filterType === 'all') return true
    return s.type === filterType
  })

  const handleCopyConfig = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const getSolutionTitle = (solution: Solution) => {
    return locale === 'zh' ? solution.titleZh : solution.title
  }

  const getSolutionDescription = (solution: Solution) => {
    return locale === 'zh' ? solution.descriptionZh : solution.description
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('solutions.page.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('solutions.page.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            filterType === 'all'
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {t('solutions.filter.all')}
        </button>
        <button
          type="button"
          onClick={() => setFilterType('free-tier')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            filterType === 'free-tier'
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {t('solutions.filter.free')}
        </button>
        <button
          type="button"
          onClick={() => setFilterType('tool')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            filterType === 'tool'
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {t('solutions.filter.tool')}
        </button>
        <button
          type="button"
          onClick={() => setFilterType('local-model')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            filterType === 'local-model'
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {t('solutions.filter.local')}
        </button>
        <button
          type="button"
          onClick={() => setFilterType('config')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            filterType === 'config'
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {t('solutions.filter.config')}
        </button>
      </div>

      {/* Solutions Grid */}
      {filteredSolutions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">{t('solutions.empty')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSolutions.map((solution) => {
            const Icon = SOLUTION_TYPE_ICONS[solution.type]
            const isOllamaCard = solution.id === 'ollama-local'
            const showOllamaDetected = isOllamaCard && ollamaStatus.available

            return (
              <div
                key={solution.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Type Badge */}
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      solution.type === 'free-tier' && 'bg-emerald-50 text-emerald-700',
                      solution.type === 'tool' && 'bg-blue-50 text-blue-700',
                      solution.type === 'local-model' && 'bg-purple-50 text-purple-700',
                      solution.type === 'config' && 'bg-amber-50 text-amber-700',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(`solutions.type.${solution.type}`)}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      solution.effort === 'low' && 'text-emerald-600',
                      solution.effort === 'medium' && 'text-amber-600',
                      solution.effort === 'high' && 'text-red-600',
                    )}
                  >
                    {t(`solutions.effort.${solution.effort}`)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mb-2 text-base font-semibold text-slate-900">
                  {getSolutionTitle(solution)}
                </h3>

                {/* Description */}
                <p className="mb-4 text-sm leading-relaxed text-slate-600">
                  {getSolutionDescription(solution)}
                </p>

                {/* Savings */}
                <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">{t('solutions.card.savings')}</p>
                  <p className="text-lg font-bold text-slate-900">{solution.savingsEstimate}</p>
                </div>

                {/* Ollama Detection */}
                {showOllamaDetected && (
                  <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2">
                    <p className="text-xs font-medium text-emerald-700">
                      {t('solutions.ollama.detected')}
                    </p>
                    {ollamaStatus.models && ollamaStatus.models.length > 0 && (
                      <p className="mt-1 text-xs text-emerald-600">
                        {ollamaStatus.models.slice(0, 3).join(', ')}
                        {ollamaStatus.models.length > 3 && ` +${ollamaStatus.models.length - 3}`}
                      </p>
                    )}
                  </div>
                )}

                {/* Free Tier Info */}
                {solution.freeTier && (
                  <div className="mb-4 space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{t('solutions.card.provider')}</span>
                      <span className="font-medium text-slate-900">{solution.freeTier.provider}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{t('solutions.card.model')}</span>
                      <span className="font-mono text-slate-900">{solution.freeTier.model}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{t('solutions.card.freeLimit')}</span>
                      <span className="font-medium text-slate-900">{solution.freeTier.freeLimit}</span>
                    </div>
                    {solution.freeTier.requiresCreditCard !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={cn(
                            'font-medium',
                            solution.freeTier.requiresCreditCard ? 'text-amber-600' : 'text-emerald-600',
                          )}
                        >
                          {solution.freeTier.requiresCreditCard
                            ? t('solutions.card.requiresCreditCard')
                            : t('solutions.card.noCreditCard')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tool Info */}
                {solution.tool && (
                  <div className="mb-4 space-y-2 border-t border-slate-100 pt-4">
                    {solution.tool.installCmd && (
                      <div>
                        <p className="mb-1 text-xs text-slate-500">{t('solutions.card.install')}</p>
                        <code className="block rounded bg-slate-900 px-2 py-1.5 text-xs text-slate-100">
                          {solution.tool.installCmd}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                {/* Config Snippet */}
                {solution.configSnippet && (
                  <div className="mb-4 border-t border-slate-100 pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-700">{t('solutions.card.config')}</p>
                      <button
                        type="button"
                        onClick={() => handleCopyConfig(solution.id, solution.configSnippet!)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                      >
                        {copiedId === solution.id ? (
                          <>
                            <Check className="h-3 w-3" />
                            {t('solutions.card.copied')}
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            {t('solutions.card.copyConfig')}
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded bg-slate-900 px-3 py-2 text-xs text-slate-100">
                      {solution.configSnippet}
                    </pre>
                  </div>
                )}

                {/* Links */}
                <div className="flex flex-wrap gap-2">
                  {solution.freeTier?.signupUrl && (
                    <a
                      href={solution.freeTier.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      {t('solutions.card.signup')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {solution.freeTier?.url && !solution.freeTier.signupUrl && (
                    <a
                      href={solution.freeTier.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {t('solutions.card.docs')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {solution.tool?.docs && (
                    <a
                      href={solution.tool.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {t('solutions.card.docs')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {solution.tool?.github && (
                    <a
                      href={solution.tool.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {t('solutions.card.github')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs leading-relaxed text-amber-800">{t('solutions.disclaimer')}</p>
      </div>
    </div>
  )
}
