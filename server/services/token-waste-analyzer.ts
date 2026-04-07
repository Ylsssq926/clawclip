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
    const steps = replay.steps;

    for (let i = 0; i < steps.length; i += 1) {
      const current = steps[i];
      if (current.type !== 'tool_call' || !current.toolName) continue;

      const repeatedCalls: SessionStep[] = [current];
      let lastMatchedIndex = i;

      for (let j = i + 1; j < steps.length; j += 1) {
        const step = steps[j];
        if (step.type === 'user' || step.type === 'response') break;
        if (step.type !== 'tool_call') continue;
        if (step.toolName !== current.toolName) break;
        repeatedCalls.push(step);
        lastMatchedIndex = j;
      }

      if (repeatedCalls.length >= 3) {
        const estimatedWasteTokens = repeatedCalls.reduce((sum, step) => sum + step.inputTokens + step.outputTokens, 0);
        const estimatedWasteCost = repeatedCalls.reduce((sum, step) => sum + step.cost, 0);
        diagnostics.push(
          makeDiagnostic({
            type: 'retry-loop',
            titleZh: '工具重试循环',
            titleEn: 'Tool retry loop',
            descZh: `同一工具 “${current.toolName}” 在没有新用户输入的情况下重复调用了 ${repeatedCalls.length} 次，像是在原地重试。`,
            descEn: `Tool "${current.toolName}" was called ${repeatedCalls.length} times without new user input, which looks like a retry loop.`,
            estimatedWasteTokens,
            estimatedWasteCost,
            sessionId: replay.meta.id,
            sessionLabel: getSessionLabel(replay),
          }),
        );
        i = lastMatchedIndex;
      }
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
    if (profile.longPromptCount > 0 && profile.outputInputRatio < 1.5) {
      const estimatedWasteTokens = Math.min(
        profile.replay.meta.totalTokens,
        Math.round(profile.longPromptChars * Math.max(0.6, 1.6 - profile.outputInputRatio)),
      );
      diagnostics.push(
        makeDiagnostic({
          type: 'long-prompt',
          titleZh: '长 Prompt 低产出',
          titleEn: 'Long prompt, weak payoff',
          descZh: `本会话出现超长用户输入，且输出/输入比只有 ${profile.outputInputRatio}，已经能看到明显的低产出倾向。`,
          descEn: `This session contains a very long user prompt and the output/input ratio is only ${profile.outputInputRatio}, which already shows a weak payoff pattern.`,
          estimatedWasteTokens,
          estimatedWasteCost: estimateCostFromTokens(profile.replay, estimatedWasteTokens),
          sessionId: profile.sessionId,
          sessionLabel: profile.sessionLabel,
        }),
      );
    }

    if (profile.avgOutputLength > 550 && profile.outputInputRatio > 7) {
      const estimatedWasteTokens = Math.min(
        profile.replay.meta.totalTokens,
        Math.round(
          Math.max(0, profile.avgOutputLength - 550) * Math.max(profile.responseCount, 1) * Math.min(1.4, profile.outputInputRatio / 7),
        ),
      );
      diagnostics.push(
        makeDiagnostic({
          type: 'verbose-output',
          titleZh: '输出明显过长',
          titleEn: 'Overly verbose output',
          descZh: `本会话回复平均长度约 ${profile.avgOutputLength} 字符，输出/输入比达到 ${profile.outputInputRatio}，已经出现“回答比需求更长”的迹象。`,
          descEn: `Average response length is about ${profile.avgOutputLength} chars while the output/input ratio reaches ${profile.outputInputRatio}. The answer is already noticeably longer than the request needs.`,
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

    let allDiagnostics = [
      ...detectRetryLoops(replays),
      ...detectLongPrompts(profiles),
      ...detectVerboseOutputs(profiles),
      ...detectExpensiveModels(profiles),
      ...detectContextBloat(profiles),
    ]
      .filter(diagnostic => diagnostic.estimatedWasteTokens > 0 || diagnostic.estimatedWasteCost > 0)
      .sort((a, b) => b.estimatedWasteCost - a.estimatedWasteCost || b.estimatedWasteTokens - a.estimatedWasteTokens);

    if (usingDemo && allDiagnostics.length === 0) {
      allDiagnostics = detectDemoFallbackDiagnostics(profiles)
        .filter(diagnostic => diagnostic.estimatedWasteTokens > 0 || diagnostic.estimatedWasteCost > 0)
        .sort((a, b) => b.estimatedWasteCost - a.estimatedWasteCost || b.estimatedWasteTokens - a.estimatedWasteTokens);
    }

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
