import { useState, useCallback, useEffect, type DragEvent, type ChangeEvent } from 'react'
import { Search, Download, Upload, Loader2, ChevronDown } from 'lucide-react'
import FadeIn from '../components/ui/FadeIn'
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
      ? <mark key={i} className="rounded bg-blue-100 px-0.5 text-[#3b82c4]">{part}</mark>
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
  }, [initialQuery, runSearch])

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
  const recommendedSearches = [
    t('knowledge.search.term.toolFailure'),
    t('knowledge.search.term.retry'),
    t('knowledge.search.term.longOutput'),
    t('knowledge.search.term.openclaw'),
    t('knowledge.search.term.zeroclaw'),
  ]
  const emptySearchTitle = t('knowledge.search.emptyTitle')
  const emptySearchDescription = t('knowledge.search.emptyDesc', { query: activeQuery })
  const emptySearchHint = t('knowledge.search.emptyHint')
  const replayActionLabel = t('knowledge.search.openReplay')

  const openReplayFromSearch = (sessionId: string) => {
    onSelectReplaySession(sessionId)
    navigateTab('replay')
  }

  return (
    <FadeIn className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('knowledge.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('knowledge.subtitle')}</p>
        </div>
        {sessionCountError ? (
          <div className="state-surface state-surface-danger inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-orange-700">
            <span>{sessionCountError}</span>
            <button
              type="button"
              onClick={loadSessionCount}
              className="rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[11px] text-orange-700 transition-colors hover:bg-orange-50"
            >
              {retrySessionCountLabel}
            </button>
          </div>
        ) : (
          <p className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
            {sessionCountText}
          </p>
        )}
      </div>

      <section className="card p-6 md:p-7">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-blue-500/10 p-2 text-[#3b82c4]">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t('knowledge.search')}</h3>
            <p className="text-xs text-slate-500">{t('knowledge.search.hint')}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder={t('knowledge.search.placeholder')}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <button
            type="button"
            onClick={() => runSearch()}
            disabled={searchLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3b82c4] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#3473af] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('knowledge.search.btn')}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">{recommendedSearchTitle}</span>
          {recommendedSearches.map(keyword => (
            <button
              key={keyword}
              type="button"
              onClick={() => runSearch(keyword)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600 transition-colors hover:border-[#3b82c4]/20 hover:bg-blue-50 hover:text-[#3b82c4]"
            >
              {keyword}
            </button>
          ))}
        </div>

        {searchError && (
          <div className="state-surface state-surface-danger mt-4 px-4 py-3 text-sm text-orange-700">{searchError}</div>
        )}

        {searchLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('knowledge.search.loading')}
          </div>
        )}

        {!searchLoading && !activeQuery && !searchError && (
          <p className="py-6 text-center text-sm text-slate-500">{t('knowledge.search.hint')}</p>
        )}

        {showSearchEmpty && (
          <EmptyState
            icon="🔎"
            title={emptySearchTitle}
            description={emptySearchDescription}
            hint={emptySearchHint}
            className="mt-4 px-4 py-8"
          />
        )}

        {!searchLoading && searchResults && searchResults.length > 0 && (
          <ul className="mt-4 space-y-4">
            {searchResults.map(item => (
              <li key={item.sessionId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="mb-2 text-sm font-medium leading-relaxed text-slate-800">
                      {highlightText(item.summary || t('knowledge.noSummary'), activeQuery)}
                    </p>
                    <p className="break-all font-mono text-[11px] text-slate-500">{item.sessionId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openReplayFromSearch(item.sessionId)}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#3b82c4]/30 hover:text-[#3b82c4]"
                  >
                    {replayActionLabel}
                  </button>
                </div>
                <ul className="space-y-2">
                  {(item.matches ?? []).map((m, idx) => (
                    <li key={`${m.stepIndex}-${idx}`} className="border-l-2 border-blue-200 pl-3 text-xs text-slate-500">
                      <span className="mr-2 text-[#3b82c4]">#{m.stepIndex}</span>
                      <span>{m.type}</span>
                      <p className="mt-1 leading-relaxed text-slate-600">{highlightText(m.snippet, activeQuery)}</p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="card p-5">
        <summary className="details-summary-reset flex cursor-pointer items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t('knowledge.tools.title')}</h3>
            <p className="mt-1 text-sm text-slate-500">{t('knowledge.tools.desc')}</p>
          </div>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400">
            <ChevronDown className="h-4 w-4" />
          </span>
        </summary>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="state-surface px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Download className="h-4 w-4 text-[#3b82c4]" />
              {t('knowledge.export.title')}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void exportAll('json')}
                disabled={exporting !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#3b82c4]/30 hover:text-[#3b82c4] disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {exporting === 'json' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t('knowledge.export.json')}
              </button>
              <button
                type="button"
                onClick={() => void exportAll('markdown')}
                disabled={exporting !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#3b82c4]/30 hover:text-[#3b82c4] disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {exporting === 'markdown' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t('knowledge.export.md')}
              </button>
            </div>
            {exportError && (
              <div className="state-surface state-surface-danger mt-3 px-4 py-3 text-sm text-orange-700">{exportError}</div>
            )}
          </section>

          <section className="state-surface px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Upload className="h-4 w-4 text-[#3b82c4]" />
              {t('knowledge.import.title')}
            </div>
            <div
              role="button"
              tabIndex={0}
              onDragOver={e => {
                e.preventDefault()
                setImportDragging(true)
              }}
              onDragLeave={() => setImportDragging(false)}
              onDrop={onDrop}
              onKeyDown={e => e.key === 'Enter' && document.getElementById('knowledge-file-input')?.click()}
              onClick={() => document.getElementById('knowledge-file-input')?.click()}
              className={`rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                importDragging
                  ? 'border-[#3b82c4]/35 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <input
                id="knowledge-file-input"
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={onInputChange}
              />
              {importLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('knowledge.import.loading')}
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                  <p className="text-sm text-slate-500">{t('knowledge.import.drop')}</p>
                </>
              )}
            </div>
            {importMessage && (
              <p className={`mt-3 text-sm ${importMessage.ok ? 'text-[#3b82c4]' : 'text-orange-700'}`}>{importMessage.text}</p>
            )}
          </section>
        </div>
      </details>
    </FadeIn>
  )
}
