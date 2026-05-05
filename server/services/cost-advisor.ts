import { costParser } from './cost-parser.js';
import { generateOpenClawConfig, generateZeroClawConfig, type GeneratedConfig, type PresetType } from './config-generator.js';
import { getRecommendations, type Solution } from './solution-recommender.js';
import { tokenWasteAnalyzer, type TokenWasteDiagnostic } from './token-waste-analyzer.js';

export type CostAdvisorActionType = 'switch-model' | 'trim-prompt' | 'trim-output' | 'reduce-retries';
export type CostAdvisorConfidence = 'low' | 'medium' | 'high';
export type CostAdvisorRiskLevel = 'low' | 'medium' | 'high';

interface AdvisorSavingSuggestion {
  currentModel: string;
  alternativeModel: string;
  currentCost: number;
  alternativeCost: number;
  saving: number;
  tokens: number;
  reasonType?: CostAdvisorActionType;
  reasonZh?: string;
  reasonEn?: string;
  actionZh?: string;
  actionEn?: string;
  qualityGuardrailZh?: string;
  qualityGuardrailEn?: string;
  priority?: CostAdvisorConfidence;
  sessionId?: string;
  sessionLabel?: string;
}

export interface CostAdvisorAction {
  id: string;
  type: CostAdvisorActionType;
  title: string;
  titleZh: string;
  reason: string;
  reasonZh: string;
  nextStep: string;
  nextStepZh: string;
  guardrail: string;
  guardrailZh: string;
  evidence: string[];
  estimatedSavingsUsd: number;
  estimatedSavingsPercent: number;
  riskLevel: CostAdvisorRiskLevel;
  priority: CostAdvisorConfidence;
  currentModel?: string;
  alternativeModel?: string;
  sessionId?: string;
  sessionLabel?: string;
  relatedSolutions: Solution[];
  implementation: {
    steps: string[];
    stepsZh: string[];
    configs: {
      openclaw: GeneratedConfig;
      zeroclaw: GeneratedConfig;
    };
  };
  verifyWith: {
    route: 'compare' | 'benchmark' | 'replay';
    label: string;
    labelZh: string;
    sessionId?: string;
  };
}

export interface CostAdvisorPlan {
  summary: {
    totalCost: number;
    totalTokens: number;
    estimatedSavingsUsd: number;
    estimatedSavingsPercent: number;
    confidence: CostAdvisorConfidence;
    actionCount: number;
    dataMode: 'demo' | 'real' | 'unknown';
  };
  primaryAction: CostAdvisorAction | null;
  secondaryActions: CostAdvisorAction[];
  diagnostics: TokenWasteDiagnostic[];
}

function roundMoney(value: number): number {
  return Math.round(Math.max(0, value) * 1_000_000) / 1_000_000;
}

function roundPercent(value: number): number {
  return Math.round(Math.max(0, value) * 10) / 10;
}

function resolveActionType(suggestion: AdvisorSavingSuggestion): CostAdvisorActionType {
  if (suggestion.reasonType) return suggestion.reasonType;
  if (suggestion.currentModel && suggestion.alternativeModel && suggestion.currentModel !== suggestion.alternativeModel) {
    return 'switch-model';
  }
  return 'trim-prompt';
}

function mapActionToDiagnosticType(type: CostAdvisorActionType): TokenWasteDiagnostic['type'] {
  switch (type) {
    case 'switch-model':
      return 'expensive-model';
    case 'reduce-retries':
      return 'retry-loop';
    case 'trim-output':
      return 'verbose-output';
    case 'trim-prompt':
    default:
      return 'context-bloat';
  }
}

function titleForAction(type: CostAdvisorActionType): Pick<CostAdvisorAction, 'title' | 'titleZh' | 'riskLevel' | 'verifyWith'> {
  switch (type) {
    case 'switch-model':
      return {
        title: 'Pilot a cheaper model for light tasks',
        titleZh: '优先灰度切换轻任务模型',
        riskLevel: 'medium',
        verifyWith: { route: 'compare', label: 'Compare the same task after switching', labelZh: '切换后用同一任务对比验证' },
      };
    case 'reduce-retries':
      return {
        title: 'Cap failed tool retries first',
        titleZh: '先给失败工具调用加重试上限',
        riskLevel: 'low',
        verifyWith: { route: 'replay', label: 'Check the failed replay steps', labelZh: '查看失败回放步骤' },
      };
    case 'trim-output':
      return {
        title: 'Limit verbose final answers',
        titleZh: '先限制冗长输出',
        riskLevel: 'low',
        verifyWith: { route: 'benchmark', label: 'Validate output quality', labelZh: '验证输出质量' },
      };
    case 'trim-prompt':
    default:
      return {
        title: 'Trim repeated context before changing models',
        titleZh: '换模型前先瘦身重复上下文',
        riskLevel: 'low',
        verifyWith: { route: 'compare', label: 'Compare before and after context trimming', labelZh: '对比上下文瘦身前后' },
      };
  }
}

function presetForSuggestion(suggestion: AdvisorSavingSuggestion): PresetType {
  const alternative = suggestion.alternativeModel?.toLowerCase() ?? '';
  if (alternative.includes('ollama')) return 'zero-bill';
  if (suggestion.reasonType === 'switch-model') return 'cheap-cloud';
  return 'hybrid';
}

function implementationSteps(type: CostAdvisorActionType): { steps: string[]; stepsZh: string[] } {
  switch (type) {
    case 'reduce-retries':
      return {
        steps: [
          'Add a retry limit of 1-2 attempts for tool failures.',
          'Do not retry deterministic errors such as 404, ENOENT, invalid schema, or permission denied.',
          'Re-run the linked session and confirm failed tool spans disappear.',
        ],
        stepsZh: [
          '给工具失败加 1-2 次重试上限。',
          '对 404、ENOENT、schema 错误、权限错误这类确定性失败不要重试。',
          '重跑关联会话，确认失败工具链路不再反复出现。',
        ],
      };
    case 'trim-output':
      return {
        steps: [
          'Set max output tokens or require a summary-first response format.',
          'Only expand details when the user explicitly asks for them.',
          'Run Benchmark or Compare to ensure the shorter answer still satisfies the task.',
        ],
        stepsZh: [
          '设置最大输出 token，或要求先摘要后展开。',
          '只有用户明确要求时才展开细节。',
          '用 Benchmark 或 Compare 确认缩短后仍满足任务。',
        ],
      };
    case 'trim-prompt':
      return {
        steps: [
          'Keep only the latest turns verbatim and summarize older context.',
          'Move repeated background into retrieval or cached prompt prefixes.',
          'Compare the same task before and after trimming context.',
        ],
        stepsZh: [
          '只保留最近几轮原文，旧上下文改成摘要。',
          '把重复背景迁移到检索或可缓存的 prompt 前缀。',
          '用同一任务对比瘦身前后的效果。',
        ],
      };
    case 'switch-model':
    default:
      return {
        steps: [
          'Route only the linked light task type to the cheaper model first.',
          'Keep the premium model as fallback for complex or high-value tasks.',
          'Re-run the same task and compare cost, tokens, and quality before expanding rollout.',
        ],
        stepsZh: [
          '先只把关联的轻任务路由到更便宜模型。',
          '复杂或高价值任务继续保留强模型作为 fallback。',
          '重跑同一任务，对比成本、token 和质量后再扩大范围。',
        ],
      };
  }
}

function buildEvidence(suggestion: AdvisorSavingSuggestion, diagnostics: TokenWasteDiagnostic[]): string[] {
  const evidence = new Set<string>();
  if (suggestion.sessionLabel) evidence.add(suggestion.sessionLabel);
  if (suggestion.sessionId) evidence.add(`session:${suggestion.sessionId}`);
  if (suggestion.currentModel && suggestion.alternativeModel && suggestion.currentModel !== suggestion.alternativeModel) {
    evidence.add(`${suggestion.currentModel} → ${suggestion.alternativeModel}`);
  }
  const matchingDiagnostics = diagnostics.filter(diagnostic => {
    if (suggestion.sessionId && diagnostic.sessionId === suggestion.sessionId) return true;
    return suggestion.reasonType != null && diagnostic.type === mapActionToDiagnosticType(suggestion.reasonType);
  });
  for (const diagnostic of matchingDiagnostics.slice(0, 2)) {
    evidence.add(diagnostic.titleZh || diagnostic.titleEn);
    if (diagnostic.sessionLabel) evidence.add(diagnostic.sessionLabel);
  }
  return Array.from(evidence);
}

function buildAdvisorAction(
  suggestion: AdvisorSavingSuggestion,
  index: number,
  totalCost: number,
  diagnostics: TokenWasteDiagnostic[],
): CostAdvisorAction {
  const type = resolveActionType(suggestion);
  const meta = titleForAction(type);
  const preset = presetForSuggestion(suggestion);
  const currentModel = suggestion.currentModel || suggestion.alternativeModel || 'gpt-4o';
  const stepPlan = implementationSteps(type);
  const relatedSolutions = getRecommendations([mapActionToDiagnosticType(type)], currentModel).slice(0, 3);
  const estimatedSavingsPercent = totalCost > 0 ? roundPercent((suggestion.saving / totalCost) * 100) : 0;

  return {
    id: `${type}-${suggestion.sessionId ?? suggestion.currentModel ?? index}`,
    type,
    title: meta.title,
    titleZh: meta.titleZh,
    reason: suggestion.reasonEn || suggestion.reasonZh || meta.title,
    reasonZh: suggestion.reasonZh || suggestion.reasonEn || meta.titleZh,
    nextStep: suggestion.actionEn || stepPlan.steps[0],
    nextStepZh: suggestion.actionZh || stepPlan.stepsZh[0],
    guardrail: suggestion.qualityGuardrailEn || 'Validate on the same task before expanding rollout.',
    guardrailZh: suggestion.qualityGuardrailZh || '扩大范围前先用同一任务验证质量。',
    evidence: buildEvidence(suggestion, diagnostics),
    estimatedSavingsUsd: roundMoney(suggestion.saving),
    estimatedSavingsPercent,
    riskLevel: meta.riskLevel,
    priority: suggestion.priority ?? (index === 0 ? 'medium' : 'low'),
    currentModel: suggestion.currentModel || undefined,
    alternativeModel: suggestion.alternativeModel || undefined,
    sessionId: suggestion.sessionId,
    sessionLabel: suggestion.sessionLabel,
    relatedSolutions,
    implementation: {
      ...stepPlan,
      configs: {
        openclaw: generateOpenClawConfig(currentModel, preset),
        zeroclaw: generateZeroClawConfig(currentModel, preset),
      },
    },
    verifyWith: {
      ...meta.verifyWith,
      sessionId: suggestion.sessionId,
    },
  };
}

function resolveConfidence(suggestions: AdvisorSavingSuggestion[], estimatedSavingsUsd: number): CostAdvisorConfidence {
  const first = suggestions[0];
  if (!first || estimatedSavingsUsd <= 0) return 'low';
  if (first.priority === 'high') return 'high';
  return first.priority === 'medium' ? 'medium' : 'low';
}

export function buildCostAdvisorPlan(days = 30): CostAdvisorPlan {
  const stats = costParser.getUsageStats(days);
  const savings = costParser.getSavingSuggestions(days);
  const wasteReport = tokenWasteAnalyzer.getReport(days);
  const suggestions = savings.suggestions as AdvisorSavingSuggestion[];
  const estimatedSavingsUsd = roundMoney(savings.totalPotentialSaving);
  const estimatedSavingsPercent = stats.totalCost > 0 ? roundPercent((estimatedSavingsUsd / stats.totalCost) * 100) : 0;
  const actions = suggestions.map((suggestion, index) =>
    buildAdvisorAction(suggestion, index, stats.totalCost, wasteReport.diagnostics),
  );

  return {
    summary: {
      totalCost: roundMoney(stats.totalCost),
      totalTokens: stats.totalTokens,
      estimatedSavingsUsd,
      estimatedSavingsPercent,
      confidence: resolveConfidence(suggestions, estimatedSavingsUsd),
      actionCount: actions.length,
      dataMode: wasteReport.summary.usingDemo ? 'demo' : stats.totalCost > 0 ? 'real' : 'unknown',
    },
    primaryAction: actions[0] ?? null,
    secondaryActions: actions.slice(1, 3),
    diagnostics: wasteReport.diagnostics.slice(0, 5),
  };
}
