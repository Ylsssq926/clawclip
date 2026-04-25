import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import knowledgeRouter from '../routes/knowledge.js';
import * as replayRepository from '../services/replay-repository.js';
import type { SessionReplay } from '../types/replay.js';

function makeReplay(id: string, summary: string, stepContent: string): SessionReplay {
  const startTime = new Date('2026-03-18T08:00:00.000Z');
  const endTime = new Date('2026-03-18T08:01:00.000Z');

  return {
    meta: {
      id,
      agentName: 'knowledge-test',
      summary,
      dataSource: 'real',
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      totalCost: 0.01,
      totalTokens: 200,
      modelUsed: ['gpt-4o'],
      stepCount: 1,
    },
    steps: [
      {
        index: 0,
        timestamp: startTime,
        type: 'response',
        content: stepContent,
        model: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 100,
        cost: 0.01,
        durationMs: 60_000,
      },
    ],
  };
}

async function requestKnowledge(pathname: string): Promise<{
  status: number;
  contentType: string | null;
  body: any;
}> {
  const app = express();
  app.use('/api/knowledge', knowledgeRouter);

  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('failed to resolve knowledge test server port');
    }

    const response = await fetch(`http://127.0.0.1:${address.port}${pathname}`);
    const contentType = response.headers.get('content-type');
    const body = contentType?.includes('application/json') ? await response.json() : await response.text();

    return {
      status: response.status,
      contentType,
      body,
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/knowledge/export-all', () => {
  it('returns paginated JSON metadata and sliced data', async () => {
    vi.spyOn(replayRepository, 'getMergedReplays').mockReturnValue([
      makeReplay('session-1', '第一条', '第一条内容'),
      makeReplay('session-2', '第二条', '第二条内容'),
      makeReplay('session-3', '第三条', '第三条内容'),
    ]);

    const { status, body } = await requestKnowledge('/api/knowledge/export-all?limit=2&offset=1');

    expect(status).toBe(200);
    expect(body).toMatchObject({
      total: 3,
      offset: 1,
      limit: 2,
    });
    expect(body.data.map((item: SessionReplay) => item.meta.id)).toEqual(['session-2', 'session-3']);
  });

  it('limits markdown exports and appends a pagination hint when truncated', async () => {
    vi.spyOn(replayRepository, 'getMergedReplays').mockReturnValue([
      makeReplay('session-1', '第一条', '第一条内容'),
      makeReplay('session-2', '第二条', '第二条内容'),
    ]);

    const { status, contentType, body } = await requestKnowledge('/api/knowledge/export-all?format=markdown&limit=1');

    expect(status).toBe(200);
    expect(contentType).toContain('text/markdown');
    expect(body).toContain('# 第一条');
    expect(body).not.toContain('# 第二条');
    expect(body).toContain('已按 limit=1 截断，本次导出 1 / 2 条；如需下一页，请传 offset=1。');
  });
});
