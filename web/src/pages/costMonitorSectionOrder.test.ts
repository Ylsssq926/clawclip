import { describe, expect, it } from 'vitest'
import {
  getCostMonitorSectionTier,
  orderCostMonitorSections,
  splitCostMonitorSections,
  type CostMonitorSectionId,
} from './costMonitorSectionOrder'

function makeSections(ids: CostMonitorSectionId[]) {
  return ids.map(id => ({ id }))
}

describe('orderCostMonitorSections', () => {
  it('把第一屏主线区块排在进一步分析前面', () => {
    const { primary, secondary } = splitCostMonitorSections(makeSections([
      'reconciliation',
      'trend',
      'model-breakdown',
      'reference-compare',
      'token-waste',
      'savings',
      'cost-advisor',
      'solutions',
    ]))

    expect(primary.map(section => section.id)).toEqual([
      'cost-advisor',
      'savings',
      'solutions',
      'token-waste',
      'trend',
    ])

    expect(secondary.map(section => section.id)).toEqual([
      'model-breakdown',
      'reference-compare',
      'reconciliation',
    ])
  })

  it('只把先下手最值的区块视为第一屏主线', () => {
    const primaryIds: CostMonitorSectionId[] = ['cost-advisor', 'savings', 'savings-empty', 'solutions', 'token-waste', 'trend']
    const secondaryIds: CostMonitorSectionId[] = ['model-breakdown', 'model-value', 'insights', 'reference-compare', 'reconciliation', 'top-tasks']

    expect(primaryIds.every(id => getCostMonitorSectionTier(id) === 'primary')).toBe(true)
    expect(secondaryIds.every(id => getCostMonitorSectionTier(id) === 'secondary')).toBe(true)
  })

  it('保留进一步分析区块在主线之后的既有排序', () => {
    const result = orderCostMonitorSections(makeSections([
      'reference-compare',
      'model-value',
      'top-tasks',
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
      'top-tasks',
    ])
  })

  it('把 secondary 区块完整留给进一步分析容器', () => {
    const { primary, secondary } = splitCostMonitorSections(makeSections([
      'top-tasks',
      'reference-compare',
      'trend',
      'model-value',
      'token-waste',
      'solutions',
      'reconciliation',
      'insights',
      'model-breakdown',
      'savings',
      'cost-advisor',
    ]))

    expect(primary.map(section => section.id)).toEqual([
      'cost-advisor',
      'savings',
      'solutions',
      'token-waste',
      'trend',
    ])
    expect(secondary.map(section => section.id)).toEqual([
      'model-breakdown',
      'model-value',
      'insights',
      'reference-compare',
      'reconciliation',
      'top-tasks',
    ])
  })
})
