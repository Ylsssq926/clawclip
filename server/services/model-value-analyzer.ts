import type { SessionReplay, SessionStep } from '../types/replay.js';
import { sessionParser } from './session-parser.js';

export type ModelValueLabel = 'cheap-workhorse' | 'balanced' | 'premium-specialist' | 'experimental';

export interface ModelValueRow {
  model: string;
  sessions: number;
  totalCost: number;
  totalTokens: number;
  avgCostPerSession: number;
  avgOutputInputRatio: number;
  toolUsageRate: number;
  errorRate: number;
  valueLabel: ModelValueLabel;
  valueLabelZh: string;
  valueLabelEn: string;
  recommendationZh: string;
  recommendationEn: string;
}

interface SessionModelStats {
  cost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  relevantSteps: number;
  errorSteps: number;
  usedTool: boolean;
}

interface ModelAccumulator {
  model: string;
  sessions: number;
  totalCost: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  relevantSteps: number;
  errorSteps: number;
  toolSessions: number;
  ratioSum: number;
  ratioCount: number;
}

const DAY_MS = 86_400_000;
const MIN_EXPERIMENTAL_SESSIONS = 2;
const MIN_EXPERIMENTAL_TOKENS = 1_500;

function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function latestReplayTimestamp(replays: SessionReplay[]): number {
  return replays.reduce((latest, replay) => {
    const end = replay.meta.endTime.getTime();
    return Number.isNaN(end) ? latest : Math.max(latest, end);
  }, 0);
}

function isRelevantModelStep(step: SessionStep): boolean {
  return step.type !== 'user' && step.type !== 'system';
}

function normalizeModelName(model: string | undefined): string | undefined {
  const normalized = model?.trim();
  if (!normalized) return undefined;
  if (normalized.toLowerCase() === 'unknown') return undefined;
  return normalized;
}

function collectReplayModels(replay: SessionReplay): string[] {
  const models = new Set<string>();

  for (const model of replay.meta.modelUsed) {
    const normalized = normalizeModelName(model);
    if (normalized) models.add(normalized);
  }

  for (const step of replay.steps) {
    const normalized = normalizeModelName(step.model);
    if (normalized) models.add(normalized);
  }

  return Array.from(models);
}

function resolveStepModel(step: SessionStep, fallbackModels: string[]): string | undefined {
  const explicit = normalizeModelName(step.model);
  if (explicit) return explicit;
  if (fallbackModels.length === 1) return fallbackModels[0];
  return undefined;
}

function loadReplays(): { replays: SessionReplay[]; usingDemo: boolean } {
  const usingDemo = sessionParser.getRealReplays().length === 0;
  const metas = sessionParser.getSessions();
  const replays: SessionReplay[] = [];
  const seen = new Set<string>();

  for (const meta of metas) {
    const replay = sessionParser.getSessionReplay(meta.id);
    if (!replay || seen.has(replay.meta.id)) continue;
    seen.add(replay.meta.id);
    replays.push(replay);
  }

  return { replays, usingDemo };
}

function filterByDays(replays: SessionReplay[], days: number | undefined, usingDemo: boolean): SessionReplay[] {
  if (days == null || !Number.isFinite(days) || days <= 0) return replays;
  const referenceNow = usingDemo ? latestReplayTimestamp(replays) || Date.now() : Date.now();
  const cutoff = referenceNow - days * DAY_MS;
  return replays.filter(replay => replay.meta.endTime.getTime() >= cutoff);
}

function classifyValueLabel(
  row: Omit<ModelValueRow, 'valueLabel' | 'valueLabelZh' | 'valueLabelEn' | 'recommendationZh' | 'recommendationEn'>,
  medians: { cost: number; ratio: number; tool: number; error: number },
): ModelValueLabel {
  if (row.sessions < MIN_EXPERIMENTAL_SESSIONS || row.totalTokens < MIN_EXPERIMENTAL_TOKENS) {
    return 'experimental';
  }

  const lowCostThreshold = medians.cost > 0 ? medians.cost * 0.8 : row.avgCostPerSession;
  const highCostThreshold = medians.cost > 0 ? medians.cost * 1.35 : row.avgCostPerSession;
  const lowErrorThreshold = Math.min(Math.max(medians.error * 1.05, 0.06), 0.14);
  const balancedErrorThreshold = Math.min(Math.max(medians.error * 1.2, 0.08), 0.18);
  const strongRatioThreshold = Math.max(medians.ratio * 1.12, 1.05);
  const balancedRatioThreshold = Math.max(medians.ratio * 0.95, 0.75);
  const strongToolThreshold = Math.max(medians.tool * 1.12, 0.35);
  const balancedToolThreshold = Math.max(medians.tool * 0.85, 0.2);

  if (row.avgCostPerSession <= lowCostThreshold && row.errorRate <= lowErrorThreshold) {
    return 'cheap-workhorse';
  }

  if (
    row.avgCostPerSession >= highCostThreshold &&
    row.errorRate <= Math.max(balancedErrorThreshold, 0.12) &&
    (row.avgOutputInputRatio >= strongRatioThreshold || row.toolUsageRate >= strongToolThreshold)
  ) {
    return 'premium-specialist';
  }

  if (
    row.errorRate <= balancedErrorThreshold &&
    row.avgOutputInputRatio >= balancedRatioThreshold &&
    row.toolUsageRate >= balancedToolThreshold
  ) {
    return 'balanced';
  }

  if (row.avgCostPerSession <= medians.cost && row.errorRate <= balancedErrorThreshold) {
    return 'cheap-workhorse';
  }

  return 'balanced';
}

function getValueLabelTexts(valueLabel: ModelValueLabel): { zh: string; en: string } {
  switch (valueLabel) {
    case 'cheap-workhorse':
      return { zh: '便宜跑量', en: 'Cheap workhorse' };
    case 'balanced':
      return { zh: '均衡主力', en: 'Balanced default' };
    case 'premium-specialist':
      return { zh: '高价值专才', en: 'Premium specialist' };
    case 'experimental':
      return { zh: '观察试用', en: 'Experimental' };
    default:
      return { zh: '均衡主力', en: 'Balanced default' };
  }
}

function getRecommendation(
  valueLabel: ModelValueLabel,
  row: Omit<ModelValueRow, 'valueLabel' | 'valueLabelZh' | 'valueLabelEn' | 'recommendationZh' | 'recommendationEn'>,
): { zh: string; en: string } {
  switch (valueLabel) {
    case 'cheap-workhorse':
      if (row.toolUsageRate >= 0.5) {
        return {
          zh: '适合扛批量、标准化、需要一定工具协作的日常任务，先吃主流流量更划算。',
          en: 'Best for high-volume, standardized work with some tool orchestration; a strong default for the bulk of traffic.',
        };
      }
      return {
        zh: '适合摘要、分类、初筛和批量问答这类高频低风险任务，先让它跑量更值。',
        en: 'Best for summaries, classification, first-pass triage, and other frequent low-risk tasks where scale matters most.',
      };
    case 'premium-specialist':
      if (row.toolUsageRate >= 0.55) {
        return {
          zh: '适合复杂工具链、关键编排和失败代价高的节点，把它留给高价值任务更划算。',
          en: 'Best reserved for complex tool chains, critical orchestration, and failure-sensitive steps where higher capability pays off.',
        };
      }
      return {
        zh: '适合关键交付、复杂生成和长输出任务，不该拿来无差别跑量。',
        en: 'Best for critical deliverables, complex generation, and long-form output rather than undifferentiated bulk traffic.',
      };
    case 'experimental':
      return {
        zh: '当前样本还少，建议先小流量试跑、继续积累会话，再决定是否放进主路由。',
        en: 'The sample is still thin. Keep it on a small traffic slice first, then decide whether it deserves a primary route.',
      };
    case 'balanced':
    default:
      return {
        zh: '适合作为默认主路由，成本、稳定性和效果代理比较均衡，适合多数通用任务。',
        en: 'A good default route with a balanced tradeoff across cost, stability, and proxy performance for most general work.',
      };
  }
}

export class ModelValueAnalyzer {
  getReport(days?: number): { rows: ModelValueRow[] } {
    const { replays, usingDemo } = loadReplays();
    const filteredReplays = filterByDays(replays, days, usingDemo);
    const modelMap = new Map<string, ModelAccumulator>();

    for (const replay of filteredReplays) {
      const replayModels = collectReplayModels(replay);
      if (replayModels.length === 0) continue;

      const sessionStats = new Map<string, SessionModelStats>();
      for (const model of replayModels) {
        sessionStats.set(model, {
          cost: 0,
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          relevantSteps: 0,
          errorSteps: 0,
          usedTool: false,
        });
      }

      for (const step of replay.steps) {
        if (!isRelevantModelStep(step)) continue;
        const model = resolveStepModel(step, replayModels);
        if (!model) continue;
        const stats = sessionStats.get(model);
        if (!stats) continue;

        stats.cost += step.cost;
        stats.inputTokens += step.inputTokens;
        stats.outputTokens += step.outputTokens;
        stats.totalTokens += step.inputTokens + step.outputTokens;
        stats.relevantSteps += 1;
        if (step.type === 'tool_call' || step.type === 'tool_result') {
          stats.usedTool = true;
        }
        if (step.isError || step.error) {
          stats.errorSteps += 1;
        }
      }

      for (const model of replayModels) {
        const stats = sessionStats.get(model);
        if (!stats) continue;
        const existing = modelMap.get(model) ?? {
          model,
          sessions: 0,
          totalCost: 0,
          totalTokens: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          relevantSteps: 0,
          errorSteps: 0,
          toolSessions: 0,
          ratioSum: 0,
          ratioCount: 0,
        };

        existing.sessions += 1;
        existing.totalCost += stats.cost;
        existing.totalTokens += stats.totalTokens;
        existing.totalInputTokens += stats.inputTokens;
        existing.totalOutputTokens += stats.outputTokens;
        existing.relevantSteps += stats.relevantSteps;
        existing.errorSteps += stats.errorSteps;
        if (stats.usedTool) existing.toolSessions += 1;
        if (stats.inputTokens > 0) {
          existing.ratioSum += stats.outputTokens / stats.inputTokens;
          existing.ratioCount += 1;
        }

        modelMap.set(model, existing);
      }
    }

    const draftRows = Array.from(modelMap.values())
      .map(acc => ({
        model: acc.model,
        sessions: acc.sessions,
        totalCost: round(acc.totalCost),
        totalTokens: Math.round(acc.totalTokens),
        avgCostPerSession: round(acc.sessions > 0 ? acc.totalCost / acc.sessions : 0),
        avgOutputInputRatio: round(acc.ratioCount > 0 ? acc.ratioSum / acc.ratioCount : 0, 3),
        toolUsageRate: round(acc.sessions > 0 ? acc.toolSessions / acc.sessions : 0, 4),
        errorRate: round(acc.relevantSteps > 0 ? acc.errorSteps / acc.relevantSteps : 0, 4),
      }))
      .filter(row => row.sessions > 0)
      .sort((a, b) => {
        if (b.sessions !== a.sessions) return b.sessions - a.sessions;
        if (b.totalCost !== a.totalCost) return b.totalCost - a.totalCost;
        return b.totalTokens - a.totalTokens;
      });

    const stableRows = draftRows.filter(
      row => row.sessions >= MIN_EXPERIMENTAL_SESSIONS && row.totalTokens >= MIN_EXPERIMENTAL_TOKENS,
    );

    const medians = {
      cost: median((stableRows.length > 0 ? stableRows : draftRows).map(row => row.avgCostPerSession)),
      ratio: median((stableRows.length > 0 ? stableRows : draftRows).map(row => row.avgOutputInputRatio)),
      tool: median((stableRows.length > 0 ? stableRows : draftRows).map(row => row.toolUsageRate)),
      error: median((stableRows.length > 0 ? stableRows : draftRows).map(row => row.errorRate)),
    };

    const rows = draftRows.map(row => {
      const valueLabel = classifyValueLabel(row, medians);
      const texts = getValueLabelTexts(valueLabel);
      const recommendation = getRecommendation(valueLabel, row);

      return {
        ...row,
        valueLabel,
        valueLabelZh: texts.zh,
        valueLabelEn: texts.en,
        recommendationZh: recommendation.zh,
        recommendationEn: recommendation.en,
      } satisfies ModelValueRow;
    });

    return { rows };
  }
}

export const modelValueAnalyzer = new ModelValueAnalyzer();
