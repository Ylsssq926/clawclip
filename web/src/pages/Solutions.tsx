import { useState, useEffect } from 'react'
import { useI18n } from '../lib/i18n'
import { cn } from '../lib/cn'
import { ExternalLink, Copy, Check, Wrench, Zap, Server, Settings, AlertTriangle } from 'lucide-react'
import { apiGetSafe } from '../lib/api'

interface Solution {
  id: string
  title: string
  titleZh: string
  description: string
  descriptionZh: string
  type: 'free-tier' | 'tool' | 'local-model' | 'config' | 'proxy'
  effort: 'low' | 'medium' | 'high'
  savingsEstimate: string
  riskLevel?: 'low' | 'medium' | 'high'
  riskNote?: string
  riskNoteZh?: string
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

interface GeneratedConfig {
  runtime: 'openclaw' | 'zeroclaw'
  preset: 'zero-bill' | 'cheap-cloud' | 'hybrid'
  presetName: string
  presetNameZh: string
  description: string
  descriptionZh: string
  estimatedSavings: string
  configFile: {
    path: string
    content: string
    format: 'json' | 'toml'
  }
  envVars?: {
    name: string
    value: string
    description: string
  }[]
  steps: {
    order: number
    title: string
    titleZh: string
    command?: string
    note?: string
    noteZh?: string
  }[]
  warning?: string
  warningZh?: string
}

const SOLUTION_TYPE_ICONS = {

  'free-tier': Zap,
  'tool': Wrench,
  'local-model': Server,
  'config': Settings,
  'proxy': Server,
}

export default function Solutions() {
  const { t, locale } = useI18n()
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({ available: false })
  const [filterType, setFilterType] = useState<'all' | Solution['type']>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Config generator state
  const [selectedRuntime, setSelectedRuntime] = useState<'openclaw' | 'zeroclaw'>('openclaw')
  const [selectedPreset, setSelectedPreset] = useState<'zero-bill' | 'cheap-cloud' | 'hybrid'>('cheap-cloud')
  const [generatedConfig, setGeneratedConfig] = useState<GeneratedConfig | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [configCopied, setConfigCopied] = useState(false)

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
  const showProxyDisclaimer = filteredSolutions.some((solution) => solution.type === 'proxy')

  const handleCopyConfig = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleGenerateConfig = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/solutions/generate-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runtime: selectedRuntime,
          preset: selectedPreset,
          currentModel: 'claude-3-5-sonnet', // TODO: Get from actual session data
        }),
      })

      if (!response.ok) throw new Error('Failed to generate config')

      const config = (await response.json()) as GeneratedConfig
      setGeneratedConfig(config)
    } catch (error) {
      console.error('Error generating config:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyGeneratedConfig = () => {
    if (!generatedConfig) return
    navigator.clipboard.writeText(generatedConfig.configFile.content).then(() => {
      setConfigCopied(true)
      setTimeout(() => setConfigCopied(false), 2000)
    })
  }

  const getConfigTitle = (config: GeneratedConfig) => {
    return locale === 'zh' ? config.presetNameZh : config.presetName
  }

  const getConfigDescription = (config: GeneratedConfig) => {
    return locale === 'zh' ? config.descriptionZh : config.description
  }

  const getStepTitle = (step: GeneratedConfig['steps'][0]) => {
    return locale === 'zh' ? step.titleZh : step.title
  }

  const getStepNote = (step: GeneratedConfig['steps'][0]) => {
    if (!step.note && !step.noteZh) return null
    return locale === 'zh' ? step.noteZh : step.note
  }

  const getConfigWarning = (config: GeneratedConfig) => {
    if (!config.warning && !config.warningZh) return null
    return locale === 'zh' ? config.warningZh : config.warning
  }

  const getSolutionTitle = (solution: Solution) => {
    return locale === 'zh' ? solution.titleZh : solution.title
  }

  const getSolutionDescription = (solution: Solution) => {
    return locale === 'zh' ? solution.descriptionZh : solution.description
  }

  const getSolutionRiskNote = (solution: Solution, locale: string) => {
    return locale === 'zh' ? solution.riskNoteZh : solution.riskNote
  }

  const getSolutionRiskBadgeClass = (riskLevel: NonNullable<Solution['riskLevel']>) => {
    switch (riskLevel) {
      case 'low':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
      case 'medium':
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
      case 'high':
        return 'bg-red-50 text-red-700 ring-1 ring-red-200'
    }
  }

  const getSolutionRiskBoxClass = (riskLevel: NonNullable<Solution['riskLevel']>) => {
    switch (riskLevel) {
      case 'medium':
        return 'border-amber-200 bg-amber-50 text-amber-800'
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800'
      default:
        return 'border-slate-200 bg-slate-50 text-slate-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('solutions.page.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('solutions.page.subtitle')}</p>
      </div>

      {/* Config Generator */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t('solutions.generator.title')}</h2>
        </div>

        {!generatedConfig ? (
          <div className="space-y-4">
            {/* Current Model Display */}
            <div className="rounded-lg bg-white p-4">
              <div className="mb-2 text-xs font-medium text-slate-500">
                {t('solutions.generator.currentModel')}
              </div>
              <div className="font-mono text-sm text-slate-900">claude-3-5-sonnet</div>
            </div>

            {/* Preset Selection */}
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">
                {t('solutions.generator.runtime')}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRuntime('openclaw')}
                  className={cn(
                    'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    selectedRuntime === 'openclaw'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
                  )}
                >
                  OpenClaw
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRuntime('zeroclaw')}
                  className={cn(
                    'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    selectedRuntime === 'zeroclaw'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
                  )}
                >
                  ZeroClaw
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
                <input
                  type="radio"
                  name="preset"
                  value="zero-bill"
                  checked={selectedPreset === 'zero-bill'}
                  onChange={(e) => setSelectedPreset(e.target.value as typeof selectedPreset)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    {t('solutions.generator.preset.zeroBill')}
                  </div>
                  <div className="text-xs text-emerald-600">{t('solutions.generator.savings')}: ~100%</div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
                <input
                  type="radio"
                  name="preset"
                  value="cheap-cloud"
                  checked={selectedPreset === 'cheap-cloud'}
                  onChange={(e) => setSelectedPreset(e.target.value as typeof selectedPreset)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    {t('solutions.generator.preset.cheapCloud')}
                  </div>
                  <div className="text-xs text-emerald-600">{t('solutions.generator.savings')}: ~80%</div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200 transition-colors hover:bg-slate-50">
                <input
                  type="radio"
                  name="preset"
                  value="hybrid"
                  checked={selectedPreset === 'hybrid'}
                  onChange={(e) => setSelectedPreset(e.target.value as typeof selectedPreset)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    {t('solutions.generator.preset.hybrid')}
                  </div>
                  <div className="text-xs text-emerald-600">{t('solutions.generator.savings')}: ~60%</div>
                </div>
              </label>
            </div>

            <button
              type="button"
              onClick={handleGenerateConfig}
              disabled={isGenerating}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? '生成中...' : t('solutions.generator.generate')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Generated Config Display */}
            <div className="rounded-lg bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{getConfigTitle(generatedConfig)}</h3>
                <span className="text-sm font-medium text-emerald-600">
                  {t('solutions.generator.savings')}: {generatedConfig.estimatedSavings}
                </span>
              </div>
              <p className="text-sm text-slate-600">{getConfigDescription(generatedConfig)}</p>
            </div>

            {/* Warning */}
            {getConfigWarning(generatedConfig) && (
              <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">{t('solutions.generator.warning')}</div>
                  <div className="mt-1">{getConfigWarning(generatedConfig)}</div>
                </div>
              </div>
            )}

            {/* Config File */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">
                  {t('solutions.generator.configPath')}: {generatedConfig.configFile.path}
                </div>
                <button
                  type="button"
                  onClick={handleCopyGeneratedConfig}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                >
                  {configCopied ? (
                    <>
                      <Check className="h-3 w-3" />
                      {t('solutions.generator.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      {t('solutions.generator.copyConfig')}
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-xs text-slate-100">
                {generatedConfig.configFile.content}
              </pre>
            </div>

            {/* Environment Variables */}
            {generatedConfig.envVars && generatedConfig.envVars.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-medium text-slate-700">
                  {t('solutions.generator.envVars')}
                </div>
                <div className="space-y-2">
                  {generatedConfig.envVars.map((envVar) => (
                    <div key={envVar.name} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                      <div className="font-mono text-xs font-medium text-slate-900">{envVar.name}</div>
                      <div className="mt-1 text-xs text-slate-600">{envVar.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Setup Steps */}
            <div>
              <div className="mb-2 text-sm font-medium text-slate-700">
                {t('solutions.generator.steps')}
              </div>
              <ol className="space-y-2">
                {generatedConfig.steps.map((step) => (
                  <li key={step.order} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                      {step.order}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">{getStepTitle(step)}</div>
                      {step.command && (
                        <code className="mt-1 block rounded bg-slate-900 px-2 py-1 text-xs text-slate-100">
                          {step.command}
                        </code>
                      )}
                      {getStepNote(step) && (
                        <div className="mt-1 text-xs text-slate-500">{getStepNote(step)}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <button
              type="button"
              onClick={() => setGeneratedConfig(null)}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {locale === 'zh' ? '生成其他配置' : 'Generate another config'}
            </button>
          </div>
        )}
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
        <button
          type="button"
          onClick={() => setFilterType('proxy')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            filterType === 'proxy'
              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
              : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
          )}
        >
          {t('solutions.filter.proxy')}
        </button>
      </div>

      {showProxyDisclaimer && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs leading-relaxed text-amber-800">{t('solutions.risk.disclaimer')}</p>
        </div>
      )}

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
            const solutionRiskNote = getSolutionRiskNote(solution, locale)
            const showRiskBox =
              !!solutionRiskNote && (solution.riskLevel === 'medium' || solution.riskLevel === 'high')

            return (
              <div
                key={solution.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Type Badge */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      solution.type === 'free-tier' && 'bg-emerald-50 text-emerald-700',
                      solution.type === 'tool' && 'bg-blue-50 text-blue-700',
                      solution.type === 'local-model' && 'bg-purple-50 text-purple-700',
                      solution.type === 'config' && 'bg-amber-50 text-amber-700',
                      solution.type === 'proxy' && 'bg-cyan-50 text-cyan-700',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(`solutions.type.${solution.type}`)}
                  </span>
                  <div className="flex flex-wrap justify-end gap-2">
                    {solution.riskLevel && (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                          getSolutionRiskBadgeClass(solution.riskLevel),
                        )}
                      >
                        {t(`solutions.risk.${solution.riskLevel}`)}
                      </span>
                    )}
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

                {showRiskBox && solution.riskLevel && (
                  <div
                    className={cn(
                      'mt-4 rounded-lg border px-3 py-2 text-xs leading-relaxed',
                      getSolutionRiskBoxClass(solution.riskLevel),
                    )}
                  >
                    {solutionRiskNote}
                  </div>
                )}
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
