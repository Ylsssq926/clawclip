import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  TokenUsage,
  DailyUsage,
  CostStats,
  BudgetConfig,
  TaskCost,
  CostInsight,
  SavingSuggestion,
  SavingsReport,
  DEFAULT_BUDGET_CONFIG,
  PRICING_REFERENCES,
  type PricingReference,
  type PricingSource,
  type UsageSource,
  type UsageSourceBreakdown,
  type CostMeta,
  type CostReconciliationMeta,
  type CostReconciliationSummary,
  type CostReconciliationRow,
  type CostReconciliationResult,
} from '../types/index.js';
import { getClawclipStateDir, getLobsterDataRoots } from './agent-data-root.js';
import { DEMO_SESSIONS } from './demo-sessions.js';
import { getRealMergedReplays } from './replay-repository.js';
import {
  getConfiguredPricingReference,
  getPricingSnapshot,
  getPricingSnapshotAsync,
  isPricingReference,
  normalizeModelId,
  readBudgetConfigFromState,
} from './pricing-fetcher.js';
import { buildCostMeta, resolveModelDetail, repriceStep } from './pricing-utils.js';
import type { PricingSnapshot } from './pricing-fetcher.js';
import type { SessionReplay } from '../types/replay.js';
import { tokenWasteAnalyzer, type TokenWasteDiagnostic } from './token-waste-analyzer.js';
import { attributeCosts, type CostAttribution } from './cost-attribution.js';
import { log } from './logger.js';
import { FREE_TIERS, LOW_COST_MODELS, type FreeTierInfo } from '../data/free-tiers.js';

interface ModelBreakdownEntry {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  tokens: number;
  cost: number;
}

export interface FrameworkBreakdownEntry {
  source: string;
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
}

const ALT_TIERS: { threshold: number; models: string[] }[] = [
  { threshold: 50, models: ['gpt-5.4-mini', 'claude-sonnet-4.6', 'gemini-3.1-pro'] },
  { threshold: 5, models: ['gpt-4.1-mini', 'deepseek-chat', 'gemini-3-flash'] },
  { threshold: 1, models: ['deepseek-chat', 'qwen-turbo', 'gemini-3.1-flash-lite', 'yi-lightning'] },
];

const LARGE_LOG_FILE_BYTES = 50 * 1024 * 1024;
const LARGE_LOG_FILE_TAIL_LINES = 10_000;
const TAIL_READ_CHUNK_BYTES = 64 * 1024;

/** 超大 .log 只读尾部，避免全量 readFileSync + split 长时间阻塞服务线程。 */
function readUtf8TailLines(filePath: string, lineLimit: number, fileSize: number): string {
  const fd = fs.openSync(filePath, 'r');
  try {
    let position = fileSize;
    let newlineCount = 0;
    const chunks: Buffer[] = [];

    while (position > 0 && newlineCount <= lineLimit) {
      const chunkSize = Math.min(TAIL_READ_CHUNK_BYTES, position);
      position -= chunkSize;
      const chunk = Buffer.alloc(chunkSize);
      const bytesRead = fs.readSync(fd, chunk, 0, chunkSize, position);
      const slice = bytesRead === chunkSize ? chunk : chunk.subarray(0, bytesRead);
      chunks.unshift(slice);
      for (let i = 0; i < slice.length; i += 1) {
        if (slice[i] === 0x0a) newlineCount += 1;
      }
    }

    const normalized = Buffer.concat(chunks).toString('utf-8').replace(/\r\n/g, '\n');
    const lines = normalized.endsWith('\n') ? normalized.slice(0, -1).split('\n') : normalized.split('\n');
    return lines.length > lineLimit ? lines.slice(-lineLimit).join('\n') : normalized;
  } finally {
    fs.closeSync(fd);
  }
}

function readUsageLogContent(filePath: string): string {
  const stat = fs.statSync(filePath);
  if (stat.size <= LARGE_LOG_FILE_BYTES) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  // 超过 50MB 时只解析最后 10000 行，避免单个超大日志把整个请求线程卡住。
  log.warn(
    `[cost-parser] oversized usage log ${filePath} (${(stat.size / 1024 / 1024).toFixed(1)}MB), only parsing last ${LARGE_LOG_FILE_TAIL_LINES} lines`,
  );
  return readUtf8TailLines(filePath, LARGE_LOG_FILE_TAIL_LINES, stat.size);
}

function suggestAlternativeDetailed(
  currentModel: string,
  data: ModelBreakdownEntry,
  pricing: PricingSnapshot,
): { name: string; cost: number } | null {
  const currentDetail = resolveModelDetail(pricing.detailed, currentModel);
  const referencePricePerMillion = Math.max(
    currentDetail.input,
    currentDetail.output,
    data.totalTokens > 0 ? (data.cost * 1_000_000) / data.totalTokens : 0,
  );

  for (const tier of ALT_TIERS) {
    if (referencePricePerMillion < tier.threshold) continue;
    const best = tier.models
      .filter(model => model !== currentModel)
      .map(model => ({
        model,
        cost: repriceStep(model, data.inputTokens, data.outputTokens, pricing),
      }))
      .filter(candidate => candidate.cost < data.cost)
      .sort((a, b) => a.cost - b.cost)[0];
    if (best) return { name: best.model, cost: best.cost };
  }

  return null;
}

/**
 * 判断任务类型是否适合轻量模型
 */
function isLightweightTask(taskType?: string): boolean {
  if (!taskType) return false;
  const lightweightTypes = ['classification', 'extraction', 'format', 'simple'];
  return lightweightTypes.some(type => taskType.toLowerCase().includes(type));
}

/**
 * 推荐更便宜的替代方案
 */
export function suggestCheaperAlternatives(
  currentModel: string,
  taskType?: string,
): AlternativeModel[] {
  const pricing = getPricingSnapshot(getConfiguredPricingReference());
  const currentDetail = resolveModelDetail(pricing.detailed, currentModel);
  const alternatives: AlternativeModel[] = [];

  const currentModelLower = currentModel.toLowerCase();
  const isExpensiveModel =
    currentModelLower.includes('gpt-4o') ||
    currentModelLower.includes('gpt-5') ||
    currentModelLower.includes('claude-opus') ||
    currentModelLower.includes('claude-sonnet');

  // 如果是贵模型，推荐 DeepSeek 和 Groq
  if (isExpensiveModel) {
    // DeepSeek V3.2
    const deepseekDetail = resolveModelDetail(pricing.detailed, 'deepseek-chat');
    const deepseekInfo = LOW_COST_MODELS.find(m => m.modelId === 'deepseek-chat');
    if (deepseekInfo) {
      const savingsPercent = ((currentDetail.output - deepseekDetail.output) / currentDetail.output) * 100;
      alternatives.push({
        model: deepseekInfo.model,
        provider: deepseekInfo.provider,
        inputPrice: deepseekDetail.input,
        outputPrice: deepseekDetail.output,
        savingsPercent: Math.round(savingsPercent),
        suitableFor: deepseekInfo.suitableFor,
        notSuitableFor: deepseekInfo.notSuitableFor,
        notes: deepseekInfo.notes,
      });
    }

    // Groq Llama 3.3 70B
    const groq70bDetail = resolveModelDetail(pricing.detailed, 'llama-3.3-70b-versatile');
    const groq70bInfo = LOW_COST_MODELS.find(m => m.modelId === 'llama-3.3-70b-versatile');
    if (groq70bInfo) {
      const savingsPercent = ((currentDetail.output - groq70bDetail.output) / currentDetail.output) * 100;
      alternatives.push({
        model: groq70bInfo.model,
        provider: groq70bInfo.provider,
        inputPrice: groq70bDetail.input,
        outputPrice: groq70bDetail.output,
        savingsPercent: Math.round(savingsPercent),
        suitableFor: groq70bInfo.suitableFor,
        notSuitableFor: groq70bInfo.notSuitableFor,
        notes: groq70bInfo.notes,
      });
    }
  }

  // 如果是轻量任务，额外推荐免费模型
  if (isLightweightTask(taskType)) {
    const groqScoutDetail = resolveModelDetail(pricing.detailed, 'meta-llama/llama-4-scout-17b-16e-instruct');
    const groqScoutInfo = LOW_COST_MODELS.find(m => m.modelId === 'meta-llama/llama-4-scout-17b-16e-instruct');
    const groqScoutFreeTier = FREE_TIERS.find(f => f.modelId === 'meta-llama/llama-4-scout-17b-16e-instruct');
    if (groqScoutInfo) {
      const savingsPercent = ((currentDetail.output - groqScoutDetail.output) / currentDetail.output) * 100;
      alternatives.push({
        model: groqScoutInfo.model,
        provider: groqScoutInfo.provider,
        inputPrice: groqScoutDetail.input,
        outputPrice: groqScoutDetail.output,
        savingsPercent: Math.round(savingsPercent),
        freeTier: groqScoutFreeTier,
        suitableFor: groqScoutInfo.suitableFor,
        notSuitableFor: groqScoutInfo.notSuitableFor,
        notes: groqScoutInfo.notes,
      });
    }
  }

  // 按节省百分比排序
  return alternatives.sort((a, b) => b.savingsPercent - a.savingsPercent);
}

interface UsageCacheEntry {
  at: number;
  data: TokenUsage[];
  pricing: PricingSnapshot;
  replays: SessionReplay[];
  isDemo: boolean;
  usageSource: UsageSource;
}

interface UsageFreshness {
  latestUsageAt?: string;
  dataCutoffAt: string;
  pricingStale: boolean;
}

export interface ReferenceCompareRow {
  reference: PricingReference;
  label: string;
  totalCost: number;
  deltaVsCurrent: number;
  pricingSource: PricingSource;
  pricingCatalogVersion: string;
}

export interface ReferenceCompareResult {
  currentReference: PricingReference;
  currentTotalCost: number;
  rows: ReferenceCompareRow[];
}

export interface CostAttributionReport {
  attribution: CostAttribution;
  costMeta: CostMeta;
  latestUsageAt?: string;
  dataCutoffAt: string;
  usingDemo: boolean;
}

function getPricingReferenceLabel(reference: PricingReference): string {
  switch (reference) {
    case 'official-static':
      return 'Official';
    case 'pricetoken':
      return 'PriceToken';
    case 'openrouter':
      return 'OpenRouter';
    default:
      return reference;
  }
}

type SavingReasonType = 'switch-model' | 'trim-prompt' | 'trim-output' | 'reduce-retries';
type SavingPriority = 'high' | 'medium' | 'low';

export interface AlternativeModel {
  model: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
  savingsPercent: number;
  freeTier?: FreeTierInfo;
  suitableFor: string[];
  notSuitableFor: string[];
  notes: string;
}

export interface AlternativesResult {
  currentModel: string;
  currentPrice: { input: number; output: number };
  alternatives: AlternativeModel[];
  freeTiers: FreeTierInfo[];
}

type EnhancedSavingSuggestion = SavingSuggestion & {
  reasonType?: SavingReasonType;
  reasonZh?: string;
  reasonEn?: string;
  actionZh?: string;
  actionEn?: string;
  qualityGuardrailZh?: string;
  qualityGuardrailEn?: string;
  priority?: SavingPriority;
  sessionId?: string;
  sessionLabel?: string;
};

interface SessionUsageSummary {
  sessionId: string;
  sessionLabel: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  modelCosts: Map<string, number>;
}

interface SessionModelUsageSummary {
  sessionId: string;
  sessionLabel: string;
  model: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface ReconciliationSessionSummary {
  sessionId: string;
  sessionLabel: string;
  provider: string | null;
  replayAvailable: boolean;
  inputTokens: number;
  outputTokens: number;
  currentCost: number;
  baselineCost: number;
  usageSources: Set<UsageSource>;
  modelCosts: Map<string, number>;
  preferredModel: string | null;
}

function roundSuggestionMoney(value: number): number {
  return Math.round(Math.max(0, value) * 1_000_000) / 1_000_000;
}

const LOW_RISK_GUARDRAIL_ZH = '这类优化通常不直接牺牲模型能力，适合优先尝试。';
const LOW_RISK_GUARDRAIL_EN = 'This kind of optimization usually reduces waste without directly sacrificing model capability.';
const SWITCH_MODEL_GUARDRAIL_ZH = '建议先在低风险任务灰度切换，确认质量稳定后再扩大范围。';
const SWITCH_MODEL_GUARDRAIL_EN = 'Roll this out on lower-risk tasks first, then expand once quality stays stable.';
const HIGH_VALUE_SWITCH_MODEL_GUARDRAIL_ZH = '如果这是高价值任务，建议先在低风险任务灰度切换，确认质量稳定后再扩大范围。';
const HIGH_VALUE_SWITCH_MODEL_GUARDRAIL_EN = 'If this is a high-value workflow, roll this out on lower-risk tasks first, then expand once quality stays stable.';

function normalizeFrameworkSource(source?: string): string {
  const normalized = (source ?? '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized === 'claw') return 'openclaw';
  if (normalized.includes('langgraph') || normalized.includes('autogen') || normalized === 'otel') return normalized;
  if (normalized.includes('openclaw')) return 'openclaw';
  if (normalized.includes('zeroclaw')) return 'zeroclaw';
  if (normalized.includes('hermes')) return 'hermes';
  return normalized;
}

function getFrameworkBucket(source?: string): string {
  return normalizeFrameworkSource(source);
}

function getSavingPriorityRank(priority: SavingPriority | undefined): number {
  switch (priority) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
    default:
      return 1;
  }
}

function getSavingSafetyRank(reasonType: SavingReasonType | undefined): number {
  return reasonType === 'switch-model' ? 1 : 2;
}

export class CostParser {
  private static readonly CHEAP_MODELS = [
    'deepseek-chat', 'deepseek-coder', 'qwen-turbo', 'qwen3.5-flash',
    'gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5.4-mini', 'gpt-5.4-nano',
    'claude-haiku-3.5', 'claude-3.5-haiku', 'claude-3-haiku', 'claude-haiku-4.5',
    'gemini-3-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.0-flash',
    'meta-llama/llama-4-scout-17b-16e-instruct', 'glm-4-flash', 'glm-4.5-flash', 'glm-4.7-flash',
    'minimax-01', 'yi-lightning', 'doubao-lite', 'hunyuan-lite',
  ];

  private config: BudgetConfig;
  private usageCache: UsageCacheEntry | null = null;
  private logDedupeKeys = new Set<string>();
  private static readonly CACHE_MS = 30_000;

  private hasKnownPriceForModel(model: string, table: PricingSnapshot['pricing']): boolean {
    const variants = normalizeModelId(model);
    for (const variant of variants) {
      if (table[variant] != null) return true;
    }
    const keys = Object.keys(table);
    for (const variant of variants) {
      for (const key of keys) {
        if (variant.startsWith(key)) return true;
      }
    }
    return false;
  }

  private priceForModel(model: string, table: PricingSnapshot['pricing']): number {
    const variants = normalizeModelId(model);
    for (const variant of variants) {
      if (table[variant] != null) return table[variant];
    }
    const keys = Object.keys(table);
    for (const variant of variants) {
      for (const key of keys) {
        if (variant.startsWith(key)) return table[key];
      }
    }
    return 2.0;
  }

  constructor() {
    this.ensureDirectories();
    this.config = this.loadConfig();
  }

  private appendReplayUsages(
    replays: SessionReplay[],
    usages: TokenUsage[],
    seen: Set<string>,
    pricing: PricingSnapshot,
    usageSource: UsageSource,
  ): number {
    let appended = 0;

    for (const replay of replays) {
      for (const step of replay.steps) {
        if (step.inputTokens === 0 && step.outputTokens === 0) continue;
        const model = step.model || 'unknown';
        const key = `${replay.meta.id}|${model}|${step.timestamp.getTime()}`;
        seen.add(key);
        usages.push({
          timestamp: step.timestamp,
          taskId: replay.meta.id,
          model,
          inputTokens: step.inputTokens,
          outputTokens: step.outputTokens,
          cost: repriceStep(step.model, step.inputTokens, step.outputTokens, pricing),
          sessionId: replay.meta.id,
          usageSource,
        });
        appended += 1;
      }
    }

    return appended;
  }

  private hasMeaningfulUsage(usages: TokenUsage[]): boolean {
    return usages.some(usage => usage.inputTokens > 0 || usage.outputTokens > 0 || usage.cost > 0);
  }

  private getReferenceNow(usages: TokenUsage[], isDemo: boolean): number {
    if (!isDemo) {
      return Date.now();
    }

    let latest = 0;
    for (const usage of usages) {
      const ts = usage.timestamp.getTime();
      if (!Number.isNaN(ts) && ts > latest) {
        latest = ts;
      }
    }

    return latest > 0 ? latest : Date.now();
  }

  private getCacheDir(): string {
    return getClawclipStateDir();
  }

  private ensureDirectories(): void {
    const cache = this.getCacheDir();
    if (!fs.existsSync(cache)) {
      fs.mkdirSync(cache, { recursive: true });
    }
  }

  private loadConfig(): BudgetConfig {
    return readBudgetConfigFromState();
  }

  saveConfig(config: Partial<BudgetConfig>): void {
    const nextConfig: BudgetConfig = { ...this.config };

    if (typeof config.monthly === 'number' && config.monthly > 0) {
      nextConfig.monthly = config.monthly;
    }
    if (typeof config.alertThreshold === 'number' && config.alertThreshold >= 1 && config.alertThreshold <= 100) {
      nextConfig.alertThreshold = config.alertThreshold;
    }
    if (typeof config.currency === 'string' && config.currency.trim()) {
      nextConfig.currency = config.currency;
    }
    if (config.pricingReference !== undefined && isPricingReference(config.pricingReference)) {
      nextConfig.pricingReference = config.pricingReference;
    }
    if (!nextConfig.pricingReference) {
      nextConfig.pricingReference = DEFAULT_BUDGET_CONFIG.pricingReference;
    }

    this.config = nextConfig;
    const configPath = path.join(this.getCacheDir(), 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    this.usageCache = null;
  }

  getConfig(): BudgetConfig {
    this.config = this.loadConfig();
    return { ...this.config };
  }

  private parseLogFiles(pricing = getPricingSnapshot()): Pick<UsageCacheEntry, 'data' | 'pricing' | 'replays' | 'isDemo' | 'usageSource'> {
    const realReplays = getRealMergedReplays();
    const realUsages: TokenUsage[] = [];
    const realSeen = new Set<string>();

    const replayUsageCount = this.appendReplayUsages(realReplays, realUsages, realSeen, pricing, 'replay');
    this.logDedupeKeys = realSeen;

    let logUsageCount = 0;
    if (realReplays.length > 0) {
      const roots = getLobsterDataRoots();
      if (roots.length === 0) {
        const fallbackLogs = path.join(os.homedir(), '.openclaw', 'logs');
        if (fs.existsSync(fallbackLogs)) {
          logUsageCount += this.parseDirectory(fallbackLogs, '.log', realUsages, pricing);
        }
      } else {
        for (const root of roots) {
          const logsDir = path.join(root.homeDir, 'logs');
          if (fs.existsSync(logsDir)) {
            logUsageCount += this.parseDirectory(logsDir, '.log', realUsages, pricing);
          }
        }
      }
    }

    if (realReplays.length > 0 && this.hasMeaningfulUsage(realUsages)) {
      const usageSource: UsageSource =
        replayUsageCount > 0 && logUsageCount > 0 ? 'mixed' : logUsageCount > 0 ? 'log' : 'replay';
      return { data: realUsages, pricing, replays: realReplays, isDemo: false, usageSource };
    }

    const demoUsages: TokenUsage[] = [];
    const demoSeen = new Set<string>();
    this.appendReplayUsages(DEMO_SESSIONS, demoUsages, demoSeen, pricing, 'demo');
    this.logDedupeKeys = demoSeen;
    return { data: demoUsages, pricing, replays: DEMO_SESSIONS, isDemo: true, usageSource: 'demo' };
  }

  private getCachedUsageBatch(): UsageCacheEntry {
    const now = Date.now();
    const currentSnapshot = getPricingSnapshot(getConfiguredPricingReference());
    if (
      this.usageCache &&
      now - this.usageCache.at < CostParser.CACHE_MS &&
      this.usageCache.pricing.reference === currentSnapshot.reference &&
      this.usageCache.pricing.source === currentSnapshot.source &&
      this.usageCache.pricing.catalogVersion === currentSnapshot.catalogVersion
    ) {
      return this.usageCache;
    }
    const parsed = this.parseLogFiles(currentSnapshot);
    this.usageCache = { at: now, ...parsed };
    return this.usageCache;
  }

  private getCachedPricingSnapshot(): PricingSnapshot {
    return this.getCachedUsageBatch().pricing;
  }

  private resolveLatestUsageAt(usages: TokenUsage[]): string | undefined {
    let latestTs = 0;

    for (const usage of usages) {
      const ts = usage.timestamp.getTime();
      if (!Number.isNaN(ts) && ts > latestTs) {
        latestTs = ts;
      }
    }

    return latestTs > 0 ? new Date(latestTs).toISOString() : undefined;
  }

  private buildUsageFreshness(batch: UsageCacheEntry): UsageFreshness {
    return {
      latestUsageAt: this.resolveLatestUsageAt(batch.data),
      dataCutoffAt: new Date(this.getReferenceNow(batch.data, batch.isDemo)).toISOString(),
      pricingStale: batch.pricing.stale,
    };
  }

  private decodeTaskLabel(taskId: string): string {
    try {
      return decodeURIComponent(taskId);
    } catch {
      return taskId;
    }
  }

  private resolveTaskName(taskId: string, sessionId: string, replays: SessionReplay[]): string {
    const replay = replays.find(item => item.meta.id === sessionId || item.meta.id === taskId);
    if (replay) {
      const meta = replay.meta;
      const label = meta.sessionLabel?.trim() || meta.agentName?.trim();
      if (label) return label;
    }

    const decoded = this.decodeTaskLabel(taskId);
    const pathLikeParts = decoded.split('/').filter(Boolean);
    return pathLikeParts[pathLikeParts.length - 1] || decoded;
  }

  private parseDirectory(
    dir: string,
    ext: string,
    usages: TokenUsage[],
    pricing: PricingSnapshot,
  ): number {
    let files: string[];
    try {
      files = fs.readdirSync(dir).filter(f => f.endsWith(ext));
    } catch {
      return 0;
    }

    let added = 0;
    for (const file of files) {
      const filePath = path.join(dir, file);
      let content: string;
      try {
        content = readUsageLogContent(filePath);
      } catch {
        continue;
      }
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
      }
      for (const line of content.split(/\r?\n/)) {
        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          const usage = parsed.usage as Record<string, unknown> | undefined;
          if (!usage) continue;
          const model = (parsed.model as string) || 'unknown';
          const inputTokens = Number(
            usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokens ?? usage.promptTokens ?? 0,
          );
          const outputTokens = Number(
            usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokens ?? usage.completionTokens ?? 0,
          );
          if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens)) continue;
          const cost = repriceStep(model, inputTokens, outputTokens, pricing);

          const rawTs = parsed.timestamp ?? parsed.created_at ?? parsed.createdAt;
          let ts = new Date();
          if (typeof rawTs === 'number' && Number.isFinite(rawTs)) {
            ts = new Date(rawTs > 1e12 ? rawTs : rawTs * 1000);
          } else if (typeof rawTs === 'string' && rawTs.length > 0) {
            ts = new Date(rawTs);
          }
          if (Number.isNaN(ts.getTime())) ts = new Date();

          const sid = (parsed.session_id as string) || '';
          const dedupeKey = `${sid}|${model}|${ts.getTime()}`;
          if (this.logDedupeKeys.has(dedupeKey)) continue;

          usages.push({
            timestamp: ts,
            taskId: (parsed.task_id as string) || sid || file,
            model,
            inputTokens,
            outputTokens,
            cost,
            sessionId: (parsed.session_id as string) || 'unknown',
            usageSource: 'log',
          });
          added += 1;
        } catch {
          // 跳过无效行
        }
      }
    }

    return added;
  }

  private getFilteredUsages(batch: UsageCacheEntry, days: number): TokenUsage[] {
    const cutoff = this.getReferenceNow(batch.data, batch.isDemo) - days * 24 * 60 * 60 * 1000;
    return batch.data.filter(usage => !Number.isNaN(usage.timestamp.getTime()) && usage.timestamp.getTime() > cutoff);
  }

  private getRepricedTotalCost(usages: TokenUsage[], pricing: PricingSnapshot): number {
    return usages.reduce(
      (sum, usage) => sum + repriceStep(usage.model, usage.inputTokens, usage.outputTokens, pricing),
      0,
    );
  }

  private createUsageSourceBreakdown(): UsageSourceBreakdown {
    return {
      replay: 0,
      log: 0,
      demo: 0,
      mixed: 0,
    };
  }

  private normalizeUsageSource(source: UsageSource | undefined, fallback: UsageSource): UsageSource {
    switch (source) {
      case 'replay':
      case 'log':
      case 'demo':
      case 'mixed':
        return source;
      default:
        return fallback;
    }
  }

  private resolveSessionUsageSource(sources: Set<UsageSource>, fallback: UsageSource): UsageSource {
    if (sources.size === 0) return fallback;
    if (sources.size === 1) {
      return sources.values().next().value ?? fallback;
    }
    return 'mixed';
  }

  private isReconciliationEstimated(
    usageSource: UsageSource,
    currentPricing: PricingSnapshot,
    baselinePricing: PricingSnapshot,
  ): boolean {
    return (
      usageSource !== 'replay' ||
      currentPricing.source === 'static-default' ||
      currentPricing.stale ||
      baselinePricing.source === 'static-default' ||
      baselinePricing.stale
    );
  }

  private buildReplayMetaLookup(replays: SessionReplay[]): Map<string, SessionReplay['meta']> {
    const lookup = new Map<string, SessionReplay['meta']>();
    for (const replay of replays) {
      lookup.set(replay.meta.id, replay.meta);
      lookup.set(this.decodeTaskLabel(replay.meta.id), replay.meta);
    }
    return lookup;
  }

  private resolvePrimaryModelName(modelCosts: Map<string, number>, preferredModel?: string | null): string | null {
    if (preferredModel && preferredModel.trim()) return preferredModel.trim();
    const topModel = Array.from(modelCosts.entries()).sort((a, b) => b[1] - a[1])[0];
    return topModel?.[0] ?? null;
  }

  getUsageFreshness(): UsageFreshness {
    return this.buildUsageFreshness(this.getCachedUsageBatch());
  }

  private getFilteredReplays(batch: UsageCacheEntry, days: number): SessionReplay[] {
    const cutoff = this.getReferenceNow(batch.data, batch.isDemo) - days * 24 * 60 * 60 * 1000;
    return batch.replays.filter(
      replay => !Number.isNaN(replay.meta.endTime.getTime()) && replay.meta.endTime.getTime() > cutoff,
    );
  }

  getCostAttribution(days: number = 30): CostAttributionReport {
    const batch = this.getCachedUsageBatch();
    const filteredReplays = this.getFilteredReplays(batch, days);
    const attribution: CostAttribution = {
      byTask: {},
      byTool: {},
      byModel: {},
      summary: {
        totalCost: 0,
        costPerStep: 0,
        mostExpensiveTool: null,
        mostExpensiveModel: null,
        wastedCost: 0,
      },
    };
    let totalStepCount = 0;

    for (const replay of filteredReplays) {
      const replayAttribution = attributeCosts(replay.steps);
      totalStepCount += replay.steps.length;
      attribution.summary.totalCost += replayAttribution.summary.totalCost;
      attribution.summary.wastedCost += replayAttribution.summary.wastedCost;

      for (const [taskKey, stats] of Object.entries(replayAttribution.byTask)) {
        attribution.byTask[`${replay.meta.id}::${taskKey}`] = { ...stats };
      }

      for (const [tool, stats] of Object.entries(replayAttribution.byTool)) {
        const existing = attribution.byTool[tool] ?? { directCost: 0, fullyLoadedCost: 0, callCount: 0, failCount: 0 };
        existing.directCost += stats.directCost;
        existing.fullyLoadedCost += stats.fullyLoadedCost;
        existing.callCount += stats.callCount;
        existing.failCount += stats.failCount;
        attribution.byTool[tool] = existing;
      }

      for (const [model, stats] of Object.entries(replayAttribution.byModel)) {
        const existing = attribution.byModel[model] ?? { cost: 0, inputTokens: 0, outputTokens: 0, callCount: 0 };
        existing.cost += stats.cost;
        existing.inputTokens += stats.inputTokens;
        existing.outputTokens += stats.outputTokens;
        existing.callCount += stats.callCount;
        attribution.byModel[model] = existing;
      }
    }

    for (const stats of Object.values(attribution.byTool)) {
      stats.directCost = roundSuggestionMoney(stats.directCost);
      stats.fullyLoadedCost = roundSuggestionMoney(stats.fullyLoadedCost);
    }

    for (const stats of Object.values(attribution.byModel)) {
      stats.cost = roundSuggestionMoney(stats.cost);
    }

    const totalCost = roundSuggestionMoney(attribution.summary.totalCost);
    const wastedCost = roundSuggestionMoney(attribution.summary.wastedCost);
    attribution.summary.totalCost = totalCost;
    attribution.summary.wastedCost = wastedCost;
    attribution.summary.costPerStep = roundSuggestionMoney(totalStepCount > 0 ? attribution.summary.totalCost / totalStepCount : 0);
    attribution.summary.mostExpensiveTool =
      Array.from(Object.entries(attribution.byTool)).sort((a, b) => b[1].fullyLoadedCost - a[1].fullyLoadedCost)[0]?.[0] ?? null;
    attribution.summary.mostExpensiveModel =
      Array.from(Object.entries(attribution.byModel)).sort((a, b) => b[1].cost - a[1].cost)[0]?.[0] ?? null;

    const freshness = this.buildUsageFreshness(batch);
    return {
      attribution,
      costMeta: buildCostMeta(batch.pricing, batch.usageSource),
      latestUsageAt: freshness.latestUsageAt,
      dataCutoffAt: freshness.dataCutoffAt,
      usingDemo: batch.isDemo,
    };
  }

  async getReferenceComparison(days: number = 30): Promise<ReferenceCompareResult> {
    const batch = this.getCachedUsageBatch();
    const filtered = this.getFilteredUsages(batch, days);
    const snapshots = await Promise.all(PRICING_REFERENCES.map(reference => getPricingSnapshotAsync(reference)));
    const baseRows = snapshots.map(snapshot => ({
      reference: snapshot.reference,
      label: getPricingReferenceLabel(snapshot.reference),
      totalCost: this.getRepricedTotalCost(filtered, snapshot),
      pricingSource: snapshot.source,
      pricingCatalogVersion: snapshot.catalogVersion,
    }));
    const currentReference = batch.pricing.reference;
    const currentRow = baseRows.find(row => row.reference === currentReference) ?? baseRows[0];
    const currentTotalCost = currentRow?.totalCost ?? 0;

    return {
      currentReference,
      currentTotalCost,
      rows: baseRows.map(row => ({
        ...row,
        deltaVsCurrent: row.totalCost - currentTotalCost,
      })),
    };
  }

  async getReconciliation(
    days: number = 30,
    baselineReference: PricingReference = 'official-static',
  ): Promise<CostReconciliationResult> {
    const batch = this.getCachedUsageBatch();
    const currentPricing = batch.pricing;
    const baselinePricing = await getPricingSnapshotAsync(baselineReference);
    const filtered = this.getFilteredUsages(batch, days);
    const replayLookup = this.buildReplayMetaLookup(batch.replays);
    const sessionMap = new Map<string, ReconciliationSessionSummary>();

    for (const usage of filtered) {
      try {
        const rawSessionId = typeof usage.sessionId === 'string' ? usage.sessionId.trim() : '';
        const rawTaskId = typeof usage.taskId === 'string' ? usage.taskId.trim() : '';
        const replayMeta =
          (rawSessionId ? replayLookup.get(rawSessionId) : undefined) ??
          (rawTaskId ? replayLookup.get(rawTaskId) : undefined);
        const sessionId = replayMeta?.id || rawSessionId || rawTaskId || `unknown-${sessionMap.size + 1}`;
        const inputTokens = Number.isFinite(usage.inputTokens) ? Math.max(0, usage.inputTokens) : 0;
        const outputTokens = Number.isFinite(usage.outputTokens) ? Math.max(0, usage.outputTokens) : 0;
        const usageSource = this.normalizeUsageSource(usage.usageSource, batch.usageSource);
        const model = typeof usage.model === 'string' ? usage.model.trim() : '';
        const sessionLabel =
          replayMeta?.sessionLabel?.trim() ||
          replayMeta?.summary?.trim() ||
          replayMeta?.agentName?.trim() ||
          this.resolveTaskName(rawTaskId || sessionId, sessionId, batch.replays) ||
          sessionId;
        const provider = replayMeta?.storeProvider?.trim() || null;
        const preferredModel = replayMeta?.storeModel?.trim() || null;
        const currentCost = repriceStep(model || undefined, inputTokens, outputTokens, currentPricing);
        const baselineCost = repriceStep(model || undefined, inputTokens, outputTokens, baselinePricing);

        const existing = sessionMap.get(sessionId);
        if (existing) {
          existing.inputTokens += inputTokens;
          existing.outputTokens += outputTokens;
          existing.currentCost += currentCost;
          existing.baselineCost += baselineCost;
          existing.usageSources.add(usageSource);
          if (model) {
            existing.modelCosts.set(model, (existing.modelCosts.get(model) ?? 0) + currentCost);
          }
          if (!existing.provider && provider) {
            existing.provider = provider;
          }
          if (!existing.preferredModel && preferredModel) {
            existing.preferredModel = preferredModel;
          }
          if (!existing.replayAvailable && Boolean(replayMeta)) {
            existing.replayAvailable = true;
          }
          if ((!existing.sessionLabel || existing.sessionLabel === existing.sessionId) && sessionLabel) {
            existing.sessionLabel = sessionLabel;
          }
          continue;
        }

        const modelCosts = new Map<string, number>();
        if (model) {
          modelCosts.set(model, currentCost);
        }

        sessionMap.set(sessionId, {
          sessionId,
          sessionLabel,
          provider,
          replayAvailable: Boolean(replayMeta),
          inputTokens,
          outputTokens,
          currentCost,
          baselineCost,
          usageSources: new Set([usageSource]),
          modelCosts,
          preferredModel,
        });
      } catch {
        // 坏数据按会话粒度跳过，不影响整体接口。
      }
    }

    const usageSourceBreakdown = this.createUsageSourceBreakdown();
    const rows: CostReconciliationRow[] = Array.from(sessionMap.values())
      .map(session => {
        const usageSource = this.resolveSessionUsageSource(session.usageSources, batch.usageSource);
        usageSourceBreakdown[usageSource] += 1;
        const estimated = this.isReconciliationEstimated(usageSource, currentPricing, baselinePricing);
        const primaryModel = this.resolvePrimaryModelName(session.modelCosts, session.preferredModel);
        return {
          sessionId: session.sessionId,
          sessionLabel: session.sessionLabel || session.sessionId,
          provider: session.provider,
          primaryModel,
          usageSource,
          estimated,
          replayAvailable: session.replayAvailable,
          inputTokens: session.inputTokens,
          outputTokens: session.outputTokens,
          currentCost: session.currentCost,
          baselineCost: session.baselineCost,
          delta: session.currentCost - session.baselineCost,
        };
      })
      .sort((a, b) => b.currentCost - a.currentCost || Math.abs(b.delta) - Math.abs(a.delta));

    const summary: CostReconciliationSummary = {
      sessions: rows.length,
      currentCost: rows.reduce((sum, row) => sum + row.currentCost, 0),
      baselineCost: rows.reduce((sum, row) => sum + row.baselineCost, 0),
      delta: 0,
      estimatedRows: rows.filter(row => row.estimated).length,
      usageSourceBreakdown,
    };
    summary.delta = summary.currentCost - summary.baselineCost;

    const freshness = this.buildUsageFreshness(batch);
    const meta: CostReconciliationMeta = {
      currentReference: currentPricing.reference,
      baselineReference: baselinePricing.reference,
      pricingSource: currentPricing.source,
      pricingCatalogVersion: currentPricing.catalogVersion,
      pricingUpdatedAt: currentPricing.updatedAt,
      stale: currentPricing.stale,
      baselinePricingSource: baselinePricing.source,
      baselinePricingCatalogVersion: baselinePricing.catalogVersion,
      baselinePricingUpdatedAt: baselinePricing.updatedAt,
      baselineStale: baselinePricing.stale,
      latestUsageAt: freshness.latestUsageAt,
      dataCutoffAt: freshness.dataCutoffAt,
    };

    return {
      meta,
      summary,
      rows,
    };
  }

  getUsageStats(days: number = 30): CostStats {
    const batch = this.getCachedUsageBatch();
    const usages = batch.data;
    const now = this.getReferenceNow(usages, batch.isDemo);
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const filtered = this.getFilteredUsages(batch, days);

    const totalCost = filtered.reduce((s, u) => s + u.cost, 0);
    const totalTokens = filtered.reduce((s, u) => s + u.inputTokens + u.outputTokens, 0);
    const inputTokens = filtered.reduce((s, u) => s + u.inputTokens, 0);
    const outputTokens = filtered.reduce((s, u) => s + u.outputTokens, 0);

    const taskMap = new Map<string, TaskCost>();
    for (const u of filtered) {
      const existing = taskMap.get(u.taskId);
      if (existing) {
        existing.tokens += u.inputTokens + u.outputTokens;
        existing.cost += u.cost;
      } else {
        taskMap.set(u.taskId, {
          taskId: u.taskId,
          taskName: this.resolveTaskName(u.taskId, u.sessionId, batch.replays),
          tokens: u.inputTokens + u.outputTokens,
          cost: u.cost,
          timestamp: u.timestamp,
        });
      }
    }
    const topTasks = Array.from(taskMap.values()).sort((a, b) => b.cost - a.cost).slice(0, 10);

    const prevCutoff = now - 2 * days * 24 * 60 * 60 * 1000;
    const prevFiltered = usages.filter(
      u =>
        !Number.isNaN(u.timestamp.getTime()) &&
        u.timestamp.getTime() > prevCutoff &&
        u.timestamp.getTime() <= cutoff,
    );
    const prevCost = prevFiltered.reduce((s, u) => s + u.cost, 0);
    const trend: 'up' | 'down' | 'stable' =
      totalCost > prevCost * 1.1 ? 'up' : totalCost < prevCost * 0.9 ? 'down' : 'stable';

    return {
      totalCost,
      totalTokens,
      inputTokens,
      outputTokens,
      averageCostPerTask: taskMap.size > 0 ? totalCost / taskMap.size : 0,
      topTasks,
      trend,
      comparedToLastMonth: prevCost > 0 ? ((totalCost - prevCost) / prevCost) * 100 : 0,
      costMeta: buildCostMeta(batch.pricing, batch.usageSource),
      pricingReference: batch.pricing.reference,
      pricingSource: batch.pricing.source,
      pricingUpdatedAt: batch.pricing.updatedAt,
      pricingCatalogVersion: batch.pricing.catalogVersion,
      usingDemo: batch.isDemo,
    };
  }

  getDailyUsage(days: number = 7): DailyUsage[] {
    const batch = this.getCachedUsageBatch();
    const usages = batch.data;
    const dailyMap = new Map<string, DailyUsage>();
    const now = this.getReferenceNow(usages, batch.isDemo);

    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, { date: dateStr, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 });
    }

    for (const u of usages) {
      if (Number.isNaN(u.timestamp.getTime())) continue;
      const dateStr = u.timestamp.toISOString().split('T')[0];
      const daily = dailyMap.get(dateStr);
      if (daily) {
        daily.inputTokens += u.inputTokens;
        daily.outputTokens += u.outputTokens;
        daily.totalTokens += u.inputTokens + u.outputTokens;
        daily.cost += u.cost;
      }
    }

    return Array.from(dailyMap.values()).reverse();
  }

  getModelBreakdown(days: number = 30): Record<string, ModelBreakdownEntry> {
    const batch = this.getCachedUsageBatch();
    const filtered = this.getFilteredUsages(batch, days);

    const models: Record<string, ModelBreakdownEntry> = {};
    if (batch.isDemo) {
      for (const replay of batch.replays) {
        for (const step of replay.steps) {
          if (step.model && !models[step.model]) {
            models[step.model] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, tokens: 0, cost: 0 };
          }
        }
      }
    }

    for (const u of filtered) {
      if (!models[u.model]) {
        models[u.model] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, tokens: 0, cost: 0 };
      }
      models[u.model].inputTokens += u.inputTokens;
      models[u.model].outputTokens += u.outputTokens;
      models[u.model].totalTokens += u.inputTokens + u.outputTokens;
      models[u.model].tokens = models[u.model].totalTokens;
      models[u.model].cost += u.cost;
    }
    return models;
  }

  getFrameworkBreakdown(days: number = 30): FrameworkBreakdownEntry[] {
    const batch = this.getCachedUsageBatch();
    const filtered = this.getFilteredUsages(batch, days);
    const cutoff = this.getReferenceNow(batch.data, batch.isDemo) - days * 24 * 60 * 60 * 1000;
    const metaLookup = this.buildReplayMetaLookup(batch.replays);
    const frameworks = new Map<string, FrameworkBreakdownEntry & { sessionIds: Set<string> }>();

    const ensureEntry = (source: string): FrameworkBreakdownEntry & { sessionIds: Set<string> } => {
      const existing = frameworks.get(source);
      if (existing) return existing;
      const created = {
        source,
        totalCost: 0,
        totalTokens: 0,
        sessionCount: 0,
        sessionIds: new Set<string>(),
      };
      frameworks.set(source, created);
      return created;
    };

    for (const replay of batch.replays) {
      const startedAt = replay.meta.startTime.getTime();
      if (Number.isNaN(startedAt) || startedAt <= cutoff) continue;
      const source = getFrameworkBucket(replay.meta.dataSource);
      ensureEntry(source).sessionIds.add(replay.meta.id);
    }

    for (const usage of filtered) {
      const meta =
        metaLookup.get(usage.sessionId) ??
        metaLookup.get(this.decodeTaskLabel(usage.sessionId)) ??
        metaLookup.get(usage.taskId) ??
        metaLookup.get(this.decodeTaskLabel(usage.taskId));
      const source = getFrameworkBucket(meta?.dataSource);
      const entry = ensureEntry(source);
      entry.totalCost += usage.cost;
      entry.totalTokens += usage.inputTokens + usage.outputTokens;
      entry.sessionIds.add(meta?.id ?? usage.sessionId ?? usage.taskId);
    }

    return Array.from(frameworks.values())
      .map(({ sessionIds, ...entry }) => ({
        ...entry,
        sessionCount: sessionIds.size,
      }))
      .filter(entry => entry.sessionCount > 0)
      .sort((left, right) => {
        if (right.totalCost !== left.totalCost) return right.totalCost - left.totalCost;
        if (right.totalTokens !== left.totalTokens) return right.totalTokens - left.totalTokens;
        return right.sessionCount - left.sessionCount;
      });
  }

  getRequestCount(days: number = 30): number {
    return this.getFilteredUsages(this.getCachedUsageBatch(), days).length;
  }

  checkBudgetAlert(): { isAlert: boolean; percentage: number; message: string } {
    if (this.config.monthly <= 0) {
      return { isAlert: false, percentage: 0, message: '未设置月预算' };
    }
    const stats = this.getUsageStats(30);
    const percentage = (stats.totalCost / this.config.monthly) * 100;
    return {
      isAlert: percentage >= this.config.alertThreshold,
      percentage,
      message:
        percentage >= 100
          ? `预算已超支！当前消费 $${stats.totalCost.toFixed(2)}，超出 $${(stats.totalCost - this.config.monthly).toFixed(2)}`
          : percentage >= this.config.alertThreshold
            ? `预算使用已达 ${percentage.toFixed(1)}%，剩余 $${(this.config.monthly - stats.totalCost).toFixed(2)}`
            : `预算状态良好，当前使用 ${percentage.toFixed(1)}%`,
    };
  }

  getInsights(days: number = 30): CostInsight[] {
    const insights: CostInsight[] = [];
    const pricing = this.getCachedPricingSnapshot();
    const stats = this.getUsageStats(days);
    const {
      totalCost,
      totalTokens,
      inputTokens,
      outputTokens,
      topTasks,
      trend,
      comparedToLastMonth,
    } = stats;

    if (totalCost === 0) {
      insights.push({
        type: 'info',
        icon: 'ℹ️',
        messageZh: `近 ${days} 天没有产生费用`,
        messageEn: `No costs in the last ${days} days`,
      });
      return insights;
    }

    const modelBreakdown = this.getModelBreakdown(days);
    const sortedModels = Object.entries(modelBreakdown).sort((a, b) => b[1].cost - a[1].cost);
    if (sortedModels.length > 0) {
      const [topModelName, topModelStats] = sortedModels[0];
      const topSharePct = (topModelStats.cost / totalCost) * 100;
      if (topSharePct >= 60) {
        insights.push({
          type: 'warning',
          icon: '🔥',
          messageZh: `${topSharePct.toFixed(0)}% 的费用集中在 ${topModelName}，考虑在简单任务上使用更经济的模型`,
          messageEn: `${topSharePct.toFixed(0)}% of costs are concentrated on ${topModelName}; consider using more economical models for simple tasks`,
        });
      } else {
        insights.push({
          type: 'info',
          icon: '📊',
          messageZh: `费用最高的模型是 ${topModelName}，占总费用 ${topSharePct.toFixed(0)}%`,
          messageEn: `The highest-cost model is ${topModelName}, accounting for ${topSharePct.toFixed(0)}% of total cost`,
        });
      }
    }

    const modelKeys = Object.keys(modelBreakdown);
    if (modelKeys.length === 1) {
      insights.push({
        type: 'tip',
        icon: '💡',
        messageZh: '你只用了一种模型，混合搭配经济型和旗舰型可以更省钱',
        messageEn: 'You only use one model; mixing economical and flagship models can save more',
      });
    }

    if (totalTokens > 0) {
      let cheapTokens = 0;
      for (const name of modelKeys) {
        const lower = name.toLowerCase();
        if (CostParser.CHEAP_MODELS.some(sub => lower.includes(sub.toLowerCase()))) {
          cheapTokens += modelBreakdown[name].tokens;
        }
      }
      const cheapRatioPct = (cheapTokens / totalTokens) * 100;
      if (cheapRatioPct > 50) {
        insights.push({
          type: 'info',
          icon: '✅',
          messageZh: `${cheapRatioPct.toFixed(0)}% 的请求使用了经济型模型，成本控制良好`,
          messageEn: `${cheapRatioPct.toFixed(0)}% of token usage goes to economical models; cost control looks good`,
        });
      } else if (cheapRatioPct < 10) {
        insights.push({
          type: 'tip',
          icon: '💰',
          messageZh: '几乎没有使用经济型模型，简单任务可以考虑 deepseek-chat / qwen-turbo 等',
          messageEn: 'Economical models are barely used; for simple tasks consider deepseek-chat, qwen-turbo, etc.',
        });
      }
    }

    const changePct = Math.abs(comparedToLastMonth);
    if (trend === 'up' && comparedToLastMonth > 20) {
      insights.push({
        type: 'warning',
        icon: '📈',
        messageZh: `费用环比上涨 ${changePct.toFixed(0)}%，注意控制用量`,
        messageEn: `Cost is up ${changePct.toFixed(0)}% vs the previous period; watch your usage`,
      });
    } else if (trend === 'down') {
      insights.push({
        type: 'info',
        icon: '📉',
        messageZh: `费用环比下降 ${changePct.toFixed(0)}%，节约有效`,
        messageEn: `Cost is down ${changePct.toFixed(0)}% vs the previous period; savings are effective`,
      });
    }

    const highThreshold = 0.1;
    const highTasks = topTasks.filter(t => t.cost > highThreshold);
    if (highTasks.length > 0) {
      const highSum = highTasks.reduce((s, t) => s + t.cost, 0);
      const highSharePct = (highSum / totalCost) * 100;
      insights.push({
        type: 'info',
        icon: '🔍',
        messageZh: `${highTasks.length} 个任务单次花费超过 $0.10，占总费用 ${highSharePct.toFixed(0)}%`,
        messageEn: `${highTasks.length} task(s) exceeded $0.10 per run, accounting for ${highSharePct.toFixed(0)}% of total cost`,
      });
    }

    if (inputTokens > 0 && outputTokens / inputTokens > 3) {
      const ratio = outputTokens / inputTokens;
      insights.push({
        type: 'tip',
        icon: '📝',
        messageZh: `输出 Token 是输入的 ${ratio.toFixed(1)} 倍，如果输出过于冗长可以在 prompt 里加约束`,
        messageEn: `Output tokens are ${ratio.toFixed(1)}× input tokens; if output is too verbose, add constraints in the prompt`,
      });
    }

    const unknownModels = modelKeys.filter(
      m => this.priceForModel(m, pricing.pricing) >= 2.0 && !this.hasKnownPriceForModel(m, pricing.pricing),
    );
    if (unknownModels.length > 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        messageZh: `${unknownModels.length} 个模型未在定价表中（${unknownModels.slice(0, 3).join(', ')}${unknownModels.length > 3 ? '…' : ''}），费用按 $2/M token 估算`,
        messageEn: `${unknownModels.length} model(s) not in pricing table (${unknownModels.slice(0, 3).join(', ')}${unknownModels.length > 3 ? '…' : ''}); cost estimated at $2/M tokens`,
      });
    }

    return insights;
  }

  getSavingSuggestions(days: number = 30): SavingsReport {
    const batch = this.getCachedUsageBatch();
    const pricing = batch.pricing;
    const stats = this.getUsageStats(days);
    const models = this.getModelBreakdown(days);
    const wasteReport = tokenWasteAnalyzer.getReport(days);
    const cutoff = this.getReferenceNow(batch.data, batch.isDemo) - days * 24 * 60 * 60 * 1000;
    const filteredUsages = batch.data.filter(
      usage => !Number.isNaN(usage.timestamp.getTime()) && usage.timestamp.getTime() > cutoff,
    );

    const topTaskById = new Map(stats.topTasks.map(task => [task.taskId, task]));
    const sessionSummaries = new Map<string, SessionUsageSummary>();
    const modelSessionSummaries = new Map<string, SessionModelUsageSummary>();

    for (const usage of filteredUsages) {
      const sessionId = usage.sessionId || usage.taskId || 'unknown';
      const sessionLabel =
        topTaskById.get(usage.taskId)?.taskName ??
        topTaskById.get(sessionId)?.taskName ??
        this.resolveTaskName(usage.taskId, sessionId, batch.replays);
      const totalTokens = usage.inputTokens + usage.outputTokens;

      const sessionSummary = sessionSummaries.get(sessionId);
      if (sessionSummary) {
        sessionSummary.cost += usage.cost;
        sessionSummary.inputTokens += usage.inputTokens;
        sessionSummary.outputTokens += usage.outputTokens;
        sessionSummary.totalTokens += totalTokens;
        sessionSummary.modelCosts.set(usage.model, (sessionSummary.modelCosts.get(usage.model) ?? 0) + usage.cost);
      } else {
        sessionSummaries.set(sessionId, {
          sessionId,
          sessionLabel,
          cost: usage.cost,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens,
          modelCosts: new Map([[usage.model, usage.cost]]),
        });
      }

      const modelSessionKey = `${usage.model}::${sessionId}`;
      const modelSessionSummary = modelSessionSummaries.get(modelSessionKey);
      if (modelSessionSummary) {
        modelSessionSummary.cost += usage.cost;
        modelSessionSummary.inputTokens += usage.inputTokens;
        modelSessionSummary.outputTokens += usage.outputTokens;
        modelSessionSummary.totalTokens += totalTokens;
      } else {
        modelSessionSummaries.set(modelSessionKey, {
          sessionId,
          sessionLabel,
          model: usage.model,
          cost: usage.cost,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens,
        });
      }
    }

    const resolvePrimaryModel = (summary?: SessionUsageSummary): string => {
      if (!summary) return '';
      const topModel = Array.from(summary.modelCosts.entries()).sort((a, b) => b[1] - a[1])[0];
      return topModel?.[0] ?? '';
    };

    const modelSessionRankings = new Map<string, SessionModelUsageSummary[]>();
    for (const summary of modelSessionSummaries.values()) {
      const list = modelSessionRankings.get(summary.model);
      if (list) {
        list.push(summary);
      } else {
        modelSessionRankings.set(summary.model, [summary]);
      }
    }
    for (const list of modelSessionRankings.values()) {
      list.sort((a, b) => b.cost - a.cost);
    }

    const suggestionFloor = batch.isDemo ? 0.001 : 0.01;

    const buildWasteSuggestion = (
      diagnostic: TokenWasteDiagnostic,
      reasonType: Exclude<SavingReasonType, 'switch-model'>,
    ): EnhancedSavingSuggestion | null => {
      const sessionSummary = diagnostic.sessionId ? sessionSummaries.get(diagnostic.sessionId) : undefined;
      const sessionLabel = diagnostic.sessionLabel || sessionSummary?.sessionLabel;
      const currentModel = resolvePrimaryModel(sessionSummary);
      const currentCost = roundSuggestionMoney(sessionSummary?.cost ?? diagnostic.estimatedWasteCost);
      const saving = roundSuggestionMoney(Math.min(diagnostic.estimatedWasteCost, currentCost));
      if (saving < suggestionFloor) return null;

      const subjectZh = sessionLabel ? `「${sessionLabel}」` : '这类任务';
      const subjectEn = sessionLabel ? `"${sessionLabel}"` : 'this task type';

      let reasonZh = '';
      let reasonEn = '';
      let actionZh = '';
      let actionEn = '';

      if (reasonType === 'reduce-retries') {
        reasonZh = `${subjectZh} 的浪费主要来自失败后连续重试，先修重试链路会比换模型更快见效。`;
        reasonEn = `Most waste in ${subjectEn} comes from repeated retries after a failure, so fixing the retry loop should pay off before changing models.`;
        actionZh = '先给工具失败加退出条件、错误分类和 fallback，把连续重试压到 1 次内，再决定是否要换模型。';
        actionEn = 'Add exit conditions, error classification, and fallback paths so failed tool calls stop looping before you revisit model choice.';
      } else if (reasonType === 'trim-prompt' && diagnostic.type === 'context-bloat') {
        reasonZh = `${subjectZh} 的成本更多浪费在越滚越大的历史上下文里，先瘦身上下文通常比换模型更稳。`;
        reasonEn = `${subjectEn} is wasting spend on ever-growing context history, so trimming context is usually safer than swapping models first.`;
        actionZh = '优先截断历史、做阶段性总结，或把长链路拆成多个短回合，避免把整段上下文反复带进后续步骤。';
        actionEn = 'Trim historical context, add checkpoint summaries, or split the workflow into shorter rounds so the whole transcript does not keep getting replayed.';
      } else if (reasonType === 'trim-prompt') {
        reasonZh = `${subjectZh} 投入了很长的上下文，但有效产出偏低，先减输入通常比换模型更值得。`;
        reasonEn = `${subjectEn} spends a lot of context for weak payoff, so trimming the prompt is usually more valuable than changing models first.`;
        actionZh = '先删重复背景，把长上下文拆成分步输入；如果内容必须保留，优先改成检索后再注入。';
        actionEn = 'Remove repeated background, split long context into stages, and prefer retrieval-based injection when the context must stay available.';
      } else {
        reasonZh = `${subjectZh} 的回答明显偏长，钱主要花在输出 token 上，先控长度更直接。`;
        reasonEn = `${subjectEn} is spending too much on long answers, so tightening output length is the most direct fix.`;
        actionZh = '先加字数 / 条目上限，或改成“先摘要再展开”，优先压缩最终输出。';
        actionEn = 'Set stricter length limits or switch to a summary-first pattern so the final output gets shorter.';
      }

      const priority: SavingPriority =
        reasonType === 'reduce-retries' || saving >= Math.max(0.03, stats.totalCost * 0.05) ? 'high' : 'medium';

      return {
        currentModel,
        alternativeModel: currentModel,
        currentCost,
        alternativeCost: roundSuggestionMoney(Math.max(currentCost - saving, 0)),
        saving,
        tokens: diagnostic.estimatedWasteTokens,
        reasonType,
        reasonZh,
        reasonEn,
        actionZh,
        actionEn,
        qualityGuardrailZh: LOW_RISK_GUARDRAIL_ZH,
        qualityGuardrailEn: LOW_RISK_GUARDRAIL_EN,
        priority,
        sessionId: diagnostic.sessionId,
        sessionLabel,
      };
    };

    const wasteReasonMap: Partial<Record<TokenWasteDiagnostic['type'], Exclude<SavingReasonType, 'switch-model'>>> = {
      'retry-loop': 'reduce-retries',
      'long-prompt': 'trim-prompt',
      'context-bloat': 'trim-prompt',
      'verbose-output': 'trim-output',
    };
    const wasteSuggestions = new Map<Exclude<SavingReasonType, 'switch-model'>, EnhancedSavingSuggestion>();
    const blockedSessionIds = new Set<string>();

    for (const diagnostic of [...wasteReport.diagnostics].sort(
      (a, b) => b.estimatedWasteCost - a.estimatedWasteCost || b.estimatedWasteTokens - a.estimatedWasteTokens,
    )) {
      const reasonType = wasteReasonMap[diagnostic.type];
      if (!reasonType || wasteSuggestions.has(reasonType)) continue;

      const suggestion = buildWasteSuggestion(diagnostic, reasonType);
      if (!suggestion) continue;

      wasteSuggestions.set(reasonType, suggestion);
      if (suggestion.sessionId && suggestion.reasonType === 'reduce-retries') {
        blockedSessionIds.add(suggestion.sessionId);
      }
    }

    const highestWasteSaving = Math.max(0, ...Array.from(wasteSuggestions.values()).map(suggestion => suggestion.saving));
    const modelSuggestions: EnhancedSavingSuggestion[] = [];
    for (const [model, data] of Object.entries(models).sort((a, b) => b[1].cost - a[1].cost)) {
      if (data.totalTokens <= 0 || data.cost <= 0) continue;
      const alternative = suggestAlternativeDetailed(model, data, pricing);
      if (!alternative) continue;

      const scopedCandidates = modelSessionRankings.get(model) ?? [];
      const scopedUsage = scopedCandidates.find(
        candidate => candidate.sessionId && !blockedSessionIds.has(candidate.sessionId),
      );
      if (scopedCandidates.length > 0 && !scopedUsage) continue;

      const currentCost = roundSuggestionMoney(scopedUsage?.cost ?? data.cost);
      const alternativeCost = roundSuggestionMoney(
        scopedUsage
          ? repriceStep(alternative.name, scopedUsage.inputTokens, scopedUsage.outputTokens, pricing)
          : alternative.cost,
      );
      const saving = roundSuggestionMoney(Math.max(currentCost - alternativeCost, 0));
      if (saving < suggestionFloor) continue;

      const sharePct = stats.totalCost > 0 ? (data.cost / stats.totalCost) * 100 : 0;
      const sessionLabel = scopedUsage?.sessionLabel;
      const isHighValueTask =
        sharePct >= 25 || (scopedUsage?.cost ?? 0) >= Math.max(0.1, stats.averageCostPerTask * 1.5);
      const mediumModelSavingThreshold = Math.max(0.03, stats.totalCost * 0.04, stats.averageCostPerTask * 0.25);
      const highModelSavingThreshold = Math.max(0.12, stats.totalCost * 0.12, highestWasteSaving * 1.25);
      const priority: SavingPriority =
        saving >= highModelSavingThreshold
          ? 'high'
          : saving >= mediumModelSavingThreshold && !isHighValueTask
            ? 'medium'
            : 'low';
      const focusZh =
        sharePct >= 15 ? `${model} 占当前周期 ${sharePct.toFixed(0)}% 的成本` : `${model} 是当前周期的高成本模型`;
      const focusEn =
        sharePct >= 15
          ? `${model} accounts for ${sharePct.toFixed(0)}% of spend in this period`
          : `${model} is one of the higher-cost models in this period`;

      modelSuggestions.push({
        currentModel: model,
        alternativeModel: alternative.name,
        currentCost,
        alternativeCost,
        saving,
        tokens: scopedUsage?.totalTokens ?? data.totalTokens,
        reasonType: 'switch-model',
        reasonZh: sessionLabel
          ? `${focusZh}，其中「${sessionLabel}」最适合先灰度切换到 ${alternative.name}。`
          : `${focusZh}，在同等 token 量下切到 ${alternative.name} 会更省。`,
        reasonEn: sessionLabel
          ? `${focusEn}, and "${sessionLabel}" is a strong place to trial ${alternative.name} first.`
          : `${focusEn}; switching the same token load to ${alternative.name} should cost less.`,
        actionZh: sessionLabel
          ? `先把「${sessionLabel}」这类任务路由到 ${alternative.name}，质量稳定后再扩大范围。`
          : `先挑一类稳定、低风险任务试跑 ${alternative.name}，确认质量后再扩大路由比例。`,
        actionEn: sessionLabel
          ? `Route tasks like "${sessionLabel}" to ${alternative.name} first, then widen the rollout once quality stays stable.`
          : `Pilot ${alternative.name} on one stable, low-risk task type first, then expand routing after quality checks out.`,
        qualityGuardrailZh: isHighValueTask ? HIGH_VALUE_SWITCH_MODEL_GUARDRAIL_ZH : SWITCH_MODEL_GUARDRAIL_ZH,
        qualityGuardrailEn: isHighValueTask ? HIGH_VALUE_SWITCH_MODEL_GUARDRAIL_EN : SWITCH_MODEL_GUARDRAIL_EN,
        priority,
        sessionId: scopedUsage?.sessionId,
        sessionLabel,
      });
    }

    const reasonPriority: Record<SavingReasonType, number> = {
      'reduce-retries': 4,
      'trim-prompt': 3,
      'trim-output': 2,
      'switch-model': 1,
    };

    const suggestions = [...wasteSuggestions.values(), ...modelSuggestions]
      .sort(
        (a, b) =>
          getSavingPriorityRank(b.priority) - getSavingPriorityRank(a.priority) ||
          getSavingSafetyRank(b.reasonType) - getSavingSafetyRank(a.reasonType) ||
          reasonPriority[b.reasonType ?? 'switch-model'] - reasonPriority[a.reasonType ?? 'switch-model'] ||
          b.saving - a.saving,
      )
      .slice(0, 4);
    const totalPotentialSaving = roundSuggestionMoney(
      suggestions.reduce((sum, suggestion) => sum + suggestion.saving, 0),
    );

    return {
      totalPotentialSaving,
      suggestions,
    };
  }

  /**
   * 获取模型的更便宜替代方案
   */
  getCheaperAlternatives(model: string, taskType?: string): AlternativesResult {
    const pricing = this.getCachedPricingSnapshot();
    const currentDetail = resolveModelDetail(pricing.detailed, model);
    const alternatives = suggestCheaperAlternatives(model, taskType);

    return {
      currentModel: model,
      currentPrice: {
        input: currentDetail.input,
        output: currentDetail.output,
      },
      alternatives,
      freeTiers: FREE_TIERS,
    };
  }
}

export const costParser = new CostParser();
