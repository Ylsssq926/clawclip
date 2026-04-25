import type { TokenWasteDiagnostic } from './token-waste-analyzer.js';

type SolutionType = 'tool' | 'config' | 'free-tier' | 'local-model';
type SolutionEffort = 'low' | 'medium' | 'high';
type TokenWasteType = TokenWasteDiagnostic['type'];

export interface Solution {
  id: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  type: SolutionType;
  effort: SolutionEffort;
  savingsEstimate: string;
  tool?: {
    name: string;
    github?: string;
    docs?: string;
    installCmd?: string;
  };
  freeTier?: {
    provider: string;
    freeLimit: string;
    model: string;
    url: string;
  };
  configSnippet?: string;
  tags: string[];
}

const TOKEN_WASTE_TYPES: TokenWasteType[] = [
  'retry-loop',
  'long-prompt',
  'verbose-output',
  'expensive-model',
  'context-bloat',
];

function isTokenWasteType(value: string): value is TokenWasteType {
  return TOKEN_WASTE_TYPES.includes(value as TokenWasteType);
}

function normalizeDiagnosticTypes(diagnosticTypes: string[]): TokenWasteType[] {
  const seen = new Set<TokenWasteType>();
  const normalized: TokenWasteType[] = [];

  for (const rawType of diagnosticTypes) {
    if (!isTokenWasteType(rawType) || seen.has(rawType)) continue;
    seen.add(rawType);
    normalized.push(rawType);
  }

  return normalized;
}

function escapeYamlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function resolvePremiumModel(modelName?: string): string {
  const normalized = modelName?.trim();
  return normalized || 'openai/gpt-5';
}

function buildLiteLLMRoutingSnippet(modelName?: string): string {
  return `model_list:
  - model_name: cheap-fast
    litellm_params:
      model: groq/llama-3.1-8b-instant

  - model_name: premium-primary
    litellm_params:
      model: ${escapeYamlString(resolvePremiumModel(modelName))}

  - model_name: smart-router
    litellm_params:
      model: auto_router/complexity_router
      complexity_router_config:
        tiers:
          SIMPLE: cheap-fast
          MEDIUM: cheap-fast
          COMPLEX: premium-primary
      complexity_router_default_model: cheap-fast`;
}

const LITELLM_CACHE_SNIPPET = `litellm_settings:
  cache: true
  cache_params:
    type: redis
    namespace: clawclip
    ttl: 600`;

const MANUAL_CONTEXT_SNIPPET = `history_window: 6
memory_strategy: rolling-summary
rules:
  - keep only the latest 6 turns verbatim
  - compress older turns into a <=200 token summary
  - inject retrieved docs only when they are referenced`;

const VERBOSE_OUTPUT_SNIPPET = `response_format:
  type: json_object
max_tokens: 300
stop:
  - "\n\nEND"
system: "Return only the requested fields."`;

function buildSolutionDatabase(modelName?: string): Solution[] {
  const premiumModel = resolvePremiumModel(modelName);

  return [
    {
      id: 'litellm-routing',
      title: 'LiteLLM smart router',
      titleZh: 'LiteLLM 智能路由',
      description: `Route simple requests away from ${premiumModel} and keep the premium model only for complex work.`,
      descriptionZh: `把简单请求从 ${premiumModel} 分流出去，只把复杂任务留给贵模型。`,
      type: 'tool',
      effort: 'medium',
      savingsEstimate: '40-85%',
      tool: {
        name: 'LiteLLM',
        github: 'https://github.com/BerriAI/litellm',
        docs: 'https://docs.litellm.ai/docs/proxy/auto_routing',
        installCmd: 'pip install "litellm[proxy]"',
      },
      configSnippet: buildLiteLLMRoutingSnippet(modelName),
      tags: ['expensive-model'],
    },
    {
      id: 'groq-free-tier',
      title: 'Groq free tier',
      titleZh: 'Groq 免费额度',
      description: 'Use Llama 3.1 8B for classification, extraction, and simple Q&A before spending on premium APIs.',
      descriptionZh: '把分类、提取、简单问答先放到 Llama 3.1 8B 免费额度上跑，再决定是否要用贵模型。',
      type: 'free-tier',
      effort: 'low',
      savingsEstimate: '100% within free limit',
      freeTier: {
        provider: 'Groq',
        freeLimit: '14.4K req/day · 500K tokens/day',
        model: 'llama-3.1-8b-instant',
        url: 'https://console.groq.com',
      },
      tags: ['expensive-model'],
    },
    {
      id: 'ollama-local-models',
      title: 'Ollama local models',
      titleZh: 'Ollama 本地模型',
      description: 'Run lightweight private or high-frequency tasks locally so the marginal token cost drops to zero.',
      descriptionZh: '把高频轻任务或隐私敏感任务放到本地跑，边际 token 成本可以降到零。',
      type: 'local-model',
      effort: 'medium',
      savingsEstimate: '100% marginal cost',
      tool: {
        name: 'Ollama',
        docs: 'https://docs.ollama.com/linux',
        installCmd: 'curl -fsSL https://ollama.com/install.sh | sh',
      },
      tags: ['expensive-model'],
    },
    {
      id: 'gptcache-semantic-cache',
      title: 'GPTCache semantic cache',
      titleZh: 'GPTCache 语义缓存',
      description: 'Short-circuit repeated or near-duplicate prompts so retries stop paying for the same answer twice.',
      descriptionZh: '把重复或近似重复的问题直接命中缓存，别为同一个答案重复付费。',
      type: 'tool',
      effort: 'medium',
      savingsEstimate: '100% on duplicate requests',
      tool: {
        name: 'GPTCache',
        github: 'https://github.com/zilliztech/GPTCache',
        docs: 'https://gptcache.readthedocs.io/en/latest/',
        installCmd: 'pip install gptcache',
      },
      tags: ['retry-loop'],
    },
    {
      id: 'litellm-redis-cache',
      title: 'LiteLLM Redis cache',
      titleZh: 'LiteLLM Redis 缓存',
      description: 'Turn on response caching in the gateway so identical retries are absorbed before they hit the model.',
      descriptionZh: '在网关层打开响应缓存，让相同重试先被拦住，不再打到模型。',
      type: 'config',
      effort: 'low',
      savingsEstimate: '20-40%',
      tool: {
        name: 'LiteLLM',
        github: 'https://github.com/BerriAI/litellm',
        docs: 'https://docs.litellm.ai/docs/proxy/caching',
        installCmd: 'pip install "litellm[proxy]"',
      },
      configSnippet: LITELLM_CACHE_SNIPPET,
      tags: ['retry-loop'],
    },
    {
      id: 'llmlingua-compression',
      title: 'LLMLingua compression',
      titleZh: 'LLMLingua 压缩',
      description: 'Compress long prompts before they reach the model to shrink context cost without rewriting the workflow.',
      descriptionZh: '在请求进入模型前先压缩长 prompt，不改主流程也能直接减上下文成本。',
      type: 'tool',
      effort: 'medium',
      savingsEstimate: 'Up to 20x compression',
      tool: {
        name: 'LLMLingua',
        github: 'https://github.com/microsoft/LLMLingua',
        docs: 'https://www.microsoft.com/en-us/research/project/llmlingua/llmlingua/',
        installCmd: 'pip install llmlingua',
      },
      tags: ['context-bloat', 'long-prompt'],
    },
    {
      id: 'manual-context-pruning',
      title: 'Rolling summaries + context window',
      titleZh: '滚动摘要 + 上下文窗口',
      description: 'Keep only the latest turns in full and replace older history with a short task summary.',
      descriptionZh: '只保留最近几轮完整对话，把更早历史改成短摘要。',
      type: 'config',
      effort: 'low',
      savingsEstimate: '15-50%',
      tool: {
        name: 'Anthropic long-context tips',
        docs: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips',
      },
      configSnippet: MANUAL_CONTEXT_SNIPPET,
      tags: ['context-bloat'],
    },
    {
      id: 'structured-output-guardrails',
      title: 'Structured output guardrails',
      titleZh: '结构化输出约束',
      description: 'Ask for JSON, cap max_tokens, and use stop sequences so answers end as soon as the task is done.',
      descriptionZh: '要求 JSON、限制 max_tokens、加停止序列，让回答在完成任务后及时停住。',
      type: 'config',
      effort: 'low',
      savingsEstimate: '10-30%',
      tool: {
        name: 'OpenAI Structured Outputs',
        docs: 'https://platform.openai.com/docs/guides/structured-outputs',
      },
      configSnippet: VERBOSE_OUTPUT_SNIPPET,
      tags: ['verbose-output'],
    },
  ];
}

export function getRecommendations(diagnosticTypes: string[], modelName?: string): Solution[] {
  const normalizedTypes = normalizeDiagnosticTypes(diagnosticTypes);
  if (normalizedTypes.length === 0) return [];

  return buildSolutionDatabase(modelName)
    .map((solution, index) => {
      const matchedIndexes = solution.tags
        .map(tag => normalizedTypes.indexOf(tag as TokenWasteType))
        .filter(position => position >= 0);

      if (matchedIndexes.length === 0) return null;

      return {
        solution,
        firstMatchIndex: Math.min(...matchedIndexes),
        matchedCount: matchedIndexes.length,
        index,
      };
    })
    .filter((item): item is { solution: Solution; firstMatchIndex: number; matchedCount: number; index: number } => item !== null)
    .sort(
      (left, right) =>
        left.firstMatchIndex - right.firstMatchIndex ||
        right.matchedCount - left.matchedCount ||
        left.index - right.index,
    )
    .map(item => item.solution);
}
