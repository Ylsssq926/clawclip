import type { TokenWasteDiagnostic } from './token-waste-analyzer.js';

type SolutionType = 'tool' | 'config' | 'free-tier' | 'local-model' | 'proxy';
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
  riskLevel?: 'low' | 'medium' | 'high';
  riskNote?: string;
  riskNoteZh?: string;
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
    signupUrl?: string;
    requiresCreditCard?: boolean;
    notes?: string;
    lastVerified?: string;
  };
  configSnippet?: string;
  recommendationPriority?: Partial<Record<TokenWasteType, number>>;
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

const DEFAULT_LITELLM_PRIMARY_MODEL = 'openai/gpt-5.4';

function sanitizePrimaryModelName(modelName?: string): string {
  const normalized = modelName?.trim()?.replace(/\s+/g, ' ');
  return normalized ? normalized : DEFAULT_LITELLM_PRIMARY_MODEL;
}

function buildLiteLLMRoutingSnippet(modelName?: string): string {
  const primaryModel = sanitizePrimaryModelName(modelName);

  return `# config.yaml
# Keep your current premium model for hard tasks: ${primaryModel}
model_list:
  - model_name: cheap-default
    litellm_params:
      model: gpt-5.4-mini
      api_key: os.environ/OPENAI_API_KEY
  - model_name: premium-primary
    litellm_params:
      model: "${primaryModel}"
      api_key: os.environ/OPENAI_API_KEY

router_settings:
  routing_strategy: "cost-based-routing"
  fallbacks:
    - premium-primary

# Run: litellm --config config.yaml --port 4000`;
}

function getPriorityForDiagnostic(solution: Solution, diagnosticType: TokenWasteType, fallbackIndex: number): number {
  return solution.recommendationPriority?.[diagnosticType] ?? 100 + fallbackIndex;
}

function buildSolutionDatabase(modelName?: string): Solution[] {
  return [
    // ===== 免费 tier 方案 =====
    {
      id: 'groq-free',
      title: 'Switch to Groq (Free)',
      titleZh: '切换到 Groq（免费）',
      description: 'Llama 3.1 8B on Groq: 500K tokens/day free, no credit card needed. Fastest inference available. Rate limit: 30 RPM.',
      descriptionZh: 'Groq 上的 Llama 3.1 8B：每天 50 万 token 免费，无需信用卡，推理速度极快。速率限制：30 RPM。',
      type: 'free-tier',
      effort: 'low',
      savingsEstimate: '100%',
      freeTier: {
        provider: 'Groq',
        model: 'llama-3.1-8b-instant',
        freeLimit: '500K tokens/day, 14,400 req/day',
        requiresCreditCard: false,
        url: 'https://console.groq.com',
        signupUrl: 'https://console.groq.com/keys',
        notes: '速率限制 30 RPM',
        lastVerified: '2026-04',
      },
      configSnippet: `# OpenAI-compatible endpoint
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEY=your_groq_key
# Model: llama-3.1-8b-instant (fast, free)
# Or: llama-3.3-70b-versatile (smarter, still free)`,
      recommendationPriority: {
        'expensive-model': 1,
      },
      tags: ['expensive-model', 'model-mismatch'],
    },
    {
      id: 'gemini-free',
      title: 'Switch to Gemini Flash-Lite (Free)',
      titleZh: '切换到 Gemini Flash-Lite（免费）',
      description: 'Google Gemini 2.5 Flash-Lite: 1,000 req/day free, 250K tokens/day. No credit card.',
      descriptionZh: 'Google Gemini 2.5 Flash-Lite：每天 1000 次请求免费，25 万 token，无需信用卡。',
      type: 'free-tier',
      effort: 'low',
      savingsEstimate: '100%',
      freeTier: {
        provider: 'Google',
        model: 'gemini-2.5-flash-lite',
        freeLimit: '1,000 req/day, 250K tokens/day',
        requiresCreditCard: false,
        url: 'https://aistudio.google.com',
        signupUrl: 'https://aistudio.google.com/apikey',
        lastVerified: '2026-04',
      },
      configSnippet: `# OpenAI-compatible via LiteLLM
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
OPENAI_API_KEY=your_gemini_key
# Model: gemini-2.5-flash-lite-preview-06-17`,
      recommendationPriority: {
        'expensive-model': 3,
      },
      tags: ['expensive-model'],
    },
    {
      id: 'openrouter-free',
      title: 'Use OpenRouter Free Models',
      titleZh: '使用 OpenRouter 免费模型',
      description: '25+ free models via one API. DeepSeek V3, Llama, Qwen and more. No credit card for basic use.',
      descriptionZh: '一个 API 访问 25+ 免费模型，包括 DeepSeek V3、Llama、Qwen 等，基础使用无需信用卡。',
      type: 'free-tier',
      effort: 'low',
      savingsEstimate: '100%',
      freeTier: {
        provider: 'OpenRouter',
        model: 'deepseek/deepseek-chat:free',
        freeLimit: '200 req/day (free), 1000 req/day (after $10 deposit)',
        requiresCreditCard: false,
        url: 'https://openrouter.ai',
        signupUrl: 'https://openrouter.ai/keys',
        lastVerified: '2026-04',
      },
      configSnippet: `# OpenAI-compatible
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=your_openrouter_key
# Free models end with :free
# e.g. deepseek/deepseek-chat:free
#      meta-llama/llama-3.1-8b-instruct:free`,
      recommendationPriority: {
        'expensive-model': 4,
      },
      tags: ['expensive-model'],
    },
    {
      id: 'deepseek-cheap',
      title: 'Switch to DeepSeek V3 (20x cheaper)',
      titleZh: '切换到 DeepSeek V3（便宜 20 倍）',
      description: 'DeepSeek V3.2: $0.14/M input tokens. 20-50x cheaper than GPT-5.4, comparable quality.',
      descriptionZh: 'DeepSeek V3.2：输入 $0.14/百万 token，比 GPT-5.4 便宜 20-50 倍，质量相当。',
      type: 'free-tier',
      effort: 'low',
      savingsEstimate: '95%',
      freeTier: {
        provider: 'DeepSeek',
        model: 'deepseek-chat',
        freeLimit: '5M tokens for new users',
        requiresCreditCard: false,
        url: 'https://platform.deepseek.com',
        signupUrl: 'https://platform.deepseek.com/api_keys',
        lastVerified: '2026-04',
      },
      configSnippet: `# OpenAI-compatible
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_API_KEY=your_deepseek_key
# Model: deepseek-chat (V3.2, $0.14/M input)
# Or: deepseek-reasoner (R1, for complex reasoning)`,
      recommendationPriority: {
        'expensive-model': 5,
      },
      tags: ['expensive-model'],
    },
    {
      id: 'cerebras-free',
      title: 'Switch to Cerebras (Free)',
      titleZh: '切换到 Cerebras（免费）',
      description: 'Llama 3.3 70B: 1M tokens/day free. Fastest inference (2000+ tok/s). 30 RPM, no credit card.',
      descriptionZh: 'Llama 3.3 70B：每天 100 万 token 免费，推理速度极快（2000+ tok/s），30 RPM，无需信用卡。',
      type: 'free-tier',
      effort: 'low',
      savingsEstimate: '100%',
      freeTier: {
        provider: 'Cerebras',
        model: 'llama-3.3-70b',
        freeLimit: '1M tokens/day, 30 RPM',
        requiresCreditCard: false,
        url: 'https://cloud.cerebras.ai',
        signupUrl: 'https://cloud.cerebras.ai/register',
        notes: 'Email verification required. Llama 3.3 70B only.',
        lastVerified: '2026-04',
      },
      configSnippet: `# OpenAI-compatible
OPENAI_BASE_URL=https://api.cerebras.ai/v1
OPENAI_API_KEY=your_cerebras_key
# Model: llama-3.3-70b (1M tokens/day free, 2000+ tok/s)`,
      recommendationPriority: {
        'expensive-model': 2,
      },
      tags: ['expensive-model'],
    },

    // ===== 成本优化工具 =====
    {
      id: 'anthropic-cache',
      title: 'Enable Anthropic Prompt Caching',
      titleZh: '开启 Anthropic Prompt Caching',
      description: 'Cache your system prompt. Cached tokens cost 90% less ($0.30/M vs $3.00/M). Saves most on long system prompts.',
      descriptionZh: '缓存系统提示词，缓存 token 成本降低 90%（$0.30/M vs $3.00/M），系统提示词越长越省。',
      type: 'config',
      effort: 'low',
      savingsEstimate: '90% on cached tokens',
      configSnippet: `# Add cache_control to your system prompt
{
  "role": "system",
  "content": [
    {
      "type": "text",
      "text": "Your long system prompt here...",
      "cache_control": {"type": "ephemeral"}
    }
  ]
}
# Cached reads: $0.30/M (vs $3.00/M normal)
# Break-even: just 1.4 reads per cache write`,
      recommendationPriority: {
        'long-prompt': 2,
        'context-bloat': 3,
        'expensive-model': 6,
      },
      tags: ['long-prompt', 'context-bloat', 'expensive-model'],
    },
    {
      id: 'llmlingua',
      title: 'Compress Prompts with LLMLingua-2',
      titleZh: '用 LLMLingua-2 压缩 Prompt',
      description: 'Microsoft research tool. 20x compression with <5% quality loss. Works on RAG context, long docs, conversation history.',
      descriptionZh: '微软研究院工具，最高 20 倍压缩，质量损失 <5%，适合 RAG 上下文、长文档、对话历史。',
      type: 'tool',
      effort: 'medium',
      savingsEstimate: '75-95% on long prompts',
      tool: {
        name: 'LLMLingua-2',
        github: 'https://github.com/microsoft/LLMLingua',
        docs: 'https://llmlingua.com/',
        installCmd: 'pip install llmlingua',
      },
      configSnippet: `from llmlingua import PromptCompressor

compressor = PromptCompressor(
    model_name="microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
    use_llmlingua2=True,
)

compressed = compressor.compress_prompt(
    your_long_prompt,
    rate=0.33,  # Keep 33% of tokens
    force_tokens=['\\n', '?'],
)
print(f"Saved {compressed['saving']} tokens")`,
      recommendationPriority: {
        'long-prompt': 0,
        'context-bloat': 0,
        'verbose-output': 2,
      },
      tags: ['long-prompt', 'context-bloat', 'verbose-output'],
    },
    {
      id: 'litellm-routing',
      title: 'Set Up LiteLLM Model Routing',
      titleZh: '配置 LiteLLM 模型路由',
      description: 'Route simple tasks to cheap models, complex tasks to powerful ones. 40-85% cost reduction with 95% quality maintained.',
      descriptionZh: '简单任务路由到便宜模型，复杂任务路由到强模型，成本降低 40-85%，质量保持 95%。',
      type: 'tool',
      effort: 'medium',
      savingsEstimate: '40-85%',
      tool: {
        name: 'LiteLLM',
        github: 'https://github.com/BerriAI/litellm',
        docs: 'https://docs.litellm.ai/docs/routing',
        installCmd: 'pip install "litellm[proxy]"',
      },
      configSnippet: buildLiteLLMRoutingSnippet(modelName),
      recommendationPriority: {
        'expensive-model': 0,
      },
      tags: ['expensive-model', 'model-mismatch'],
    },
    {
      id: 'ollama-local',
      title: 'Run Models Locally with Ollama',
      titleZh: '用 Ollama 在本地跑模型',
      description: 'Zero marginal cost after setup. Break-even vs GPT-5.4-mini at ~500 req/day. Best for privacy-sensitive or high-volume tasks.',
      descriptionZh: '安装后边际成本为零，每天 500+ 请求时比 GPT-5.4-mini 更划算，适合隐私敏感或高频任务。',
      type: 'local-model',
      effort: 'medium',
      savingsEstimate: '100% (after hardware)',
      tool: {
        name: 'Ollama',
        github: 'https://github.com/ollama/ollama',
        docs: 'https://ollama.com',
        installCmd: 'curl -fsSL https://ollama.com/install.sh | sh',
      },
      configSnippet: `# Install and run a model
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:8b  # Good for most tasks
ollama pull qwen2.5:7b   # Better for Chinese

# OpenAI-compatible API at localhost:11434
OPENAI_API_KEY=ollama  # any string works
OPENAI_BASE_URL=http://localhost:11434/v1
# Model: llama3.1:8b

# Break-even vs GPT-5.4-mini: ~500 req/day`,
      recommendationPriority: {
        'expensive-model': 2,
        'retry-loop': 4,
      },
      tags: ['expensive-model', 'retry-loop'],
    },
    {
      id: 'claude-code-proxy',
      title: 'claude-code-proxy: Use Claude via OpenAI API',
      titleZh: 'claude-code-proxy：用 OpenAI 格式调用 Claude',
      description: 'Wraps Claude Code SDK to expose an OpenAI-compatible endpoint. Use your own Claude subscription. 3.4k stars, actively maintained.',
      descriptionZh: '把 Claude Code SDK 包装成 OpenAI 兼容接口，使用你自己的 Claude 订阅。3.4k stars，活跃维护。',
      type: 'proxy',
      effort: 'low',
      savingsEstimate: 'Use subscription instead of API',
      riskLevel: 'medium',
      riskNote: 'Uses Claude CLI auth, not official API. May break on Claude updates.',
      riskNoteZh: '使用 Claude CLI 认证，非官方 API 路径，Claude 更新时可能失效。',
      tool: {
        name: 'claude-code-proxy',
        github: 'https://github.com/1rgs/claude-code-proxy',
        installCmd: 'pip install claude-code-proxy',
      },
      configSnippet: `# Install
pip install claude-code-proxy

# Run (uses your Claude CLI auth)
claude-code-proxy --port 8080

# Point your app to:
OPENAI_BASE_URL=http://localhost:8080/v1
OPENAI_API_KEY=any-string`,
      tags: ['expensive-model'],
    },
    {
      id: 'codex-proxy',
      title: 'codex-proxy: Use Codex/Copilot via API',
      titleZh: 'codex-proxy：通过 API 使用 Codex/Copilot',
      description: 'Wraps OpenAI Codex CLI to expose OpenAI-compatible endpoint. 815 stars, updated daily.',
      descriptionZh: '把 OpenAI Codex CLI 包装成 OpenAI 兼容接口，815 stars，每日更新。',
      type: 'proxy',
      effort: 'low',
      savingsEstimate: 'Use Copilot subscription instead of API',
      riskLevel: 'medium',
      riskNote: 'Uses Codex CLI auth. Requires active Copilot subscription.',
      riskNoteZh: '使用 Codex CLI 认证，需要有效的 Copilot 订阅。',
      tool: {
        name: 'codex-proxy',
        github: 'https://github.com/icebear0828/codex-proxy',
        installCmd: 'npm install -g codex-proxy',
      },
      configSnippet: `# Install
npm install -g codex-proxy

# Run
codex-proxy --port 8080

# Point your app to:
OPENAI_BASE_URL=http://localhost:8080/v1
OPENAI_API_KEY=any-string`,
      tags: ['expensive-model'],
    },
    {
      id: 'cliproxyapi',
      title: 'CLIProxyAPI: Multi-account API gateway',
      titleZh: 'CLIProxyAPI：多账号 API 网关',
      description: 'Pool multiple Claude/Gemini/Codex accounts into one API gateway. 28k stars. For teams sharing subscriptions.',
      descriptionZh: '把多个 Claude/Gemini/Codex 账号池化成一个 API 网关，28k stars，适合团队共享订阅。',
      type: 'proxy',
      effort: 'medium',
      savingsEstimate: 'Share subscription across team',
      riskLevel: 'high',
      riskNote: 'Account pooling may violate ToS. Use only accounts you own. Risk of account suspension.',
      riskNoteZh: '账号池化可能违反服务条款，只使用你自己的账号，有封号风险。',
      tool: {
        name: 'CLIProxyAPI',
        github: 'https://github.com/router-for-me/CLIProxyAPI',
        docs: 'https://github.com/router-for-me/CLIProxyAPI#readme',
      },
      configSnippet: `# See GitHub for full setup
# Requires: Node.js, your own accounts
git clone https://github.com/router-for-me/CLIProxyAPI
cd CLIProxyAPI && npm install
# Configure accounts in config.json
npm start`,
      tags: ['expensive-model'],
    },
    {
      id: 'openclaw-zero-token',
      title: 'openclaw-zero-token: Web session proxy',
      titleZh: 'openclaw-zero-token：网页会话代理',
      description: 'Uses browser login session to proxy Claude/Gemini/ChatGPT web endpoints. 4.5k stars. High risk.',
      descriptionZh: '通过浏览器登录会话代理 Claude/Gemini/ChatGPT 网页端点，4.5k stars，高风险。',
      type: 'proxy',
      effort: 'high',
      savingsEstimate: 'Use web subscription instead of API',
      riskLevel: 'high',
      riskNote: 'Uses browser cookies/tokens. Sessions expire frequently. High risk of account suspension. Not recommended for production.',
      riskNoteZh: '使用浏览器 Cookie/Token，会话频繁过期，封号风险高，不建议用于生产环境。',
      tool: {
        name: 'openclaw-zero-token',
        github: 'https://github.com/linuxhsj/openclaw-zero-token',
      },
      configSnippet: `# See GitHub for setup instructions
# Requires: Node.js, Playwright, your own accounts
git clone https://github.com/linuxhsj/openclaw-zero-token
# Follow README for browser auth setup`,
      tags: ['expensive-model'],
    },

    // ===== 保留原有方案 =====
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
      recommendationPriority: {
        'retry-loop': 0,
      },
      tags: ['retry-loop'],
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
      recommendationPriority: {
        'retry-loop': 1,
      },
      tags: ['retry-loop'],
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
      recommendationPriority: {
        'context-bloat': 1,
      },
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
      recommendationPriority: {
        'verbose-output': 0,
      },
      tags: ['verbose-output'],
    },
  ];
}

export function getRecommendations(diagnosticTypes: string[], modelName?: string): Solution[] {
  const normalizedTypes = normalizeDiagnosticTypes(diagnosticTypes);
  if (normalizedTypes.length === 0) return [];

  return buildSolutionDatabase(modelName)
    .map((solution, index) => {
      const matchedTypes = normalizedTypes.filter(type => solution.tags.includes(type));
      if (matchedTypes.length === 0) return null;

      const firstMatchedType = matchedTypes[0];

      return {
        solution,
        firstMatchIndex: normalizedTypes.indexOf(firstMatchedType),
        firstMatchedType,
        matchedCount: matchedTypes.length,
        priority: getPriorityForDiagnostic(solution, firstMatchedType, index),
        index,
      };
    })
    .filter(
      (
        item,
      ): item is {
        solution: Solution;
        firstMatchIndex: number;
        firstMatchedType: TokenWasteType;
        matchedCount: number;
        priority: number;
        index: number;
      } => item !== null,
    )
    .sort(
      (left, right) =>
        left.firstMatchIndex - right.firstMatchIndex ||
        left.priority - right.priority ||
        right.matchedCount - left.matchedCount ||
        left.index - right.index,
    )
    .map(item => item.solution);
}
