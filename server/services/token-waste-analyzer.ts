import type { SessionReplay, SessionStep } from '../types/replay.js';
import { DEMO_SESSIONS } from './demo-sessions.js';
import { sessionParser } from './session-parser.js';

export interface TokenWasteDiagnostic {
  type: 'retry-loop' | 'long-prompt' | 'verbose-output' | 'expensive-model' | 'context-bloat';
  severity: 'high' | 'medium' | 'low';
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  estimatedWasteTokens: number;
  estimatedWasteCost: number;
  sessionId?: string;
  sessionLabel?: string;
}

export interface TokenWasteReport {
  summary: {
    estimatedWasteTokens: number;
    estimatedWasteCost: number;
    signals: number;
    topIssue?: string;
    usingDemo: boolean;
  };
  diagnostics: TokenWasteDiagnostic[];
}

interface SessionProfile {
  replay: SessionReplay;
  sessionId: string;
  sessionLabel: string;
  userChars: number;
  responseChars: number;
  outputInputRatio: number;
  avgOutputLength: number;
  responseCount: number;
  toolCallCount: number;
  avgTokensPerStep: number;
  longPromptChars: number;
  longPromptCount: number;
  verboseOutputExcessChars: number;
  models: string[];
}

const DAY_MS = 86_400_000;
const DIAGNOSTIC_LIMIT = 6;
const LONG_PROMPT_THRESHOLD = 800;
const VERBOSE_OUTPUT_THRESHOLD = 1000;
const CONTEXT_BLOAT_THRESHOLD = 1500;

function roundCost(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function latestReplayTimestamp(replays: SessionReplay[]): number {
  return replays.reduce((latest, replay) => Math.max(latest, replay.meta.endTime.getTime()), 0);
}

function filterByDays(replays: SessionReplay[], days?: number, referenceNow = Date.now()): SessionReplay[] {
  if (days == null || !Number.isFinite(days) || days <= 0) return replays;
  const cutoff = referenceNow - days * DAY_MS;
  return replays.filter(replay => replay.meta.endTime.getTime() >= cutoff);
}

function getSessionLabel(replay: SessionReplay): string {
  return (replay.meta.sessionLabel || replay.meta.summary || replay.meta.agentName).trim().slice(0, 80);
}

function estimateCostFromTokens(replay: SessionReplay, wasteTokens: number): number {
  if (wasteTokens <= 0 || replay.meta.totalTokens <= 0 || replay.meta.totalCost <= 0) return 0;
  const ratio = Math.min(Math.max(wasteTokens / replay.meta.totalTokens, 0), 1);
  return roundCost(replay.meta.totalCost * ratio);
}

function estimateSeverity(estimatedWasteTokens: number, estimatedWasteCost: number): TokenWasteDiagnostic['severity'] {
  if (estimatedWasteCost >= 0.03 || estimatedWasteTokens >= 5000) return 'high';
  if (estimatedWasteCost >= 0.01 || estimatedWasteTokens >= 1500) return 'medium';
  return 'low';
}

function normalizeModelName(value: string): string {
  return value.toLowerCase().replace(/[._\s]+/g, '-');
}

function findExpensiveModel(models: string[]): string | undefined {
  return models.find(model => {
    const normalized = normalizeModelName(model);
    return (
      normalized.includes('gpt-5-4') ||
      normalized.includes('claude-opus') ||
      normalized.includes('claude-sonnet-4-6') ||
      normalized.includes('o3-pro') ||
      /(^|-)o1($|-)/.test(normalized)
    );
  });
}

function isToolResultError(step: SessionStep): boolean {
  if (step.type !== 'tool_result') return false;
  const haystack = `${step.error ?? ''}\n${step.toolOutput ?? ''}\n${step.content ?? ''}`;
  return step.isError === true || Boolean(step.error) || /(error|enoent|timeout|failed|exception|denied|not found)/i.test(haystack);
}

interface CycleSegment {
  start: number;
  end: number;
  steps: SessionStep[];
}

interface CallstackCycleAnalysis {
  detected: boolean;
  pattern: string | null;
  count: number;
}

interface SemanticCycleAnalysis {
  detected: boolean;
  pattern: string | null;
  similarity: number;
}

interface InternalBadCycleAnalysis {
  detected: boolean;
  confidence: 'high' | 'medium' | 'low';
  pattern: string | null;
  similarity: number;
  repetitionCount: number;
}

const SEMANTIC_STEP_TYPES: Array<Extract<SessionStep['type'], 'tool_call' | 'tool_result' | 'thinking' | 'response'>> = [
  'tool_call',
  'tool_result',
  'thinking',
  'response',
];

function splitCycleSegments(steps: SessionStep[]): CycleSegment[] {
  const segments: CycleSegment[] = [];
  let start = -1;

  const flush = (endExclusive: number): void => {
    if (start < 0 || endExclusive <= start) {
      start = -1;
      return;
    }

    const segmentSteps = steps.slice(start, endExclusive);
    if (segmentSteps.some(step => step.type === 'tool_call')) {
      segments.push({ start, end: endExclusive - 1, steps: segmentSteps });
    }
    start = -1;
  };

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (step.type === 'user' || step.type === 'response') {
      flush(i);
      continue;
    }
    if (start < 0) start = i;
  }

  flush(steps.length);
  return segments;
}

function tokenizeSemanticText(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, ' ')
    .replace(/[\\]+/g, '/')
    .replace(/\b\d+\b/g, '#');
  const matches = normalized.match(/[\p{Script=Han}]|[\p{Letter}\p{Number}_./:-]+/gu) ?? [];
  return new Set(matches.map(token => token.trim()).filter(Boolean));
}

function jaccardSimilarity(left: string, right: string): number {
  const leftTokens = tokenizeSemanticText(left);
  const rightTokens = tokenizeSemanticText(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union > 0 ? intersection / union : 0;
}

function buildSemanticText(step: SessionStep): string {
  return [step.toolName, step.toolInput, step.toolOutput, step.reasoning, step.content, step.error]
    .filter(Boolean)
    .join(' ')
    .slice(0, 1200);
}

function analyzeCallstackSegment(steps: SessionStep[], k = 0.5): CallstackCycleAnalysis {
  const toolSequence = steps
    .filter((step): step is SessionStep & { type: 'tool_call' } => step.type === 'tool_call')
    .map(step => step.toolName?.trim() || 'unknown');

  if (toolSequence.length < 3) {
    return { detected: false, pattern: null, count: 0 };
  }

  const candidates = new Map<string, { count: number; length: number }>();
  const maxLength = Math.min(4, toolSequence.length);
  for (let length = 1; length <= maxLength; length += 1) {
    for (let start = 0; start <= toolSequence.length - length; start += 1) {
      const pattern = toolSequence.slice(start, start + length).join(' → ');
      const existing = candidates.get(pattern);
      if (existing) {
        existing.count += 1;
      } else {
        candidates.set(pattern, { count: 1, length });
      }
    }
  }

  const counts = Array.from(candidates.values()).map(item => item.count);
  if (counts.length === 0) {
    return { detected: false, pattern: null, count: 0 };
  }

  const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + (count - mean) ** 2, 0) / counts.length;
  const threshold = mean + k * Math.sqrt(variance);
  const topCandidate = Array.from(candidates.entries())
    .map(([pattern, value]) => ({ pattern, ...value }))
    .filter(candidate => (candidate.length === 1 ? candidate.count >= 3 : candidate.count >= 2) && candidate.count > threshold)
    .sort((a, b) => b.count * b.length - a.count * a.length || b.count - a.count || b.length - a.length)[0];

  if (!topCandidate) {
    return { detected: false, pattern: null, count: 0 };
  }

  return {
    detected: true,
    pattern: topCandidate.pattern,
    count: topCandidate.count,
  };
}

function analyzeSemanticSegment(steps: SessionStep[], threshold = 0.7): SemanticCycleAnalysis {
  let bestSimilarity = 0;
  let bestPattern: string | null = null;

  for (const stepType of SEMANTIC_STEP_TYPES) {
    const filtered = steps.filter(step => step.type === stepType);
    for (let i = 1; i < filtered.length; i += 1) {
      const previous = filtered[i - 1];
      const current = filtered[i];
      if (stepType === 'tool_call' && previous.toolName?.trim() !== current.toolName?.trim()) continue;
      if (
        stepType === 'tool_result' &&
        previous.toolName?.trim() &&
        current.toolName?.trim() &&
        previous.toolName.trim() !== current.toolName.trim()
      ) {
        continue;
      }

      const similarity = jaccardSimilarity(buildSemanticText(previous), buildSemanticText(current));
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestPattern =
          stepType === 'tool_call'
            ? previous.toolName?.trim() || current.toolName?.trim() || stepType
            : stepType;
      }
    }
  }

  return {
    detected: bestSimilarity > threshold,
    pattern: bestPattern,
    similarity: bestSimilarity,
  };
}

function getMaxRepeatedToolCount(steps: SessionStep[]): number {
  const counts = new Map<string, number>();
  let maxCount = 0;

  for (const step of steps) {
    if (step.type !== 'tool_call') continue;
    const tool = step.toolName?.trim() || 'unknown';
    const nextCount = (counts.get(tool) ?? 0) + 1;
    counts.set(tool, nextCount);
    if (nextCount > maxCount) maxCount = nextCount;
  }

  return maxCount;
}

function getConfidenceRank(confidence: InternalBadCycleAnalysis['confidence']): number {
  switch (confidence) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
    default:
      return 1;
  }
}

function analyzeBadCycleSegment(steps: SessionStep[]): InternalBadCycleAnalysis {
  const callstack = analyzeCallstackSegment(steps);
  const semantic = analyzeSemanticSegment(steps);
  const repeatedToolCount = getMaxRepeatedToolCount(steps);

  if (callstack.detected && semantic.detected) {
    return {
      detected: true,
      confidence: 'high',
      pattern: callstack.pattern ?? semantic.pattern,
      similarity: semantic.similarity,
      repetitionCount: callstack.count,
    };
  }

  if (callstack.detected) {
    return {
      detected: true,
      confidence: semantic.similarity >= 0.55 || repeatedToolCount >= 3 ? 'medium' : 'low',
      pattern: callstack.pattern,
      similarity: semantic.similarity,
      repetitionCount: callstack.count,
    };
  }

  if (semantic.detected && repeatedToolCount >= 3) {
    return {
      detected: true,
      confidence: 'low',
      pattern: semantic.pattern,
      similarity: semantic.similarity,
      repetitionCount: repeatedToolCount,
    };
  }

  return {
    detected: false,
    confidence: 'low',
    pattern: null,
    similarity: semantic.similarity,
    repetitionCount: 0,
  };
}

export function detectCyclesCallstack(steps: SessionStep[], k = 0.5): boolean {
  return splitCycleSegments(steps).some(segment => analyzeCallstackSegment(segment.steps, k).detected);
}

export function detectCyclesSemantic(steps: SessionStep[], threshold = 0.7): boolean {
  return splitCycleSegments(steps).some(segment => analyzeSemanticSegment(segment.steps, threshold).detected);
}

export function detectBadCycle(
  steps: SessionStep[],
): { detected: boolean; confidence: 'high' | 'medium' | 'low'; pattern: string | null } {
  let best: InternalBadCycleAnalysis = {
    detected: false,
    confidence: 'low',
    pattern: null,
    similarity: 0,
    repetitionCount: 0,
  };

  for (const segment of splitCycleSegments(steps)) {
    const analysis = analyzeBadCycleSegment(segment.steps);
    if (!analysis.detected) continue;

    const nextRank = getConfidenceRank(analysis.confidence);
    const bestRank = getConfidenceRank(best.confidence);
    if (
      !best.detected ||
      nextRank > bestRank ||
      (nextRank === bestRank &&
        (analysis.repetitionCount > best.repetitionCount ||
          (analysis.repetitionCount === best.repetitionCount && analysis.similarity > best.similarity)))
    ) {
      best = analysis;
    }
  }

  return {
    detected: best.detected,
    confidence: best.detected ? best.confidence : 'low',
    pattern: best.pattern,
  };
}

function sortDiagnostics(diagnostics: TokenWasteDiagnostic[]): TokenWasteDiagnostic[] {
  return diagnostics.sort((a, b) => b.estimatedWasteCost - a.estimatedWasteCost || b.estimatedWasteTokens - a.estimatedWasteTokens);
}

function mergeDemoDiagnostics(primary: TokenWasteDiagnostic[], fallback: TokenWasteDiagnostic[]): TokenWasteDiagnostic[] {
  const merged = new Map<string, TokenWasteDiagnostic>();

  for (const diagnostic of primary) {
    const key = `${diagnostic.type}|${diagnostic.sessionId ?? ''}|${diagnostic.sessionLabel ?? ''}`;
    merged.set(key, diagnostic);
  }

  for (const diagnostic of fallback) {
    const key = `${diagnostic.type}|${diagnostic.sessionId ?? ''}|${diagnostic.sessionLabel ?? ''}`;
    if (!merged.has(key)) {
      merged.set(key, diagnostic);
    }
  }

  return sortDiagnostics(Array.from(merged.values()));
}

function buildProfile(replay: SessionReplay): SessionProfile {
  let userChars = 0;
  let responseChars = 0;
  let responseCount = 0;
  let toolCallCount = 0;
  let longPromptChars = 0;
  let longPromptCount = 0;
  let verboseOutputExcessChars = 0;
  const models = new Set<string>(replay.meta.modelUsed.filter(Boolean));

  for (const step of replay.steps) {
    if (step.model) models.add(step.model);

    if (step.type === 'user') {
      const length = step.content.trim().length;
      userChars += length;
      if (length > LONG_PROMPT_THRESHOLD) {
        longPromptChars += length;
        longPromptCount += 1;
      }
      continue;
    }

    if (step.type === 'response') {
      const length = step.content.trim().length;
      responseChars += length;
      responseCount += 1;
      verboseOutputExcessChars += Math.max(0, length - VERBOSE_OUTPUT_THRESHOLD);
      continue;
    }

    if (step.type === 'tool_call') {
      toolCallCount += 1;
    }
  }

  return {
    replay,
    sessionId: replay.meta.id,
    sessionLabel: getSessionLabel(replay),
    userChars,
    responseChars,
    outputInputRatio: userChars > 0 ? +(responseChars / userChars).toFixed(2) : 0,
    avgOutputLength: responseCount > 0 ? Math.round(responseChars / responseCount) : 0,
    responseCount,
    toolCallCount,
    avgTokensPerStep: replay.meta.stepCount > 0 ? replay.meta.totalTokens / replay.meta.stepCount : 0,
    longPromptChars,
    longPromptCount,
    verboseOutputExcessChars,
    models: Array.from(models),
  };
}

function makeDiagnostic(args: Omit<TokenWasteDiagnostic, 'severity' | 'estimatedWasteTokens' | 'estimatedWasteCost'> & {
  estimatedWasteTokens: number;
  estimatedWasteCost: number;
}): TokenWasteDiagnostic {
  const estimatedWasteTokens = Math.max(0, Math.round(args.estimatedWasteTokens));
  const estimatedWasteCost = roundCost(Math.max(0, args.estimatedWasteCost));
  return {
    ...args,
    estimatedWasteTokens,
    estimatedWasteCost,
    severity: estimateSeverity(estimatedWasteTokens, estimatedWasteCost),
  };
}

function detectRetryLoops(replays: SessionReplay[]): TokenWasteDiagnostic[] {
  const diagnostics: TokenWasteDiagnostic[] = [];

  for (const replay of replays) {
    for (const segment of splitCycleSegments(replay.steps)) {
      const cycle = analyzeBadCycleSegment(segment.steps);
      if (!cycle.detected) continue;

      const estimatedWasteTokens = segment.steps.reduce((sum, step) => sum + step.inputTokens + step.outputTokens, 0);
      const directWasteCost = segment.steps.reduce((sum, step) => sum + step.cost, 0);
      const estimatedWasteCost = directWasteCost > 0 ? directWasteCost : estimateCostFromTokens(replay, estimatedWasteTokens);
      const failureCount = segment.steps.filter(isToolResultError).length;
      const confidenceZh =
        cycle.confidence === 'high' ? '高度疑似' : cycle.confidence === 'medium' ? '较大概率' : '有一定概率';
      const confidenceEn =
        cycle.confidence === 'high' ? 'A high-confidence' : cycle.confidence === 'medium' ? 'A likely' : 'A possible';
      const similarityTextZh =
        cycle.similarity > 0
          ? `，相邻同类型步骤的语义相似度约 ${cycle.similarity.toFixed(2)}`
          : '';
      const similarityTextEn =
        cycle.similarity > 0 ? `, with adjacent same-type steps scoring ~${cycle.similarity.toFixed(2)} in Jaccard similarity` : '';
      const failureTextZh = failureCount > 0 ? `，且窗口里已经出现了 ${failureCount} 次失败结果` : '';
      const failureTextEn = failureCount > 0 ? ` and the window already contains ${failureCount} failed result(s)` : '';
      const patternTextZh = cycle.pattern ? `调用模式 “${cycle.pattern}” ` : '调用模式 ';
      const patternTextEn = cycle.pattern ? `pattern "${cycle.pattern}" ` : 'call pattern ';

      diagnostics.push(
        makeDiagnostic({
          type: 'retry-loop',
          titleZh: '工具重试循环',
          titleEn: 'Tool retry loop',
          descZh: `${confidenceZh}检测到${patternTextZh}异常重复（重复强度 ${cycle.repetitionCount}）${failureTextZh}${similarityTextZh}，说明代理可能在没有新信息的情况下反复走回同一条工具路径。`,
          descEn: `${confidenceEn} repeated ${patternTextEn}was detected (repeat strength ${cycle.repetitionCount})${failureTextEn}${similarityTextEn}, which suggests the agent kept revisiting the same tool path without materially new information.`,
          estimatedWasteTokens,
          estimatedWasteCost,
          sessionId: replay.meta.id,
          sessionLabel: getSessionLabel(replay),
        }),
      );
    }
  }

  return diagnostics;
}

function detectLongPrompts(profiles: SessionProfile[]): TokenWasteDiagnostic[] {
  return profiles
    .filter(profile => profile.longPromptCount > 0 && profile.outputInputRatio < 1)
    .map(profile => {
      const wasteFactor = Math.max(0.4, 1.2 - profile.outputInputRatio);
      const estimatedWasteTokens = Math.min(
        profile.replay.meta.totalTokens,
        Math.round(profile.longPromptChars * wasteFactor),
      );
      return makeDiagnostic({
        type: 'long-prompt',
        titleZh: '长 Prompt 低产出',
        titleEn: 'Long prompt, weak payoff',
        descZh: `本会话有 ${profile.longPromptCount} 条超长用户输入（>${LONG_PROMPT_THRESHOLD} 字符），但输出/输入比仅 ${profile.outputInputRatio}，说明很多上下文投入没有转成有效结果。`,
        descEn: `This session contains ${profile.longPromptCount} very long user prompt(s) (> ${LONG_PROMPT_THRESHOLD} chars), but the output/input ratio is only ${profile.outputInputRatio}. A lot of context did not turn into useful results.`,
        estimatedWasteTokens,
        estimatedWasteCost: estimateCostFromTokens(profile.replay, estimatedWasteTokens),
        sessionId: profile.sessionId,
        sessionLabel: profile.sessionLabel,
      });
    });
}

function detectVerboseOutputs(profiles: SessionProfile[]): TokenWasteDiagnostic[] {
  return profiles
    .filter(profile => profile.avgOutputLength > VERBOSE_OUTPUT_THRESHOLD && profile.outputInputRatio > 8)
    .map(profile => {
      const ratioFactor = Math.min(1.8, profile.outputInputRatio / 8);
      const estimatedWasteTokens = Math.min(
        profile.replay.meta.totalTokens,
        Math.round(profile.verboseOutputExcessChars * ratioFactor),
      );
      return makeDiagnostic({
        type: 'verbose-output',
        titleZh: '输出明显过长',
        titleEn: 'Overly verbose output',
        descZh: `平均单次输出 ${profile.avgOutputLength} 字符，输出/输入比达到 ${profile.outputInputRatio}，回答明显偏长，适合加长度约束或先给摘要。`,
        descEn: `Average response length is ${profile.avgOutputLength} chars and the output/input ratio reaches ${profile.outputInputRatio}. Responses are likely too verbose and could be shortened with stricter length constraints.`,
        estimatedWasteTokens,
        estimatedWasteCost: estimateCostFromTokens(profile.replay, estimatedWasteTokens),
        sessionId: profile.sessionId,
        sessionLabel: profile.sessionLabel,
      });
    });
}

function detectExpensiveModels(profiles: SessionProfile[]): TokenWasteDiagnostic[] {
  return profiles
    .map(profile => ({ profile, expensiveModel: findExpensiveModel(profile.models) }))
    .filter(({ profile, expensiveModel }) => Boolean(expensiveModel) && (profile.replay.meta.stepCount <= 4 || profile.toolCallCount === 0))
    .map(({ profile, expensiveModel }) => {
      let wasteShare = profile.replay.meta.stepCount <= 2 ? 0.85 : 0.65;
      if (profile.toolCallCount === 0) wasteShare = Math.min(0.9, wasteShare + 0.1);
      const estimatedWasteTokens = Math.round(profile.replay.meta.totalTokens * wasteShare);
      return makeDiagnostic({
        type: 'expensive-model',
        titleZh: '高价模型用在轻任务',
        titleEn: 'Premium model on a light task',
        descZh: `会话使用了 ${expensiveModel}，但只有 ${profile.replay.meta.stepCount} 步${profile.toolCallCount === 0 ? '且没有工具调用' : ''}，更像轻量任务，适合优先路由到更便宜的模型。`,
        descEn: `This session used ${expensiveModel}, but it only has ${profile.replay.meta.stepCount} step(s)${profile.toolCallCount === 0 ? ' and no tool calls' : ''}. It looks like a light task that could likely run on a cheaper model.`,
        estimatedWasteTokens,
        estimatedWasteCost: roundCost(profile.replay.meta.totalCost * wasteShare),
        sessionId: profile.sessionId,
        sessionLabel: profile.sessionLabel,
      });
    });
}

function detectContextBloat(profiles: SessionProfile[]): TokenWasteDiagnostic[] {
  return profiles
    .filter(profile => profile.replay.meta.stepCount > 20 && profile.avgTokensPerStep > CONTEXT_BLOAT_THRESHOLD)
    .map(profile => {
      const estimatedWasteTokens = Math.min(
        profile.replay.meta.totalTokens,
        Math.round((profile.avgTokensPerStep - CONTEXT_BLOAT_THRESHOLD) * profile.replay.meta.stepCount),
      );
      return makeDiagnostic({
        type: 'context-bloat',
        titleZh: '上下文膨胀',
        titleEn: 'Context bloat',
        descZh: `会话共 ${profile.replay.meta.stepCount} 步，平均每步约 ${Math.round(profile.avgTokensPerStep)} tokens，说明上下文越滚越大，后半段很可能在重复携带历史负担。`,
        descEn: `This session spans ${profile.replay.meta.stepCount} steps with roughly ${Math.round(profile.avgTokensPerStep)} tokens per step. Context likely kept growing and dragged extra history forward.`,
        estimatedWasteTokens,
        estimatedWasteCost: estimateCostFromTokens(profile.replay, estimatedWasteTokens),
        sessionId: profile.sessionId,
        sessionLabel: profile.sessionLabel,
      });
    });
}

function detectDemoFallbackDiagnostics(profiles: SessionProfile[]): TokenWasteDiagnostic[] {
  const diagnostics: TokenWasteDiagnostic[] = [];

  for (const profile of profiles) {
    const effectivePromptChars = profile.longPromptChars > 0 ? profile.longPromptChars : profile.userChars;

    if (effectivePromptChars >= 320 && profile.outputInputRatio < 1.6) {
      const estimatedWasteTokens = Math.min(
        profile.replay.meta.totalTokens,
        Math.round(effectivePromptChars * Math.max(0.5, 1.6 - profile.outputInputRatio)),
      );
      diagnostics.push(
        makeDiagnostic({
          type: 'long-prompt',
          titleZh: '长 Prompt 低产出',
          titleEn: 'Long prompt, weak payoff',
          descZh: `本会话输入已经偏长（约 ${effectivePromptChars} 字符），但输出/输入比只有 ${profile.outputInputRatio}，在 demo 样本里已经能看出明显的低产出倾向。`,
          descEn: `This session already has a fairly long prompt (~${effectivePromptChars} chars) while the output/input ratio is only ${profile.outputInputRatio}, which is enough to show a weak payoff pattern in demo data.`,
          estimatedWasteTokens,
          estimatedWasteCost: estimateCostFromTokens(profile.replay, estimatedWasteTokens),
          sessionId: profile.sessionId,
          sessionLabel: profile.sessionLabel,
        }),
      );
    }

    if (profile.avgOutputLength > 550 && profile.outputInputRatio > 5) {
      const estimatedWasteTokens = Math.min(
        profile.replay.meta.totalTokens,
        Math.round(
          Math.max(0, profile.avgOutputLength - 550) * Math.max(profile.responseCount, 1) * Math.min(1.5, profile.outputInputRatio / 5),
        ),
      );
      diagnostics.push(
        makeDiagnostic({
          type: 'verbose-output',
          titleZh: '输出明显过长',
          titleEn: 'Overly verbose output',
          descZh: `本会话回复平均长度约 ${profile.avgOutputLength} 字符，输出/输入比达到 ${profile.outputInputRatio}，在 demo 模式下已经足够说明回答偏长。`,
          descEn: `Average response length is about ${profile.avgOutputLength} chars and the output/input ratio reaches ${profile.outputInputRatio}; that is already enough to flag verbose answers in demo mode.`,
          estimatedWasteTokens,
          estimatedWasteCost: estimateCostFromTokens(profile.replay, estimatedWasteTokens),
          sessionId: profile.sessionId,
          sessionLabel: profile.sessionLabel,
        }),
      );
    }

    if (profile.replay.meta.stepCount >= 3 && profile.avgTokensPerStep > 700) {
      const estimatedWasteTokens = Math.min(
        profile.replay.meta.totalTokens,
        Math.round((profile.avgTokensPerStep - 700) * profile.replay.meta.stepCount),
      );
      diagnostics.push(
        makeDiagnostic({
          type: 'context-bloat',
          titleZh: '上下文膨胀',
          titleEn: 'Context bloat',
          descZh: `本会话虽然轮次不多，但平均每步已经约 ${Math.round(profile.avgTokensPerStep)} tokens，说明 demo 样本里的上下文负担已经偏重。`,
          descEn: `This session is not very long, but it already averages about ${Math.round(profile.avgTokensPerStep)} tokens per step, which is enough to show context drag in demo data.`,
          estimatedWasteTokens,
          estimatedWasteCost: estimateCostFromTokens(profile.replay, estimatedWasteTokens),
          sessionId: profile.sessionId,
          sessionLabel: profile.sessionLabel,
        }),
      );
    }
  }

  return diagnostics;
}

export class TokenWasteAnalyzer {
  getReport(days?: number): TokenWasteReport {
    const realReplays = sessionParser.getRealReplays();
    const usingDemo = realReplays.length === 0;
    const sourceReplays = usingDemo ? DEMO_SESSIONS : realReplays;
    const referenceNow = usingDemo ? latestReplayTimestamp(sourceReplays) : Date.now();
    const replays = filterByDays(sourceReplays, days, referenceNow);
    const profiles = replays.map(buildProfile);

    const primaryDiagnostics = sortDiagnostics(
      [
        ...detectRetryLoops(replays),
        ...detectLongPrompts(profiles),
        ...detectVerboseOutputs(profiles),
        ...detectExpensiveModels(profiles),
        ...detectContextBloat(profiles),
      ].filter(diagnostic => diagnostic.estimatedWasteTokens > 0 || diagnostic.estimatedWasteCost > 0),
    );

    const fallbackDiagnostics = usingDemo
      ? sortDiagnostics(
          detectDemoFallbackDiagnostics(profiles).filter(
            diagnostic => diagnostic.estimatedWasteTokens > 0 || diagnostic.estimatedWasteCost > 0,
          ),
        )
      : [];

    const allDiagnostics = usingDemo
      ? mergeDemoDiagnostics(primaryDiagnostics, fallbackDiagnostics)
      : primaryDiagnostics;

    const diagnostics = allDiagnostics.slice(0, DIAGNOSTIC_LIMIT);
    const estimatedWasteTokens = allDiagnostics.reduce((sum, diagnostic) => sum + diagnostic.estimatedWasteTokens, 0);
    const estimatedWasteCost = roundCost(
      allDiagnostics.reduce((sum, diagnostic) => sum + diagnostic.estimatedWasteCost, 0),
    );

    return {
      summary: {
        estimatedWasteTokens,
        estimatedWasteCost,
        signals: allDiagnostics.length,
        topIssue: allDiagnostics[0]?.type,
        usingDemo,
      },
      diagnostics,
    };
  }
}

export const tokenWasteAnalyzer = new TokenWasteAnalyzer();
