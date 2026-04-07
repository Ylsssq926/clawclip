import { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight } from 'lucide-react'
import FadeIn from '../components/ui/FadeIn'
import GlowCard from '../components/ui/GlowCard'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import EmptyState from '../components/ui/EmptyState'
import { cn } from '../lib/cn'
import { useI18n } from '../lib/i18n'
import { apiGet, apiGetSafe, apiPost, parseApiErrorMessage } from '../lib/api'
import {
  DEFAULT_COST_RECONCILIATION_SORT,
  getCostReconciliationDisplayRows,
  type CostReconciliationSortKey,
} from '../lib/costReconciliationRows'

interface DailyData {
  date: string
  cost: number
  totalTokens: number
}

type PricingReference = 'official-static' | 'pricetoken' | 'openrouter'
type PricingSource = 'pricetoken' | 'openrouter' | 'static-default'
type UsageSource = 'replay' | 'log' | 'demo' | 'mixed'

type UsageSourceBreakdown = Record<UsageSource, number>

interface CostReconciliationMeta {
  currentReference: PricingReference
  baselineReference: PricingReference
  pricingSource: PricingSource
  pricingCatalogVersion: string
  pricingUpdatedAt: string
  stale: boolean
  baselinePricingSource: PricingSource
  baselinePricingCatalogVersion: string
  baselinePricingUpdatedAt: string
  baselineStale: boolean
  latestUsageAt?: string
  dataCutoffAt: string
}

interface CostReconciliationSummary {
  sessions: number
  currentCost: number
  baselineCost: number
  delta: number
  estimatedRows: number
  usageSourceBreakdown: UsageSourceBreakdown
}

interface CostReconciliationRow {
  sessionId: string
  sessionLabel: string
  provider: string | null
  primaryModel: string | null
  usageSource: UsageSource
  estimated: boolean
  replayAvailable: boolean
  inputTokens: number
  outputTokens: number
  currentCost: number
  baselineCost: number
  delta: number
}

interface CostReconciliationData {
  meta: CostReconciliationMeta
  summary: CostReconciliationSummary
  rows: CostReconciliationRow[]
}

const PRICING_REFERENCE_OPTIONS: Array<{
  value: PricingReference
  labelZh: string
  labelEn: string
}> = [
  { value: 'pricetoken', labelZh: 'PriceToken', labelEn: 'PriceToken' },
  { value: 'official-static', labelZh: 'Official', labelEn: 'Official' },
  { value: 'openrouter', labelZh: 'OpenRouter', labelEn: 'OpenRouter' },
]

function isPricingReference(value: unknown): value is PricingReference {
  return value === 'official-static' || value === 'pricetoken' || value === 'openrouter'
}

function getPricingReferenceLabel(reference: PricingReference | undefined, isZh: boolean): string | null {
  if (!reference) return null
  switch (reference) {
    case 'official-static':
      return isZh ? 'Official 静态表' : 'Official static table'
    case 'pricetoken':
      return 'PriceToken'
    case 'openrouter':
      return 'OpenRouter'
    default:
      return null
  }
}

function getPricingSourceLabel(source: PricingSource | undefined, isZh: boolean): string | null {
  if (!source) return null
  switch (source) {
    case 'pricetoken':
      return isZh ? 'PriceToken 动态价格' : 'Dynamic PriceToken pricing'
    case 'openrouter':
      return isZh ? 'OpenRouter 官方 models 接口' : 'OpenRouter public models API'
    case 'static-default':
      return isZh ? '内置静态默认表' : 'Built-in static defaults'
    default:
      return null
  }
}

function getUsageSourceLabel(source: UsageSource | undefined, isZh: boolean): string {
  switch (source) {
    case 'replay':
      return isZh ? '回放' : 'Replay'
    case 'log':
      return isZh ? '日志' : 'Logs'
    case 'demo':
      return isZh ? 'Demo' : 'Demo'
    case 'mixed':
      return isZh ? '混合' : 'Mixed'
    default:
      return '--'
  }
}

function getUsageSourceBadgeClass(source: UsageSource | undefined): string {
  switch (source) {
    case 'replay':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'log':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'demo':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    case 'mixed':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-500'
  }
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
  pricingReference?: PricingReference
  pricingSource?: PricingSource
  pricingUpdatedAt?: string
  pricingCatalogVersion?: string
  latestUsageAt?: string
  dataCutoffAt?: string
  costMeta?: {
    pricingReference?: PricingReference
    pricingCatalogVersion?: string
    stale?: boolean
  }
  usingDemo?: boolean
}

interface ReferenceCompareRow {
  reference: PricingReference
  label: string
  totalCost: number
  deltaVsCurrent: number
  pricingSource: PricingSource
  pricingCatalogVersion: string
}

interface ReferenceCompareData {
  currentReference: PricingReference
  currentTotalCost: number
  rows: ReferenceCompareRow[]
}

interface CostInsight {
  type: 'info' | 'warning' | 'tip'
  icon: string
  messageZh: string
  messageEn: string
}

type SavingReasonType = 'switch-model' | 'trim-prompt' | 'trim-output' | 'reduce-retries'
type SavingPriority = 'high' | 'medium' | 'low'

interface SavingSuggestion {
  currentModel: string
  alternativeModel: string
  currentCost: number
  alternativeCost: number
  saving: number
  tokens: number
  reasonType?: SavingReasonType
  reasonZh?: string
  reasonEn?: string
  actionZh?: string
  actionEn?: string
  qualityGuardrailZh?: string
  qualityGuardrailEn?: string
  priority?: SavingPriority
  sessionId?: string
  sessionLabel?: string
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

function formatSignedCostDelta(value: number): string {
  if (Math.abs(value) < 0.0000005) return '$0.0000'
  return `${value > 0 ? '+' : '-'}$${formatWasteCost(Math.abs(value))}`
}

function getSavingTypeMeta(reasonType: SavingReasonType | undefined, isZh: boolean) {
  switch (reasonType) {
    case 'reduce-retries':
      return {
        label: isZh ? '先修重试' : 'Fix retries',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      }
    case 'trim-prompt':
      return {
        label: isZh ? '缩 Prompt' : 'Trim prompt',
        className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
      }
    case 'trim-output':
      return {
        label: isZh ? '缩输出' : 'Trim output',
        className: 'border-violet-200 bg-violet-50 text-violet-700',
      }
    case 'switch-model':
      return {
        label: isZh ? '换模型' : 'Switch model',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      }
    default:
      return {
        label: isZh ? '优化建议' : 'Suggestion',
        className: 'border-slate-200 bg-slate-50 text-slate-600',
      }
  }
}

function getSavingCardClass(priority: SavingPriority | undefined): string {
  switch (priority) {
    case 'high':
      return 'border-[#3b82c4]/25 bg-[#3b82c4]/5'
    case 'medium':
      return 'border-cyan-200 bg-cyan-50/60'
    case 'low':
    default:
      return 'border-slate-200 bg-slate-50'
  }
}

function getSavingPriorityMeta(priority: SavingPriority | undefined, t: (key: string) => string) {
  switch (priority) {
    case 'high':
      return {
        label: t('cost.savings.priority.high'),
        className: 'border-[#3b82c4]/20 bg-[#3b82c4]/10 text-[#2f6fa8]',
      }
    case 'low':
      return {
        label: t('cost.savings.priority.low'),
        className: 'border-slate-200 bg-slate-100 text-slate-600',
      }
    case 'medium':
    default:
      return {
        label: t('cost.savings.priority.medium'),
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      }
  }
}

function getSavingGuardrailMeta(reasonType: SavingReasonType | undefined, t: (key: string) => string) {
  if (reasonType === 'switch-model') {
    return {
      label: t('cost.savings.guardrail.cautious'),
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      badgeClassName: 'bg-amber-100 text-amber-700',
    }
  }

  return {
    label: t('cost.savings.guardrail.lowRisk'),
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    badgeClassName: 'bg-emerald-100 text-emerald-700',
  }
}

function getSavingReasonText(suggestion: SavingSuggestion, isZh: boolean): string {
  if (isZh) {
    if (suggestion.reasonZh) return suggestion.reasonZh
    if (suggestion.currentModel && suggestion.alternativeModel && suggestion.currentModel !== suggestion.alternativeModel) {
      return `${suggestion.currentModel} 的这部分成本偏高，可以优先尝试切到 ${suggestion.alternativeModel}。`
    }
    return '这类任务有明确的降本空间，适合优先处理。'
  }

  if (suggestion.reasonEn) return suggestion.reasonEn
  if (suggestion.currentModel && suggestion.alternativeModel && suggestion.currentModel !== suggestion.alternativeModel) {
    return `${suggestion.currentModel} is expensive for this slice of work, so ${suggestion.alternativeModel} is worth trying first.`
  }
  return 'This workload has a clear cost-saving opportunity and is worth tackling first.'
}

function getSavingActionText(suggestion: SavingSuggestion, isZh: boolean): string {
  if (isZh) {
    if (suggestion.actionZh) return suggestion.actionZh
    if (suggestion.currentModel && suggestion.alternativeModel && suggestion.currentModel !== suggestion.alternativeModel) {
      return `先把这类任务灰度到 ${suggestion.alternativeModel}，确认质量稳定后再逐步扩大。`
    }
    return '先从一个稳定、低风险的任务入口试改，再观察成本变化。'
  }

  if (suggestion.actionEn) return suggestion.actionEn
  if (suggestion.currentModel && suggestion.alternativeModel && suggestion.currentModel !== suggestion.alternativeModel) {
    return `Pilot ${suggestion.alternativeModel} on this task type first, then expand gradually once quality stays stable.`
  }
  return 'Start with one stable, low-risk task entry point and watch how the cost changes.'
}

function getSavingGuardrailText(suggestion: SavingSuggestion, isZh: boolean): string {
  if (isZh) {
    if (suggestion.qualityGuardrailZh) return suggestion.qualityGuardrailZh
    return suggestion.reasonType === 'switch-model'
      ? '建议先在低风险任务灰度切换，确认质量稳定后再扩大范围。'
      : '这类优化通常不直接牺牲模型能力，适合优先尝试。'
  }

  if (suggestion.qualityGuardrailEn) return suggestion.qualityGuardrailEn
  return suggestion.reasonType === 'switch-model'
    ? 'Roll this out on lower-risk tasks first, then expand once quality stays stable.'
    : 'This kind of optimization usually reduces waste without directly sacrificing model capability.'
}

interface BudgetConfig {
  monthly: number
  alertThreshold: number
  pricingReference?: PricingReference
}

type ModelBreakdown = Record<string, { tokens: number; cost: number }>

interface ModelBreakdownRow {
  model: string
  cost: number
  tokens: number
  percentage: number
}

type ModelValueLabel = 'cheap-workhorse' | 'balanced' | 'premium-specialist' | 'experimental'

interface ModelValueRow {
  model: string
  sessions: number
  totalCost: number
  totalTokens: number
  avgCostPerSession: number
  avgOutputInputRatio: number
  toolUsageRate: number
  errorRate: number
  valueLabel: ModelValueLabel
  valueLabelZh: string
  valueLabelEn: string
  recommendationZh: string
  recommendationEn: string
}

interface ModelValueReport {
  rows: ModelValueRow[]
}

function formatMatrixCost(value: number): string {
  if (value >= 1) return value.toFixed(2)
  if (value >= 0.1) return value.toFixed(3)
  if (value >= 0.01) return value.toFixed(4)
  return value.toFixed(5)
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(value * 100 >= 10 ? 0 : 1)}%`
}

function formatCompactTokens(value: number, locale: string): string {
  return new Intl.NumberFormat(locale.startsWith('zh') ? 'zh-CN' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function getModelValueBadgeClass(valueLabel: ModelValueLabel): string {
  switch (valueLabel) {
    case 'cheap-workhorse':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'premium-specialist':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    case 'experimental':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'balanced':
    default:
      return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  }
}

function getStabilityMeta(errorRate: number, isZh: boolean): { label: string; className: string } {
  if (errorRate <= 0.03) {
    return {
      label: isZh ? '很稳' : 'Very stable',
      className: 'text-emerald-600',
    }
  }
  if (errorRate <= 0.08) {
    return {
      label: isZh ? '较稳' : 'Stable',
      className: 'text-cyan-700',
    }
  }
  if (errorRate <= 0.15) {
    return {
      label: isZh ? '可接受' : 'Acceptable',
      className: 'text-amber-700',
    }
  }
  return {
    label: isZh ? '波动偏大' : 'Needs watching',
    className: 'text-rose-600',
  }
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

interface Props {
  onOpenReplaySession: (sessionId: string) => void
}

export default function CostMonitor({ onOpenReplaySession }: Props) {
  const { t, locale } = useI18n()
  const isZh = locale.startsWith('zh')
  const [daily, setDaily] = useState<DailyData[]>([])
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [referenceCompare, setReferenceCompare] = useState<ReferenceCompareData | null>(null)
  const [reconciliation, setReconciliation] = useState<CostReconciliationData | null>(null)
  const [insights, setInsights] = useState<CostInsight[]>([])
  const [savings, setSavings] = useState<SavingsReport | null>(null)
  const [tokenWaste, setTokenWaste] = useState<TokenWasteReport | null>(null)
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown>({})
  const [modelValueRows, setModelValueRows] = useState<ModelValueRow[]>([])
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig | null>(null)
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [budgetForm, setBudgetForm] = useState({ monthly: '', alertThreshold: '80' })
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [referenceSaving, setReferenceSaving] = useState(false)
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [budgetSuccessMessage, setBudgetSuccessMessage] = useState<string | null>(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [demoCostHint, setDemoCostHint] = useState(false)
  const [reconciliationSortBy, setReconciliationSortBy] = useState<CostReconciliationSortKey>(DEFAULT_COST_RECONCILIATION_SORT)
  const [showEstimatedOnly, setShowEstimatedOnly] = useState(false)
  const [showReplayableOnly, setShowReplayableOnly] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [d, s, compare, recon, isDemo, ins, sav, waste, models, modelValue, budget] = await Promise.all([
        apiGet<DailyData[]>(`/api/cost/daily?days=${days}`),
        apiGet<CostSummary>(`/api/cost/summary?days=${days}`),
        apiGetSafe<ReferenceCompareData>(`/api/cost/reference-compare?days=${days}`),
        apiGetSafe<CostReconciliationData>(`/api/cost/reconciliation?days=${days}&baseline=official-static`),
        apiGetSafe<{ hasRealSessionData?: boolean }>('/api/status')
          .then(status => !(status?.hasRealSessionData ?? false)),
        apiGet<CostInsight[]>(`/api/cost/insights?days=${days}`).catch(() => [] as CostInsight[]),
        apiGetSafe<SavingsReport>(`/api/cost/savings?days=${days}`),
        apiGetSafe<TokenWasteReport>(`/api/analytics/token-waste?days=${days}`),
        apiGetSafe<ModelBreakdown>(`/api/cost/models?days=${days}`),
        apiGetSafe<ModelValueReport>(`/api/analytics/model-value?days=${days}`),
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
          ? {
              monthly: budget.monthly,
              alertThreshold: budget.alertThreshold,
              pricingReference: isPricingReference(budget.pricingReference) ? budget.pricingReference : 'pricetoken',
            }
          : null

      setDaily(Array.isArray(d) ? d : [])
      setSummary(s)
      setReferenceCompare(compare?.rows?.length ? compare : null)
      setReconciliation(recon?.rows?.length ? recon : null)
      setDemoCostHint(Boolean(isDemo || s?.usingDemo))
      setInsights(Array.isArray(ins) ? ins : [])
      setSavings(sav)
      setTokenWaste(waste?.summary ? waste : null)
      setModelBreakdown(normalizedModels)
      setModelValueRows(Array.isArray(modelValue?.rows) ? modelValue.rows : [])
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
  const modelValueDisplayRows = modelValueRows
    .filter(row => row.sessions > 0)
    .slice(0, 6)
  const averageDailyCost = daily.length > 0 ? daily.reduce((sum, item) => sum + item.cost, 0) / daily.length : 0
  const selectedPricingReference = budgetConfig?.pricingReference ?? summary?.costMeta?.pricingReference ?? 'pricetoken'
  const pricingReferenceLabel = getPricingReferenceLabel(summary?.costMeta?.pricingReference ?? selectedPricingReference, isZh)
  const pricingSourceLabel = getPricingSourceLabel(summary?.pricingSource, isZh)
  const pricingCatalogVersion = summary?.costMeta?.pricingCatalogVersion ?? summary?.pricingCatalogVersion ?? null
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
  const referenceCompareRows = referenceCompare?.rows ?? []
  const currentReferenceRow = referenceCompareRows.find(row => row.reference === referenceCompare?.currentReference) ?? null
  const officialReferenceRow = referenceCompareRows.find(row => row.reference === 'official-static') ?? null
  const referenceVsOfficialRows = officialReferenceRow
    ? referenceCompareRows
      .filter(row => row.reference !== 'official-static')
      .map(row => ({
        ...row,
        deltaVsOfficial: row.totalCost - officialReferenceRow.totalCost,
      }))
    : []
  const reconciliationRows = reconciliation?.rows ?? []
  const reconciliationSummary = reconciliation?.summary ?? null
  const reconciliationMeta = reconciliation?.meta ?? null
  const reconciliationUsageBreakdown = reconciliationSummary?.usageSourceBreakdown ?? null
  const reconciliationCurrentReferenceLabel = getPricingReferenceLabel(reconciliationMeta?.currentReference, isZh)
  const reconciliationBaselineReferenceLabel = getPricingReferenceLabel(reconciliationMeta?.baselineReference, isZh)
  const reconciliationCurrentSourceLabel = getPricingSourceLabel(reconciliationMeta?.pricingSource, isZh)
  const reconciliationBaselineSourceLabel = getPricingSourceLabel(reconciliationMeta?.baselinePricingSource, isZh)
  const displayedReconciliationRows = getCostReconciliationDisplayRows(reconciliationRows, {
    sortBy: reconciliationSortBy,
    onlyEstimated: showEstimatedOnly,
    onlyReplayable: showReplayableOnly,
  })
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
  const hasSwitchModelSuggestion = Boolean(
    savings?.suggestions.some(suggestion => (
      suggestion.reasonType === 'switch-model'
      || (suggestion.currentModel && suggestion.alternativeModel && suggestion.currentModel !== suggestion.alternativeModel)
    )),
  )
  const replayActionLabel = isZh ? '查看会话' : 'View session'
  const canOpenReplaySession = (sessionId?: string): sessionId is string => Boolean(sessionId?.trim())
  const reconciliationSortOptions: Array<{ value: CostReconciliationSortKey; label: string }> = [
    { value: 'abs-delta', label: isZh ? '偏差最大' : 'Largest delta' },
    { value: 'current-cost', label: isZh ? '当前成本最高' : 'Highest current cost' },
    { value: 'tokens', label: isZh ? 'Token 最多' : 'Most tokens' },
  ]

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

  const handlePricingReferenceChange = async (pricingReference: PricingReference) => {
    const previousReference = selectedPricingReference
    setReferenceSaving(true)
    setBudgetError(null)
    setBudgetSuccessMessage(null)
    setError(null)
    setBudgetConfig(current => (
      current
        ? { ...current, pricingReference }
        : { monthly: 50, alertThreshold: 80, pricingReference }
    ))

    try {
      await apiPost('/api/cost/budget', { pricingReference })
      await loadData()
      setBudgetSuccessMessage(isZh ? '✅ 价格参考已更新' : '✅ Pricing reference updated')
    } catch (err) {
      setBudgetConfig(current => (
        current
          ? { ...current, pricingReference: previousReference }
          : { monthly: 50, alertThreshold: 80, pricingReference: previousReference }
      ))
      setError(parseApiErrorMessage(err, isZh ? '切换价格参考失败' : 'Failed to update pricing reference'))
    } finally {
      setReferenceSaving(false)
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
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm">
            <span className="text-xs text-slate-500">{isZh ? '价格参考' : 'Pricing reference'}</span>
            <select
              value={selectedPricingReference}
              onChange={event => void handlePricingReferenceChange(event.target.value as PricingReference)}
              disabled={referenceSaving}
              className="bg-transparent text-sm text-slate-700 focus:outline-none disabled:opacity-60"
            >
              {PRICING_REFERENCE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {isZh ? option.labelZh : option.labelEn}
                </option>
              ))}
            </select>
          </label>
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

          {referenceCompareRows.length > 0 && (
            <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold">{isZh ? '参考价格对比' : 'Reference pricing comparison'}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {referenceCompare && currentReferenceRow
                      ? (
                        isZh
                          ? `同一批会话按 3 套参考价格重算，当前 ${currentReferenceRow.label} 总计 $${formatWasteCost(referenceCompare.currentTotalCost)}。`
                          : `The same sessions repriced across 3 catalogs. Current ${currentReferenceRow.label} total: $${formatWasteCost(referenceCompare.currentTotalCost)}.`
                      )
                      : (isZh ? '同一批会话按 3 套价格目录重新计算。' : 'The same sessions repriced across 3 catalogs.')}
                  </p>
                </div>
                {referenceVsOfficialRows.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {referenceVsOfficialRows.map(row => (
                      <span
                        key={`official-${row.reference}`}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium',
                          row.deltaVsOfficial > 0
                            ? 'bg-red-50 text-red-600'
                            : row.deltaVsOfficial < 0
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-500',
                        )}
                      >
                        {row.label} {isZh ? '较 Official' : 'vs Official'} {formatSignedCostDelta(row.deltaVsOfficial)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
                {referenceCompareRows.map(row => {
                  const isCurrentRow = row.reference === referenceCompare?.currentReference
                  const deltaTone = isCurrentRow
                    ? 'bg-[#3b82c4]/10 text-[#3b82c4]'
                    : row.deltaVsCurrent > 0
                      ? 'bg-red-50 text-red-600'
                      : row.deltaVsCurrent < 0
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                  const deltaDescription = isCurrentRow
                    ? (isZh ? '当前模式基准' : 'Current baseline')
                    : row.deltaVsCurrent > 0
                      ? (isZh ? '比当前模式更贵' : 'More expensive than current')
                      : row.deltaVsCurrent < 0
                        ? (isZh ? '比当前模式更便宜' : 'Cheaper than current')
                        : (isZh ? '与当前模式持平' : 'Same as current')

                  return (
                    <div
                      key={row.reference}
                      className={cn(
                        'rounded-xl border p-4 transition-colors',
                        isCurrentRow
                          ? 'border-[#3b82c4]/30 bg-[#3b82c4]/5 shadow-[0_0_0_1px_rgba(59,130,196,0.15)]'
                          : 'border-slate-200 bg-slate-50',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getPricingSourceLabel(row.pricingSource, isZh) ?? row.pricingSource}
                          </p>
                        </div>
                        {isCurrentRow && (
                          <span className="rounded-full bg-[#3b82c4]/10 px-2.5 py-1 text-[11px] font-medium text-[#3b82c4]">
                            {isZh ? '当前模式' : 'Current'}
                          </span>
                        )}
                      </div>

                      <p className="mt-4 text-2xl font-bold tabular-nums text-slate-900">
                        ${formatWasteCost(row.totalCost)}
                      </p>

                      <div className={cn('mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium', deltaTone)}>
                        {isCurrentRow
                          ? (isZh ? '基准 · $0.0000' : 'Baseline · $0.0000')
                          : `${isZh ? '较当前' : 'vs current'} ${formatSignedCostDelta(row.deltaVsCurrent)}`}
                      </div>

                      <p className="mt-2 text-xs text-slate-500">{deltaDescription}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {reconciliationSummary && reconciliationRows.length > 0 && (
            <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold">{isZh ? '成本对账' : 'Cost reconciliation'}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {isZh
                      ? `当前按 ${reconciliationCurrentReferenceLabel ?? reconciliationMeta?.currentReference ?? '--'} 口径，与 ${reconciliationBaselineReferenceLabel ?? reconciliationMeta?.baselineReference ?? '--'} 基线重算同一批会话。`
                      : `The same sessions repriced with ${reconciliationCurrentReferenceLabel ?? reconciliationMeta?.currentReference ?? '--'} versus the ${reconciliationBaselineReferenceLabel ?? reconciliationMeta?.baselineReference ?? '--'} baseline.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#3b82c4]/20 bg-[#3b82c4]/10 px-3 py-1 text-xs font-medium text-[#2f6fa8]">
                    {isZh ? '当前口径' : 'Current'} · {reconciliationCurrentReferenceLabel ?? reconciliationMeta?.currentReference ?? '--'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {isZh ? '基线' : 'Baseline'} · {reconciliationBaselineReferenceLabel ?? reconciliationMeta?.baselineReference ?? '--'}
                  </span>
                  {(reconciliationMeta?.stale || reconciliationMeta?.baselineStale) && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      {isZh ? '价格缓存偏旧' : 'Pricing cache is stale'}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[#3b82c4]/20 bg-[#3b82c4]/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{isZh ? '当前总账' : 'Current total'}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">${formatWasteCost(reconciliationSummary.currentCost)}</p>
                  <p className="mt-1 text-xs text-slate-500">{reconciliationCurrentSourceLabel ?? reconciliationMeta?.pricingSource ?? '--'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{isZh ? '基线总账' : 'Baseline total'}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">${formatWasteCost(reconciliationSummary.baselineCost)}</p>
                  <p className="mt-1 text-xs text-slate-500">{reconciliationBaselineSourceLabel ?? reconciliationMeta?.baselinePricingSource ?? '--'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{isZh ? '差额' : 'Delta'}</p>
                  <p className={cn(
                    'mt-2 text-2xl font-semibold tabular-nums',
                    reconciliationSummary.delta > 0
                      ? 'text-red-600'
                      : reconciliationSummary.delta < 0
                        ? 'text-emerald-600'
                        : 'text-slate-900',
                  )}>
                    {formatSignedCostDelta(reconciliationSummary.delta)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {reconciliationSummary.delta > 0
                      ? (isZh ? '当前口径高于基线' : 'Current is above baseline')
                      : reconciliationSummary.delta < 0
                        ? (isZh ? '当前口径低于基线' : 'Current is below baseline')
                        : (isZh ? '当前口径与基线持平' : 'Current matches baseline')}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{isZh ? '会话 / 估算' : 'Sessions / estimated'}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{reconciliationSummary.sessions}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {isZh ? `估算行 ${reconciliationSummary.estimatedRows}` : `${reconciliationSummary.estimatedRows} estimated row${reconciliationSummary.estimatedRows === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(['replay', 'log', 'demo', 'mixed'] as const).map(source => {
                  const count = reconciliationUsageBreakdown?.[source] ?? 0
                  if (count <= 0) return null
                  return (
                    <span
                      key={`recon-source-${source}`}
                      className={cn('rounded-full border px-3 py-1 text-xs font-medium', getUsageSourceBadgeClass(source))}
                    >
                      {getUsageSourceLabel(source, isZh)} · {count}
                    </span>
                  )
                })}
                {reconciliationMeta?.pricingCatalogVersion && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                    {isZh ? '当前目录' : 'Current catalog'} · {reconciliationMeta.pricingCatalogVersion}
                  </span>
                )}
                {reconciliationMeta?.baselinePricingCatalogVersion && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                    {isZh ? '基线目录' : 'Baseline catalog'} · {reconciliationMeta.baselinePricingCatalogVersion}
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
                  <span className="text-xs text-slate-500">{isZh ? '排序' : 'Sort'}</span>
                  <select
                    value={reconciliationSortBy}
                    onChange={event => setReconciliationSortBy(event.target.value as CostReconciliationSortKey)}
                    className="bg-transparent text-sm text-slate-700 focus:outline-none"
                  >
                    {reconciliationSortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                  showEstimatedOnly
                    ? 'border-[#3b82c4]/20 bg-[#3b82c4]/5 text-[#2f6fa8]'
                    : 'border-slate-200 bg-white text-slate-600',
                )}>
                  <input
                    type="checkbox"
                    checked={showEstimatedOnly}
                    onChange={event => setShowEstimatedOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#3b82c4] focus:ring-[#3b82c4]/30"
                  />
                  <span>{isZh ? '只看 Estimated' : 'Estimated only'}</span>
                </label>

                <label className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                  showReplayableOnly
                    ? 'border-[#3b82c4]/20 bg-[#3b82c4]/5 text-[#2f6fa8]'
                    : 'border-slate-200 bg-white text-slate-600',
                )}>
                  <input
                    type="checkbox"
                    checked={showReplayableOnly}
                    onChange={event => setShowReplayableOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#3b82c4] focus:ring-[#3b82c4]/30"
                  />
                  <span>{isZh ? '只看可回放' : 'Replayable only'}</span>
                </label>

                <span className="text-xs text-slate-500 sm:ml-auto">
                  {isZh
                    ? `显示 ${displayedReconciliationRows.length} / ${reconciliationRows.length} 行`
                    : `Showing ${displayedReconciliationRows.length} / ${reconciliationRows.length} rows`}
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4 font-medium">{isZh ? '会话' : 'Session'}</th>
                      <th className="pb-3 pr-4 font-medium">{isZh ? '服务商' : 'Provider'}</th>
                      <th className="pb-3 pr-4 font-medium">{isZh ? '主模型' : 'Primary model'}</th>
                      <th className="pb-3 pr-4 font-medium">{isZh ? 'Token' : 'Tokens'}</th>
                      <th className="pb-3 pr-4 font-medium">{isZh ? '当前成本' : 'Current cost'}</th>
                      <th className="pb-3 pr-4 font-medium">{isZh ? '基线成本' : 'Baseline cost'}</th>
                      <th className="pb-3 font-medium">{isZh ? '差额' : 'Delta'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedReconciliationRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                          {isZh
                            ? '当前筛选下没有会话，试试取消上面的过滤条件。'
                            : 'No sessions match the current filters. Try clearing the filters above.'}
                        </td>
                      </tr>
                    )}
                    {displayedReconciliationRows.map(row => {
                      const replaySessionId = row.sessionId?.trim()
                      const isReplayLinkable = row.replayAvailable && canOpenReplaySession(replaySessionId)
                      return (
                        <tr
                          key={`reconciliation-${row.sessionId}`}
                          tabIndex={isReplayLinkable ? 0 : undefined}
                          role={isReplayLinkable ? 'button' : undefined}
                          onClick={isReplayLinkable ? () => onOpenReplaySession(replaySessionId) : undefined}
                          onKeyDown={isReplayLinkable ? event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              onOpenReplaySession(replaySessionId)
                            }
                          } : undefined}
                          className={cn(
                            'border-b border-slate-100 align-top last:border-0',
                            isReplayLinkable && 'group cursor-pointer transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82c4]/30',
                          )}
                        >
                          <td className="py-4 pr-4 min-w-[300px]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-slate-900">{row.sessionLabel || row.sessionId}</div>
                                <div className="mt-1 break-all font-mono text-[11px] text-slate-500">{row.sessionId}</div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  <span className={cn('inline-flex rounded-full border px-2 py-1 text-[11px] font-medium', getUsageSourceBadgeClass(row.usageSource))}>
                                    {getUsageSourceLabel(row.usageSource, isZh)}
                                  </span>
                                  {row.estimated && (
                                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                                      {isZh ? '估算' : 'Estimated'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isReplayLinkable && (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-[#3b82c4] transition-all group-hover:gap-1.5 group-hover:text-[#2f6fa8]">
                                  {replayActionLabel}
                                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 pr-4 min-w-[120px] text-slate-600">{row.provider || '--'}</td>
                          <td className="py-4 pr-4 min-w-[180px] text-slate-600">{row.primaryModel || '--'}</td>
                          <td className="py-4 pr-4 min-w-[150px] text-slate-600">
                            <div className="font-medium text-slate-900">{(row.inputTokens + row.outputTokens).toLocaleString()}</div>
                            <div className="mt-1 text-xs text-slate-500">{isZh ? '输入' : 'In'} {row.inputTokens.toLocaleString()}</div>
                            <div className="text-xs text-slate-500">{isZh ? '输出' : 'Out'} {row.outputTokens.toLocaleString()}</div>
                          </td>
                          <td className="py-4 pr-4 whitespace-nowrap font-semibold tabular-nums text-slate-900">${formatWasteCost(row.currentCost)}</td>
                          <td className="py-4 pr-4 whitespace-nowrap font-semibold tabular-nums text-slate-600">${formatWasteCost(row.baselineCost)}</td>
                          <td className={cn(
                            'py-4 whitespace-nowrap font-semibold tabular-nums',
                            row.delta > 0 ? 'text-red-600' : row.delta < 0 ? 'text-emerald-600' : 'text-slate-500',
                          )}>
                            {formatSignedCostDelta(row.delta)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                {isZh
                  ? '说明：当前成本使用你当前选中的 pricing reference；基线默认 official-static。行内的 Estimated 表示该行至少包含静态目录、旧缓存或非 Replay 用量等估算因素。'
                  : 'Note: current cost uses the selected pricing reference, while the baseline defaults to official-static. “Estimated” means the row depends on static catalogs, stale pricing, or non-replay usage.'}
              </p>
            </div>
          )}

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

          {modelValueDisplayRows.length > 0 && (
            <div className="glass-raised rounded-xl p-6 border border-surface-border mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold">{isZh ? '模型效果 / 成本矩阵' : 'Model value matrix'}</h3>
                  <p className="mt-2 text-sm text-slate-600 max-w-3xl">
                    {isZh
                      ? '不是只看哪个便宜，还要看谁更适合便宜跑量、谁值得留给高价值任务。这里把成本、会话样本、output/input、工具使用率和稳定性放在一起看。'
                      : 'Don’t just ask which model is cheaper. Ask which one deserves bulk traffic and which one should be saved for high-value work.'}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-right">
                  <p className="text-xs font-medium text-cyan-700">{isZh ? '看值不值' : 'Worth it > cheap'}</p>
                  <p className="mt-1 text-xs text-cyan-700/80">
                    {isZh ? '成本 × 稳定性 × 工具表现' : 'Cost × stability × tool behavior'}
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4 font-medium">{isZh ? '模型' : 'Model'}</th>
                      <th className="pb-3 pr-4 font-medium">{isZh ? '会话数' : 'Sessions'}</th>
                      <th className="pb-3 pr-4 font-medium">{isZh ? '平均成本' : 'Avg cost'}</th>
                      <th className="pb-3 pr-4 font-medium">{isZh ? '效果代理' : 'Proxy effect'}</th>
                      <th className="pb-3 pr-4 font-medium">{isZh ? '稳定性' : 'Stability'}</th>
                      <th className="pb-3 pr-4 font-medium">{isZh ? '角色标签' : 'Role label'}</th>
                      <th className="pb-3 font-medium">{isZh ? '推荐用途' : 'Recommended use'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelValueDisplayRows.map(row => {
                      const stabilityMeta = getStabilityMeta(row.errorRate, isZh)
                      return (
                        <tr key={row.model} className="border-b border-slate-100 align-top last:border-0">
                          <td className="py-4 pr-4 min-w-[180px]">
                            <div className="font-medium text-slate-900">{row.model}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              ${formatMatrixCost(row.totalCost)} · {formatCompactTokens(row.totalTokens, locale)} {isZh ? 'Token' : 'tokens'}
                            </div>
                          </td>
                          <td className="py-4 pr-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{row.sessions}</div>
                            <div className="mt-1 text-xs text-slate-500">{isZh ? '个会话样本' : 'session samples'}</div>
                          </td>
                          <td className="py-4 pr-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">${formatMatrixCost(row.avgCostPerSession)}</div>
                            <div className="mt-1 text-xs text-slate-500">{isZh ? '每会话均值' : 'per session'}</div>
                          </td>
                          <td className="py-4 pr-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{row.avgOutputInputRatio.toFixed(2)}×</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {isZh ? '工具使用率' : 'Tool usage'} {formatRate(row.toolUsageRate)}
                            </div>
                          </td>
                          <td className="py-4 pr-4 whitespace-nowrap">
                            <div className={cn('font-semibold', stabilityMeta.className)}>{formatRate(row.errorRate)}</div>
                            <div className={cn('mt-1 text-xs', stabilityMeta.className)}>{stabilityMeta.label}</div>
                          </td>
                          <td className="py-4 pr-4 whitespace-nowrap">
                            <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium', getModelValueBadgeClass(row.valueLabel))}>
                              {isZh ? row.valueLabelZh : row.valueLabelEn}
                            </span>
                          </td>
                          <td className="py-4 min-w-[240px] max-w-[360px] text-sm leading-6 text-slate-600">
                            {isZh ? row.recommendationZh : row.recommendationEn}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                {isZh
                  ? '注：output/input、工具使用率和错误率都只是轻量代理指标，不替代真实业务验收；这个矩阵主要帮你判断“谁更值得承担什么角色”。'
                  : 'Note: output/input, tool usage, and error rate are lightweight proxy metrics, not substitutes for real task evaluation. The matrix is here to show which model is worth which role.'}
              </p>
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
                {wasteDiagnostics.map((diagnostic, index) => {
                  const replaySessionId = diagnostic.sessionId?.trim()
                  const isReplayLinkable = canOpenReplaySession(replaySessionId)

                  const content = (
                    <>
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
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <p className="text-sm font-medium text-[#3b82c4]">
                          {isZh ? '预计浪费' : 'Estimated waste'} ${formatWasteCost(diagnostic.estimatedWasteCost)} · {diagnostic.estimatedWasteTokens.toLocaleString()} tokens
                        </p>
                        {isReplayLinkable && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#3b82c4] transition-all group-hover:gap-1.5 group-hover:text-[#2f6fa8]">
                            {replayActionLabel}
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        )}
                      </div>
                    </>
                  )

                  if (isReplayLinkable) {
                    return (
                      <button
                        key={`${diagnostic.type}-${replaySessionId ?? diagnostic.sessionLabel ?? index}`}
                        type="button"
                        onClick={() => onOpenReplaySession(replaySessionId)}
                        className="group w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#3b82c4]/35 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82c4]/30 focus-visible:ring-offset-2"
                      >
                        {content}
                      </button>
                    )
                  }

                  return (
                    <div key={`${diagnostic.type}-${diagnostic.sessionLabel ?? index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      {content}
                    </div>
                  )
                })}
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
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className="text-lg font-semibold">{t('cost.savings.title')}</h3>
                <div className="text-right">
                  <span className="text-xs text-slate-500">{t('cost.savings.total')}</span>
                  <span className="text-lg font-bold text-emerald-500 ml-2">${formatWasteCost(savings.totalPotentialSaving)}</span>
                </div>
              </div>
              <div className="space-y-3">
                {savings.suggestions.map((sug, i) => {
                  const typeMeta = getSavingTypeMeta(sug.reasonType, isZh)
                  const priorityMeta = getSavingPriorityMeta(sug.priority, t)
                  const guardrailMeta = getSavingGuardrailMeta(sug.reasonType, t)
                  const reasonText = getSavingReasonText(sug, isZh)
                  const actionText = getSavingActionText(sug, isZh)
                  const guardrailText = getSavingGuardrailText(sug, isZh)
                  const replaySessionId = sug.sessionId?.trim()
                  const isReplayLinkable = canOpenReplaySession(replaySessionId)
                  const showModelRoute = Boolean(
                    sug.currentModel
                    && sug.alternativeModel
                    && sug.currentModel !== sug.alternativeModel,
                  )

                  const content = (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', typeMeta.className)}>
                            {typeMeta.label}
                          </span>
                          <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-medium', priorityMeta.className)}>
                            {priorityMeta.label}
                          </span>
                          {sug.sessionLabel && (
                            <span className="truncate text-[11px] text-slate-500">
                              {t('cost.savings.session')}: {sug.sessionLabel}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-800">{reasonText}</p>
                        <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
                          <div className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2.5">
                            <p className="text-[11px] font-medium text-slate-500">{t('cost.savings.next')}</p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-600">{actionText}</p>
                          </div>
                          <div className={cn('rounded-lg border px-3 py-2.5', guardrailMeta.className)}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-medium">{t('cost.savings.guardrail')}</p>
                              <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', guardrailMeta.badgeClassName)}>
                                {guardrailMeta.label}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-relaxed">{guardrailText}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          {showModelRoute ? (
                            <p className="text-xs text-slate-500">
                              {isZh ? '模型切换：' : 'Route: '}
                              <span className="font-medium text-slate-700">{sug.currentModel}</span>
                              <span className="mx-1">→</span>
                              <span className="font-medium text-emerald-600">{sug.alternativeModel}</span>
                            </p>
                          ) : <span />}
                          {isReplayLinkable && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#3b82c4] transition-all group-hover:gap-1.5 group-hover:text-[#2f6fa8]">
                              {replayActionLabel}
                              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-slate-500">{t('cost.savings.estSave')}</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-500">-${formatWasteCost(sug.saving)}</p>
                      </div>
                    </div>
                  )

                  if (isReplayLinkable) {
                    return (
                      <button
                        key={`${sug.reasonType ?? 'suggestion'}-${replaySessionId ?? sug.currentModel ?? i}`}
                        type="button"
                        onClick={() => onOpenReplaySession(replaySessionId)}
                        className={cn(
                          'group w-full rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#3b82c4]/35 hover:bg-white/95 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82c4]/30 focus-visible:ring-offset-2',
                          getSavingCardClass(sug.priority),
                        )}
                      >
                        {content}
                      </button>
                    )
                  }

                  return (
                    <div
                      key={`${sug.reasonType ?? 'suggestion'}-${sug.currentModel ?? i}`}
                      className={cn('rounded-xl border p-4', getSavingCardClass(sug.priority))}
                    >
                      {content}
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 space-y-1">
                {hasSwitchModelSuggestion && (
                  <p className="text-xs text-amber-700">
                    ⚠️ {isZh ? '换模型建议请先灰度验证质量，再逐步扩大路由范围' : 'Validate model-switch suggestions on a small slice first before expanding routing'}
                  </p>
                )}
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
        {pricingReferenceLabel && (
          <p>
            {isZh ? '当前参考模式：' : 'Current reference: '}
            <span className="font-medium text-slate-700">{pricingReferenceLabel}</span>
          </p>
        )}
        {pricingSourceLabel && (
          <p>
            {isZh ? '定价来源：' : 'Pricing source: '}
            <span className="font-medium text-slate-700">{pricingSourceLabel}</span>
            {pricingUpdatedAtLabel ? ` · ${isZh ? '更新时间' : 'Updated'} ${pricingUpdatedAtLabel}` : ''}
          </p>
        )}
        {pricingCatalogVersion && (
          <p>
            {isZh ? '价格目录版本：' : 'Pricing catalog: '}
            <span className="font-medium text-slate-700">{pricingCatalogVersion}</span>
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
