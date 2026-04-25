import { Router } from 'express';
import { getRecommendations } from '../services/solution-recommender.js';
import {
  generateOpenClawConfig,
  generateZeroClawConfig,
  type RuntimeType,
  type PresetType,
  type GeneratedConfig,
} from '../services/config-generator.js';

const router = Router();

interface OllamaTagsResponse {
  models?: Array<{ name: string }>;
}

interface OllamaCheckResponse {
  available: boolean;
  models?: string[];
}

router.get('/check-ollama', async (_req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.json({ available: false } satisfies OllamaCheckResponse);
    }

    const data = (await response.json()) as OllamaTagsResponse;
    const models = data.models?.map((m) => m.name) ?? [];

    return res.json({
      available: true,
      models,
    } satisfies OllamaCheckResponse);
  } catch (error) {
    return res.json({ available: false } satisfies OllamaCheckResponse);
  }
});

router.get('/all', (_req, res) => {
  // 获取所有解决方案（传入所有可能的 tag）
  const allTags = [
    'retry-loop',
    'long-prompt',
    'verbose-output',
    'expensive-model',
    'context-bloat',
    'model-mismatch',
  ];
  
  const solutions = getRecommendations(allTags);
  return res.json(solutions);
});

interface GenerateConfigRequest {
  runtime: RuntimeType;
  preset: PresetType;
  currentModel?: string;
}

router.post('/generate-config', (req, res) => {
  try {
    const { runtime, preset, currentModel } = req.body as GenerateConfigRequest;

    if (!runtime || !preset) {
      return res.status(400).json({ error: 'Missing runtime or preset' });
    }

    if (runtime !== 'openclaw' && runtime !== 'zeroclaw') {
      return res.status(400).json({ error: 'Invalid runtime' });
    }

    if (preset !== 'zero-bill' && preset !== 'cheap-cloud' && preset !== 'hybrid') {
      return res.status(400).json({ error: 'Invalid preset' });
    }

    const config: GeneratedConfig =
      runtime === 'openclaw'
        ? generateOpenClawConfig(currentModel ?? '', preset)
        : generateZeroClawConfig(currentModel ?? '', preset);

    return res.json(config);
  } catch (error) {
    console.error('Error generating config:', error);
    return res.status(500).json({ error: 'Failed to generate config' });
  }
});

export default router;
