import { describe, expect, it } from 'vitest'
import { getReplayDetailSections } from './replayDetailSections'

describe('getReplayDetailSections', () => {
  it('把时间线排在智能诊断前面', () => {
    expect(getReplayDetailSections({ insightsLoading: false, insightCount: 2 })).toEqual([
      'timeline',
      'insights',
    ])
  })

  it('没有 insights 且不在加载时隐藏智能诊断区块', () => {
    expect(getReplayDetailSections({ insightsLoading: false, insightCount: 0 })).toEqual([
      'timeline',
    ])
  })

  it('诊断还在加载时保留后置入口', () => {
    expect(getReplayDetailSections({ insightsLoading: true, insightCount: 0 })).toEqual([
      'timeline',
      'insights',
    ])
  })
})
