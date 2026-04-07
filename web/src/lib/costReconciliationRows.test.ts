import { describe, expect, it } from 'vitest'
import { getCostReconciliationDisplayRows } from './costReconciliationRows'

const rows = [
  {
    sessionId: 'small-delta',
    delta: 0.24,
    estimated: false,
    replayAvailable: true,
    currentCost: 4.8,
    inputTokens: 220,
    outputTokens: 80,
  },
  {
    sessionId: 'largest-delta',
    delta: -1.75,
    estimated: true,
    replayAvailable: true,
    currentCost: 1.1,
    inputTokens: 40,
    outputTokens: 20,
  },
  {
    sessionId: 'middle-delta',
    delta: 0.91,
    estimated: true,
    replayAvailable: false,
    currentCost: 2.6,
    inputTokens: 180,
    outputTokens: 70,
  },
]

describe('getCostReconciliationDisplayRows', () => {
  it('默认按绝对值 delta 从高到低排序', () => {
    const result = getCostReconciliationDisplayRows(rows)

    expect(result.map(row => row.sessionId)).toEqual([
      'largest-delta',
      'middle-delta',
      'small-delta',
    ])
  })

  it('支持只看 Estimated', () => {
    const result = getCostReconciliationDisplayRows(rows, { onlyEstimated: true })

    expect(result.map(row => row.sessionId)).toEqual([
      'largest-delta',
      'middle-delta',
    ])
  })

  it('支持只看可回放会话', () => {
    const result = getCostReconciliationDisplayRows(rows, { onlyReplayable: true })

    expect(result.map(row => row.sessionId)).toEqual([
      'largest-delta',
      'small-delta',
    ])
  })
})
