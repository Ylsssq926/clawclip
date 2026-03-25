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
} from '../types/index.js';
import { getClawclipStateDir, getLobsterDataRoots } from './agent-data-root.js';
import { sessionParser } from './session-parser.js';
import { getModelPricing } from './pricing-fetcher.js';

const ALT_TIERS: { threshold: number; models: string[] }[] = [
  { threshold: 50, models: ['gpt-5.4-mini', 'claude-sonnet-4.6', 'gemini-2.5-pro'] },
  { threshold: 5, models: ['gpt-5-mini', 'deepseek-chat', 'gemini-2.5-flash'] },
  { threshold: 1, models: ['deepseek-chat', 'qwen-turbo', 'yi-lightning'] },
];

function suggestAlternative(
  pricePerMillion: number,
  pricing: Record<string, number>,
): { name: string; price: number } | null {
  for (const tier of ALT_TIERS) {
    if (pricePerMillion < tier.threshold) continue;
    const best = tier.models
      .map(m => ({ m, p: pricing[m] ?? Infinity }))
      .filter(x => x.p < pricePerMillion)
      .sort((a, b) => a.p - b.p)[0];
    if (best) return { name: best.m, price: best.p };
  }
  return null;
}

export class CostParser {
  private static readonly CHEAP_MODELS = [
    'deepseek-chat', 'deepseek-coder', 'qwen-turbo', 'qwen3.5-flash',
    'gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5.4-nano',
    'claude-3.5-haiku', 'claude-3-haiku', 'claude-haiku-4.5',
    'gemini-2.5-flash-lite', 'gemini-2.0-flash',
    'glm-4-flash', 'glm-4.5-flash', 'glm-4.7-flash',
    'minimax-01', 'yi-lightning', 'doubao-lite', 'hunyuan-lite',
  ];

  private config: BudgetConfig;
  private usageCache: { at: number; data: TokenUsage[] } | null = null;
  private logDedupeKeys = new Set<string>();
  private static readonly CACHE_MS = 3500;

  private get modelPricing(): Record<string, number> {
    return getModelPricing();
  }

  constructor() {
    this.ensureDirectories();
    this.config = this.loadConfig();
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
    const configPath = path.join(this.getCacheDir(), 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const loaded = { ...DEFAULT_BUDGET_CONFIG, ...JSON.parse(content) };
        if (typeof loaded.monthly !== 'number' || loaded.monthly <= 0) {
          loaded.monthly = DEFAULT_BUDGET_CONFIG.monthly;
        }
        if (
          typeof loaded.alertThreshold !== 'number' ||
          loaded.alertThreshold < 1 ||
          loaded.alertThreshold > 100
        ) {
          loaded.alertThreshold = DEFAULT_BUDGET_CONFIG.alertThreshold;
        }
        return loaded;
      } catch {
        // 配置文件损坏，使用默认值
      }
    }
    return DEFAULT_BUDGET_CONFIG;
  }

  saveConfig(config: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...config };
    const configPath = path.join(this.getCacheDir(), 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    this.usageCache = null;
  }

  getConfig(): BudgetConfig {
    return { ...this.config };
  }

  parseLogFiles(): TokenUsage[] {
    const usages: TokenUsage[] = [];
    const seen = new Set<string>();
    const replays = sessionParser.getRealReplays();
    for (const replay of replays) {
      for (const step of replay.steps) {
        if (step.inputTokens === 0 && step.outputTokens === 0) continue;
        const key = `${replay.meta.id}|${step.model || ''}|${step.timestamp.getTime()}`;
        seen.add(key);
        usages.push({
          timestamp: step.timestamp,
          taskId: replay.meta.id,
          model: step.model || 'unknown',
          inputTokens: step.inputTokens,
          outputTokens: step.outputTokens,
          cost: step.cost,
          sessionId: replay.meta.id,
        });
      }
    }

    this.logDedupeKeys = seen;
    const roots = getLobsterDataRoots();
    if (roots.length === 0) {
      const fallbackLogs = path.join(os.homedir(), '.openclaw', 'logs');
      if (fs.existsSync(fallbackLogs)) {
        this.parseDirectory(fallbackLogs, '.log', usages);
      }
    } else {
      for (const root of roots) {
        const logsDir = path.join(root.homeDir, 'logs');
        if (fs.existsSync(logsDir)) {
          this.parseDirectory(logsDir, '.log', usages);
        }
      }
    }

    return usages;
  }

  private getCachedUsages(): TokenUsage[] {
    const now = Date.now();
    if (this.usageCache && now - this.usageCache.at < CostParser.CACHE_MS) {
      return this.usageCache.data;
    }
    const data = this.parseLogFiles();
    this.usageCache = { at: now, data };
    return data;
  }

  private parseDirectory(dir: string, ext: string, usages: TokenUsage[]): void {
    let files: string[];
    try {
      files = fs.readdirSync(dir).filter(f => f.endsWith(ext));
    } catch {
      return;
    }
    for (const file of files) {
      const filePath = path.join(dir, file);
      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
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
          const price = this.modelPricing[model] || 2.0;
          const cost = (inputTokens + outputTokens) * price / 1_000_000;

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
          });
        } catch {
          // 跳过无效行
        }
      }
    }
  }

  getUsageStats(days: number = 30): CostStats {
    const usages = this.getCachedUsages();
    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const filtered = usages.filter(u => !Number.isNaN(u.timestamp.getTime()) && u.timestamp.getTime() > cutoff);

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
          taskName: u.taskId,
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
    };
  }

  getDailyUsage(days: number = 7): DailyUsage[] {
    const usages = this.getCachedUsages();
    const dailyMap = new Map<string, DailyUsage>();

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
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

  getModelBreakdown(days: number = 30): Record<string, { tokens: number; cost: number }> {
    const usages = this.getCachedUsages();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = usages.filter(u => !Number.isNaN(u.timestamp.getTime()) && u.timestamp.getTime() > cutoff);

    const models: Record<string, { tokens: number; cost: number }> = {};
    for (const u of filtered) {
      if (!models[u.model]) models[u.model] = { tokens: 0, cost: 0 };
      models[u.model].tokens += u.inputTokens + u.outputTokens;
      models[u.model].cost += u.cost;
    }
    return models;
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

    const unknownModels = modelKeys.filter(m => this.modelPricing[m] == null);
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
    const models = this.getModelBreakdown(days);
    const suggestions: SavingSuggestion[] = [];
    let totalPotentialSaving = 0;

    for (const [model, data] of Object.entries(models)) {
      const pricePerMillion = this.modelPricing[model] ?? 2.0;
      const alt = suggestAlternative(pricePerMillion, this.modelPricing);
      if (!alt) continue;

      const altCost = data.tokens * alt.price / 1_000_000;
      const saving = data.cost - altCost;
      if (saving <= 0.01) continue;

      totalPotentialSaving += saving;
      suggestions.push({
        currentModel: model,
        alternativeModel: alt.name,
        currentCost: data.cost,
        alternativeCost: altCost,
        saving,
        tokens: data.tokens,
      });
    }

    suggestions.sort((a, b) => b.saving - a.saving);

    return {
      totalPotentialSaving,
      suggestions: suggestions.slice(0, 5),
    };
  }
}

export const costParser = new CostParser();
