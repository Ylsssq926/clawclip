import { describe, expect, it } from 'vitest';
import { getRecommendations } from '../services/solution-recommender.js';

describe('getRecommendations', () => {
  it('prioritizes the first diagnostic type and personalizes LiteLLM routing snippets', () => {
    const recommendations = getRecommendations(['expensive-model', 'retry-loop'], 'openai/gpt-5');

    expect(recommendations.slice(0, 3).map(item => item.id)).toEqual([
      'litellm-routing',
      'groq-free-tier',
      'ollama-local-models',
    ]);
    expect(recommendations[0]?.configSnippet).toContain('openai/gpt-5');
  });

  it('deduplicates multi-tag solutions like LLMLingua', () => {
    const recommendations = getRecommendations(['context-bloat', 'long-prompt']);
    const ids = recommendations.map(item => item.id);

    expect(ids.filter(id => id === 'llmlingua-compression')).toHaveLength(1);
    expect(ids.slice(0, 2)).toEqual(['llmlingua-compression', 'manual-context-pruning']);
  });
});
