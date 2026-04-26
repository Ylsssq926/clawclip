import type { SessionReplay, SessionStep } from '../types/replay.js';

export interface ConsistencyReport {
  taskId: string;
  runCount: number;
  /** 结果一致性：相同结果的比例 */
  resultConsistency: number;
  /** 步骤方差：(max_steps - min_steps) / mean_steps */
  stepVarianceRatio: number;
  /** 成本方差：成本的标准差 / 均值 */
  costVarianceRatio: number;
  /** 工具调用一致性：每次运行使用相同工具集的比例 */
  toolConsistency: number;
  /** 首次分歧点：多次运行中第一个出现差异的步骤索引 */
  firstDivergenceStep: number | null;
  verdict: 'stable' | 'unstable' | 'insufficient_data';
}

const TASK_SIMILARITY_THRESHOLD = 0.34;
const RESULT_SIMILARITY_THRESHOLD = 0.68;
const TEXT_STEP_SIMILARITY_THRESHOLD = 0.6;
const TOOL_INPUT_SIMILARITY_THRESHOLD = 0.52;

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r/g, '\n').replace(/\s+/g, ' ').trim();
}

function stripFormatting(value: string): string {
  return normalizeWhitespace(value)
    .replace(/^Sender \(untrusted metadata\):\s*```[\s\S]*?```\s*/i, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1');
}

function normalizeText(value: string): string {
  return stripFormatting(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value: string): string {
  return normalizeText(value).replace(/\s+/g, '');
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  const tokens = normalized.split(' ').filter(Boolean);
  const compact = normalized.replace(/\s+/g, '');
  const ngrams: string[] = [];
  if (compact.length > 0 && compact.length <= 3) {
    ngrams.push(compact);
  } else {
    for (let i = 0; i <= compact.length - 3; i += 1) {
      ngrams.push(compact.slice(i, i + 3));
    }
  }

  return [...tokens, ...ngrams];
}

function jaccardSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 1;
  if (left.length === 0 || right.length === 0) return 0;

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) intersection += 1;
  }

  const union = new Set([...leftSet, ...rightSet]).size;
  return union === 0 ? 0 : intersection / union;
}

function inclusionSimilarity(left: string, right: string): number {
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) / Math.max(left.length, right.length);
  }
  return 0;
}

function textSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft && !normalizedRight) return 1;
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  const jaccard = jaccardSimilarity(tokenize(normalizedLeft), tokenize(normalizedRight));
  const inclusion = inclusionSimilarity(compactText(normalizedLeft), compactText(normalizedRight));
  return Math.max(jaccard, inclusion);
}

function slugifyTask(value: string): string {
  const normalized = normalizeText(value);
  if (!normalized) return 'task';
  return normalized.replace(/\s+/g, '-').slice(0, 48) || 'task';
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildTaskDescriptor(replay: SessionReplay): string {
  const firstUserMessage = replay.steps.find(step => step.type === 'user')?.content ?? '';
  const title = replay.meta.sessionLabel ?? '';
  const summary = replay.meta.summary ?? '';
  return [title, summary, firstUserMessage].filter(Boolean).join(' · ');
}

function buildTaskId(replay: SessionReplay): string {
  const descriptor = buildTaskDescriptor(replay);
  const slug = slugifyTask(descriptor);
  return `${slug}-${hashString(normalizeText(descriptor) || replay.meta.id).slice(0, 8)}`;
}

function dominantCluster(values: string[], threshold: number): { ratio: number; representativeIndex: number } {
  if (values.length === 0) {
    return { ratio: 0, representativeIndex: 0 };
  }

  let bestCount = 0;
  let bestIndex = 0;

  for (let index = 0; index < values.length; index += 1) {
    const candidate = values[index];
    let clusterCount = 0;
    for (const other of values) {
      if (textSimilarity(candidate, other) >= threshold) {
        clusterCount += 1;
      }
    }
    if (clusterCount > bestCount || (clusterCount === bestCount && candidate.length > values[bestIndex].length)) {
      bestCount = clusterCount;
      bestIndex = index;
    }
  }

  return {
    ratio: bestCount / values.length,
    representativeIndex: bestIndex,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const average = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function normalizeToolName(value?: string): string {
  return normalizeText(value ?? '').replace(/\s+/g, '');
}

function buildToolSetSignature(replay: SessionReplay): string {
  const tools = new Set<string>();
  for (const step of replay.steps) {
    if (step.type !== 'tool_call') continue;
    const normalizedTool = normalizeToolName(step.toolName);
    if (normalizedTool) tools.add(normalizedTool);
  }
  return [...tools].sort().join('|');
}

function findTerminalStep(replay: SessionReplay): SessionStep | undefined {
  for (let i = replay.steps.length - 1; i >= 0; i -= 1) {
    const step = replay.steps[i];
    if (step.isError || step.error) return step;
    if (step.type === 'response' || step.type === 'tool_result' || step.type === 'system') return step;
  }
  return replay.steps[replay.steps.length - 1];
}

function buildResultSignature(replay: SessionReplay): string {
  const step = findTerminalStep(replay);
  if (!step) return 'empty';

  if (step.isError || step.error) {
    const errorText = step.error ?? step.toolOutput ?? step.content;
    return `error:${step.type}:${normalizeToolName(step.toolName)}:${stripFormatting(errorText).slice(0, 240)}`;
  }

  if (step.type === 'response') {
    return `response:${stripFormatting(step.content).slice(0, 320)}`;
  }

  if (step.type === 'tool_result') {
    return `tool_result:${stripFormatting(step.toolOutput ?? step.content).slice(0, 320)}`;
  }

  return `${step.type}:${stripFormatting(step.content).slice(0, 320)}`;
}

function buildStepSignature(step: SessionStep | undefined): string {
  if (!step) return '__missing__';
  if (step.type === 'thinking') return 'thinking';

  const errorMarker = step.isError || step.error ? 'error' : 'ok';
  switch (step.type) {
    case 'tool_call':
      return `tool_call:${normalizeToolName(step.toolName)}:${errorMarker}:${stripFormatting(step.toolInput ?? step.content).slice(0, 200)}`;
    case 'tool_result':
      return `tool_result:${errorMarker}:${stripFormatting(step.error ?? step.toolOutput ?? step.content).slice(0, 200)}`;
    case 'response':
      return `response:${stripFormatting(step.content).slice(0, 220)}`;
    case 'user':
      return `user:${stripFormatting(step.content).slice(0, 220)}`;
    case 'system':
      return `system:${errorMarker}:${stripFormatting(step.error ?? step.content).slice(0, 200)}`;
    default:
      return `${step.type}:${stripFormatting(step.content).slice(0, 200)}`;
  }
}

function stepsEquivalent(left: SessionStep | undefined, right: SessionStep | undefined): boolean {
  if (!left || !right) return left == null && right == null;
  if (left.type !== right.type) return false;

  switch (left.type) {
    case 'thinking':
      return true;
    case 'tool_call':
      return (
        normalizeToolName(left.toolName) === normalizeToolName(right.toolName)
        && textSimilarity(left.toolInput ?? left.content, right.toolInput ?? right.content) >= TOOL_INPUT_SIMILARITY_THRESHOLD
      );
    case 'tool_result':
      return textSimilarity(left.error ?? left.toolOutput ?? left.content, right.error ?? right.toolOutput ?? right.content) >= TEXT_STEP_SIMILARITY_THRESHOLD;
    case 'response':
    case 'user':
    case 'system':
      return textSimilarity(left.error ?? left.content, right.error ?? right.content) >= TEXT_STEP_SIMILARITY_THRESHOLD;
    default:
      return buildStepSignature(left) === buildStepSignature(right);
  }
}

function findFirstDivergenceStep(sessions: SessionReplay[]): number | null {
  const maxSteps = sessions.reduce((max, replay) => Math.max(max, replay.steps.length), 0);

  for (let index = 0; index < maxSteps; index += 1) {
    const baseline = sessions[0]?.steps[index];
    for (let sessionIndex = 1; sessionIndex < sessions.length; sessionIndex += 1) {
      const candidate = sessions[sessionIndex]?.steps[index];
      if (!stepsEquivalent(baseline, candidate)) {
        return index;
      }
    }
  }

  return null;
}

function computeVerdict(report: Omit<ConsistencyReport, 'verdict' | 'taskId'>, taskClusterRatio: number): ConsistencyReport['verdict'] {
  if (report.runCount < 2) return 'insufficient_data';
  if (taskClusterRatio < 0.67) return 'insufficient_data';

  const stabilityScore = mean([
    report.resultConsistency,
    report.toolConsistency,
    clamp(1 - report.stepVarianceRatio, 0, 1),
    clamp(1 - report.costVarianceRatio, 0, 1),
  ]);

  if (
    report.resultConsistency >= 0.67
    && report.toolConsistency >= 0.67
    && report.stepVarianceRatio <= 0.45
    && report.costVarianceRatio <= 0.5
    && stabilityScore >= 0.72
  ) {
    return 'stable';
  }

  return 'unstable';
}

export function analyzeConsistency(sessions: SessionReplay[]): ConsistencyReport {
  if (sessions.length === 0) {
    return {
      taskId: 'task-empty',
      runCount: 0,
      resultConsistency: 0,
      stepVarianceRatio: 0,
      costVarianceRatio: 0,
      toolConsistency: 0,
      firstDivergenceStep: null,
      verdict: 'insufficient_data',
    };
  }

  const taskDescriptors = sessions.map(buildTaskDescriptor);
  const taskCluster = dominantCluster(taskDescriptors, TASK_SIMILARITY_THRESHOLD);
  const stepCounts = sessions.map(session => session.steps.length);
  const averageSteps = mean(stepCounts);
  const maxSteps = Math.max(...stepCounts);
  const minSteps = Math.min(...stepCounts);
  const costs = sessions.map(session => session.meta.totalCost);
  const averageCost = mean(costs);
  const resultConsistency = dominantCluster(
    sessions.map(buildResultSignature),
    RESULT_SIMILARITY_THRESHOLD,
  ).ratio;
  const toolConsistency = dominantCluster(
    sessions.map(buildToolSetSignature),
    1,
  ).ratio;

  const reportBase = {
    runCount: sessions.length,
    resultConsistency: roundMetric(resultConsistency),
    stepVarianceRatio: roundMetric(averageSteps > 0 ? (maxSteps - minSteps) / averageSteps : 0),
    costVarianceRatio: roundMetric(averageCost > 0 ? standardDeviation(costs) / averageCost : 0),
    toolConsistency: roundMetric(toolConsistency),
    firstDivergenceStep: findFirstDivergenceStep(sessions),
  };

  return {
    taskId: buildTaskId(sessions[taskCluster.representativeIndex]),
    ...reportBase,
    verdict: computeVerdict(reportBase, taskCluster.ratio),
  };
}

// 导出供其他模块使用
export { buildTaskDescriptor, textSimilarity };
