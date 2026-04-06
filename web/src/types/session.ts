/** Session list / replay meta aligned with `/api/replay/sessions` payloads. */
export interface SessionMeta {
  id: string
  agentName: string
  dataSource?: string
  sessionLabel?: string
  sessionKey?: string
  storeUpdatedAt?: number
  storeContextTokens?: number
  storeTotalTokens?: number
  storeModel?: string
  storeChannel?: string
  storeProvider?: string
  startTime: string
  endTime?: string
  durationMs: number
  totalCost: number
  totalTokens: number
  modelUsed: string[]
  stepCount: number
  summary: string
  parseDiagnostics?: {
    totalLines: number
    parsedLines: number
    skippedLines: number
    errorSamples?: string[]
    multilineRecovered?: number
  }
}
