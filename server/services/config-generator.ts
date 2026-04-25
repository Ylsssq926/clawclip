export type RuntimeType = 'openclaw' | 'zeroclaw';
export type PresetType = 'zero-bill' | 'cheap-cloud' | 'hybrid';

export interface GeneratedConfig {
  runtime: RuntimeType;
  preset: PresetType;
  presetName: string;
  presetNameZh: string;
  description: string;
  descriptionZh: string;
  estimatedSavings: string;

  configFile: {
    path: string;
    content: string;
    format: 'json' | 'toml';
  };

  envVars?: {
    name: string;
    value: string;
    description: string;
  }[];

  steps: {
    order: number;
    title: string;
    titleZh: string;
    command?: string;
    note?: string;
    noteZh?: string;
  }[];

  warning?: string;
  warningZh?: string;
}

function isClaudeModel(model: string): boolean {
  const lower = model.toLowerCase();
  return lower.includes('claude') || lower.includes('anthropic');
}

function isGPTModel(model: string): boolean {
  const lower = model.toLowerCase();
  return lower.includes('gpt') || lower.includes('openai');
}

export function generateOpenClawConfig(
  currentModel: string,
  preset: PresetType,
): GeneratedConfig {
  if (preset === 'zero-bill') {
    return {
      runtime: 'openclaw',
      preset: 'zero-bill',
      presetName: 'Zero Bill (Local Ollama)',
      presetNameZh: '零账单（本地 Ollama）',
      description: 'Run models locally with Ollama. Zero marginal cost after setup.',
      descriptionZh: '用 Ollama 在本地跑模型，安装后边际成本为零。',
      estimatedSavings: '100%',
      configFile: {
        path: '~/.openclaw/openclaw.json',
        content: JSON.stringify(
          {
            env: {
              OLLAMA_API_KEY: 'ollama-local',
            },
            agents: {
              defaults: {
                model: {
                  primary: 'ollama/qwen2.5:7b',
                },
              },
            },
          },
          null,
          2,
        ),
        format: 'json',
      },
      steps: [
        {
          order: 1,
          title: 'Install Ollama',
          titleZh: '安装 Ollama',
          command: 'curl -fsSL https://ollama.com/install.sh | sh',
          note: 'For Windows, download from https://ollama.com/download',
          noteZh: 'Windows 用户请从 https://ollama.com/download 下载安装',
        },
        {
          order: 2,
          title: 'Pull a model',
          titleZh: '拉取模型',
          command: 'ollama pull qwen2.5:7b',
          note: 'Or try llama3.1:8b for English tasks',
          noteZh: '或者用 llama3.1:8b 处理英文任务',
        },
        {
          order: 3,
          title: 'Copy config to ~/.openclaw/openclaw.json',
          titleZh: '复制配置到 ~/.openclaw/openclaw.json',
        },
        {
          order: 4,
          title: 'Restart OpenClaw',
          titleZh: '重启 OpenClaw',
        },
      ],
      warning: 'Requires 8GB+ RAM. Model quality may be lower than cloud models.',
      warningZh: '需要 8GB+ 内存，模型质量可能低于云端模型。',
    };
  }

  if (preset === 'cheap-cloud') {
    const useDeepSeek = isClaudeModel(currentModel) || !isGPTModel(currentModel);

    if (useDeepSeek) {
      return {
        runtime: 'openclaw',
        preset: 'cheap-cloud',
        presetName: 'Cheap Cloud (DeepSeek)',
        presetNameZh: '便宜云端（DeepSeek）',
        description: 'DeepSeek V3: $0.14/M input tokens. 20-50x cheaper than GPT-4o.',
        descriptionZh: 'DeepSeek V3：输入 $0.14/百万 token，比 GPT-4o 便宜 20-50 倍。',
        estimatedSavings: '95%',
        configFile: {
          path: '~/.openclaw/openclaw.json',
          content: JSON.stringify(
            {
              env: {
                DEEPSEEK_API_KEY: 'YOUR_DEEPSEEK_KEY',
              },
              agents: {
                defaults: {
                  model: {
                    primary: 'deepseek/deepseek-chat',
                  },
                },
              },
            },
            null,
            2,
          ),
          format: 'json',
        },
        envVars: [
          {
            name: 'DEEPSEEK_API_KEY',
            value: 'YOUR_DEEPSEEK_KEY',
            description: 'Get your API key from https://platform.deepseek.com/api_keys',
          },
        ],
        steps: [
          {
            order: 1,
            title: 'Sign up at DeepSeek',
            titleZh: '在 DeepSeek 注册',
            note: 'Visit https://platform.deepseek.com',
            noteZh: '访问 https://platform.deepseek.com',
          },
          {
            order: 2,
            title: 'Get API key',
            titleZh: '获取 API 密钥',
            note: 'Go to https://platform.deepseek.com/api_keys',
            noteZh: '前往 https://platform.deepseek.com/api_keys',
          },
          {
            order: 3,
            title: 'Replace YOUR_DEEPSEEK_KEY in config',
            titleZh: '在配置中替换 YOUR_DEEPSEEK_KEY',
          },
          {
            order: 4,
            title: 'Copy config to ~/.openclaw/openclaw.json',
            titleZh: '复制配置到 ~/.openclaw/openclaw.json',
          },
          {
            order: 5,
            title: 'Restart OpenClaw',
            titleZh: '重启 OpenClaw',
          },
        ],
      };
    } else {
      return {
        runtime: 'openclaw',
        preset: 'cheap-cloud',
        presetName: 'Cheap Cloud (Groq)',
        presetNameZh: '便宜云端（Groq）',
        description: 'Groq Llama 3.1 8B: 500K tokens/day free, fastest inference.',
        descriptionZh: 'Groq Llama 3.1 8B：每天 50 万 token 免费，推理速度极快。',
        estimatedSavings: '100%',
        configFile: {
          path: '~/.openclaw/openclaw.json',
          content: JSON.stringify(
            {
              env: {
                GROQ_API_KEY: 'YOUR_GROQ_KEY',
              },
              agents: {
                defaults: {
                  model: {
                    primary: 'groq/llama-3.1-8b-instant',
                  },
                },
              },
            },
            null,
            2,
          ),
          format: 'json',
        },
        envVars: [
          {
            name: 'GROQ_API_KEY',
            value: 'YOUR_GROQ_KEY',
            description: 'Get your API key from https://console.groq.com/keys',
          },
        ],
        steps: [
          {
            order: 1,
            title: 'Sign up at Groq',
            titleZh: '在 Groq 注册',
            note: 'Visit https://console.groq.com',
            noteZh: '访问 https://console.groq.com',
          },
          {
            order: 2,
            title: 'Get API key',
            titleZh: '获取 API 密钥',
            note: 'Go to https://console.groq.com/keys',
            noteZh: '前往 https://console.groq.com/keys',
          },
          {
            order: 3,
            title: 'Replace YOUR_GROQ_KEY in config',
            titleZh: '在配置中替换 YOUR_GROQ_KEY',
          },
          {
            order: 4,
            title: 'Copy config to ~/.openclaw/openclaw.json',
            titleZh: '复制配置到 ~/.openclaw/openclaw.json',
          },
          {
            order: 5,
            title: 'Restart OpenClaw',
            titleZh: '重启 OpenClaw',
          },
        ],
      };
    }
  }

  // preset === 'hybrid'
  return {
    runtime: 'openclaw',
    preset: 'hybrid',
    presetName: 'Hybrid Routing (LiteLLM)',
    presetNameZh: '混合路由（LiteLLM）',
    description: 'Route simple tasks to cheap models, complex tasks to powerful ones. 40-85% cost reduction.',
    descriptionZh: '简单任务路由到便宜模型，复杂任务路由到强模型，成本降低 40-85%。',
    estimatedSavings: '40-85%',
    configFile: {
      path: '~/.openclaw/openclaw.json',
      content: JSON.stringify(
        {
          env: {
            LITELLM_API_KEY: 'YOUR_LITELLM_KEY',
          },
          models: {
            providers: {
              litellm: {
                baseUrl: 'http://localhost:4000',
                apiKey: '${LITELLM_API_KEY}',
                api: 'openai-completions',
                models: [
                  {
                    id: 'deepseek-chat',
                    name: 'DeepSeek Chat (via LiteLLM)',
                    reasoning: false,
                    input: ['text'],
                    contextWindow: 131072,
                    maxTokens: 8192,
                  },
                ],
              },
            },
          },
          agents: {
            defaults: {
              model: {
                primary: 'litellm/deepseek-chat',
              },
            },
          },
        },
        null,
        2,
      ),
      format: 'json',
    },
    envVars: [
      {
        name: 'LITELLM_API_KEY',
        value: 'YOUR_LITELLM_KEY',
        description: 'Any string works for local LiteLLM proxy',
      },
    ],
    steps: [
      {
        order: 1,
        title: 'Install LiteLLM',
        titleZh: '安装 LiteLLM',
        command: 'pip install "litellm[proxy]"',
      },
      {
        order: 2,
        title: 'Create config.yaml for LiteLLM',
        titleZh: '创建 LiteLLM 的 config.yaml',
        note: 'See https://docs.litellm.ai/docs/routing for examples',
        noteZh: '参考 https://docs.litellm.ai/docs/routing 的示例',
      },
      {
        order: 3,
        title: 'Start LiteLLM proxy',
        titleZh: '启动 LiteLLM 代理',
        command: 'litellm --config config.yaml --port 4000',
      },
      {
        order: 4,
        title: 'Copy config to ~/.openclaw/openclaw.json',
        titleZh: '复制配置到 ~/.openclaw/openclaw.json',
      },
      {
        order: 5,
        title: 'Restart OpenClaw',
        titleZh: '重启 OpenClaw',
      },
    ],
    warning: 'Requires running LiteLLM proxy locally. More complex setup.',
    warningZh: '需要在本地运行 LiteLLM 代理，配置较复杂。',
  };
}

export function generateZeroClawConfig(
  currentModel: string,
  preset: PresetType,
): GeneratedConfig {
  if (preset === 'zero-bill') {
    return {
      runtime: 'zeroclaw',
      preset: 'zero-bill',
      presetName: 'Zero Bill (Local Ollama)',
      presetNameZh: '零账单（本地 Ollama）',
      description: 'Run models locally with Ollama. Zero marginal cost after setup.',
      descriptionZh: '用 Ollama 在本地跑模型，安装后边际成本为零。',
      estimatedSavings: '100%',
      configFile: {
        path: '~/.zeroclaw/config.toml',
        content: `default_provider = "ollama"
default_model = "qwen2.5:7b"
api_url = "http://localhost:11434"

[providers.ollama]
api_key = "ollama-local"`,
        format: 'toml',
      },
      steps: [
        {
          order: 1,
          title: 'Install Ollama',
          titleZh: '安装 Ollama',
          command: 'curl -fsSL https://ollama.com/install.sh | sh',
          note: 'For Windows, download from https://ollama.com/download',
          noteZh: 'Windows 用户请从 https://ollama.com/download 下载安装',
        },
        {
          order: 2,
          title: 'Pull a model',
          titleZh: '拉取模型',
          command: 'ollama pull qwen2.5:7b',
          note: 'Or try llama3.1:8b for English tasks',
          noteZh: '或者用 llama3.1:8b 处理英文任务',
        },
        {
          order: 3,
          title: 'Copy config to ~/.zeroclaw/config.toml',
          titleZh: '复制配置到 ~/.zeroclaw/config.toml',
        },
        {
          order: 4,
          title: 'Restart ZeroClaw',
          titleZh: '重启 ZeroClaw',
        },
      ],
      warning: 'Requires 8GB+ RAM. Model quality may be lower than cloud models.',
      warningZh: '需要 8GB+ 内存，模型质量可能低于云端模型。',
    };
  }

  if (preset === 'cheap-cloud') {
    const useDeepSeek = isClaudeModel(currentModel) || !isGPTModel(currentModel);

    if (useDeepSeek) {
      return {
        runtime: 'zeroclaw',
        preset: 'cheap-cloud',
        presetName: 'Cheap Cloud (DeepSeek)',
        presetNameZh: '便宜云端（DeepSeek）',
        description: 'DeepSeek V3: $0.14/M input tokens. 20-50x cheaper than GPT-4o.',
        descriptionZh: 'DeepSeek V3：输入 $0.14/百万 token，比 GPT-4o 便宜 20-50 倍。',
        estimatedSavings: '95%',
        configFile: {
          path: '~/.zeroclaw/config.toml',
          content: `default_provider = "deepseek"
default_model = "deepseek-chat"

[providers.deepseek]
api_key = "YOUR_DEEPSEEK_KEY"
base_url = "https://api.deepseek.com"`,
          format: 'toml',
        },
        envVars: [
          {
            name: 'DEEPSEEK_API_KEY',
            value: 'YOUR_DEEPSEEK_KEY',
            description: 'Get your API key from https://platform.deepseek.com/api_keys',
          },
        ],
        steps: [
          {
            order: 1,
            title: 'Sign up at DeepSeek',
            titleZh: '在 DeepSeek 注册',
            note: 'Visit https://platform.deepseek.com',
            noteZh: '访问 https://platform.deepseek.com',
          },
          {
            order: 2,
            title: 'Get API key',
            titleZh: '获取 API 密钥',
            note: 'Go to https://platform.deepseek.com/api_keys',
            noteZh: '前往 https://platform.deepseek.com/api_keys',
          },
          {
            order: 3,
            title: 'Replace YOUR_DEEPSEEK_KEY in config',
            titleZh: '在配置中替换 YOUR_DEEPSEEK_KEY',
          },
          {
            order: 4,
            title: 'Copy config to ~/.zeroclaw/config.toml',
            titleZh: '复制配置到 ~/.zeroclaw/config.toml',
          },
          {
            order: 5,
            title: 'Restart ZeroClaw',
            titleZh: '重启 ZeroClaw',
          },
        ],
      };
    } else {
      return {
        runtime: 'zeroclaw',
        preset: 'cheap-cloud',
        presetName: 'Cheap Cloud (Groq)',
        presetNameZh: '便宜云端（Groq）',
        description: 'Groq Llama 3.1 8B: 500K tokens/day free, fastest inference.',
        descriptionZh: 'Groq Llama 3.1 8B：每天 50 万 token 免费，推理速度极快。',
        estimatedSavings: '100%',
        configFile: {
          path: '~/.zeroclaw/config.toml',
          content: `default_provider = "groq"
default_model = "llama-3.1-8b-instant"

[providers.groq]
api_key = "YOUR_GROQ_KEY"`,
          format: 'toml',
        },
        envVars: [
          {
            name: 'GROQ_API_KEY',
            value: 'YOUR_GROQ_KEY',
            description: 'Get your API key from https://console.groq.com/keys',
          },
        ],
        steps: [
          {
            order: 1,
            title: 'Sign up at Groq',
            titleZh: '在 Groq 注册',
            note: 'Visit https://console.groq.com',
            noteZh: '访问 https://console.groq.com',
          },
          {
            order: 2,
            title: 'Get API key',
            titleZh: '获取 API 密钥',
            note: 'Go to https://console.groq.com/keys',
            noteZh: '前往 https://console.groq.com/keys',
          },
          {
            order: 3,
            title: 'Replace YOUR_GROQ_KEY in config',
            titleZh: '在配置中替换 YOUR_GROQ_KEY',
          },
          {
            order: 4,
            title: 'Copy config to ~/.zeroclaw/config.toml',
            titleZh: '复制配置到 ~/.zeroclaw/config.toml',
          },
          {
            order: 5,
            title: 'Restart ZeroClaw',
            titleZh: '重启 ZeroClaw',
          },
        ],
      };
    }
  }

  // preset === 'hybrid'
  return {
    runtime: 'zeroclaw',
    preset: 'hybrid',
    presetName: 'Hybrid Routing (Fallback Chain)',
    presetNameZh: '混合路由（回退链）',
    description: 'Use cheap model first, fallback to powerful model on failure. 40-70% cost reduction.',
    descriptionZh: '优先使用便宜模型，失败时回退到强模型，成本降低 40-70%。',
    estimatedSavings: '40-70%',
    configFile: {
      path: '~/.zeroclaw/config.toml',
      content: `default_provider = "deepseek"
default_model = "deepseek-chat"
fallback_providers = ["groq", "openai"]

[providers.deepseek]
api_key = "YOUR_DEEPSEEK_KEY"
base_url = "https://api.deepseek.com"

[providers.groq]
api_key = "YOUR_GROQ_KEY"

[providers.openai]
api_key = "YOUR_OPENAI_KEY"`,
      format: 'toml',
    },
    envVars: [
      {
        name: 'DEEPSEEK_API_KEY',
        value: 'YOUR_DEEPSEEK_KEY',
        description: 'Primary provider (cheapest)',
      },
      {
        name: 'GROQ_API_KEY',
        value: 'YOUR_GROQ_KEY',
        description: 'First fallback (free tier)',
      },
      {
        name: 'OPENAI_API_KEY',
        value: 'YOUR_OPENAI_KEY',
        description: 'Final fallback (most reliable)',
      },
    ],
    steps: [
      {
        order: 1,
        title: 'Get API keys from providers',
        titleZh: '从各提供商获取 API 密钥',
        note: 'DeepSeek, Groq, and OpenAI',
        noteZh: 'DeepSeek、Groq 和 OpenAI',
      },
      {
        order: 2,
        title: 'Replace API keys in config',
        titleZh: '在配置中替换 API 密钥',
      },
      {
        order: 3,
        title: 'Copy config to ~/.zeroclaw/config.toml',
        titleZh: '复制配置到 ~/.zeroclaw/config.toml',
      },
      {
        order: 4,
        title: 'Restart ZeroClaw',
        titleZh: '重启 ZeroClaw',
      },
    ],
    warning: 'Requires API keys from multiple providers. More complex setup.',
    warningZh: '需要多个提供商的 API 密钥，配置较复杂。',
  };
}
