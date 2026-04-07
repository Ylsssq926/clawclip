import { describe, expect, it } from 'vitest'
import { orderCostMonitorSections, type CostMonitorSectionId } from './costMonitorSectionOrder'

function makeSections(ids: CostMonitorSectionId[]) {
  return ids.map(id => ({ id }))
}

describe('orderCostMonitorSections', () => {
  it('把行动区块排在价格参考和成本对账前面', () => {
    const result = orderCostMonitorSections(makeSections([
      'reconciliation',
      'trend',
      'reference-compare',
      'token-waste',
      'savings',
    ]))

    expect(result.map(section => section.id)).toEqual([
      'savings',
      'token-waste',
      'trend',
      'reference-compare',
      'reconciliation',
    ])
  })

  it('保留中间分析区块在行动区块之后、审计区块之前', () => {
    const result = orderCostMonitorSections(makeSections([
      'reference-compare',
      'model-value',
      'insights',
      'model-breakdown',
      'reconciliation',
    ]))

    expect(result.map(section => section.id)).toEqual([
      'model-breakdown',
      'model-value',
      'insights',
      'reference-compare',
      'reconciliation',
    ])
  })
})
