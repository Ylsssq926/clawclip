import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Medal, Loader2, AlertCircle, X } from 'lucide-react'
import { cn } from '../lib/cn'

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

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return '刚刚'
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(iso).toLocaleDateString('zh-CN')
}

const RANK_BADGE: Record<string, string> = {
  S: 'bg-gradient-to-r from-amber-400/25 to-yellow-500/20 text-amber-300 ring-1 ring-amber-400/40',
  A: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
  B: 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30',
  C: 'bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/25',
  D: 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30',
}

function PodiumMedal(position: number): string {
  if (position === 1) return '🥇'
  if (position === 2) return '🥈'
  if (position === 3) return '🥉'
  return ''
}

export default function Leaderboard() {
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

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/leaderboard?limit=50')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : '加载失败')
        setEntries([])
        return
      }
      setEntries(Array.isArray(data.entries) ? data.entries : [])
      setIsDemo(Boolean(data.isDemo))
    } catch {
      setError('网络错误')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

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
    fetch('/api/benchmark/latest')
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) {
          setPreviewErr(typeof d.error === 'string' ? d.error : '暂无评测数据')
          return
        }
        setPreview({
          overallScore: Number(d.overallScore),
          rank: String(d.rank ?? ''),
          topModel: String(d.topModel ?? ''),
          totalSessions: Number(d.totalSessions),
        })
      })
      .catch(() => setPreviewErr('无法加载评测预览'))
      .finally(() => setPreviewLoading(false))
  }

  const submit = async () => {
    const n = nickname.trim()
    if (n.length < 1 || n.length > 20) {
      setSubmitMsg('请输入 1–20 个字符的昵称')
      return
    }
    setSubmitting(true)
    setSubmitMsg(null)
    try {
      const res = await fetch('/api/leaderboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: n }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitMsg(typeof data.error === 'string' ? data.error : '提交失败')
        return
      }
      const pos = typeof data.rank_position === 'number' ? data.rank_position : '?'
      setSubmitMsg(`提交成功！你的当前排名：第 ${pos} 名`)
      await loadList()
      setTimeout(() => {
        setModalOpen(false)
        setSubmitMsg(null)
      }, 1200)
    } catch {
      setSubmitMsg('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">排行榜</h2>
          <p className="text-sm text-slate-500 mt-1">看看谁的龙虾最强</p>
          {isDemo && entries.length > 0 && (
            <p className="text-[11px] text-cyan-500/80 mt-2">当前为演示数据，提交分数后将保存到你的本地排行榜</p>
          )}
        </div>
        <button
          type="button"
          onClick={openModal}
          className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#3b82c4] via-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-opacity"
        >
          提交我的分数
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">加载中…</span>
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
                  !isTop3 && 'border-white/[0.08] bg-white/[0.03]',
                )}
              >
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 min-w-[4.5rem] shrink-0">
                    {medal ? (
                      <>
                        <span className="text-2xl leading-none" aria-hidden>
                          {medal}
                        </span>
                        <span className="text-sm font-mono text-slate-400 tabular-nums">{pos}</span>
                      </>
                    ) : (
                      <span className="text-base font-mono text-slate-500 tabular-nums w-10">#{pos}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <div className="font-medium text-white">{e.nickname}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-md',
                          RANK_BADGE[e.rank] ?? RANK_BADGE.C,
                        )}
                      >
                        {e.rank}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 font-mono">
                        {e.topModel}
                      </span>
                      <span className="text-[10px] text-slate-500">{e.totalSessions} 会话</span>
                    </div>
                  </div>
                  <div className="text-right sm:ml-auto">
                    <div className="text-2xl sm:text-3xl font-bold tabular-nums bg-gradient-to-r from-cyan-200 to-teal-300 bg-clip-text text-transparent">
                      {Math.round(e.score)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{formatRelativeTime(e.submittedAt)}</div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-12">暂无排行数据</p>
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
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl shadow-cyan-900/20 p-6"
              onClick={ev => ev.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Medal className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg font-semibold text-white">提交到排行榜</h3>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10"
                  aria-label="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <label className="block text-xs text-slate-400 mb-1.5">昵称（1–20 字）</label>
              <input
                type="text"
                maxLength={20}
                value={nickname}
                onChange={ev => setNickname(ev.target.value)}
                placeholder="例如：龙虾本虾"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />

              <div className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <p className="text-[11px] uppercase tracking-wide text-cyan-500/80 mb-2">当前评测预览</p>
                {previewLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    读取中…
                  </div>
                )}
                {!previewLoading && previewErr && <p className="text-sm text-amber-400/90">{previewErr}</p>}
                {!previewLoading && !previewErr && preview && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">综合分</span>
                      <div className="text-xl font-bold text-white tabular-nums">{Math.round(preview.overallScore)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">等级</span>
                      <div className="text-xl font-bold text-cyan-300">{preview.rank}</div>
                    </div>
                    <div className="col-span-2 text-slate-400 text-xs">
                      模型 <span className="text-slate-300 font-mono">{preview.topModel}</span> ·{' '}
                      {preview.totalSessions} 会话
                    </div>
                  </div>
                )}
              </div>

              {submitMsg && (
                <p
                  className={cn(
                    'mt-3 text-sm',
                    submitMsg.startsWith('提交成功') ? 'text-emerald-400' : 'text-rose-400',
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 border border-white/10 hover:bg-white/5"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={submitting || previewLoading}
                  onClick={submit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#3b82c4] to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? '提交中…' : '确认提交'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
