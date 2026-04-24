import { describe, it, expect } from 'vitest';
import { normalizeOtelSpan, extractServiceName } from '../services/otel-normalizer.js';
import type { OtelSpan, OtelResource } from '../types/otel.js';

describe('OTEL Normalizer', () => {
  const mockResource: OtelResource = {
    attributes: [
      { key: 'service.name', value: { stringValue: 'test-agent' } },
    ],
  };

  it('should extract service name from resource', () => {
    const serviceName = extractServiceName(mockResource);
    expect(serviceName).toBe('test-agent');
  });

  it('should normalize invoke_agent span to response type', () => {
    const span: OtelSpan = {
      traceId: 'trace-123',
      spanId: 'span-456',
      name: 'invoke_agent',
      startTimeUnixNano: '1000000000000000',
      endTimeUnixNano: '1000000500000000', // 500ms later
      attributes: [
        { key: 'gen_ai.operation.name', value: { stringValue: 'invoke_agent' } },
        { key: 'gen_ai.request.model', value: { stringValue: 'gpt-4o' } },
        { key: 'gen_ai.usage.input_tokens', value: { intValue: '100' } },
        { key: 'gen_ai.usage.output_tokens', value: { intValue: '50' } },
      ],
    };

    const step = normalizeOtelSpan(span, mockResource, 0);

    expect(step.type).toBe('response');
    expect(step.model).toBe('gpt-4o');
    expect(step.inputTokens).toBe(100);
    expect(step.outputTokens).toBe(50);
    expect(step.durationMs).toBe(500);
  });

  it('should normalize execute_tool span to tool_call type', () => {
    const span: OtelSpan = {
      traceId: 'trace-123',
      spanId: 'span-789',
      name: 'execute_tool',
      startTimeUnixNano: '1000000000000000',
      endTimeUnixNano: '1000000200000000', // 200ms later
      attributes: [
        { key: 'gen_ai.operation.name', value: { stringValue: 'execute_tool' } },
        { key: 'gen_ai.tool.name', value: { stringValue: 'web_search' } },
      ],
    };

    const step = normalizeOtelSpan(span, mockResource, 1);

    expect(step.type).toBe('tool_call');
    expect(step.toolName).toBe('web_search');
    expect(step.durationMs).toBe(200);
  });

  it('should handle error status', () => {
    const span: OtelSpan = {
      traceId: 'trace-123',
      spanId: 'span-error',
      name: 'failed_operation',
      startTimeUnixNano: '1000000000000000',
      endTimeUnixNano: '1000100000000000',
      status: {
        code: 2,
        message: 'Operation failed',
      },
      attributes: [],
    };

    const step = normalizeOtelSpan(span, mockResource, 2);

    expect(step.isError).toBe(true);
    expect(step.error).toBe('Operation failed');
  });

  it('should support legacy field names', () => {
    const span: OtelSpan = {
      traceId: 'trace-123',
      spanId: 'span-legacy',
      name: 'legacy_call',
      startTimeUnixNano: '1000000000000000',
      endTimeUnixNano: '1000100000000000',
      attributes: [
        { key: 'llm.model_name', value: { stringValue: 'claude-3.5-sonnet' } },
        { key: 'gen_ai.system', value: { stringValue: 'anthropic' } },
      ],
    };

    const step = normalizeOtelSpan(span, mockResource, 3);

    expect(step.model).toBe('claude-3.5-sonnet');
  });
});
