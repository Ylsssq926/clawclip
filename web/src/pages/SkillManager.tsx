import { useState, useEffect } from 'react'
import { Search, Trash2, Download } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { ApiError, apiGet, apiPost } from '../lib/api'
import EmptyState from '../components/ui/EmptyState'

/** 展示服务端返回的 error + hint，避免只显示泛化文案 */
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

interface Skill {
  name: string
  description: string
  installed: boolean
}

const SUGGESTED_SKILLS = ['web-search', 'browser-use', 'filesystem']
const VALID_SKILL_NAME = /^[a-zA-Z0-9_-]+$/

export default function SkillManager() {
  const { t, locale } = useI18n()
  const [skills, setSkills] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [installing, setInstalling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const normalizedSearch = search.trim()
  const hasInvalidInstallName = normalizedSearch.length > 0 && !VALID_SKILL_NAME.test(normalizedSearch)
  const installInputHint = locale === 'en'
    ? 'Use letters, numbers, hyphens, or underscores.'
    : '支持字母、数字、连字符和下划线。'
  const invalidInstallHint = locale === 'en'
    ? 'Skill names can only contain letters, numbers, hyphens, and underscores.'
    : 'Skill 名称只能包含字母、数字、连字符和下划线。'
  const suggestedSkillsTitle = locale === 'en' ? 'Popular picks' : '常用推荐'
  const emptySkillsHint = locale === 'en'
    ? 'Type a skill name above and click Install to add your first skill.'
    : '在上方输入技能名称并点击安装，就能添加第一个技能。'

  useEffect(() => {
    apiGet<Skill[]>('/api/skills')
      .then(d => setSkills(Array.isArray(d) ? d : []))
      .catch(err => { setError(formatUserApiError(err, t('skills.error.network'))) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(null), 3000)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const handleInstall = async () => {
    if (!normalizedSearch) return
    if (!VALID_SKILL_NAME.test(normalizedSearch)) {
      setError(invalidInstallHint)
      return
    }

    setError(null)
    setSuccessMessage(null)
    setInstalling(normalizedSearch)
    try {
      const skillName = normalizedSearch
      const result = await apiPost<{ success: boolean; message?: string }>('/api/skills/install', { name: skillName })
      if (result.success) {
        setSearch('')
        const list = await apiGet<Skill[]>('/api/skills')
        setSkills(Array.isArray(list) ? list : [])
        setSuccessMessage(locale === 'en' ? `✅ Skill ${skillName} installed` : `✅ 技能 ${skillName} 已安装`)
      } else {
        setError(result.message || t('skills.error.install'))
      }
    } catch (err) {
      setError(formatUserApiError(err, t('skills.error.install')))
    } finally {
      setInstalling(null)
    }
  }

  const doUninstall = async (name: string) => {
    setError(null)
    setSuccessMessage(null)
    try {
      const result = await apiPost<{ success: boolean; message?: string }>('/api/skills/uninstall', { name })
      if (result.success) {
        setSkills(prev => prev.filter(s => s.name !== name))
        setSuccessMessage(locale === 'en' ? `✅ Skill ${name} uninstalled` : `✅ 技能 ${name} 已卸载`)
      } else {
        setError(result.message ?? t('skills.error.network'))
      }
    } catch (err) {
      setError(formatUserApiError(err, t('skills.error.network')))
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('skills.title')}</h2>

      <div className="mb-3 flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInstall()}
              placeholder={t('skills.placeholder')}
              aria-invalid={hasInvalidInstallName}
              className="w-full bg-surface-raised border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <p className={`mt-2 text-xs ${hasInvalidInstallName ? 'text-amber-600' : 'text-slate-500'}`}>
            {hasInvalidInstallName ? invalidInstallHint : installInputHint}
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          disabled={!normalizedSearch || hasInvalidInstallName || !!installing}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 rounded-xl text-sm font-medium transition-all flex items-center gap-2 text-white"
        >
          <Download className="w-4 h-4" />
          {installing ? t('skills.installing') : t('skills.install')}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">{suggestedSkillsTitle}</span>
        {SUGGESTED_SKILLS.map(skill => (
          <button
            key={skill}
            type="button"
            onClick={() => setSearch(skill)}
            className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            {skill}
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

      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
          {successMessage}
        </div>
      )}

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold">{t('skills.installed')} ({skills.length})</h3>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
          </div>
        ) : skills.length === 0 ? (
          <EmptyState
            icon="🧩"
            title={t('skills.empty.title')}
            description={t('skills.empty.desc')}
            hint={emptySkillsHint}
            className="m-6"
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {skills.map(skill => (
              <div key={skill.name} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-medium">{skill.name}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{skill.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmTarget(skill.name)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('skills.uninstall')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <p className="text-sm text-slate-500 mb-4">
              {t('skills.confirm.uninstall').replace('{name}', confirmTarget)}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                {t('leaderboard.modal.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  void doUninstall(confirmTarget)
                  setConfirmTarget(null)
                }}
                className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
              >
                {t('skills.uninstall')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
