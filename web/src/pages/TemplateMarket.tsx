import { useState, useEffect, useMemo } from 'react'
import { Check, ArrowRight, ChevronDown } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { ApiError, apiGet, apiPost } from '../lib/api'

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

const CAT_I18N: Record<string, string> = {
  '效率': 'templates.cat.efficiency',
  '创作': 'templates.cat.creative',
  '开发': 'templates.cat.dev',
  '客服': 'templates.cat.support',
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

  const getCategoryLabel = (category: string) => (CAT_I18N[category] ? t(CAT_I18N[category]) : category)

  useEffect(() => {
    apiGet<Template[]>('/api/templates')
      .then(d => setTemplates(Array.isArray(d) ? d : []))
      .catch(err => { setError(formatUserApiError(err, t('templates.error.network'))) })
      .finally(() => setLoading(false))
  }, [])

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
      <h2 className="text-2xl font-bold mb-2">{t('templates.title')}</h2>
      <p className="text-slate-500 text-sm mb-6">{t('templates.subtitle')}</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => setCatIdx(0)}
          className={`px-4 py-2 rounded-xl text-sm transition-all ${
            catIdx === 0
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/15'
              : 'card text-slate-500 hover:text-slate-900'
          }`}
        >
          {t('templates.cat.all')}
        </button>
        {categories.map((cat, i) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCatIdx(i + 1)}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              catIdx === i + 1
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/15'
                : 'card text-slate-500 hover:text-slate-900'
            }`}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400/60 hover:text-red-400 ml-3 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!loading && filtered.map(template => {
          const isExpanded = expandedId === template.id
          const detailTags = Array.isArray(template.tags) && template.tags.length > 0
            ? template.tags
            : (template.skills ?? [])

          return (
            <div
              key={template.id}
              className="card p-6 bg-white border-slate-200 hover:border-slate-300 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3 gap-3">
                <span className="text-3xl">{template.icon}</span>
                <span className="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-500 border border-slate-200">
                  {getCategoryLabel(template.category)}
                </span>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-slate-900">{template.name}</h3>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed line-clamp-2">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-4">
                {(template.skills ?? []).map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                    {s}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => toggleExpanded(template.id)}
                aria-expanded={isExpanded}
                className="w-full px-4 py-2.5 mb-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between"
              >
                <span>{isExpanded ? t('templates.details.hide') : t('templates.details.show')}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              <div
                className={`grid overflow-hidden transition-all duration-300 ease-out ${
                  isExpanded ? 'grid-rows-[1fr] opacity-100 mb-4' : 'grid-rows-[0fr] opacity-0 mb-0'
                }`}
              >
                <div className="min-h-0">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {t('templates.details.preview')}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {template.description}
                      </p>
                    </div>
                    {(template.category || detailTags.length > 0) && (
                      <div className="flex flex-wrap gap-2">
                        {template.category && (
                          <span className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-white text-slate-600">
                            {getCategoryLabel(template.category)}
                          </span>
                        )}
                        {detailTags.map(tag => (
                          <span
                            key={`${template.id}-${tag}`}
                            className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleApply(template.id)}
                disabled={applied.has(template.id) || applying === template.id}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  applied.has(template.id)
                    ? 'bg-emerald-50 text-emerald-600 cursor-default border border-emerald-100'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/20'
                }`}
              >
                {applied.has(template.id) ? (
                  <><Check className="w-4 h-4" /> {t('templates.applied')}</>
                ) : applying === template.id ? (
                  t('templates.applying')
                ) : (
                  <><ArrowRight className="w-4 h-4" /> {t('templates.apply')}</>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500"><p>{t('templates.empty')}</p></div>
      )}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-48 w-full" />)}
        </div>
      )}
    </div>
  )
}
