import { describe, expect, it } from 'vitest';
import { DEMO_SESSIONS } from '../services/demo-sessions.js';

function getDemoSession(agentName: string) {
  const replay = DEMO_SESSIONS.find(item => item.meta.agentName === agentName);
  expect(replay, `missing demo session: ${agentName}`).toBeTruthy();
  return replay!;
}

describe('DEMO_SESSIONS', () => {
  it('keeps code-helper aligned with read-only analysis tasks', () => {
    const replay = getDemoSession('code-helper');

    expect(replay.steps.some(step => /(?:file|write)_write|write_file/i.test(step.toolName ?? ''))).toBe(false);

    const response = replay.steps.find(step => step.type === 'response');
    expect(response?.content).not.toMatch(/validate\.ts|已顺手生成|文件写入/i);
  });

  it('gives debugger a realistic failed retry loop sample', () => {
    const replay = getDemoSession('debugger');
    const repeatedCalls = replay.steps.filter(step => step.type === 'tool_call');
    const errorResults = replay.steps.filter(
      step =>
        step.type === 'tool_result' &&
        (step.isError || Boolean(step.error) || /error|enoent|timeout|failed/i.test(`${step.content} ${step.toolOutput}`)),
    );

    expect(repeatedCalls.length).toBeGreaterThanOrEqual(3);
    expect(new Set(repeatedCalls.map(step => step.toolName)).size).toBe(1);
    expect(errorResults.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps email-helper as a lightweight task on an obviously pricey model with consistent date', () => {
    const replay = getDemoSession('email-helper');
    const models = new Set(replay.steps.map(step => step.model).filter(Boolean));
    const response = replay.steps.find(step => step.type === 'response');
    const expectedDate = response
      ? `日期：${response.timestamp.getFullYear()} 年 ${response.timestamp.getMonth() + 1} 月 ${response.timestamp.getDate()} 日`
      : '';

    expect(Array.from(models)).toContain('claude-sonnet-4.6');
    expect(response?.content).toContain(expectedDate);
    expect(response?.timestamp.getTime()).toBeLessThan(Date.now());
  });
});
