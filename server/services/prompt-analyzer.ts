import type { SessionReplay } from '../types/replay.js';
import { DEMO_SESSIONS } from './demo-sessions.js';
import { sessionParser } from './session-parser.js';

export interface PromptPattern {
  sessionId: string;
  sessionLabel: string;
  avgPromptLength: number;
  avgOutputLength: number;
  outputInputRatio: number;
  toolTriggerRate: number;
  totalTokens: number;
  totalCost: number;
  stepCount: number;
}

export interface PromptInsightsResult {
  patterns: PromptPattern[];
  summary: {
    avgPromptLength: number;
    avgOutputInputRatio: number;
    avgToolTriggerRate: number;
    totalSessions: number;
    efficientCount: number;
    wastefulCount: number;
  };
  tips: Array<{
    type: 'good' | 'warning' | 'tip';
    messageZh: string;
    messageEn: string;
  }>;
}

function getLatestReplayTimestamp(replays: SessionReplay[]): number {
  return replays.reduce((latest, replay) => Math.max(latest, replay.meta.endTime.getTime()), 0);
}

function buildPromptPatterns(replays: SessionReplay[], days?: number, referenceNow = Date.now()): PromptPattern[] {
  const cutoff = days ? referenceNow - days * 86400_000 : 0;
  const patterns: PromptPattern[] = [];

  for (const replay of replays) {
    const meta = replay.meta;
    if (cutoff && meta.endTime.getTime() < cutoff) continue;
    if (!replay.steps.length) continue;

    let userTokens = 0;
    let userCount = 0;
    let outputTokens = 0;
    let outputCount = 0;
    let toolCalls = 0;

    for (const step of replay.steps) {
      if (step.type === 'user') {
        userTokens += step.content.length;
        userCount++;
      } else if (step.type === 'response') {
        outputTokens += step.content.length;
        outputCount++;
      } else if (step.type === 'tool_call') {
        toolCalls++;
      }
    }

    if (userCount === 0) continue;
    if (outputCount === 0 && toolCalls === 0) continue;

    const avgPromptLength = Math.round(userTokens / userCount);
    const avgOutputLength = outputCount > 0 ? Math.round(outputTokens / outputCount) : 0;
    const outputInputRatio = userTokens > 0 ? +(outputTokens / userTokens).toFixed(2) : 0;
    const toolTriggerRate = +(toolCalls / replay.steps.length).toFixed(2);

    patterns.push({
      sessionId: meta.id,
      sessionLabel: (meta.sessionLabel || meta.summary || meta.agentName).slice(0, 60),
      avgPromptLength,
      avgOutputLength,
      outputInputRatio,
      toolTriggerRate,
      totalTokens: meta.totalTokens,
      totalCost: meta.totalCost,
      stepCount: replay.steps.length,
    });
  }

  patterns.sort((a, b) => b.outputInputRatio - a.outputInputRatio);
  return patterns;
}

export function getPromptInsights(days?: number): PromptInsightsResult {
  const realReplays = sessionParser.getRealReplays();
  const realPatterns = buildPromptPatterns(realReplays, days, Date.now());
  const usingDemo = realPatterns.length === 0;
  const patterns = usingDemo
    ? buildPromptPatterns(DEMO_SESSIONS, days, getLatestReplayTimestamp(DEMO_SESSIONS))
    : realPatterns;

  const total = patterns.length;
  const avgPromptLength = total > 0 ? Math.round(patterns.reduce((s, p) => s + p.avgPromptLength, 0) / total) : 0;
  const avgOutputInputRatio = total > 0 ? +(patterns.reduce((s, p) => s + p.outputInputRatio, 0) / total).toFixed(2) : 0;
  const avgToolTriggerRate = total > 0 ? +(patterns.reduce((s, p) => s + p.toolTriggerRate, 0) / total).toFixed(2) : 0;

  const efficientCount = patterns.filter(p => p.outputInputRatio > 3 && p.avgPromptLength < 500).length;
  const wastefulCount = patterns.filter(p => p.outputInputRatio < 0.5 && p.avgPromptLength > 1000).length;

  const tips: PromptInsightsResult['tips'] = [];

  if (efficientCount > 0) {
    tips.push({
      type: 'good',
      messageZh: `${efficientCount} 个会话的 prompt 简短且产出丰富（输出/输入比 >3），效率优秀。`,
      messageEn: `${efficientCount} session(s) have short prompts with rich output (output/input ratio >3). Highly efficient.`,
    });
  }

  if (wastefulCount > 0) {
    tips.push({
      type: 'warning',
      messageZh: `${wastefulCount} 个会话的 prompt 冗长但产出不多（输出/输入比 <0.5），建议精简指令。`,
      messageEn: `${wastefulCount} session(s) have long prompts but low output (ratio <0.5). Consider simplifying instructions.`,
    });
  }

  if (avgToolTriggerRate > 0.4) {
    tips.push({
      type: 'tip',
      messageZh: `工具调用占比平均 ${Math.round(avgToolTriggerRate * 100)}%，Agent 倾向于大量使用工具，注意工具调用成本。`,
      messageEn: `Tool calls average ${Math.round(avgToolTriggerRate * 100)}% of steps. Your Agent relies heavily on tools — watch tool call costs.`,
    });
  }

  if (usingDemo && total > 0) {
    tips.unshift({
      type: 'tip',
      messageZh: realReplays.length > 0
        ? '当前真实会话缺少可分析的 Prompt 样本，已自动回退为 Demo 会话结果。'
        : '当前展示的是 Demo 会话的 Prompt 分析，接入 OpenClaw 后会自动切换为真实数据。',
      messageEn: realReplays.length > 0
        ? 'Current real sessions do not contain analyzable prompt samples, so demo prompt insights are shown instead.'
        : 'You are viewing prompt insights from demo sessions. Connect OpenClaw to switch to real data automatically.',
    });
  }

  if (total === 0) {
    tips.push({
      type: 'tip',
      messageZh: usingDemo
        ? 'Demo 会话暂无符合时间范围的数据，可扩大时间范围后重试。'
        : '暂无真实会话数据，连接 OpenClaw 后即可分析 prompt 效率。',
      messageEn: usingDemo
        ? 'No demo sessions match the selected time range. Try a wider window.'
        : 'No real session data yet. Connect OpenClaw to analyze prompt efficiency.',
    });
  }

  return {
    patterns: patterns.slice(0, 20),
    summary: {
      avgPromptLength,
      avgOutputInputRatio,
      avgToolTriggerRate,
      totalSessions: total,
      efficientCount,
      wastefulCount,
    },
    tips,
  };
}
