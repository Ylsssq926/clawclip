import { useState, useEffect, useMemo } from 'react'
import { Check, ArrowRight, ChevronDown } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { ApiError, apiGet, apiGetSafe, apiPost } from '../lib/api'

const INSTALLED_TEMPLATES_STORAGE_KEY = 'clawclip-installed-templates'

function formatUserApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    try {
      const b = JSON.parse(err.body || '{}') as { error?: string; hint?: string }
      const line = [b.error, b.hint].filter(x => typeof x === 'string' && x.trim()).join(' ')
      if (line) return line
    } catch {
      /* ignore */
    }
  }
  return fallback
}

function loadInstalledTemplates(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set()

  try {
    const saved = localStorage.getItem(INSTALLED_TEMPLATES_STORAGE_KEY)
    if (!saved) return new Set()

    const parsed: unknown = JSON.parse(saved)
    if (!Array.isArray(parsed)) return new Set()

    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  } catch {
    return new Set()
  }
}

function persistInstalledTemplates(installed: Set<string>) {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(INSTALLED_TEMPLATES_STORAGE_KEY, JSON.stringify([...installed]))
  } catch {
    /* ignore */
  }
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  icon: string
  skills: string[]
  tags?: string[]
}

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

const CAT_I18N: Record<string, string> = {
  '效率': 'templates.cat.efficiency',
  '创作': 'templates.cat.creative',
  '开发': 'templates.cat.dev',
  '客服': 'templates.cat.support',
  '通用': 'templates.cat.general',
  efficiency: 'templates.cat.efficiency',
  creative: 'templates.cat.creative',
  dev: 'templates.cat.dev',
  support: 'templates.cat.support',
  general: 'templates.cat.general',
}

const DESCRIPTION_FALLBACK_KEYS: Record<string, string> = {
  'daily-reporter': 'templates.fallback.desc.daily-reporter',
  'email-assistant': 'templates.fallback.desc.email-assistant',
  'customer-service': 'templates.fallback.desc.customer-service',
  'code-reviewer': 'templates.fallback.desc.code-reviewer',
  'schedule-manager': 'templates.fallback.desc.schedule-manager',
}

function getCategoryI18nKey(category: string): string | null {
  const trimmed = typeof category === 'string' ? category.trim() : ''
  if (!trimmed) return null
  return CAT_I18N[trimmed] ?? CAT_I18N[trimmed.toLowerCase()] ?? null
}

function getTemplateCategoryLabel(category: string, t: TranslateFn): string {
  const key = getCategoryI18nKey(category)
  return key ? t(key) : category
}

function getTemplateAudienceLabel(category: string, t: TranslateFn): string {
  const key = getCategoryI18nKey(category)
  switch (key) {
    case 'templates.cat.efficiency':
      return t('templates.audience.efficiency')
    case 'templates.cat.creative':
      return t('templates.audience.creative')
    case 'templates.cat.dev':
      return t('templates.audience.dev')
    case 'templates.cat.support':
      return t('templates.audience.support')
    default:
      return t('templates.audience.general')
  }
}

function buildMeaningfulDescription(
  template: Pick<Template, 'id' | 'name' | 'description' | 'category' | 'skills'>,
  t: TranslateFn,
): string {
  const description = typeof template.description === 'string' ? template.description.trim() : ''
  if (description.length >= 10) return description

  const fallbackKey = DESCRIPTION_FALLBACK_KEYS[template.id]
  if (fallbackKey) return t(fallbackKey)

  const skills = Array.isArray(template.skills) ? template.skills.filter(Boolean) : []
  const categoryLabel = getTemplateCategoryLabel(template.category || 'general', t)
  if (skills.length > 0) {
    return t('templates.fallback.desc.withSkills', {
      name: template.name,
      category: categoryLabel,
      skills: skills.slice(0, 3).join(', '),
    })
  }

  return t('templates.fallback.desc.generic', {
    name: template.name,
    category: categoryLabel,
  })
}

function normalizeTemplate(template: Template, index: number, t: TranslateFn): Template {
  const fallbackId = `template-${index + 1}`
  const category = typeof template.category === 'string' && template.category.trim() ? template.category.trim() : 'general'
  const skills = Array.isArray(template.skills)
    ? template.skills.filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0)
    : []

  const normalized: Template = {
    ...template,
    id: typeof template.id === 'string' && template.id.trim() ? template.id.trim() : fallbackId,
    name: typeof template.name === 'string' && template.name.trim() ? template.name.trim() : t('templates.fallback.name', { index: index + 1 }),
    category,
    icon: typeof template.icon === 'string' && template.icon.trim() ? template.icon.trim() : '🧩',
    skills,
    tags: Array.isArray(template.tags)
      ? template.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      : undefined,
    description: '',
  }

  normalized.description = buildMeaningfulDescription(normalized, t)
  return normalized
}

export default function TemplateMarket() {
  const { t } = useI18n()
  const [templates, setTemplates] = useState<Template[]>([])
  const [catIdx, setCatIdx] = useState(0)
  const [applied, setApplied] = useState<Set<string>>(() => loadInstalledTemplates())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [applying, setApplying] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const categories = useMemo(
    () => [...new Set(templates.map(t => t.category))],
    [templates],
  )

  const getCategoryLabel = (category: string) => getTemplateCategoryLabel(category, t)
  const getAudienceLabel = (category: string) => getTemplateAudienceLabel(category, t)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      apiGet<Template[]>('/api/templates'),
      apiGetSafe<Array<{ name?: string }>>('/api/skills'),
    ])
      .then(([templateList, installedSkills]) => {
        if (cancelled) return

        const normalizedTemplates = (Array.isArray(templateList) ? templateList : []).map((template, index) => normalizeTemplate(template, index, t))
        setTemplates(normalizedTemplates)

        if (Array.isArray(installedSkills)) {
          const next = new Set(
            installedSkills
              .map(skill => (typeof skill?.name === 'string' ? skill.name.trim() : ''))
              .filter(Boolean),
          )
          persistInstalledTemplates(next)
          setApplied(next)
        }
      })
      .catch(err => {
        if (cancelled) return
        setError(formatUserApiError(err, t('templates.error.network')))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [t])

  const filtered =
    catIdx === 0
      ? templates
      : templates.filter(tmpl => tmpl.category === categories[catIdx - 1])

  useEffect(() => {
    if (expandedId && !filtered.some(template => template.id === expandedId)) {
      setExpandedId(null)
    }
  }, [expandedId, filtered])

  const handleApply = async (id: string) => {
    setError(null)
    setApplying(id)
    try {
      const result = await apiPost<{ success: boolean; message?: string }>('/api/templates/apply', { id })
      if (result.success) {
        setApplied(prev => {
          const next = new Set(prev)
          next.add(id)
          persistInstalledTemplates(next)
          return next
        })
      } else {
        setError(result.message || t('templates.error.apply'))
      }
    } catch (err) {
      setError(formatUserApiError(err, t('templates.error.apply')))
    } finally {
      setApplying(null)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold text-slate-900">{t('templates.title')}</h2>
      <p className="mb-6 text-sm text-slate-500">{t('templates.subtitle')}</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCatIdx(0)}
          className={`rounded-xl px-4 py-2 text-sm transition-colors ${
            catIdx === 0
              ? 'bg-[#3b82c4] text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
          }`}
        >
          {t('templates.cat.all')}
        </button>
        {categories.map((cat, i) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCatIdx(i + 1)}
            className={`rounded-xl px-4 py-2 text-sm transition-colors ${
              catIdx === i + 1
                ? 'bg-[#3b82c4] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      {error && (
        <div className="state-surface state-surface-danger mb-4 flex items-center justify-between gap-3 px-4 py-3 text-sm text-orange-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-orange-700/70 transition-colors hover:text-orange-700"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {!loading && filtered.map(template => {
          const isExpanded = expandedId === template.id
          const detailTags = Array.isArray(template.tags) && template.tags.length > 0
            ? template.tags
            : (template.skills ?? [])
          const isApplied = applied.has(template.id)
          const audienceLabel = getAudienceLabel(template.category)
          const statusLabel = isApplied ? t('templates.applied') : t('templates.status.notImported')
          const previewTags = detailTags.slice(0, 3)

          return (
            <div key={template.id} className="card flex h-full flex-col p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-start gap-3">
                  <span className="text-3xl leading-none">{template.icon}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{template.name}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        isApplied
                          ? 'border-[#3b82c4]/15 bg-blue-50 text-[#3b82c4]'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {getCategoryLabel(template.category)} · {audienceLabel}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600">{template.description}</p>

              {previewTags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {previewTags.map(tag => (
                    <span
                      key={`${template.id}-${tag}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500"
                    >
                      {tag}
                    </span>
                  ))}
                  {detailTags.length > previewTags.length && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-400">
                      +{detailTags.length - previewTags.length}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => toggleExpanded(template.id)}
                  aria-expanded={isExpanded}
                  className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-800"
                >
                  <span>{isExpanded ? t('templates.details.hide') : t('templates.details.show')}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isApplied ? (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">
                    <Check className="h-4 w-4" />
                    {t('templates.applied')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApply(template.id)}
                    disabled={applying === template.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#3b82c4]/30 hover:text-[#3b82c4] disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {applying === template.id ? (
                      t('templates.applying')
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        {t('templates.apply')}
                      </>
                    )}
                  </button>
                )}
              </div>

              <div
                className={`grid overflow-hidden transition-all duration-300 ease-out ${
                  isExpanded ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0">
                  <div className="state-surface space-y-4 px-4 py-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {t('templates.details.preview')}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{template.description}</p>
                    </div>
                    {detailTags.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {t('templates.details.capabilities')}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {detailTags.map(tag => (
                            <span
                              key={`${template.id}-${tag}`}
                              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="py-12 text-center text-slate-500"><p>{t('templates.empty')}</p></div>
      )}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-48 w-full" />)}
        </div>
      )}
    </div>
  )
}
