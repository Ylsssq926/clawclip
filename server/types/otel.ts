/** OTLP JSON 格式类型定义 */

export interface OtelKeyValue {
  key: string;
  value: {
    stringValue?: string;
    intValue?: string;
    doubleValue?: number;
    boolValue?: boolean;
  };
}

export interface OtelResource {
  attributes: OtelKeyValue[];
}

export interface OtelSpanStatus {
  code: number; // 0=UNSET, 1=OK, 2=ERROR
  message?: string;
}

export interface OtelSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  status?: OtelSpanStatus;
  attributes: OtelKeyValue[];
}

export interface OtelScopeSpan {
  scope?: {
    name: string;
    version?: string;
  };
  spans: OtelSpan[];
}

export interface OtelResourceSpan {
  resource: OtelResource;
  scopeSpans: OtelScopeSpan[];
}

export interface OtelTracePayload {
  resourceSpans: OtelResourceSpan[];
}
