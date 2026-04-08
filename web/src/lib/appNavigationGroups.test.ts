import { describe, expect, it } from 'vitest'
import { ALL_NAV_TAB_IDS, APP_NAVIGATION_GROUPS } from './appNavigationGroups'

describe('APP_NAVIGATION_GROUPS', () => {
  it('把核心流程固定成 replay / benchmark / cost', () => {
    const coreGroup = APP_NAVIGATION_GROUPS.find(group => group.id === 'core')

    expect(coreGroup?.tabIds).toEqual(['replay', 'benchmark', 'cost'])
  })

  it('把 dashboard 单独作为总览入口，其余辅助页归到工具层', () => {
    const overviewGroup = APP_NAVIGATION_GROUPS.find(group => group.id === 'overview')
    const toolsGroup = APP_NAVIGATION_GROUPS.find(group => group.id === 'tools')

    expect(overviewGroup?.tabIds).toEqual(['dashboard'])
    expect(toolsGroup?.tabIds).toEqual([
      'prompt',
      'compare',
      'knowledge',
      'templates',
      'skills',
      'leaderboard',
    ])
  })

  it('确保每个顶层 tab 只出现一次', () => {
    const groupedTabs = APP_NAVIGATION_GROUPS.flatMap(group => group.tabIds)

    expect(groupedTabs).toHaveLength(ALL_NAV_TAB_IDS.length)
    expect(new Set(groupedTabs)).toEqual(new Set(ALL_NAV_TAB_IDS))
  })
})
