import { Router } from 'express';
import { getRecommendations } from '../services/solution-recommender.js';

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

export default router;
