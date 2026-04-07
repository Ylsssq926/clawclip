import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import FadeIn from '../components/ui/FadeIn'
import GlowCard from '../components/ui/GlowCard'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import EmptyState from '../components/ui/EmptyState'
import { cn } from '../lib/cn'
import { useI18n } from '../lib/i18n'
import { apiGet, apiGetSafe, apiPost, parseApiErrorMessage } from '../lib/api'

interface DailyData {
  date: string
  cost: number
  totalTokens: number
}

interface CostSummary {
  totalCost: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  trend: 'up' | 'down' | 'stable'
  comparedToLastMonth: number
  budget: { isAlert: boolean; percentage: number; message: string }
  topTasks: { taskId: string; taskName: string; cost: number; tokens: number }[]
  pricingSource?: 'pricetoken' | 'static-default'
  pricingUpdatedAt?: string
  latestUsageAt?: string
  dataCutoffAt?: string
  costMeta?: {
    stale?: boolean
  }
  usingDemo?: boolean
}

interface CostInsight {
  type: 'info' | 'warning' | 'tip'
  icon: string
  messageZh: string
  messageEn: string
}

interface SavingSuggestion {
  currentModel: string
  alternativeModel: string
  currentCost: number
  alternativeCost: number
  saving: number
  tokens: number
}

interface SavingsReport {
  totalPotentialSaving: number
  suggestions: SavingSuggestion[]
}

type TokenWasteIssueType = 'retry-loop' | 'long-prompt' | 'verbose-output' | 'expensive-model' | 'context-bloat'

interface TokenWasteDiagnostic {
  type: TokenWasteIssueType
  severity: 'high' | 'medium' | 'low'
  titleZh: string
  titleEn: string
  descZh: string
  descEn: string
  estimatedWasteTokens: number
  estimatedWasteCost: number
  sessionId?: string
  sessionLabel?: string
}

interface TokenWasteReport {
  summary: {
    estimatedWasteTokens: number
    estimatedWasteCost: number
    signals: number
    topIssue?: TokenWasteIssueType
    usingDemo: boolean
  }
  diagnostics: TokenWasteDiagnostic[]
}

function formatWasteCost(value: number): string {
  if (value >= 1) return value.toFixed(2)
  if (value >= 0.1) return value.toFixed(3)
  return value.toFixed(4)
}

interface BudgetConfig {
  monthly: number
  alertThreshold: number
}

type ModelBreakdown = Record<string, { tokens: number; cost: number }>

interface ModelBreakdownRow {
  model: string
  cost: number
  tokens: number
  percentage: number
}

const chartTooltipStyle = {
  background: 'rgba(248,250,252,0.96)',
  border: '1px solid rgba(226,232,240,0.9)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
} as const

function formatFreshnessTime(value: string | undefined, locale: string): string {
  if (!value) return '--'
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return '--'

  return new Intl.DateTimeFormat(locale.startsWith('zh') ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

function CostSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="glass-raised rounded-xl p-5 border border-surface-border space-y-3">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-9 w-32" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="glass-raised rounded-xl p-6 border border-surface-border">
        <div className="skeleton h-6 w-28 mb-4" />
        <div className="skeleton h-[300px] w-full rounded-lg" />
      </div>
    </div>
  )
}

export default function CostMonitor() {
  const { t, locale } = useI18n()
  const isZh = locale.startsWith('zh')
  const [daily, setDaily] = useState<DailyData[]>([])
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [insights, setInsights] = useState<CostInsight[]>([])
  const [savings, setSavings] = useState<SavingsReport | null>(null)
  const [tokenWaste, setTokenWaste] = useState<TokenWasteReport | null>(null)
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown>({})
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig | null>(null)
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [budgetForm, setBudgetForm] = useState({ monthly: '', alertThreshold: '80' })
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [budgetSuccessMessage, setBudgetSuccessMessage] = useState<string | null>(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [demoCostHint, setDemoCostHint] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [d, s, isDemo, ins, sav, waste, models, budget] = await Promise.all([
        apiGet<DailyData[]>(`/api/cost/daily?days=${days}`),
        apiGet<CostSummary>(`/api/cost/summary?days=${days}`),
        apiGetSafe<{ hasRealSessionData?: boolean }>('/api/status')
          .then(status => !(status?.hasRealSessionData ?? false)),
        apiGet<CostInsight[]>(`/api/cost/insights?days=${days}`).catch(() => [] as CostInsight[]),
        apiGetSafe<SavingsReport>(`/api/cost/savings?days=${days}`),
        apiGetSafe<TokenWasteReport>(`/api/analytics/token-waste?days=${days}`),
        apiGetSafe<ModelBreakdown>(`/api/cost/models?days=${days}`),
        apiGetSafe<BudgetConfig>('/api/cost/budget'),
      ])

      const normalizedModels: ModelBreakdown = {}
      if (models && typeof models === 'object' && !Array.isArray(models)) {
        for (const [model, data] of Object.entries(models)) {
          normalizedModels[model] = {
            cost: Number(data?.cost ?? 0),
            tokens: Number(data?.tokens ?? 0),
          }
        }
      }

      const normalizedBudget =
        budget && typeof budget.monthly === 'number' && typeof budget.alertThreshold === 'number'
          ? { monthly: budget.monthly, alertThreshold: budget.alertThreshold }
          : null

      setDaily(Array.isArray(d) ? d : [])
      setSummary(s)
      setDemoCostHint(Boolean(isDemo || s?.usingDemo))
      setInsights(Array.isArray(ins) ? ins : [])
      setSavings(sav)
      setTokenWaste(waste?.summary ? waste : null)
      setModelBreakdown(normalizedModels)
      setBudgetConfig(normalizedBudget)
    } catch {
      setError(t('cost.error'))
    } finally {
      setLoading(false)
    }
  }, [days, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!budgetSuccessMessage) return
    const timer = window.setTimeout(() => setBudgetSuccessMessage(null), 3000)
    return () => window.clearTimeout(timer)
  }, [budgetSuccessMessage])

  const rawModelRows = Object.entries(modelBreakdown)
    .map(([model, data]) => ({
      model,
      cost: Number(data.cost ?? 0),
      tokens: Number(data.tokens ?? 0),
    }))
    .filter(row => row.cost > 0)
  const modelTotalCost = rawModelRows.reduce((sum, row) => sum + row.cost, 0)
  const modelBreakdownRows: ModelBreakdownRow[] = modelTotalCost > 0
    ? [...rawModelRows]
      .sort((a, b) => b.cost - a.cost)
      .map(row => ({
        ...row,
        percentage: (row.cost / modelTotalCost) * 100,
      }))
    : []
  const averageDailyCost = daily.length > 0 ? daily.reduce((sum, item) => sum + item.cost, 0) / daily.length : 0
  const pricingSourceLabel = summary?.pricingSource
    ? summary.pricingSource === 'pricetoken'
      ? (isZh ? 'PriceToken 动态价格' : 'Dynamic PriceToken pricing')
      : (isZh ? '内置静态默认表' : 'Built-in static defaults')
    : null
  const pricingUpdatedAtLabel = (() => {
    if (!summary?.pricingUpdatedAt) return null
    const timestamp = new Date(summary.pricingUpdatedAt)
    if (Number.isNaN(timestamp.getTime())) return null
    return new Intl.DateTimeFormat(isZh ? 'zh-CN' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp)
  })()
  const latestUsageLabel = formatFreshnessTime(summary?.latestUsageAt, locale)
  const dataCutoffLabel = formatFreshnessTime(summary?.dataCutoffAt, locale)
  const showGlobalEmptyState = !loading && !error && !!summary && summary.totalCost === 0
  const emptyStartHint = isZh
    ? '接入本地 JSONL 日志后跑几次真实任务，再回来查看趋势、模型占比和预算提醒。'
    : 'Connect local JSONL logs, run a few real tasks, then come back to review trends, model breakdown, and budget alerts.'
  const wasteDiagnostics = tokenWaste?.diagnostics.slice(0, 4) ?? []
  const wasteSummaryText = tokenWaste
    ? `${isZh ? '预计浪费' : 'Estimated waste'} $${formatWasteCost(tokenWaste.summary.estimatedWasteCost)} / ${tokenWaste.summary.estimatedWasteTokens.toLocaleString()} tokens`
    : (isZh ? '诊断数据暂不可用' : 'Diagnostics unavailable right now')
  const wasteMetaText = tokenWaste
    ? `${isZh ? `${tokenWaste.summary.signals} 个信号` : `${tokenWaste.summary.signals} signal${tokenWaste.summary.signals === 1 ? '' : 's'}`}${tokenWaste.summary.usingDemo ? (isZh ? ' · 当前为 Demo 诊断' : ' · Demo diagnostics') : ''}`
    : (isZh ? '会在这里汇总重试、长 Prompt、冗长输出等浪费信号' : 'Retry loops, long prompts, verbose output, and other waste signals will be summarized here')

  const openBudgetModal = () => {
    setBudgetError(null)
    setBudgetForm({
      monthly: budgetConfig ? String(budgetConfig.monthly) : '',
      alertThreshold: budgetConfig ? String(budgetConfig.alertThreshold) : '80',
    })
    setBudgetModalOpen(true)
  }

  const handleBudgetSave = async () => {
    const monthly = Number(budgetForm.monthly)
    const alertThreshold = Number(budgetForm.alertThreshold)

    if (!Number.isFinite(monthly) || monthly <= 0) {
      setBudgetError(isZh ? '请输入有效的月预算金额' : 'Please enter a valid monthly budget amount')
      return
    }

    if (!Number.isFinite(alertThreshold) || alertThreshold < 1 || alertThreshold > 100) {
      setBudgetError(isZh ? '告警阈值必须在 1 到 100 之间' : 'Alert threshold must be between 1 and 100')
      return
    }

    setBudgetSaving(true)
    setBudgetError(null)
    setBudgetSuccessMessage(null)

    try {
      await apiPost('/api/cost/budget', { monthly, alertThreshold })
      setBudgetModalOpen(false)
      await loadData()
      setBudgetSuccessMessage(isZh ? '✅ 预算已保存' : '✅ Budget saved')
    } catch (err) {
      setBudgetError(parseApiErrorMessage(err, isZh ? '保存预算设置失败' : 'Failed to save budget settings'))
    } finally {
      setBudgetSaving(false)
    }
  }

  const TrendIcon = summary?.trend === 'up' ? TrendingUp : summary?.trend === 'down' ? TrendingDown : Minus
  const trendColor = summary?.trend === 'up' ? 'text-red-400' : summary?.trend === 'down' ? 'text-green-400' : 'text-slate-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold">{t('cost.title')}</h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {([7, 14, 30] as const).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                days === d ? 'bg-accent text-white' : 'glass-raised text-slate-500 hover:text-slate-900 hover:bg-slate-100',
              )}
            >
              {t('cost.days').replace('{n}', String(d))}
            </button>
          ))}
          <button
            type="button"
            onClick={openBudgetModal}
            className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            {isZh ? '预算设置' : 'Budget Settings'}
          </button>
        </div>
      </div>

      {demoCostHint && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-700/90">
          {t('demo.hint.cost')}
        </div>
      )}

      {budgetSuccessMessage && (
        <div className="mb-4 rounded-lg border border-emerald-500/25 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
          {budgetSuccessMessage}
        </div>
      )}

      {loading && <CostSkeleton />}

      {error && (
        <div className="bg-red-50 border border-red-500/30 rounded-xl p-4 mb-6 text-red-600 text-sm">
          {error}
        </div>
      )}

      {showGlobalEmptyState && (
        <div className="mb-6">
          <EmptyState
            icon="📉"
            title={t('cost.empty.title')}
            description={t('cost.empty.desc')}
            hint={emptyStartHint}
          />
        </div>
      )}

      {!loading && summary?.budget?.isAlert && (
        <div className="bg-red-50 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-red-600 text-sm">{summary.budget.message}</span>
        </div>
      )}

      {!loading && (
        <FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <GlowCard>
              <div className="p-5">
                <span className="text-sm text-slate-500">{t('cost.card.total')}</span>
                <div className="text-2xl font-bold text-accent mt-1 tabular-nums">
                  <AnimatedCounter value={summary?.totalCost ?? 0} prefix="$" decimals={2} duration={1000} />
                </div>
                <div className={`flex items-center gap-1 mt-1 text-xs ${trendColor}`}>
                  <TrendIcon className="w-3 h-3" />
                  <span>
                    {t('cost.card.mom').replace('{n}', String(summary?.comparedToLastMonth?.toFixed(1) ?? '0'))}
                  </span>
                </div>
              </div>
            </GlowCard>
            <GlowCard>
              <div className="p-5">
                <span className="text-sm text-slate-500">{t('cost.card.tokens')}</span>
                <div className="text-2xl font-bold text-blue-400 mt-1 tabular-nums">
                  <AnimatedCounter value={summary?.totalTokens ?? 0} decimals={0} duration={1000} />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {t('cost.card.inOut')
                    .replace('{in}', String(summary?.inputTokens?.toLocaleString() ?? 0))
                    .replace('{out}', String(summary?.outputTokens?.toLocaleString() ?? 0))}
                </div>
              </div>
            </GlowCard>
            <GlowCard>
              <div className="p-5">
                <span className="text-sm text-slate-500">{t('cost.card.budget')}</span>
                <div className="text-2xl font-bold text-purple-400 mt-1 tabular-nums">
                  <AnimatedCounter value={summary?.budget?.percentage ?? 0} decimals={1} suffix="%" duration={1000} />
                </div>
                <div className="w-full bg-surface-overlay rounded-full h-2 mt-2 border border-surface-border">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      (summary?.budget?.percentage || 0) > 80 ? 'bg-red-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(summary?.budget?.percentage || 0, 100)}%` }}
                  />
                </div>
              </div>
            </GlowCard>
          </div>

          {modelBreakdownRows.length > 0 && (
            <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="text-lg font-semibold">{isZh ? '模型成本占比' : 'Cost by model'}</h3>
                <span className="text-xs text-slate-500">
                  {isZh ? '显示各模型在当前周期内的成本占比' : 'Share of spend by model in the selected range'}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(220, modelBreakdownRows.length * 46)}>
                <BarChart
                  data={modelBreakdownRows}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.14)" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                    tickFormatter={value => `${value}%`}
                  />
                  <YAxis type="category" dataKey="model" stroke="#64748b" tick={{ fontSize: 12 }} width={140} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelStyle={{ color: '#64748b' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Bar dataKey="percentage" name={isZh ? '成本占比' : 'Cost share'} fill="#3b82c4" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {!loading && insights.length > 0 && (
            <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
              <h3 className="text-lg font-semibold mb-4">{t('cost.insights.title')}</h3>
              <div className="space-y-3">
                {insights.map((ins, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 rounded-xl text-sm',
                      ins.type === 'warning' ? 'bg-amber-50 border border-amber-500/20 text-amber-700' :
                      ins.type === 'tip' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600' :
                      'bg-slate-50 border border-slate-200 text-slate-500',
                    )}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{ins.icon}</span>
                    <span>{isZh ? ins.messageZh : ins.messageEn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold">{isZh ? '🔥 Token 浪费诊断' : '🔥 Token Waste Diagnostics'}</h3>
                <p className="mt-2 text-sm text-slate-700">{wasteSummaryText}</p>
                <p className="mt-1 text-xs text-slate-500">{wasteMetaText}</p>
              </div>
            </div>

            {wasteDiagnostics.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
                {wasteDiagnostics.map((diagnostic, index) => (
                  <div key={`${diagnostic.type}-${diagnostic.sessionId ?? diagnostic.sessionLabel ?? index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{isZh ? diagnostic.titleZh : diagnostic.titleEn}</p>
                        {diagnostic.sessionLabel && (
                          <p className="mt-1 truncate text-[11px] text-slate-500">{diagnostic.sessionLabel}</p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-1 text-[11px] font-medium',
                          diagnostic.severity === 'high'
                            ? 'bg-red-500/10 text-red-600'
                            : diagnostic.severity === 'medium'
                              ? 'bg-amber-500/10 text-amber-700'
                              : 'bg-blue-500/10 text-[#3b82c4]',
                        )}
                      >
                        {diagnostic.severity === 'high'
                          ? (isZh ? '高' : 'High')
                          : diagnostic.severity === 'medium'
                            ? (isZh ? '中' : 'Medium')
                            : (isZh ? '低' : 'Low')}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{isZh ? diagnostic.descZh : diagnostic.descEn}</p>
                    <p className="mt-4 text-sm font-medium text-[#3b82c4]">
                      {isZh ? '预计浪费' : 'Estimated waste'} ${formatWasteCost(diagnostic.estimatedWasteCost)} · {diagnostic.estimatedWasteTokens.toLocaleString()} tokens
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                {tokenWaste
                  ? (isZh ? '当前时间范围内暂未发现明显的 Token 浪费信号。' : 'No obvious token waste signals were found in the selected time range.')
                  : (isZh ? '诊断接口暂不可用，稍后会在这里显示浪费信号。' : 'The diagnostics API is unavailable right now. Waste signals will appear here once it recovers.')}
              </div>
            )}
          </div>

          {!loading && savings && savings.suggestions.length > 0 && (
            <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t('cost.savings.title')}</h3>
                <div className="text-right">
                  <span className="text-xs text-slate-500">{t('cost.savings.total')}</span>
                  <span className="text-lg font-bold text-green-400 ml-2">${savings.totalPotentialSaving.toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-3">
                {savings.suggestions.map((sug, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-3 text-sm min-w-0">
                      <span className="font-medium text-slate-800 truncate">{sug.currentModel}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-green-400 truncate">{sug.alternativeModel}</span>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-green-400 font-medium text-sm">-${sug.saving.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-amber-700">⚠️ {isZh ? '注意：更换模型可能影响输出质量' : 'Note: switching models may affect output quality'}</p>
                <p className="text-xs text-slate-600">{t('cost.savings.disclaimer')}</p>
              </div>
            </div>
          )}

          {!loading && savings && savings.suggestions.length === 0 && summary && summary.totalCost > 0 && (
            <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6 text-center">
              <p className="text-sm text-slate-500">✅ {t('cost.savings.empty')}</p>
            </div>
          )}

          <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
            <h3 className="text-lg font-semibold mb-4">{t('cost.trend.title')}</h3>
            {summary && summary.totalCost === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <span className="text-4xl mb-3">📉</span>
                <p className="text-lg mb-1">{t('cost.empty.title')}</p>
                <p className="text-sm text-center max-w-md">{t('cost.empty.desc')}</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: '#64748b' }}
                      itemStyle={{ color: '#0f172a' }}
                    />
                    {averageDailyCost > 0 && (
                      <ReferenceLine y={averageDailyCost} stroke="#94a3b8" strokeDasharray="6 6" />
                    )}
                    <Line type="monotone" dataKey="cost" stroke="#f97316" strokeWidth={2} dot={false} name={t('cost.chart.series')} />
                  </LineChart>
                </ResponsiveContainer>
                {averageDailyCost > 0 && (
                  <p className="mt-3 text-xs text-slate-500">
                    {isZh ? '虚线表示日均成本' : 'Dashed line shows average daily cost'} · ${averageDailyCost.toFixed(2)}
                  </p>
                )}
              </>
            )}
          </div>

          {summary?.topTasks && summary.topTasks.length > 0 && (
            <div className="glass-raised rounded-xl p-6 border border-surface-border">
              <h3 className="text-lg font-semibold mb-4">{t('cost.topTasks')}</h3>
              <div className="space-y-3">
                {summary.topTasks.slice(0, 5).map((task, i) => (
                  <div key={task.taskId} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-sm w-6">{i + 1}.</span>
                      <span className="text-sm truncate max-w-[300px]">{task.taskName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-accent font-medium">${task.cost.toFixed(4)}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        {task.tokens.toLocaleString()} {t('replay.list.tokensUnit')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FadeIn>
      )}

      {budgetModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !budgetSaving && setBudgetModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-cyan-900/10"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{isZh ? '预算设置' : 'Budget Settings'}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {isZh ? '设置月预算金额和触发告警的阈值。' : 'Set your monthly budget and alert threshold.'}
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="block text-xs text-slate-500 mb-1.5">{isZh ? '月预算金额' : 'Monthly budget'}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetForm.monthly}
                  onChange={event => setBudgetForm(form => ({ ...form, monthly: event.target.value }))}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder={isZh ? '例如 500' : 'e.g. 500'}
                />
              </label>

              <label className="block">
                <span className="block text-xs text-slate-500 mb-1.5">{isZh ? '告警阈值（%）' : 'Alert threshold (%)'}</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={budgetForm.alertThreshold}
                  onChange={event => setBudgetForm(form => ({ ...form, alertThreshold: event.target.value }))}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="80"
                />
              </label>
            </div>

            {budgetError && <p className="mt-4 text-sm text-red-600">{budgetError}</p>}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={budgetSaving}
                onClick={() => setBudgetModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-100 disabled:opacity-50"
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={budgetSaving}
                onClick={handleBudgetSave}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#3b82c4] to-teal-500 disabled:opacity-50"
              >
                {budgetSaving ? (isZh ? '保存中...' : 'Saving...') : (isZh ? '保存' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing disclaimer */}
      <div className="text-[11px] text-slate-600 leading-relaxed mt-4 px-1 space-y-1">
        {pricingSourceLabel && (
          <p>
            {isZh ? '定价来源：' : 'Pricing source: '}
            <span className="font-medium text-slate-700">{pricingSourceLabel}</span>
            {pricingUpdatedAtLabel ? ` · ${isZh ? '更新时间' : 'Updated'} ${pricingUpdatedAtLabel}` : ''}
          </p>
        )}
        <p>
          {isZh ? '数据截止到：' : 'Data cutoff: '}
          <span className="font-medium text-slate-700">{dataCutoffLabel}</span>
        </p>
        <p>
          {isZh ? '最近 usage：' : 'Latest usage: '}
          <span className="font-medium text-slate-700">{latestUsageLabel}</span>
        </p>
        {summary?.costMeta?.stale && (
          <p className="text-amber-700">
            {isZh
              ? '⚠️ 当前价格目录已过期，展示为最近一次成功刷新结果'
              : '⚠️ Pricing catalog is stale; showing the last successful snapshot'}
          </p>
        )}
        <p>{t('cost.disclaimer.estimate')}</p>
        <p>{t('cost.disclaimer.source')}</p>
      </div>
    </div>
  )
}
