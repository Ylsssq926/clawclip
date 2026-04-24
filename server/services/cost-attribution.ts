import type { SessionStep } from '../types/replay.js';
import type { PricingSnapshot } from './pricing-fetcher.js';
import { getPricingSnapshot } from './pricing-fetcher.js';
import { repriceStep } from './pricing-utils.js';

interface TaskCostBucket {
  directCost: number;
  fullyLoadedCost: number;
  tokens: number;
}

interface ToolCostBucket {
  directCost: number;
  fullyLoadedCost: number;
  callCount: number;
  failCount: number;
}

interface ModelCostBucket {
  cost: number;
  inputTokens: number;
  outputTokens: number;
  callCount: number;
}

export interface CostAttribution {
  byTask: Record<string, TaskCostBucket>;
  byTool: Record<string, ToolCostBucket>;
  byModel: Record<string, ModelCostBucket>;
  summary: {
    totalCost: number;
    costPerStep: number;
    mostExpensiveTool: string | null;
    mostExpensiveModel: string | null;
    wastedCost: number;
  };
}

interface ToolSpan {
  id: string;
  toolName: string;
  callIndex: number;
  resultIndex: number | null;
  assignedIndices: number[];
  directCost: number;
  fullyLoadedCost: number;
  tokens: number;
  failed: boolean;
}

const ROOT_TASK_KEY = 'session-root';
const TOOL_ERROR_PATTERN = /(error|enoent|timeout|failed|exception|denied|not found)/i;

function roundCost(value: number): number {
  return Math.round(Math.max(0, value) * 1_000_000) / 1_000_000;
}

function normalizeNumber(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function stepTokens(step: Pick<SessionStep, 'inputTokens' | 'outputTokens'>): number {
  return normalizeNumber(step.inputTokens) + normalizeNumber(step.outputTokens);
}

function resolveStepCost(step: SessionStep, pricing: PricingSnapshot): number {
  const explicitCost = Number(step.cost);
  if (Number.isFinite(explicitCost) && explicitCost > 0) {
    return Math.max(0, explicitCost);
  }

  const inputTokens = normalizeNumber(step.inputTokens);
  const outputTokens = normalizeNumber(step.outputTokens);
  if (inputTokens === 0 && outputTokens === 0) return 0;

  return repriceStep(step.model, inputTokens, outputTokens, pricing);
}

function isToolResultError(step: SessionStep): boolean {
  if (step.type !== 'tool_result') return false;
  const haystack = `${step.error ?? ''}\n${step.toolOutput ?? ''}\n${step.content ?? ''}`;
  return step.isError === true || Boolean(step.error) || TOOL_ERROR_PATTERN.test(haystack);
}

function isFailedStep(step: SessionStep): boolean {
  return step.isError === true || Boolean(step.error) || isToolResultError(step);
}

function findPairedToolResultIndex(
  steps: SessionStep[],
  callIndex: number,
  consumedResults: Set<number>,
): number | null {
  const toolCallId = steps[callIndex]?.toolCallId?.trim();

  if (toolCallId) {
    for (let i = callIndex + 1; i < steps.length; i += 1) {
      const step = steps[i];
      if (step.type !== 'tool_result' || consumedResults.has(i)) continue;
      if (step.toolCallId?.trim() === toolCallId) return i;
    }
  }

  const toolName = steps[callIndex]?.toolName?.trim();
  if (toolName) {
    for (let i = callIndex + 1; i < steps.length; i += 1) {
      const step = steps[i];
      if (step.type !== 'tool_result' || consumedResults.has(i)) continue;
      if (!step.toolName || step.toolName.trim() === toolName) return i;
    }
  }

  for (let i = callIndex + 1; i < steps.length; i += 1) {
    const step = steps[i];
    if (step.type !== 'tool_result' || consumedResults.has(i)) continue;
    return i;
  }

  return null;
}

function buildToolSpans(steps: SessionStep[], pricing: PricingSnapshot): ToolSpan[] {
  const consumedResults = new Set<number>();
  const spans: ToolSpan[] = [];

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (step.type !== 'tool_call') continue;

    const resultIndex = findPairedToolResultIndex(steps, i, consumedResults);
    if (resultIndex != null) consumedResults.add(resultIndex);

    const assignedIndices: number[] = [i];
    if (resultIndex != null) {
      assignedIndices.push(resultIndex);
    }

    const downstreamStart = (resultIndex ?? i) + 1;
    for (let j = downstreamStart; j < steps.length; j += 1) {
      const downstream = steps[j];
      if (downstream.type === 'user' || downstream.type === 'tool_call' || downstream.type === 'tool_result') break;
      assignedIndices.push(j);
    }

    const directIndices = resultIndex == null ? [i] : [i, resultIndex];
    const directCost = directIndices.reduce((sum, index) => sum + resolveStepCost(steps[index], pricing), 0);
    const fullyLoadedCost = assignedIndices.reduce((sum, index) => sum + resolveStepCost(steps[index], pricing), 0);
    const tokens = assignedIndices.reduce((sum, index) => sum + stepTokens(steps[index]), 0);
    const failed = isFailedStep(step) || (resultIndex != null && isToolResultError(steps[resultIndex]));
    const toolName = step.toolName?.trim() || 'unknown';
    const spanId = step.toolCallId?.trim() || `${toolName}@${step.index}`;

    spans.push({
      id: spanId,
      toolName,
      callIndex: i,
      resultIndex,
      assignedIndices,
      directCost,
      fullyLoadedCost,
      tokens,
      failed,
    });
  }

  return spans;
}

function findMostExpensiveTool(byTool: CostAttribution['byTool']): string | null {
  let topTool: string | null = null;
  let topCost = -1;

  for (const [tool, stats] of Object.entries(byTool)) {
    if (stats.fullyLoadedCost > topCost) {
      topTool = tool;
      topCost = stats.fullyLoadedCost;
    }
  }

  return topTool;
}

function findMostExpensiveModel(byModel: CostAttribution['byModel']): string | null {
  let topModel: string | null = null;
  let topCost = -1;

  for (const [model, stats] of Object.entries(byModel)) {
    if (stats.cost > topCost) {
      topModel = model;
      topCost = stats.cost;
    }
  }

  return topModel;
}

export function attributeCosts(steps: SessionStep[]): CostAttribution {
  const pricing = getPricingSnapshot();
  const byTask: CostAttribution['byTask'] = {};
  const byTool: CostAttribution['byTool'] = {};
  const byModel: CostAttribution['byModel'] = {};
  const assignedIndices = new Set<number>();
  const failedIndices = new Set<number>();
  let totalCost = 0;

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    const cost = resolveStepCost(step, pricing);
    const inputTokens = normalizeNumber(step.inputTokens);
    const outputTokens = normalizeNumber(step.outputTokens);
    totalCost += cost;

    if (isFailedStep(step)) {
      failedIndices.add(i);
    }

    const hasUsage = inputTokens > 0 || outputTokens > 0 || cost > 0;
    const model = step.model?.trim() || (hasUsage ? 'unknown' : '');
    if (!model) continue;

    const bucket = byModel[model] ?? { cost: 0, inputTokens: 0, outputTokens: 0, callCount: 0 };
    bucket.cost += cost;
    bucket.inputTokens += inputTokens;
    bucket.outputTokens += outputTokens;
    bucket.callCount += 1;
    byModel[model] = bucket;
  }

  for (const span of buildToolSpans(steps, pricing)) {
    for (const index of span.assignedIndices) {
      assignedIndices.add(index);
    }
    if (span.failed) {
      failedIndices.add(span.callIndex);
      if (span.resultIndex != null) failedIndices.add(span.resultIndex);
    }

    byTask[span.id] = {
      directCost: roundCost(span.directCost),
      fullyLoadedCost: roundCost(span.fullyLoadedCost),
      tokens: span.tokens,
    };

    const toolBucket = byTool[span.toolName] ?? { directCost: 0, fullyLoadedCost: 0, callCount: 0, failCount: 0 };
    toolBucket.directCost += span.directCost;
    toolBucket.fullyLoadedCost += span.fullyLoadedCost;
    toolBucket.callCount += 1;
    if (span.failed) toolBucket.failCount += 1;
    byTool[span.toolName] = toolBucket;
  }

  const rootIndices: number[] = [];
  for (let i = 0; i < steps.length; i += 1) {
    if (assignedIndices.has(i)) continue;
    const step = steps[i];
    const cost = resolveStepCost(step, pricing);
    const tokens = stepTokens(step);
    if (cost <= 0 && tokens <= 0) continue;
    rootIndices.push(i);
  }

  if (rootIndices.length > 0) {
    byTask[ROOT_TASK_KEY] = {
      directCost: roundCost(rootIndices.reduce((sum, index) => sum + resolveStepCost(steps[index], pricing), 0)),
      fullyLoadedCost: roundCost(rootIndices.reduce((sum, index) => sum + resolveStepCost(steps[index], pricing), 0)),
      tokens: rootIndices.reduce((sum, index) => sum + stepTokens(steps[index]), 0),
    };
  }

  for (const stats of Object.values(byTool)) {
    stats.directCost = roundCost(stats.directCost);
    stats.fullyLoadedCost = roundCost(stats.fullyLoadedCost);
  }

  for (const stats of Object.values(byModel)) {
    stats.cost = roundCost(stats.cost);
  }

  const wastedCost = roundCost(
    Array.from(failedIndices).reduce((sum, index) => sum + resolveStepCost(steps[index], pricing), 0),
  );

  return {
    byTask,
    byTool,
    byModel,
    summary: {
      totalCost: roundCost(totalCost),
      costPerStep: roundCost(steps.length > 0 ? totalCost / steps.length : 0),
      mostExpensiveTool: findMostExpensiveTool(byTool),
      mostExpensiveModel: findMostExpensiveModel(byModel),
      wastedCost,
    },
  };
}
