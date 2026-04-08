import { useState, useCallback, useEffect, type DragEvent, type ChangeEvent } from 'react'
import { Search, Download, Upload, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useI18n } from '../lib/i18n'
import { apiGet } from '../lib/api'
import EmptyState from '../components/ui/EmptyState'

interface SearchMatch {
  stepIndex: number
  type: string
  snippet: string
}

interface SearchResultItem {
  sessionId: string
  summary: string
  matches: SearchMatch[]
}

function highlightText(text: string, query: string) {
  if (!query) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-blue-500/30 text-blue-300 rounded px-0.5">{part}</mark>
      : part,
  )
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

interface Props {
  initialQuery?: string
  navigateTab: (tab: 'replay') => void
  onSelectReplaySession: (sessionId: string) => void
}

export default function Knowledge({ initialQuery, navigateTab, onSelectReplaySession }: Props) {
  const { t } = useI18n()
  const [sessionCount, setSessionCount] = useState<number | null>(null)
  const [sessionCountError, setSessionCountError] = useState<string | null>(null)
  const [qInput, setQInput] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null)

  const [exporting, setExporting] = useState<'json' | 'markdown' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  const [importDragging, setImportDragging] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const loadSessionCount = useCallback(() => {
    setSessionCountError(null)
    apiGet<{ total?: number }>('/api/knowledge/stats')
      .then(data => {
        setSessionCount(typeof data.total === 'number' ? data.total : 0)
        setSessionCountError(null)
      })
      .catch(() => {
        setSessionCount(null)
        setSessionCountError(t('knowledge.stats.error'))
      })
  }, [t])

  useEffect(() => {
    void loadSessionCount()
  }, [loadSessionCount])

  const runSearch = useCallback((nextQuery?: string) => {
    const q = (nextQuery ?? qInput).trim()
    if (typeof nextQuery === 'string') {
      setQInput(q)
    }
    setActiveQuery(q)
    if (!q) {
      setSearchResults([])
      setSearchError(null)
      return
    }
    setSearchLoading(true)
    setSearchError(null)
    setSearchResults(null)
    apiGet<{ results?: SearchResultItem[] }>(`/api/knowledge/search?q=${encodeURIComponent(q)}`)
      .then(data => {
        setSearchResults(Array.isArray(data.results) ? data.results : [])
      })
      .catch(() => setSearchError(t('knowledge.search.error')))
      .finally(() => setSearchLoading(false))
  }, [qInput, t])

  useEffect(() => {
    if (!initialQuery?.trim()) return
    runSearch(initialQuery)
  }, [initialQuery])

  const exportAll = async (format: 'json' | 'markdown') => {
    setExporting(format)
    setExportError(null)
    try {
      const res = await fetch(`/api/knowledge/export-all?format=${format}`)
      if (!res.ok) throw new Error(`${t('knowledge.export.failStatus')} (${res.status})`)
      const blob = await res.blob()
      const name = format === 'json' ? 'knowledge-sessions.json' : 'knowledge-sessions.md'
      triggerBlobDownload(blob, name)
    } catch {
      setExportError(t('knowledge.export.error'))
    } finally {
      setExporting(null)
    }
  }

  const postImport = async (text: string) => {
    setImportLoading(true)
    setImportMessage(null)
    try {
      let body: unknown
      try {
        body = JSON.parse(text)
      } catch {
        setImportMessage({ ok: false, text: t('knowledge.import.badJson') })
        return
      }
      const res = await fetch('/api/knowledge/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(errText || `HTTP ${res.status}`)
      }
      let msg = t('knowledge.import.success')
      let refreshedCount = false
      try {
        const j = await res.json()
        if (j && typeof j.total === 'number') {
          setSessionCount(j.total)
          setSessionCountError(null)
          refreshedCount = true
        }
        if (j && typeof j.imported === 'number') {
          msg = t('knowledge.import.successDetail', {
            imported: j.imported,
            total: j.total ?? '?',
          })
        }
      } catch {
        /* ignore */
      }
      if (!refreshedCount) {
        void loadSessionCount()
      }
      setImportMessage({ ok: true, text: msg })
    } catch {
      setImportMessage({ ok: false, text: t('knowledge.import.error') })
    } finally {
      setImportLoading(false)
    }
  }

  const onFile = (file: File | undefined) => {
    if (!file || !file.name.toLowerCase().endsWith('.json')) {
      setImportMessage({ ok: false, text: t('knowledge.import.invalid') })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      void postImport(text)
    }
    reader.onerror = () => setImportMessage({ ok: false, text: t('knowledge.import.error') })
    reader.readAsText(file, 'UTF-8')
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setImportDragging(false)
    onFile(e.dataTransfer.files[0])
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    onFile(f)
  }

  const showSearchEmpty =
    Boolean(activeQuery) && !searchLoading && !searchError && searchResults !== null && searchResults.length === 0
  const sessionCountText = sessionCount === null
    ? t('knowledge.stats.loading')
    : t('knowledge.stats.count', { count: sessionCount })
  const retrySessionCountLabel = t('knowledge.stats.retry')
  const recommendedSearchTitle = t('knowledge.search.recommended')
  const recommendedSearches = ['React', t('knowledge.search.rednote'), 'Notion', 'Python', 'Kubernetes']
  const emptySearchTitle = t('knowledge.search.emptyTitle')
  const emptySearchDescription = t('knowledge.search.emptyDesc', { query: activeQuery })
  const emptySearchHint = t('knowledge.search.emptyHint')
  const replayActionLabel = t('knowledge.search.openReplay')
  const openReplayFromSearch = (sessionId: string) => {
    onSelectReplaySession(sessionId)
    navigateTab('replay')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">{t('knowledge.title')}</h2>
        <p className="text-slate-500 text-sm">{t('knowledge.subtitle')}</p>
        {sessionCountError ? (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <span>{sessionCountError}</span>
            <button
              type="button"
              onClick={loadSessionCount}
              className="rounded-full border border-amber-300 px-2 py-0.5 text-[11px] text-amber-700 transition-colors hover:bg-amber-100"
            >
              {retrySessionCountLabel}
            </button>
          </div>
        ) : (
          <p className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{sessionCountText}</p>
        )}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card card-blue p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Search className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">{t('knowledge.search')}</h3>
        </div>
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="search"
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder={t('knowledge.search.placeholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <button
            type="button"
            onClick={() => runSearch()}
            disabled={searchLoading}
            className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t('knowledge.search.btn')}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">{recommendedSearchTitle}</span>
          {recommendedSearches.map(keyword => (
            <button
              key={keyword}
              type="button"
              onClick={() => runSearch(keyword)}
              className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-blue-100 transition-colors"
            >
              {keyword}
            </button>
          ))}
        </div>

        {searchError && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">{searchError}</div>
        )}


        {searchLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('knowledge.search.loading')}
          </div>
        )}

        {!searchLoading && !activeQuery && !searchError && (
          <p className="text-sm text-slate-500 text-center py-4">{t('knowledge.search.hint')}</p>
        )}

        {showSearchEmpty && (
          <EmptyState
            icon="🔎"
            title={emptySearchTitle}
            description={emptySearchDescription}
            hint={emptySearchHint}
            className="px-4 py-8"
          />
        )}

        {!searchLoading && searchResults && searchResults.length > 0 && (
          <ul className="space-y-4 mt-2">
            {searchResults.map(item => (
              <li key={item.sessionId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 mb-2">{highlightText(item.summary || t('knowledge.noSummary'), activeQuery)}</p>
                    <p className="text-[11px] text-slate-600 font-mono break-all">{item.sessionId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openReplayFromSearch(item.sessionId)}
                    className="inline-flex items-center justify-center rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-medium text-cyan-700 transition-colors hover:border-cyan-300 hover:bg-cyan-50"
                  >
                    {replayActionLabel}
                  </button>
                </div>
                <ul className="space-y-2">
                  {(item.matches ?? []).map((m, idx) => (
                    <li key={`${m.stepIndex}-${idx}`} className="text-xs text-slate-500 border-l-2 border-cyan-500/40 pl-3">
                      <span className="text-cyan-500/80 mr-2">#{m.stepIndex}</span>
                      <span className="text-slate-500">{m.type}</span>
                      <p className="mt-1 text-slate-500">{highlightText(m.snippet, activeQuery)}</p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card card-cyan p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Download className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">{t('knowledge.export.title')}</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">{t('knowledge.export.desc')}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void exportAll('json')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {exporting === 'json' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t('knowledge.export.json')}
          </button>
          <button
            type="button"
            onClick={() => void exportAll('markdown')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {exporting === 'markdown' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t('knowledge.export.md')}
          </button>
        </div>
        {exportError && (
          <p className="text-sm text-red-300 mt-3">{exportError}</p>
        )}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card card-green p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Upload className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">{t('knowledge.import.title')}</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">{t('knowledge.import.desc')}</p>
        <div
          role="button"
          tabIndex={0}
          onDragOver={e => { e.preventDefault(); setImportDragging(true) }}
          onDragLeave={() => setImportDragging(false)}
          onDrop={onDrop}
          onKeyDown={e => e.key === 'Enter' && document.getElementById('knowledge-file-input')?.click()}
          className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer ${
            importDragging ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
          }`}
          onClick={() => document.getElementById('knowledge-file-input')?.click()}
        >
          <input
            id="knowledge-file-input"
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onInputChange}
          />
          {importLoading ? (
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> {t('knowledge.import.loading')}
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-500">{t('knowledge.import.drop')}</p>
            </>
          )}
        </div>
        {importMessage && (
          <p className={`text-sm mt-3 ${importMessage.ok ? 'text-emerald-400' : 'text-red-300'}`}>{importMessage.text}</p>
        )}
      </motion.section>
    </div>
  )
}
