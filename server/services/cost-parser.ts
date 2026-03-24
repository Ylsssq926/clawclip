import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  TokenUsage,
  DailyUsage,
  CostStats,
  BudgetConfig,
  TaskCost,
  DEFAULT_MODEL_PRICING,
  DEFAULT_BUDGET_CONFIG,
} from '../types/index.js';
import { getClawclipStateDir, getLobsterDataRoots, listAgentSessionEntries } from './agent-data-root.js';

export class CostParser {
  private config: BudgetConfig;
  private modelPricing: Record<string, number>;

  constructor() {
    this.ensureDirectories();
    this.config = this.loadConfig();
    this.modelPricing = DEFAULT_MODEL_PRICING;
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
  }

  getConfig(): BudgetConfig {
    return { ...this.config };
  }

  /** 解析各数据根下的日志与会话 JSONL，提取 token 用量 */
  parseLogFiles(): TokenUsage[] {
    const usages: TokenUsage[] = [];
    const roots = getLobsterDataRoots();

    if (roots.length === 0) {
      const fallbackLogs = path.join(os.homedir(), '.openclaw', 'logs');
      if (fs.existsSync(fallbackLogs)) {
        this.parseDirectory(fallbackLogs, '.log', usages);
      }
      return usages;
    }

    for (const root of roots) {
      const logsDir = path.join(root.homeDir, 'logs');
      if (fs.existsSync(logsDir)) {
        this.parseDirectory(logsDir, '.log', usages);
      }
      for (const e of listAgentSessionEntries(root)) {
        this.parseDirectory(e.sessionsDir, '.jsonl', usages);
      }
    }

    return usages;
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
        if (ext === '.jsonl' && !line.includes('"usage"') && !line.includes("'usage'")) continue;
        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          const usage = parsed.usage as Record<string, unknown> | undefined;
          if (!usage) continue;
          const model = (parsed.model as string) || 'unknown';
          const inputTokens = Number(
            usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokens ?? 0,
          );
          const outputTokens = Number(
            usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokens ?? 0,
          );
          if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens)) continue;
          const price = this.modelPricing[model] || 5.0;
          const cost = (inputTokens + outputTokens) * price / 1_000_000;

          const rawTs = parsed.timestamp ?? parsed.created_at ?? parsed.createdAt;
          let ts = new Date();
          if (typeof rawTs === 'number' && Number.isFinite(rawTs)) {
            ts = new Date(rawTs > 1e12 ? rawTs : rawTs * 1000);
          } else if (typeof rawTs === 'string' && rawTs.length > 0) {
            ts = new Date(rawTs);
          }
          if (Number.isNaN(ts.getTime())) ts = new Date();

          usages.push({
            timestamp: ts,
            taskId: (parsed.task_id as string) || (parsed.session_id as string) || file,
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
    const usages = this.parseLogFiles();
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
    const usages = this.parseLogFiles();
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
    const usages = this.parseLogFiles();
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
          ? `预算已超支！当前消费 ¥${stats.totalCost.toFixed(2)}，超出 ¥${(stats.totalCost - this.config.monthly).toFixed(2)}`
          : percentage >= this.config.alertThreshold
            ? `预算使用已达 ${percentage.toFixed(1)}%，剩余 ¥${(this.config.monthly - stats.totalCost).toFixed(2)}`
            : `预算状态良好，当前使用 ${percentage.toFixed(1)}%`,
    };
  }
}

export const costParser = new CostParser();
