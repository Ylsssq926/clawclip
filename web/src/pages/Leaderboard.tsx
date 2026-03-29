import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Medal, Loader2, AlertCircle, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { useI18n } from '../lib/i18n'
import { apiGet, apiPost, parseApiErrorMessage } from '../lib/api'

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
  S: 'bg-gradient-to-r from-amber-400/25 to-yellow-500/20 text-amber-300 ring-1 ring-amber-400/40',
  A: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
  B: 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30',
  C: 'bg-slate-500/15 text-slate-500 ring-1 ring-slate-500/25',
  D: 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30',
}

function PodiumMedal(position: number): string {
  if (position === 1) return '🥇'
  if (position === 2) return '🥈'
  if (position === 3) return '🥉'
  return ''
}

export default function Leaderboard() {
  const { t, locale } = useI18n()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [nickname, setNickname] = useState('')
  const [preview, setPreview] = useState<BenchmarkPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewErr, setPreviewErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState<string | null>(null)
  const [submitOk, setSubmitOk] = useState(false)

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
      const data = await apiGet<{ entries?: LeaderboardEntry[]; isDemo?: boolean }>('/api/leaderboard?limit=50')
      setEntries(Array.isArray(data.entries) ? data.entries : [])
      setIsDemo(Boolean(data.isDemo))
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
      .catch((err) => {
        setPreviewErr(parseApiErrorMessage(err, t('leaderboard.modal.noData')))
      })
      .finally(() => setPreviewLoading(false))
  }

  const submit = async () => {
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
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{t('leaderboard.title')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('leaderboard.subtitle')}</p>
      {isDemo && entries.length > 0 && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.07] px-4 py-3 flex items-start gap-2.5">
          <span className="text-base leading-none mt-px" aria-hidden>💡</span>
          <p className="text-sm text-cyan-700 leading-relaxed">{t('leaderboard.demoBanner')}</p>
        </div>
      )}
        </div>
        <button
          type="button"
          onClick={openModal}
          className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#3b82c4] via-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-opacity"
        >
          {t('leaderboard.submit')}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{t('leaderboard.loading')}</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <ul className="space-y-3">
          {entries.map((e, i) => {
            const pos = i + 1
            const isTop3 = pos <= 3
            const medal = PodiumMedal(pos)
            return (
              <li
                key={e.id}
                className={cn(
                  'rounded-2xl border px-4 py-4 transition-shadow',
                  pos === 1 &&
                    'border-cyan-400/30 bg-gradient-to-br from-[#3b82c4]/25 via-cyan-600/15 to-teal-600/10 shadow-lg shadow-cyan-500/10',
                  pos === 2 && 'border-slate-300/25 bg-gradient-to-br from-slate-400/10 to-slate-600/5',
                  pos === 3 && 'border-amber-800/30 bg-gradient-to-br from-amber-900/20 to-amber-950/10',
                  !isTop3 && 'border-slate-200 bg-white',
                )}
              >
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 min-w-[4.5rem] shrink-0">
                    {medal ? (
                      <>
                        <span className="text-2xl leading-none" aria-hidden>
                          {medal}
                        </span>
                        <span className="text-sm font-mono text-slate-500 tabular-nums">{pos}</span>
                      </>
                    ) : (
                      <span className="text-base font-mono text-slate-500 tabular-nums w-10">#{pos}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <div className="font-medium text-slate-900">{e.nickname}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-md',
                          RANK_BADGE[e.rank] ?? RANK_BADGE.C,
                        )}
                      >
                        {e.rank}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono">
                        {e.topModel}
                      </span>
                      <span className="text-[10px] text-slate-500">{e.totalSessions} {t('leaderboard.sessions')}</span>
                    </div>
                  </div>
                  <div className="text-right sm:ml-auto">
                    <div className="text-2xl sm:text-3xl font-bold tabular-nums bg-gradient-to-r from-cyan-200 to-teal-300 bg-clip-text text-transparent">
                      {Math.round(e.score)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{fmtRelative(e.submittedAt)}</div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-12">{t('leaderboard.empty')}</p>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !submitting && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-cyan-900/10 p-6"
              onClick={ev => ev.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Medal className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-slate-900">{t('leaderboard.modal.title')}</h3>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  aria-label={t('leaderboard.modal.close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <label className="block text-xs text-slate-500 mb-1.5">{t('leaderboard.modal.nickname')}</label>
              <input
                type="text"
                maxLength={20}
                value={nickname}
                onChange={ev => setNickname(ev.target.value)}
                placeholder={t('leaderboard.modal.nickPlaceholder')}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />

              <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <p className="text-[11px] uppercase tracking-wide text-cyan-500/80 mb-2">{t('leaderboard.modal.preview')}</p>
                {previewLoading && (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('leaderboard.modal.reading')}
                  </div>
                )}
                {!previewLoading && previewErr && <p className="text-sm text-amber-400/90">{previewErr}</p>}
                {!previewLoading && !previewErr && preview && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">{t('leaderboard.modal.score')}</span>
                      <div className="text-xl font-bold text-slate-900 tabular-nums">{Math.round(preview.overallScore)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('leaderboard.modal.rank')}</span>
                      <div className="text-xl font-bold text-cyan-600">{preview.rank}</div>
                    </div>
                    <div className="col-span-2 text-slate-500 text-xs">
                      {t('leaderboard.modal.model')} <span className="text-slate-700 font-mono">{preview.topModel}</span> ·{' '}
                      {preview.totalSessions} {t('leaderboard.sessions')}
                    </div>
                  </div>
                )}
              </div>

              {submitMsg && (
                <p
                  className={cn(
                    'mt-3 text-sm',
                    submitOk ? 'text-emerald-400' : 'text-rose-400',
                  )}
                >
                  {submitMsg}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-100"
                >
                  {t('leaderboard.modal.cancel')}
                </button>
                <button
                  type="button"
                  disabled={submitting || previewLoading}
                  onClick={submit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#3b82c4] to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? t('leaderboard.modal.submitting') : t('leaderboard.modal.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scoring methodology & anti-cheat notice */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 space-y-3">
        <h4 className="text-slate-900 font-semibold text-base">{t('leaderboard.rules.title')}</h4>
        <ul className="list-disc list-inside space-y-1.5 text-slate-500 leading-relaxed">
          <li>{t('leaderboard.rules.r1')}</li>
          <li>{t('leaderboard.rules.r2')}</li>
          <li>{t('leaderboard.rules.r3')}</li>
          <li>{t('leaderboard.rules.r4')}</li>
          <li>{t('leaderboard.rules.r5')}</li>
        </ul>
        <p className="text-xs text-slate-600 pt-2 border-t border-slate-200">{t('leaderboard.rules.disclaimer')}</p>
      </div>
    </div>
  )
}
