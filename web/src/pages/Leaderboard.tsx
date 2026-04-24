import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Medal, Loader2, AlertCircle, X, HelpCircle } from 'lucide-react'
import { cn } from '../lib/cn'
import { useI18n } from '../lib/i18n'
import { apiGet, apiGetSafe, apiPost, parseApiErrorMessage } from '../lib/api'

interface LeaderboardEntry {
  id: string
  nickname: string
  score: number
  rank: string
  topModel: string
  totalSessions: number
  dimensions: { dimension: string; score: number }[]
  submittedAt: string
}

interface BenchmarkPreview {
  overallScore: number
  rank: string
  topModel: string
  totalSessions: number
}

const RANK_BADGE: Record<string, string> = {
  S: 'border border-[#3b82c4]/20 bg-blue-50 text-[#3b82c4]',
  A: 'border border-slate-200 bg-slate-100 text-slate-700',
  B: 'border border-slate-200 bg-slate-100 text-slate-700',
  C: 'border border-slate-200 bg-slate-100 text-slate-600',
  D: 'border border-orange-200 bg-orange-50 text-orange-700',
}

const DEMO_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    id: 'demo-deep',
    nickname: 'DeepLobster',
    score: 92,
    rank: 'S',
    topModel: 'deepseek-chat',
    totalSessions: 156,
    dimensions: [],
    submittedAt: '2025-03-18T02:30:00.000Z',
  },
  {
    id: 'demo-code',
    nickname: 'CodeWizard',
    score: 88,
    rank: 'A',
    topModel: 'gpt-4o',
    totalSessions: 98,
    dimensions: [],
    submittedAt: '2025-03-17T14:20:00.000Z',
  },
  {
    id: 'demo-eff',
    nickname: 'SpeedRunner',
    score: 85,
    rank: 'A',
    topModel: 'claude-3.5-sonnet',
    totalSessions: 210,
    dimensions: [],
    submittedAt: '2025-03-16T09:15:00.000Z',
  },
]

export default function Leaderboard() {
  const { t, locale } = useI18n()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [nickname, setNickname] = useState('')
  const [preview, setPreview] = useState<BenchmarkPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewErr, setPreviewErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState(false)
  const [hasRealSessionData, setHasRealSessionData] = useState<boolean | null>(null)

  const submitDisabledHint = t('leaderboard.submit.disabled')
  const canSubmit = hasRealSessionData === true
  const submitBlocked = hasRealSessionData === false
  const hasValidPreview = !!preview && Number.isFinite(preview.overallScore) && preview.rank.trim().length > 0 && preview.topModel.trim().length > 0
  const showDemoBanner = (isDemo || !canSubmit) && entries.length > 0
  const columnLabels = {
    position: t('leaderboard.table.position'),
    nickname: t('leaderboard.table.nickname'),
    rank: t('leaderboard.table.rank'),
    model: t('leaderboard.table.model'),
    sessions: t('leaderboard.table.sessions'),
    score: t('leaderboard.table.score'),
    submitted: t('leaderboard.table.submitted'),
  }

  const fmtRelative = useCallback((iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 0) return t('leaderboard.time.now')
    const min = Math.floor(diff / 60000)
    if (min < 1) return t('leaderboard.time.now')
    if (min < 60) return t('leaderboard.time.min').replace('{n}', String(min))
    const hours = Math.floor(min / 60)
    if (hours < 24) return t('leaderboard.time.hour').replace('{n}', String(hours))
    const days = Math.floor(hours / 24)
    if (days < 7) return t('leaderboard.time.day').replace('{n}', String(days))
    const dateLocale =
      locale === 'zh' ? 'zh-CN'
      : locale === 'ja' ? 'ja-JP'
      : locale === 'ko' ? 'ko-KR'
      : locale === 'de' ? 'de-DE'
      : locale === 'fr' ? 'fr-FR'
      : locale === 'es' ? 'es-ES'
      : 'en-US'
    return new Date(iso).toLocaleDateString(dateLocale)
  }, [t, locale])

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, status] = await Promise.all([
        apiGet<{ entries?: LeaderboardEntry[]; isDemo?: boolean }>('/api/leaderboard?limit=50'),
        apiGetSafe<{ hasRealSessionData?: boolean }>('/api/status'),
      ])
      const hasRealData = status?.hasRealSessionData === true
      const serverEntries = Array.isArray(data.entries) ? data.entries : []
      const shouldUseDemoFallback = !hasRealData && serverEntries.length === 0

      setEntries(shouldUseDemoFallback ? DEMO_LEADERBOARD_ENTRIES : serverEntries)
      setIsDemo(Boolean(data.isDemo) || shouldUseDemoFallback || !hasRealData)
      setHasRealSessionData(hasRealData)
    } catch (err) {
      setError(parseApiErrorMessage(err, t('leaderboard.error')))
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadList()
  }, [loadList])

  const openModal = () => {
    if (!canSubmit) return
    setModalOpen(true)
    setNickname('')
    setSubmitMsg(null)
    setPreviewErr(null)
    setPreviewLoading(true)
    setPreview(null)
    apiGet<{ overallScore: number; rank?: string; topModel?: string; totalSessions: number }>('/api/benchmark/latest')
      .then(d => {
        setPreview({
          overallScore: Number(d.overallScore),
          rank: String(d.rank ?? ''),
          topModel: String(d.topModel ?? ''),
          totalSessions: Number(d.totalSessions),
        })
      })
      .catch(err => {
        setPreviewErr(parseApiErrorMessage(err, t('leaderboard.modal.noData')))
      })
      .finally(() => setPreviewLoading(false))
  }

  const submit = async () => {
    if (!canSubmit) {
      setSubmitOk(false)
      setSubmitMsg(submitDisabledHint)
      return
    }

    if (!hasValidPreview) {
      setSubmitOk(false)
      setSubmitMsg(previewErr || t('leaderboard.modal.noData'))
      return
    }

    const n = nickname.trim()
    if (n.length < 1 || n.length > 20) {
      setSubmitOk(false)
      setSubmitMsg(t('leaderboard.modal.nickWarn'))
      return
    }
    setSubmitting(true)
    setSubmitMsg(null)
    setSubmitOk(false)
    try {
      const data = await apiPost<{ rank_position?: number }>('/api/leaderboard/submit', { nickname: n })
      const pos = typeof data.rank_position === 'number' ? data.rank_position : '?'
      setSubmitOk(true)
      setSubmitMsg(t('leaderboard.modal.success').replace('{pos}', String(pos)))
      await loadList()
      setTimeout(() => {
        setModalOpen(false)
        setSubmitMsg(null)
      }, 1200)
    } catch (err) {
      setSubmitOk(false)
      setSubmitMsg(parseApiErrorMessage(err, t('leaderboard.modal.fail')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{t('leaderboard.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('leaderboard.subtitle')}</p>
          {showDemoBanner && (
            <div className="state-surface state-surface-brand mt-3 flex items-start gap-2.5 px-4 py-3">
              <span className="mt-px text-base leading-none" aria-hidden>💡</span>
              <p className="text-sm leading-relaxed text-[#3b82c4]">{t('leaderboard.demoBanner')}</p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
          <button
            type="button"
            onClick={openModal}
            disabled={!canSubmit}
            className={cn(
              'rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:pointer-events-none',
              canSubmit
                ? 'bg-[#3b82c4] text-white hover:bg-[#3473af]'
                : 'cursor-not-allowed bg-slate-200 text-slate-400',
            )}
          >
            {t('leaderboard.submit')}
          </button>
          {submitBlocked && (
            <p className="text-xs text-slate-500">{submitDisabledHint}</p>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t('leaderboard.loading')}</span>
        </div>
      )}

      {!loading && error && (
        <div className="state-surface state-surface-danger flex items-center gap-2 px-4 py-3 text-sm text-orange-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <ul className="space-y-3 md:hidden">
            {entries.map((entry, index) => {
              const pos = index + 1
              return (
                <li
                  key={entry.id}
                  className={cn(
                    'rounded-2xl border bg-white px-4 py-4',
                    pos === 1 ? 'border-[#3b82c4]/25 bg-blue-50/30' : 'border-slate-200',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums',
                      pos === 1 ? 'border-[#3b82c4]/20 bg-white text-[#3b82c4]' : 'border-slate-200 bg-white text-slate-600',
                    )}>
                      {pos}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{entry.nickname}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold', RANK_BADGE[entry.rank] ?? RANK_BADGE.C)}>
                              {entry.rank}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
                              {entry.topModel}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-semibold tabular-nums text-slate-900">{Math.round(entry.score)}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">{fmtRelative(entry.submittedAt)}</div>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">{entry.totalSessions} {t('leaderboard.sessions')}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{columnLabels.position}</th>
                  <th className="px-4 py-3 text-left font-medium">{columnLabels.nickname}</th>
                  <th className="px-4 py-3 text-left font-medium">{columnLabels.rank}</th>
                  <th className="px-4 py-3 text-left font-medium">{columnLabels.model}</th>
                  <th className="px-4 py-3 text-left font-medium">{columnLabels.sessions}</th>
                  <th className="px-4 py-3 text-right font-medium">{columnLabels.score}</th>
                  <th className="px-4 py-3 text-right font-medium">{columnLabels.submitted}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((entry, index) => {
                  const pos = index + 1
                  return (
                    <tr
                      key={`${entry.id}-table`}
                      className={cn(
                        'transition-colors hover:bg-slate-50',
                        pos === 1 && 'bg-blue-50/40',
                      )}
                    >
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-600">#{pos}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{entry.nickname}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold', RANK_BADGE[entry.rank] ?? RANK_BADGE.C)}>
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{entry.topModel}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{entry.totalSessions}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{Math.round(entry.score)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{fmtRelative(entry.submittedAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="py-12 text-center text-sm text-slate-500">{t('leaderboard.empty')}</p>
      )}

      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-base font-semibold text-slate-900">{t('leaderboard.rules.summaryTitle')}</h4>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-500">
              <li>• {t('leaderboard.rules.summary.r1')}</li>
              <li>• {t('leaderboard.rules.summary.r2')}</li>
              <li>• {t('leaderboard.rules.summary.r3')}</li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <HelpCircle className="h-4 w-4" />
            {t('leaderboard.rules.help')}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !submitting && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.18, ease: [0.25, 0.4, 0.25, 1] }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10"
              onClick={ev => ev.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-[#3b82c4]" />
                  <h3 className="text-lg font-semibold text-slate-900">{t('leaderboard.modal.title')}</h3>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  aria-label={t('leaderboard.modal.close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <label className="mb-1.5 block text-xs text-slate-500">{t('leaderboard.modal.nickname')}</label>
              <input
                type="text"
                maxLength={20}
                value={nickname}
                onChange={ev => setNickname(ev.target.value)}
                placeholder={t('leaderboard.modal.nickPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />

              <div className="state-surface state-surface-brand mt-5 p-4">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-[#3b82c4]">{t('leaderboard.modal.preview')}</p>
                {previewLoading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('leaderboard.modal.reading')}
                  </div>
                )}
                {!previewLoading && previewErr && <p className="text-sm text-orange-700">{previewErr}</p>}
                {!previewLoading && !previewErr && preview && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">{t('leaderboard.modal.score')}</span>
                      <div className="text-xl font-bold tabular-nums text-slate-900">{Math.round(preview.overallScore)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('leaderboard.modal.rank')}</span>
                      <div className="text-xl font-bold text-[#3b82c4]">{preview.rank}</div>
                    </div>
                    <div className="col-span-2 text-xs text-slate-500">
                      {t('leaderboard.modal.model')} <span className="font-mono text-slate-700">{preview.topModel}</span> ·{' '}
                      {preview.totalSessions} {t('leaderboard.sessions')}
                    </div>
                  </div>
                )}
              </div>

              {submitMsg && (
                <p className={cn('mt-3 text-sm', submitOk ? 'text-[#3b82c4]' : 'text-orange-700')}>
                  {submitMsg}
                </p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  {t('leaderboard.modal.cancel')}
                </button>
                <button
                  type="button"
                  disabled={submitting || previewLoading || !canSubmit || !hasValidPreview}
                  onClick={submit}
                  title={submitBlocked ? submitDisabledHint : previewErr || undefined}
                  className="flex-1 rounded-xl bg-[#3b82c4] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3473af] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitting ? t('leaderboard.modal.submitting') : t('leaderboard.modal.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {rulesOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setRulesOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.18, ease: [0.25, 0.4, 0.25, 1] }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10"
              onClick={ev => ev.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-[#3b82c4]" />
                  <h3 className="text-lg font-semibold text-slate-900">{t('leaderboard.rules.modalTitle')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRulesOpen(false)}
                  className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  aria-label={t('leaderboard.rules.close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm leading-relaxed text-slate-500">
                <p>{t('leaderboard.rules.r1')}</p>
                <p>{t('leaderboard.rules.r2')}</p>
                <p>{t('leaderboard.rules.r3')}</p>
                <p>{t('leaderboard.rules.r4')}</p>
                <p>{t('leaderboard.rules.r5')}</p>
                <p className="border-t border-slate-200 pt-3 text-xs text-slate-600">{t('leaderboard.rules.disclaimer')}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
