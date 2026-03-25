import { useState, useEffect } from 'react'
import { Search, Trash2, Download } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { ApiError, apiGet, apiPost } from '../lib/api'

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

export default function SkillManager() {
  const { t } = useI18n()
  const [skills, setSkills] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [installing, setInstalling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<Skill[]>('/api/skills')
      .then(d => setSkills(Array.isArray(d) ? d : []))
      .catch(err => { setError(formatUserApiError(err, t('skills.error.network'))) })
      .finally(() => setLoading(false))
  }, [])

  const handleInstall = async () => {
    if (!search.trim()) return
    setError(null)
    setInstalling(search)
    try {
      const result = await apiPost<{ success: boolean; message?: string }>('/api/skills/install', { name: search })
      if (result.success) {
        setSearch('')
        const list = await apiGet<Skill[]>('/api/skills')
        setSkills(Array.isArray(list) ? list : [])
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
    try {
      const result = await apiPost<{ success: boolean; message?: string }>('/api/skills/uninstall', { name })
      if (result.success) {
        setSkills(prev => prev.filter(s => s.name !== name))
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

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInstall()}
            placeholder={t('skills.placeholder')}
            className="w-full bg-surface-raised border border-white/[0.1] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
        <button
          onClick={handleInstall}
          disabled={!search.trim() || !!installing}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 rounded-xl text-sm font-medium transition-all flex items-center gap-2 text-white"
        >
          <Download className="w-4 h-4" />
          {installing ? t('skills.installing') : t('skills.install')}
        </button>
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

      <div className="card">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h3 className="font-semibold">{t('skills.installed')} ({skills.length})</h3>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
          </div>
        ) : skills.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">
            <p className="text-lg mb-2">{t('skills.empty.title')}</p>
            <p className="text-sm">{t('skills.empty.desc')}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {skills.map(skill => (
              <div key={skill.name} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div>
                  <div className="font-medium">{skill.name}</div>
                  <div className="text-sm text-slate-400 mt-0.5">{skill.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmTarget(skill.name)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
          <div className="bg-[#0f172a] border border-white/[0.1] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <p className="text-sm text-slate-300 mb-4">
              {t('skills.confirm.uninstall').replace('{name}', confirmTarget)}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
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
