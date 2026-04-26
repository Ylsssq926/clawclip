import { Fragment, type ReactNode, useState, useEffect, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowRight, ChevronRight, Copy, Check, ExternalLink } from 'lucide-react'
import FadeIn from '../components/ui/FadeIn'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import EmptyState from '../components/ui/EmptyState'
import { cn } from '../lib/cn'
import {
  getCostMonitorCopy,
  localizeCostInsightMessage,
  localizeCostModelRecommendation,
  type CostMonitorCopy,
  type Locale,
  useI18n,
} from '../lib/i18n'
import { apiGet, apiGetSafe, apiPost, parseApiErrorMessage } from '../lib/api'
import {
  DEFAULT_COST_RECONCILIATION_SORT,
  getCostReconciliationDisplayRows,
  type CostReconciliationSortKey,
} from '../lib/costReconciliationRows'
import { splitCostMonitorSections, type CostMonitorSectionId } from './costMonitorSectionOrder'
import { getSessionSourceDisplayName } from '../lib/sessionSources'
import type { Tab } from '../App'

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

const PRICING_REFERENCE_OPTIONS: PricingReference[] = ['pricetoken', 'official-static', 'openrouter']

function isPricingReference(value: unknown): value is PricingReference {
  return value === 'official-static' || value === 'pricetoken' || value === 'openrouter'
}

function getIntlLocale(locale: Locale): string {
  switch (locale) {
    case 'zh':
      return 'zh-CN'
    case 'ja':
      return 'ja-JP'
    case 'ko':
      return 'ko-KR'
    case 'es':
      return 'es-ES'
    case 'fr':
      return 'fr-FR'
    case 'de':
      return 'de-DE'
    case 'en':
    default:
      return 'en-US'
  }
}

function fillTemplate(template: string, replacements: Record<string, string | number>): string {
  let result = template
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(`{${key}}`).join(String(value))
  }
  return result
}

function getPricingReferenceLabel(reference: PricingReference | undefined, copy: CostMonitorCopy): string | null {
  if (!reference) return null
  return copy.pricingReference[reference] ?? null
}

function getPricingSourceLabel(source: PricingSource | undefined, copy: CostMonitorCopy): string | null {
  if (!source) return null
  return copy.pricingSource[source] ?? null
}

function getUsageSourceLabel(source: UsageSource | undefined, copy: CostMonitorCopy): string {
  return (source ? copy.usageSource[source] : null) ?? '--'
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

interface Solution {
  id: string
  title: string
  titleZh: string
  description: string
  descriptionZh: string
  type: 'tool' | 'config' | 'free-tier' | 'local-model' | 'proxy'
  effort: 'low' | 'medium' | 'high'
  savingsEstimate: string
  riskLevel?: 'low' | 'medium' | 'high'
  riskNote?: string
  riskNoteZh?: string
  tool?: {
    name: string
    github?: string
    docs?: string
    installCmd?: string
  }
  freeTier?: {
    provider: string
    freeLimit: string
    model: string
    url: string
  }
  configSnippet?: string
  tags: string[]
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
  recommendations?: Solution[]
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

function getSavingTypeMeta(reasonType: SavingReasonType | undefined, copy: CostMonitorCopy) {
  switch (reasonType) {
    case 'reduce-retries':
      return {
        label: copy.savings.types['reduce-retries'],
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      }
    case 'trim-prompt':
      return {
        label: copy.savings.types['trim-prompt'],
        className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
      }
    case 'trim-output':
      return {
        label: copy.savings.types['trim-output'],
        className: 'border-violet-200 bg-violet-50 text-violet-700',
      }
    case 'switch-model':
      return {
        label: copy.savings.types['switch-model'],
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      }
    default:
      return {
        label: copy.savings.types.default,
        className: 'border-slate-200 bg-slate-50 text-slate-600',
      }
  }
}

function getSavingCardClass(priority: SavingPriority | undefined): string {
  switch (priority) {
    case 'high':
      return 'border-[#3b82c4]/18 bg-[#3b82c4]/[0.03]'
    case 'medium':
    case 'low':
    default:
      return 'border-slate-200 bg-white'
  }
}

function getSavingGuardrailMeta(reasonType: SavingReasonType | undefined, copy: CostMonitorCopy) {
  if (reasonType === 'switch-model') {
    return {
      label: copy.savings.guardrailLabels.cautious,
      className: 'border-slate-200 bg-slate-50/80 text-slate-700',
    }
  }

  return {
    label: copy.savings.guardrailLabels.lowRisk,
    className: 'border-slate-200 bg-slate-50/80 text-slate-700',
  }
}

function getSavingReasonText(suggestion: SavingSuggestion, locale: Locale, copy: CostMonitorCopy): string {
  if (locale === 'zh' && suggestion.reasonZh) return suggestion.reasonZh
  if (locale === 'en' && suggestion.reasonEn) return suggestion.reasonEn
  if (suggestion.currentModel && suggestion.alternativeModel && suggestion.currentModel !== suggestion.alternativeModel) {
    return fillTemplate(copy.savings.reason['switch-model'], {
      current: suggestion.currentModel,
      alternative: suggestion.alternativeModel,
      saving: `$${formatWasteCost(suggestion.saving)}`,
    })
  }

  switch (suggestion.reasonType) {
    case 'reduce-retries':
      return copy.savings.reason['reduce-retries']
    case 'trim-prompt':
      return copy.savings.reason['trim-prompt']
    case 'trim-output':
      return copy.savings.reason['trim-output']
    default:
      return copy.savings.reason.default
  }
}

function getSavingActionText(suggestion: SavingSuggestion, locale: Locale, copy: CostMonitorCopy): string {
  if (locale === 'zh' && suggestion.actionZh) return suggestion.actionZh
  if (locale === 'en' && suggestion.actionEn) return suggestion.actionEn
  if (suggestion.currentModel && suggestion.alternativeModel && suggestion.currentModel !== suggestion.alternativeModel) {
    return fillTemplate(copy.savings.action['switch-model'], {
      alternative: suggestion.alternativeModel,
    })
  }

  switch (suggestion.reasonType) {
    case 'reduce-retries':
      return copy.savings.action['reduce-retries']
    case 'trim-prompt':
      return copy.savings.action['trim-prompt']
    case 'trim-output':
      return copy.savings.action['trim-output']
    default:
      return copy.savings.action.default
  }
}

function getSavingGuardrailText(suggestion: SavingSuggestion, locale: Locale, copy: CostMonitorCopy): string {
  if (locale === 'zh' && suggestion.qualityGuardrailZh) return suggestion.qualityGuardrailZh
  if (locale === 'en' && suggestion.qualityGuardrailEn) return suggestion.qualityGuardrailEn

  switch (suggestion.reasonType) {
    case 'switch-model':
      return fillTemplate(copy.savings.guardrailText['switch-model'], {
        alternative: suggestion.alternativeModel || copy.savings.newModel,
      })
    case 'trim-prompt':
      return copy.savings.guardrailText['trim-prompt']
    case 'trim-output':
      return copy.savings.guardrailText['trim-output']
    case 'reduce-retries':
      return copy.savings.guardrailText['reduce-retries']
    default:
      return copy.savings.guardrailText.default
  }
}

interface BudgetConfig {
  monthly: number
  alertThreshold: number
  pricingReference?: PricingReference
}

type ModelBreakdown = Record<string, { tokens: number; cost: number }>

interface FreeTierInfo {
  provider: string
  model: string
  modelId: string
  freeLimit: {
    requestsPerDay?: number
    tokensPerDay?: number
    tokensPerMonth?: number
  }
  rateLimit: {
    rpm: number
    tpm?: number
  }
  requiresCreditCard: boolean
  url: string
  notes?: string
}

interface AlternativeModel {
  model: string
  provider: string
  inputPrice: number
  outputPrice: number
  savingsPercent: number
  freeTier?: FreeTierInfo
  suitableFor: string[]
  notSuitableFor: string[]
  notes: string
}

interface AlternativesResult {
  currentModel: string
  currentPrice: { input: number; output: number }
  alternatives: AlternativeModel[]
  freeTiers: FreeTierInfo[]
}

interface ModelBreakdownRow {
  model: string
  cost: number
  tokens: number
  percentage: number
}

interface FrameworkBreakdownRow {
  source: string
  label: string
  totalCost: number
  totalTokens: number
  sessionCount: number
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

function formatCompactTokens(value: number, locale: Locale): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
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

function getStabilityMeta(errorRate: number, copy: CostMonitorCopy): { label: string; className: string } {
  if (errorRate <= 0.03) {
    return {
      label: copy.modelValue.stability.veryStable,
      className: 'text-emerald-600',
    }
  }
  if (errorRate <= 0.08) {
    return {
      label: copy.modelValue.stability.stable,
      className: 'text-cyan-700',
    }
  }
  if (errorRate <= 0.15) {
    return {
      label: copy.modelValue.stability.acceptable,
      className: 'text-amber-700',
    }
  }
  return {
    label: copy.modelValue.stability.watch,
    className: 'text-rose-600',
  }
}

const chartTooltipStyle = {
  background: 'rgba(248,250,252,0.96)',
  border: '1px solid rgba(226,232,240,0.9)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
} as const

function formatFreshnessTime(value: string | undefined, locale: Locale): string {
  if (!value) return '--'
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return '--'

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

function getTokenWasteDiagnosticTitle(diagnostic: TokenWasteDiagnostic, locale: Locale, copy: CostMonitorCopy): string {
  if (locale === 'zh') return diagnostic.titleZh
  if (locale === 'en') return diagnostic.titleEn
  return copy.tokenWaste.titles[diagnostic.type] ?? diagnostic.titleEn
}

function getTokenWasteDiagnosticDescription(diagnostic: TokenWasteDiagnostic, locale: Locale, copy: CostMonitorCopy): string {
  if (locale === 'zh') return diagnostic.descZh
  if (locale === 'en') return diagnostic.descEn
  return copy.tokenWaste.descriptions[diagnostic.type] ?? diagnostic.descEn
}

function getLocalizedSolutionTitle(solution: Solution, locale: Locale): string {
  return locale === 'zh' ? solution.titleZh : solution.title
}

function getLocalizedSolutionDescription(solution: Solution, locale: Locale): string {
  return locale === 'zh' ? solution.descriptionZh : solution.description
}

function getSolutionLearnMoreUrl(solution: Solution): string | undefined {
  return solution.tool?.docs ?? solution.tool?.github ?? solution.freeTier?.url
}

function getSolutionCopyText(solution: Solution): string | undefined {
  return solution.tool?.installCmd ?? solution.configSnippet
}

function getSolutionMetaText(solution: Solution): string | null {
  if (solution.freeTier) {
    return `${solution.freeTier.provider} · ${solution.freeTier.model} · ${solution.freeTier.freeLimit}`
  }

  if (solution.tool?.name) {
    return solution.tool.name
  }

  return null
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
  onNavigate?: (tab: Tab) => void
}

interface CostMonitorRenderableSection {
  id: CostMonitorSectionId
  content: ReactNode
}

export default function CostMonitor({ onOpenReplaySession, onNavigate }: Props) {
  const { locale, t } = useI18n()
  const copy = getCostMonitorCopy(locale)
  const [daily, setDaily] = useState<DailyData[]>([])
  const [summary, setSummary] = useState<CostSummary | null>(null)
  const [referenceCompare, setReferenceCompare] = useState<ReferenceCompareData | null>(null)
  const [reconciliation, setReconciliation] = useState<CostReconciliationData | null>(null)
  const [insights, setInsights] = useState<CostInsight[]>([])
  const [savings, setSavings] = useState<SavingsReport | null>(null)
  const [tokenWaste, setTokenWaste] = useState<TokenWasteReport | null>(null)
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown>({})
  const [frameworkBreakdownRows, setFrameworkBreakdownRows] = useState<FrameworkBreakdownRow[]>([])
  const [modelValueRows, setModelValueRows] = useState<ModelValueRow[]>([])
  const [alternatives, setAlternatives] = useState<Record<string, AlternativesResult>>({})
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
  const [copiedSolutionId, setCopiedSolutionId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const results = await Promise.allSettled([
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
        apiGetSafe<Array<{ source: string; totalCost: number; totalTokens: number; sessionCount: number }>>(`/api/cost/frameworks?days=${days}`),
        apiGetSafe<ModelValueReport>(`/api/analytics/model-value?days=${days}`),
        apiGetSafe<BudgetConfig>('/api/cost/budget'),
      ])

      const d = results[0].status === 'fulfilled' ? results[0].value : []
      const s = results[1].status === 'fulfilled' ? results[1].value : null
      const compare = results[2].status === 'fulfilled' ? results[2].value : null
      const recon = results[3].status === 'fulfilled' ? results[3].value : null
      const isDemo = results[4].status === 'fulfilled' ? results[4].value : false
      const ins = results[5].status === 'fulfilled' ? results[5].value : []
      const sav = results[6].status === 'fulfilled' ? results[6].value : null
      const waste = results[7].status === 'fulfilled' ? results[7].value : null
      const models = results[8].status === 'fulfilled' ? results[8].value : null
      const frameworks = results[9].status === 'fulfilled' ? results[9].value : null
      const modelValue = results[10].status === 'fulfilled' ? results[10].value : null
      const budget = results[11].status === 'fulfilled' ? results[11].value : null

      const normalizedModels: ModelBreakdown = {}
      if (models && typeof models === 'object' && !Array.isArray(models)) {
        for (const [model, data] of Object.entries(models)) {
          if (data && typeof data === 'object' && 'cost' in data && 'tokens' in data) {
            normalizedModels[model] = {
              cost: Number(data.cost ?? 0),
              tokens: Number(data.tokens ?? 0),
            }
          }
        }
      }

      const normalizedFrameworks = Array.isArray(frameworks)
        ? frameworks
          .filter(row => row && typeof row === 'object')
          .map(row => ({
            source: String(row.source ?? 'otel'),
            label: getSessionSourceDisplayName(typeof row.source === 'string' ? row.source : 'otel', t),
            totalCost: Number(row.totalCost ?? 0),
            totalTokens: Number(row.totalTokens ?? 0),
            sessionCount: Number(row.sessionCount ?? 0),
          }))
          .filter(row => row.sessionCount > 0)
        : []

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
      setFrameworkBreakdownRows(normalizedFrameworks)
      setModelValueRows(
        Array.isArray(modelValue?.rows)
          ? modelValue.rows.filter((row): row is NonNullable<typeof row> => row != null && typeof row === 'object')
          : [],
      )
      setBudgetConfig(normalizedBudget)

      // 获取贵模型的替代方案
      const expensiveModels = Object.entries(normalizedModels)
        .filter(([model, data]) => {
          const cost = Number(data.cost ?? 0)
          const modelLower = model.toLowerCase()
          return cost > 0 && (
            modelLower.includes('gpt-4o') ||
            modelLower.includes('gpt-5') ||
            modelLower.includes('claude-opus') ||
            modelLower.includes('claude-sonnet')
          )
        })
        .map(([model]) => model)
        .slice(0, 3) // 只获取前3个贵模型的替代方案

      if (expensiveModels.length > 0) {
        const alternativesData: Record<string, AlternativesResult> = {}
        await Promise.all(
          expensiveModels.map(async (model) => {
            try {
              const result = await apiGetSafe<AlternativesResult>(`/api/cost/alternatives?model=${encodeURIComponent(model)}`)
              if (result) {
                alternativesData[model] = result
              }
            } catch {
              // 忽略错误
            }
          })
        )
        setAlternatives(alternativesData)
      } else {
        setAlternatives({})
      }
    } catch {
      setError(copy.errorLoad)
    } finally {
      setLoading(false)
    }
  }, [copy.errorLoad, days, t])

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
  const hasMultipleFrameworks = frameworkBreakdownRows.length > 1
  const hasFrameworkComparisonData = hasMultipleFrameworks && frameworkBreakdownRows.some(row => row.totalCost > 0)
  const modelValueDisplayRows = modelValueRows
    .filter(row => row.sessions > 0)
    .slice(0, 6)
  const averageDailyCost = daily.length > 0 ? daily.reduce((sum, item) => sum + item.cost, 0) / daily.length : 0
  const selectedPricingReference = budgetConfig?.pricingReference ?? summary?.costMeta?.pricingReference ?? 'pricetoken'
  const pricingReferenceLabel = getPricingReferenceLabel(summary?.costMeta?.pricingReference ?? selectedPricingReference, copy)
  const pricingSourceLabel = getPricingSourceLabel(summary?.pricingSource, copy)
  const pricingUpdatedAtLabel = (() => {
    if (!summary?.pricingUpdatedAt) return null
    const timestamp = new Date(summary.pricingUpdatedAt)
    if (Number.isNaN(timestamp.getTime())) return null
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp)
  })()
  const latestUsageLabel = formatFreshnessTime(summary?.latestUsageAt, locale)
  const dataCutoffLabel = formatFreshnessTime(summary?.dataCutoffAt, locale)
  const referenceCompareRows = referenceCompare?.rows ?? []
  const currentReferenceRow = referenceCompareRows.find(row => row.reference === referenceCompare?.currentReference) ?? null
  const currentReferenceCompareLabel = currentReferenceRow
    ? getPricingReferenceLabel(currentReferenceRow.reference, copy) ?? currentReferenceRow.label
    : null
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
  const reconciliationCurrentReferenceLabel = getPricingReferenceLabel(reconciliationMeta?.currentReference, copy)
  const reconciliationBaselineReferenceLabel = getPricingReferenceLabel(reconciliationMeta?.baselineReference, copy)
  const reconciliationCurrentSourceLabel = getPricingSourceLabel(reconciliationMeta?.pricingSource, copy)
  const reconciliationBaselineSourceLabel = getPricingSourceLabel(reconciliationMeta?.baselinePricingSource, copy)
  const displayedReconciliationRows = getCostReconciliationDisplayRows(reconciliationRows, {
    sortBy: reconciliationSortBy,
    onlyEstimated: showEstimatedOnly,
    onlyReplayable: showReplayableOnly,
  })
  const showGlobalEmptyState = !loading && !error && !!summary && summary.totalCost === 0
  const emptyStartHint = copy.empty.hint
  const wasteDiagnostics = tokenWaste?.diagnostics.slice(0, 4) ?? []
  const wasteSummaryText = tokenWaste
    ? fillTemplate(copy.tokenWaste.summary, {
      cost: `$${formatWasteCost(tokenWaste.summary.estimatedWasteCost)}`,
      tokens: tokenWaste.summary.estimatedWasteTokens.toLocaleString(getIntlLocale(locale)),
    })
    : copy.tokenWaste.unavailable
  const wasteMetaText = tokenWaste
    ? `${fillTemplate(copy.tokenWaste.signals, { count: tokenWaste.summary.signals })}${tokenWaste.summary.usingDemo ? copy.tokenWaste.demoSuffix : ''}`
    : copy.tokenWaste.fallback
  const recommendedSolutions = summary?.recommendations?.slice(0, 3) ?? []
  const hasSwitchModelSuggestion = Boolean(
    savings?.suggestions.some(suggestion => (
      suggestion.reasonType === 'switch-model'
      || (suggestion.currentModel && suggestion.alternativeModel && suggestion.currentModel !== suggestion.alternativeModel)
    )),
  )
  const replayActionLabel = copy.replayAction
  const benchmarkActionLabel = locale === 'zh' ? '在 Benchmark 对比' : 'Compare in Benchmark'
  const canOpenReplaySession = (sessionId?: string): sessionId is string => Boolean(sessionId?.trim())
  const reconciliationSortOptions: Array<{ value: CostReconciliationSortKey; label: string }> = [
    { value: 'abs-delta', label: copy.reconciliation.sortOptions['abs-delta'] },
    { value: 'current-cost', label: copy.reconciliation.sortOptions['current-cost'] },
    { value: 'tokens', label: copy.reconciliation.sortOptions.tokens },
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
      setBudgetError(copy.budget.invalidMonthly)
      return
    }

    if (!Number.isFinite(alertThreshold) || alertThreshold < 1 || alertThreshold > 100) {
      setBudgetError(copy.budget.invalidThreshold)
      return
    }

    setBudgetSaving(true)
    setBudgetError(null)
    setBudgetSuccessMessage(null)

    try {
      await apiPost('/api/cost/budget', { monthly, alertThreshold })
      setBudgetModalOpen(false)
      await loadData()
      setBudgetSuccessMessage(copy.budget.saved)
    } catch (err) {
      setBudgetError(parseApiErrorMessage(err, copy.budget.saveFailed))
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
      setBudgetSuccessMessage(copy.budget.referenceUpdated)
    } catch (err) {
      setBudgetConfig(current => (
        current
          ? { ...current, pricingReference: previousReference }
          : { monthly: 50, alertThreshold: 80, pricingReference: previousReference }
      ))
      setError(parseApiErrorMessage(err, copy.budget.referenceFailed))
    } finally {
      setReferenceSaving(false)
    }
  }

  const handleCopySolutionText = (solutionId: string, text?: string) => {
    if (!text || !navigator.clipboard?.writeText) return

    void navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedSolutionId(solutionId)
        window.setTimeout(() => {
          setCopiedSolutionId(current => (current === solutionId ? null : current))
        }, 1800)
      })
      .catch(() => {})
  }

  const TrendIcon = summary?.trend === 'up' ? TrendingUp : summary?.trend === 'down' ? TrendingDown : Minus
  const trendColor = summary?.trend === 'up' ? 'text-orange-700' : summary?.trend === 'down' ? 'text-[#3b82c4]' : 'text-slate-500'
  const overviewCardClass = 'glass-raised rounded-2xl border border-surface-border p-6'
  const primarySectionCardClass = 'glass-raised rounded-xl border border-surface-border p-6'
  const secondarySectionCardClass = 'rounded-xl border border-slate-200 bg-white/90 p-6 shadow-sm'

  const pricingReferenceControl = (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm">
      <span className="text-xs text-slate-500">{copy.pricingReferenceLabel}</span>
      <select
        value={selectedPricingReference}
        onChange={event => void handlePricingReferenceChange(event.target.value as PricingReference)}
        disabled={referenceSaving}
        className="bg-transparent text-sm text-slate-700 focus:outline-none disabled:opacity-60"
      >
        {PRICING_REFERENCE_OPTIONS.map(option => (
          <option key={option} value={option}>
            {getPricingReferenceLabel(option, copy) ?? option}
          </option>
        ))}
      </select>
    </label>
  )

  const costMonitorSections: CostMonitorRenderableSection[] = []

  if (savings && savings.suggestions.length > 0) {
    costMonitorSections.push({
      id: 'savings',
      content: (
        <div className={primarySectionCardClass}>
          <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold">{copy.savings.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {copy.savings.subtitle}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">{copy.savings.totalLabel}</span>
              <span className="ml-2 text-lg font-bold text-emerald-500">${formatWasteCost(savings.totalPotentialSaving)}</span>
            </div>
          </div>
          <div className="space-y-3">
            {savings.suggestions.map((sug, i) => {
              const typeMeta = getSavingTypeMeta(sug.reasonType, copy)
              const guardrailMeta = getSavingGuardrailMeta(sug.reasonType, copy)
              const reasonText = getSavingReasonText(sug, locale, copy)
              const actionText = getSavingActionText(sug, locale, copy)
              const guardrailText = getSavingGuardrailText(sug, locale, copy)
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
                      {sug.sessionLabel && (
                        <span className="truncate text-[11px] text-slate-500">
                          {copy.savings.session}: {sug.sessionLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-800">{reasonText}</p>
                    <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                        <p className="text-[11px] font-medium text-slate-500">{copy.savings.next}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{actionText}</p>
                      </div>
                      <div className={cn('rounded-lg border px-3 py-2.5', guardrailMeta.className)}>
                        <p className="text-[11px] font-medium text-slate-500">
                          {copy.savings.guardrail} · {guardrailMeta.label}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed">{guardrailText}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      {showModelRoute ? (
                        <p className="text-xs text-slate-500">
                          {copy.savings.routeLabel}
                          <span className="font-medium text-slate-700">{sug.currentModel}</span>
                          <span className="mx-1">→</span>
                          <span className="font-medium text-slate-700">{sug.alternativeModel}</span>
                        </p>
                      ) : <span />}
                      <div className="flex flex-wrap items-center gap-3">
                        {isReplayLinkable && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              onOpenReplaySession(replaySessionId)
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 transition-all hover:gap-1.5 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82c4]/30 focus-visible:ring-offset-2"
                          >
                            {replayActionLabel}
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        )}
                        {onNavigate && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              onNavigate('benchmark')
                            }}
                            className="text-xs font-medium text-slate-500 transition-colors hover:text-[#3b82c4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82c4]/30 focus-visible:ring-offset-2"
                          >
                            {benchmarkActionLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-500">{copy.savings.estSave}</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-500">-${formatWasteCost(sug.saving)}</p>
                  </div>
                </div>
              )

              if (isReplayLinkable) {
                return (
                  <div
                    key={`${sug.reasonType ?? 'suggestion'}-${replaySessionId ?? sug.currentModel ?? i}`}
                    tabIndex={0}
                    role="button"
                    onClick={() => onOpenReplaySession(replaySessionId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onOpenReplaySession(replaySessionId)
                      }
                    }}
                    className={cn(
                      'group w-full rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#3b82c4]/35 hover:bg-white/95 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82c4]/30 focus-visible:ring-offset-2',
                      'cursor-pointer',
                      getSavingCardClass(sug.priority),
                    )}
                  >
                    {content}
                  </div>
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
                {copy.savings.switchModelNote}
              </p>
            )}
            <p className="text-xs text-slate-600">{copy.savings.disclaimer}</p>
          </div>
        </div>
      ),
    })
  }

  if (savings && savings.suggestions.length === 0 && summary && summary.totalCost > 0) {
    costMonitorSections.push({
      id: 'savings-empty',
      content: (
        <div className={`${primarySectionCardClass} text-center`}>
          <p className="text-sm text-slate-500">
            {copy.savings.emptyHint}
          </p>
        </div>
      ),
    })
  }

  if (recommendedSolutions.length > 0) {
    costMonitorSections.push({
      id: 'solutions',
      content: (
        <div className={primarySectionCardClass}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold">{t('solutions.title')}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {t('solutions.disclaimer')}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
            {recommendedSolutions.map(solution => {
              const copyText = getSolutionCopyText(solution)
              const learnMoreUrl = getSolutionLearnMoreUrl(solution)
              const metaText = getSolutionMetaText(solution)
              const copyLabel = solution.tool?.installCmd ? t('solutions.install') : t('solutions.snippet')
              const isCopied = copiedSolutionId === solution.id

              return (
                <div key={solution.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {metaText && (
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{metaText}</p>
                      )}
                      <h4 className="mt-1 text-base font-semibold text-slate-900">{getLocalizedSolutionTitle(solution, locale)}</h4>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {t(`solutions.effort.${solution.effort}`)}
                      </span>
                      {solution.type === 'free-tier' && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                          {t('solutions.free')}
                        </span>
                      )}
                      {solution.type === 'local-model' && (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                          {t('solutions.local')}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {getLocalizedSolutionDescription(solution, locale)}
                  </p>

                  <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-emerald-700">{t('solutions.savings')}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{solution.savingsEstimate}</p>
                  </div>

                  {copyText && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-950 px-3 py-3 text-slate-100">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{copyLabel}</p>
                        <button
                          type="button"
                          onClick={() => handleCopySolutionText(solution.id, copyText)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82c4]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{isCopied ? t('solutions.copied') : t('solutions.copy')}</span>
                        </button>
                      </div>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-100">{copyText}</pre>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-3">
                    {learnMoreUrl ? (
                      <a
                        href={learnMoreUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#3b82c4] transition-colors hover:text-[#2f6fa8]"
                      >
                        {t('solutions.learnMore')}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : <span />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ),
    })
  }

  costMonitorSections.push({
    id: 'token-waste',
    content: (
      <div className={primarySectionCardClass}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold">{copy.tokenWaste.title}</h3>
            <p className="mt-2 text-sm text-slate-700">{wasteSummaryText}</p>
            <p className="mt-1 text-xs text-slate-500">{wasteMetaText}</p>
          </div>
        </div>

        {wasteDiagnostics.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            {wasteDiagnostics.map((diagnostic, index) => {
              const replaySessionId = diagnostic.sessionId?.trim()
              const isReplayLinkable = canOpenReplaySession(replaySessionId)

              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{getTokenWasteDiagnosticTitle(diagnostic, locale, copy)}</p>
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
                        ? copy.tokenWaste.severity.high
                        : diagnostic.severity === 'medium'
                          ? copy.tokenWaste.severity.medium
                          : copy.tokenWaste.severity.low}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{getTokenWasteDiagnosticDescription(diagnostic, locale, copy)}</p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-sm font-medium text-[#3b82c4]">
                      {copy.tokenWaste.likelyWasted} ${formatWasteCost(diagnostic.estimatedWasteCost)} · {diagnostic.estimatedWasteTokens.toLocaleString(getIntlLocale(locale))} {copy.modelValue.tokensUnit}
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
            {tokenWaste ? copy.tokenWaste.noWaste : copy.tokenWaste.apiUnavailable}
          </div>
        )}
      </div>
    ),
  })

  costMonitorSections.push({
    id: 'trend',
    content: (
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{copy.trend.title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {copy.trend.subtitle}
            </p>
          </div>
          {averageDailyCost > 0 && (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
              {copy.trend.averagePerDay} · ${averageDailyCost.toFixed(2)}
            </span>
          )}
        </div>

        {summary && summary.totalCost === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <span className="text-3xl">📉</span>
            <p className="mt-3 text-sm font-medium text-slate-700">{copy.empty.title}</p>
            <p className="mt-1 text-center text-xs text-slate-500">{copy.empty.desc}</p>
          </div>
        ) : (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={240}>
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
                <Line type="monotone" dataKey="cost" stroke="#f97316" strokeWidth={2} dot={false} name={copy.chart.series} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    ),
  })

  if (modelBreakdownRows.length > 0 || frameworkBreakdownRows.length > 0) {
    costMonitorSections.push({
      id: 'model-breakdown',
      content: (
        <div className={secondarySectionCardClass}>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h3 className="text-base font-semibold">{modelBreakdownRows.length > 0 ? copy.modelBreakdown.title : t('cost.byFramework')}</h3>
            <span className="text-xs text-slate-500">
              {modelBreakdownRows.length > 0 ? copy.modelBreakdown.subtitle : (locale === 'zh' ? '按来源看成本、Token 和会话数。' : 'Compare cost, tokens, and sessions by source.')}
            </span>
          </div>
          {modelBreakdownRows.length > 0 && (
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
                <Bar dataKey="percentage" name={copy.modelBreakdown.series} fill="#3b82c4" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {frameworkBreakdownRows.length > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h4 className="text-sm font-semibold text-slate-900">{t('cost.byFramework')}</h4>
                <span className="text-xs text-slate-500">
                  {locale === 'zh' ? `${frameworkBreakdownRows.length} 个来源` : `${frameworkBreakdownRows.length} sources`}
                </span>
              </div>

              <div className={cn('mt-4 grid gap-4', hasFrameworkComparisonData ? 'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]' : '')}>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/80 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">{locale === 'zh' ? '来源' : 'Source'}</th>
                        <th className="px-4 py-3 text-right">{locale === 'zh' ? '成本' : 'Cost'}</th>
                        <th className="px-4 py-3 text-right">Tokens</th>
                        <th className="px-4 py-3 text-right">{locale === 'zh' ? '会话' : 'Sessions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {frameworkBreakdownRows.map(row => (
                        <tr key={row.source}>
                          <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">${formatWasteCost(row.totalCost)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{row.totalTokens.toLocaleString(getIntlLocale(locale))}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{row.sessionCount.toLocaleString(getIntlLocale(locale))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasFrameworkComparisonData && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                    <ResponsiveContainer width="100%" height={Math.max(220, frameworkBreakdownRows.length * 46)}>
                      <BarChart
                        data={frameworkBreakdownRows}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.14)" />
                        <XAxis
                          type="number"
                          stroke="#64748b"
                          tick={{ fontSize: 12 }}
                          tickFormatter={value => `$${formatWasteCost(Number(value))}`}
                        />
                        <YAxis type="category" dataKey="label" stroke="#64748b" tick={{ fontSize: 12 }} width={96} />
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          labelStyle={{ color: '#64748b' }}
                          itemStyle={{ color: '#0f172a' }}
                          formatter={value => [`$${formatWasteCost(Number(value))}`, locale === 'zh' ? '成本' : 'Cost']}
                        />
                        <Bar dataKey="totalCost" name={locale === 'zh' ? '成本' : 'Cost'} fill="#10b981" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 更便宜的替代方案 */}
          {Object.keys(alternatives).length > 0 && (
            <div className="mt-6 space-y-4">
              {Object.entries(alternatives).map(([model, altData]) => {
                if (!altData.alternatives || altData.alternatives.length === 0) return null
                
                return (
                  <details key={model} className="group rounded-lg border border-slate-200 bg-slate-50/50">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100/50 transition-colors flex items-center justify-between">
                      <span>💡 {locale === 'zh' ? `${model} 的更便宜替代方案` : `Cheaper alternatives for ${model}`}</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="border-t border-slate-200 px-4 py-3 space-y-3">
                      {altData.alternatives.slice(0, 3).map((alt, idx) => (
                        <div key={idx} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{alt.model}</span>
                              <span className="text-xs text-slate-500">({alt.provider})</span>
                              {alt.freeTier && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  {locale === 'zh' ? '免费' : 'Free'}
                                </span>
                              )}
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {locale === 'zh' ? `节省 ${alt.savingsPercent}%` : `Save ${alt.savingsPercent}%`}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              {locale === 'zh' ? '输入' : 'Input'}: ${alt.inputPrice}/M · {locale === 'zh' ? '输出' : 'Output'}: ${alt.outputPrice}/M
                            </div>
                            <div className="mt-2 text-xs text-slate-500">{alt.notes}</div>
                            {alt.freeTier && (
                              <div className="mt-2 text-xs text-slate-500">
                                {locale === 'zh' ? '免费额度' : 'Free tier'}: 
                                {alt.freeTier.freeLimit.requestsPerDay && ` ${alt.freeTier.freeLimit.requestsPerDay} ${locale === 'zh' ? '次/天' : 'req/day'}`}
                                {alt.freeTier.freeLimit.tokensPerDay && ` ${(alt.freeTier.freeLimit.tokensPerDay / 1000).toFixed(0)}K ${locale === 'zh' ? 'tokens/天' : 'tokens/day'}`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {locale === 'zh' 
                          ? '⚠️ 免责声明：替代方案基于价格和通用能力推荐，实际效果可能因任务而异。建议先在非关键任务上测试，确认质量后再扩大使用范围。'
                          : '⚠️ Disclaimer: Alternatives are recommended based on pricing and general capabilities. Actual performance may vary by task. Test on non-critical tasks first before wider adoption.'}
                      </p>
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </div>
      ),
    })
  }

  if (modelValueDisplayRows.length > 0) {
    costMonitorSections.push({
      id: 'model-value',
      content: (
        <div className={secondarySectionCardClass}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-base font-semibold">{copy.modelValue.title}</h3>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                {copy.modelValue.subtitle}
              </p>
            </div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-right">
              <p className="text-xs font-medium text-cyan-700">{copy.modelValue.calloutTitle}</p>
              <p className="mt-1 text-xs text-cyan-700/80">
                {copy.modelValue.calloutSubtitle}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4 font-medium">{copy.modelValue.headers.model}</th>
                  <th className="pb-3 pr-4 font-medium">{copy.modelValue.headers.sessions}</th>
                  <th className="pb-3 pr-4 font-medium">{copy.modelValue.headers.avgCost}</th>
                  <th className="pb-3 pr-4 font-medium">{copy.modelValue.headers.outputTools}</th>
                  <th className="pb-3 pr-4 font-medium">{copy.modelValue.headers.stability}</th>
                  <th className="pb-3 pr-4 font-medium">{copy.modelValue.headers.role}</th>
                  <th className="pb-3 font-medium">{copy.modelValue.headers.recommended}</th>
                </tr>
              </thead>
              <tbody>
                {modelValueDisplayRows.map(row => {
                  const stabilityMeta = getStabilityMeta(row.errorRate, copy)
                  return (
                    <tr key={row.model} className="border-b border-slate-100 align-top last:border-0">
                      <td className="min-w-[180px] py-4 pr-4">
                        <div className="font-medium text-slate-900">{row.model}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          ${formatMatrixCost(row.totalCost)} · {formatCompactTokens(row.totalTokens, locale)} {copy.modelValue.tokensUnit}
                        </div>
                      </td>
                      <td className="whitespace-nowrap py-4 pr-4">
                        <div className="font-semibold text-slate-900">{row.sessions}</div>
                        <div className="mt-1 text-xs text-slate-500">{copy.modelValue.samples}</div>
                      </td>
                      <td className="whitespace-nowrap py-4 pr-4">
                        <div className="font-semibold text-slate-900">${formatMatrixCost(row.avgCostPerSession)}</div>
                        <div className="mt-1 text-xs text-slate-500">{copy.modelValue.perSession}</div>
                      </td>
                      <td className="whitespace-nowrap py-4 pr-4">
                        <div className="font-semibold text-slate-900">{row.avgOutputInputRatio.toFixed(2)}×</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {copy.modelValue.toolUsage} {formatRate(row.toolUsageRate)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap py-4 pr-4">
                        <div className={cn('font-semibold', stabilityMeta.className)}>{formatRate(row.errorRate)}</div>
                        <div className={cn('mt-1 text-xs', stabilityMeta.className)}>{stabilityMeta.label}</div>
                      </td>
                      <td className="whitespace-nowrap py-4 pr-4">
                        <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium', getModelValueBadgeClass(row.valueLabel))}>
                          {copy.modelValue.labels[row.valueLabel]}
                        </span>
                      </td>
                      <td className="min-w-[240px] max-w-[360px] py-4 text-sm leading-6 text-slate-600">
                        {localizeCostModelRecommendation(row, locale, t)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            {copy.modelValue.footer}
          </p>
        </div>
      ),
    })
  }

  if (!loading && insights.length > 0) {
    costMonitorSections.push({
      id: 'insights',
      content: (
        <div className={secondarySectionCardClass}>
          <h3 className="mb-4 text-base font-semibold">{copy.insightsTitle}</h3>
          <div className="space-y-3">
            {insights.map((ins, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 rounded-xl px-4 py-3 text-sm',
                  ins.type === 'warning' ? 'border border-amber-500/20 bg-amber-50 text-amber-700'
                    : ins.type === 'tip' ? 'border border-blue-500/20 bg-blue-500/10 text-blue-600'
                      : 'border border-slate-200 bg-slate-50 text-slate-500',
                )}
              >
                <span>{localizeCostInsightMessage(ins, locale, t)}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }

  if (referenceCompareRows.length > 0) {
    costMonitorSections.push({
      id: 'reference-compare',
      content: (
        <div className={secondarySectionCardClass}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-base font-semibold">{copy.referenceCompare.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {referenceCompare && currentReferenceCompareLabel
                  ? fillTemplate(copy.referenceCompare.descriptionCurrent, { label: currentReferenceCompareLabel, cost: `$${formatWasteCost(referenceCompare.currentTotalCost)}` })
                  : copy.referenceCompare.description}
              </p>
            </div>
            {referenceVsOfficialRows.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {referenceVsOfficialRows.map(row => {
                  const displayLabel = getPricingReferenceLabel(row.reference, copy) ?? row.label
                  return (
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
                      {displayLabel} {copy.referenceCompare.vsOfficial} {formatSignedCostDelta(row.deltaVsOfficial)}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
            {referenceCompareRows.map(row => {
              const isCurrentRow = row.reference === referenceCompare?.currentReference
              const displayLabel = getPricingReferenceLabel(row.reference, copy) ?? row.label
              const deltaTone = isCurrentRow
                ? 'bg-[#3b82c4]/10 text-[#3b82c4]'
                : row.deltaVsCurrent > 0
                  ? 'bg-red-50 text-red-600'
                  : row.deltaVsCurrent < 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-slate-100 text-slate-500'
              const deltaDescription = isCurrentRow
                ? copy.referenceCompare.currentDescription
                : row.deltaVsCurrent > 0
                  ? copy.referenceCompare.moreExpensive
                  : row.deltaVsCurrent < 0
                    ? copy.referenceCompare.cheaper
                    : copy.referenceCompare.aboutSame

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
                      <p className="text-sm font-semibold text-slate-900">{displayLabel}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getPricingSourceLabel(row.pricingSource, copy) ?? row.pricingSource}
                      </p>
                    </div>
                    {isCurrentRow && (
                      <span className="rounded-full bg-[#3b82c4]/10 px-2.5 py-1 text-[11px] font-medium text-[#3b82c4]">
                        {copy.referenceCompare.current}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-2xl font-bold tabular-nums text-slate-900">
                    ${formatWasteCost(row.totalCost)}
                  </p>

                  <div className={cn('mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium', deltaTone)}>
                    {isCurrentRow
                      ? `${copy.referenceCompare.current} · $0.0000`
                      : `${copy.referenceCompare.vsCurrent} ${formatSignedCostDelta(row.deltaVsCurrent)}`}
                  </div>

                  <p className="mt-2 text-xs text-slate-500">{deltaDescription}</p>
                </div>
              )
            })}
          </div>
        </div>
      ),
    })
  }

  if (reconciliationSummary && reconciliationRows.length > 0) {
    costMonitorSections.push({
      id: 'reconciliation',
      content: (
        <div className={secondarySectionCardClass}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-base font-semibold">{copy.reconciliation.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {fillTemplate(copy.reconciliation.description, {
                  current: reconciliationCurrentReferenceLabel ?? reconciliationMeta?.currentReference ?? '--',
                  baseline: reconciliationBaselineReferenceLabel ?? reconciliationMeta?.baselineReference ?? '--',
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#3b82c4]/20 bg-[#3b82c4]/10 px-3 py-1 text-xs font-medium text-[#2f6fa8]">
                {copy.reconciliation.current} · {reconciliationCurrentReferenceLabel ?? reconciliationMeta?.currentReference ?? '--'}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {copy.reconciliation.comparison} · {reconciliationBaselineReferenceLabel ?? reconciliationMeta?.baselineReference ?? '--'}
              </span>
              {(reconciliationMeta?.stale || reconciliationMeta?.baselineStale) && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  {copy.reconciliation.stale}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[#3b82c4]/20 bg-[#3b82c4]/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.reconciliation.currentTotal}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">${formatWasteCost(reconciliationSummary.currentCost)}</p>
              <p className="mt-1 text-xs text-slate-500">{reconciliationCurrentSourceLabel ?? reconciliationMeta?.pricingSource ?? '--'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.reconciliation.comparisonTotal}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">${formatWasteCost(reconciliationSummary.baselineCost)}</p>
              <p className="mt-1 text-xs text-slate-500">{reconciliationBaselineSourceLabel ?? reconciliationMeta?.baselinePricingSource ?? '--'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.reconciliation.delta}</p>
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
                  ? copy.reconciliation.deltaAbove
                  : reconciliationSummary.delta < 0
                    ? copy.reconciliation.deltaBelow
                    : copy.reconciliation.deltaEqual}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.reconciliation.sessionsEstimated}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{reconciliationSummary.sessions}</p>
              <p className="mt-1 text-xs text-slate-500">
                {fillTemplate(copy.reconciliation.estimatedRows, { count: reconciliationSummary.estimatedRows })}
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
                  {getUsageSourceLabel(source, copy)} · {count}
                </span>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
              <span className="text-xs text-slate-500">{copy.reconciliation.sort}</span>
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
              <span>{copy.reconciliation.estimatedOnly}</span>
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
              <span>{copy.reconciliation.replayableOnly}</span>
            </label>

            <span className="text-xs text-slate-500 sm:ml-auto">
              {fillTemplate(copy.reconciliation.rowsShown, { shown: displayedReconciliationRows.length, total: reconciliationRows.length })}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4 font-medium">{copy.reconciliation.headers.session}</th>
                  <th className="pb-3 pr-4 font-medium">{copy.reconciliation.headers.provider}</th>
                  <th className="pb-3 pr-4 font-medium">{copy.reconciliation.headers.primaryModel}</th>
                  <th className="pb-3 pr-4 font-medium">{copy.reconciliation.headers.tokens}</th>
                  <th className="pb-3 pr-4 font-medium">{copy.reconciliation.headers.currentCost}</th>
                  <th className="pb-3 pr-4 font-medium">{copy.reconciliation.headers.comparisonCost}</th>
                  <th className="pb-3 font-medium">{copy.reconciliation.delta}</th>
                </tr>
              </thead>
              <tbody>
                {displayedReconciliationRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                      {copy.reconciliation.noRows}
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
                      <td className="min-w-[300px] py-4 pr-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-900">{row.sessionLabel || row.sessionId}</div>
                            <div className="mt-1 break-all font-mono text-[11px] text-slate-500">{row.sessionId}</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className={cn('inline-flex rounded-full border px-2 py-1 text-[11px] font-medium', getUsageSourceBadgeClass(row.usageSource))}>
                                {getUsageSourceLabel(row.usageSource, copy)}
                              </span>
                              {row.estimated && (
                                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                                  {copy.reconciliation.estimated}
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
                      <td className="min-w-[120px] py-4 pr-4 text-slate-600">{row.provider || '--'}</td>
                      <td className="min-w-[180px] py-4 pr-4 text-slate-600">{row.primaryModel || '--'}</td>
                      <td className="min-w-[150px] py-4 pr-4 text-slate-600">
                        <div className="font-medium text-slate-900">{(row.inputTokens + row.outputTokens).toLocaleString()}</div>
                        <div className="mt-1 text-xs text-slate-500">{copy.reconciliation.input} {row.inputTokens.toLocaleString(getIntlLocale(locale))}</div>
                        <div className="text-xs text-slate-500">{copy.reconciliation.output} {row.outputTokens.toLocaleString(getIntlLocale(locale))}</div>
                      </td>
                      <td className="whitespace-nowrap py-4 pr-4 font-semibold tabular-nums text-slate-900">${formatWasteCost(row.currentCost)}</td>
                      <td className="whitespace-nowrap py-4 pr-4 font-semibold tabular-nums text-slate-600">${formatWasteCost(row.baselineCost)}</td>
                      <td className={cn(
                        'whitespace-nowrap py-4 font-semibold tabular-nums',
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
            {copy.reconciliation.footer}
          </p>
        </div>
      ),
    })
  }

  if (summary?.topTasks && summary.topTasks.length > 0) {
    costMonitorSections.push({
      id: 'top-tasks',
      content: (
        <div className={secondarySectionCardClass}>
          <h3 className="mb-4 text-base font-semibold">{copy.topTasksTitle}</h3>
          <div className="space-y-3">
            {summary.topTasks.slice(0, 5).map((task, i) => (
              <div key={task.taskId} className="flex items-center justify-between border-b border-surface-border py-2 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-sm text-slate-500">{i + 1}.</span>
                  <span className="max-w-[300px] truncate text-sm">{task.taskName}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium text-accent">${task.cost.toFixed(4)}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {task.tokens.toLocaleString(getIntlLocale(locale))} {copy.modelValue.tokensUnit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }

  const orderedCostMonitorSections = splitCostMonitorSections(costMonitorSections)
  const overviewTrendSection = orderedCostMonitorSections.primary.find(section => section.id === 'trend')?.content ?? null
  const mainlineActionSections = orderedCostMonitorSections.primary.filter(section => section.id !== 'trend')
  const furtherAnalysisSections = orderedCostMonitorSections.secondary

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold">{copy.pageTitle}</h2>
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
              {fillTemplate(copy.days, { n: d })}
            </button>
          ))}
          <button
            type="button"
            onClick={openBudgetModal}
            className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            {copy.budget.button}
          </button>
        </div>
      </div>

      {demoCostHint && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-700/90">
          {copy.demoHint}
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
            title={copy.empty.title}
            description={copy.empty.desc}
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
          <div className="space-y-6">
            <div className={overviewCardClass}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-semibold">{copy.overview.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {copy.overview.subtitle}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
                  <span className="text-sm text-slate-500">{copy.cards.total}</span>
                  <div className="mt-1 text-2xl font-bold text-[#3b82c4] tabular-nums">
                    <AnimatedCounter value={summary?.totalCost ?? 0} prefix="$" decimals={2} duration={1000} />
                  </div>
                  <div className={`mt-1 flex items-center gap-1 text-xs ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    <span>
                      {fillTemplate(copy.cards.mom, { n: summary?.comparedToLastMonth?.toFixed(1) ?? '0' })}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
                  <span className="text-sm text-slate-500">{copy.cards.tokens}</span>
                  <div className="mt-1 text-2xl font-bold text-[#3b82c4] tabular-nums">
                    <AnimatedCounter value={summary?.totalTokens ?? 0} decimals={0} duration={1000} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {fillTemplate(copy.cards.inOut, {
                      in: summary?.inputTokens?.toLocaleString(getIntlLocale(locale)) ?? 0,
                      out: summary?.outputTokens?.toLocaleString(getIntlLocale(locale)) ?? 0,
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
                  <span className="text-sm text-slate-500">{copy.cards.budget}</span>
                  <div className={`mt-1 text-2xl font-bold tabular-nums ${(summary?.budget?.percentage || 0) > 80 ? 'text-orange-700' : 'text-[#3b82c4]'}`}>
                    <AnimatedCounter value={summary?.budget?.percentage ?? 0} decimals={1} suffix="%" duration={1000} />
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full border border-surface-border bg-surface-overlay">
                    <div
                      className={`h-2 rounded-full transition-all ${(summary?.budget?.percentage || 0) > 80 ? 'bg-orange-500' : 'bg-[#3b82c4]'}`}
                      style={{ width: `${Math.min(summary?.budget?.percentage || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {overviewTrendSection}
            </div>

            {mainlineActionSections.length > 0 && (
              <div className="space-y-6">
                {mainlineActionSections.map(section => (
                  <Fragment key={section.id}>{section.content}</Fragment>
                ))}
              </div>
            )}

            {furtherAnalysisSections.length > 0 && (
              <details className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
                  <span>{copy.advancedTitle}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>

                <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                  <div className="flex justify-end">{pricingReferenceControl}</div>
                  {furtherAnalysisSections.map(section => (
                    <Fragment key={section.id}>{section.content}</Fragment>
                  ))}
                </div>
              </details>
            )}
          </div>
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
              <h3 className="text-lg font-semibold text-slate-900">{copy.budget.modalTitle}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {copy.budget.modalDesc}
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="block text-xs text-slate-500 mb-1.5">{copy.budget.monthly}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetForm.monthly}
                  onChange={event => setBudgetForm(form => ({ ...form, monthly: event.target.value }))}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder={copy.budget.monthlyPlaceholder}
                />
              </label>

              <label className="block">
                <span className="block text-xs text-slate-500 mb-1.5">{copy.budget.threshold}</span>
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
                {copy.budget.cancel}
              </button>
              <button
                type="button"
                disabled={budgetSaving}
                onClick={handleBudgetSave}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#3b82c4] to-teal-500 disabled:opacity-50"
              >
                {budgetSaving ? copy.budget.saving : copy.budget.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing disclaimer */}
      <div className="mt-4 px-1">
        <p className="text-[11px] leading-relaxed text-slate-600">{copy.pricingDetails.estimate}</p>
        {summary?.costMeta?.stale && (
          <p className="mt-1 text-[11px] text-amber-700">
            {copy.pricingDetails.stale}
          </p>
        )}
        <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5">
          <summary className="cursor-pointer text-[11px] font-medium text-slate-600">
            {copy.pricingDetails.title}
          </summary>
          <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-600">
            {pricingReferenceLabel && (
              <p>
                {copy.pricingDetails.currentView}
                <span className="font-medium text-slate-700">{pricingReferenceLabel}</span>
              </p>
            )}
            {pricingSourceLabel && (
              <p>
                {copy.pricingDetails.reference}
                <span className="font-medium text-slate-700">{pricingSourceLabel}</span>
                {pricingUpdatedAtLabel ? ` · ${copy.pricingDetails.updated} ${pricingUpdatedAtLabel}` : ''}
              </p>
            )}
            <p>
              {copy.pricingDetails.cutoff}
              <span className="font-medium text-slate-700">{dataCutoffLabel}</span>
            </p>
            <p>
              {copy.pricingDetails.latest}
              <span className="font-medium text-slate-700">{latestUsageLabel}</span>
            </p>
            <p>{copy.pricingDetails.source}</p>
          </div>
        </details>
      </div>
    </div>
  )
}
