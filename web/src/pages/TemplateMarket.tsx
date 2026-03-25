import { useState, useEffect, useMemo } from 'react'
import { Check, ArrowRight } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { apiGet, apiPost } from '../lib/api'

interface Template {
  id: string
  name: string
  description: string
  category: string
  icon: string
  skills: string[]
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
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const categories = useMemo(
    () => [...new Set(templates.map(t => t.category))],
    [templates],
  )

  useEffect(() => {
    apiGet<Template[]>('/api/templates')
      .then(d => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => { setError(t('templates.error.network')) })
      .finally(() => setLoading(false))
  }, [])

  const filtered =
    catIdx === 0
      ? templates
      : templates.filter(tmpl => tmpl.category === categories[catIdx - 1])

  const handleApply = async (id: string) => {
    setError(null)
    setApplying(id)
    try {
      const result = await apiPost<{ success: boolean; message?: string }>('/api/templates/apply', { id })
      if (result.success) {
        setApplied(prev => new Set(prev).add(id))
      } else {
        setError(result.message || t('templates.error.apply'))
      }
    } catch {
      setError(t('templates.error.apply'))
    } finally {
      setApplying(null)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{t('templates.title')}</h2>
      <p className="text-slate-400 text-sm mb-6">{t('templates.subtitle')}</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          type="button"
          onClick={() => setCatIdx(0)}
          className={`px-4 py-2 rounded-xl text-sm transition-all ${
            catIdx === 0
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/15'
              : 'card text-slate-400 hover:text-white'
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
                : 'card text-slate-400 hover:text-white'
            }`}
          >
            {CAT_I18N[cat] ? t(CAT_I18N[cat]) : cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
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
        {!loading && filtered.map(template => (
          <div key={template.id} className="card-blue p-6 hover:border-blue-400/25 transition-all">
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{template.icon}</span>
              <span className="text-xs px-2 py-1 bg-white/[0.05] rounded-full text-slate-400 border border-white/[0.06]">{template.category}</span>
            </div>
            <h3 className="font-semibold text-lg mb-2 text-white">{template.name}</h3>
            <p className="text-sm text-slate-400 mb-4 leading-relaxed">{template.description}</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {(template.skills ?? []).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">{s}</span>
              ))}
            </div>
            <button
              onClick={() => handleApply(template.id)}
              disabled={applied.has(template.id) || applying === template.id}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                applied.has(template.id)
                  ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
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
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500"><p>{t('templates.empty')}</p></div>
      )}
      {loading && (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-48 w-full" />)}
        </div>
      )}
    </div>
  )
}
