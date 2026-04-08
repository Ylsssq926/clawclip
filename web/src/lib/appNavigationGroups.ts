export const OVERVIEW_NAV_TAB_IDS = ['dashboard'] as const
export const CORE_FLOW_NAV_TAB_IDS = ['replay', 'benchmark', 'cost'] as const
export const TOOL_NAV_TAB_IDS = ['prompt', 'compare', 'knowledge', 'templates', 'skills', 'leaderboard'] as const

export const ALL_NAV_TAB_IDS = [
  ...OVERVIEW_NAV_TAB_IDS,
  ...CORE_FLOW_NAV_TAB_IDS,
  ...TOOL_NAV_TAB_IDS,
] as const

export type AppNavigationTabId = (typeof ALL_NAV_TAB_IDS)[number]

export interface AppNavigationGroupDefinition {
  id: 'overview' | 'core' | 'tools'
  titleKey: string
  tabIds: readonly AppNavigationTabId[]
}

export const APP_NAVIGATION_GROUPS = [
  {
    id: 'overview',
    titleKey: 'nav.group.overview',
    tabIds: OVERVIEW_NAV_TAB_IDS,
  },
  {
    id: 'core',
    titleKey: 'nav.group.core',
    tabIds: CORE_FLOW_NAV_TAB_IDS,
  },
  {
    id: 'tools',
    titleKey: 'nav.group.tools',
    tabIds: TOOL_NAV_TAB_IDS,
  },
] as const satisfies readonly AppNavigationGroupDefinition[]

export function buildAppNavigationGroups<T extends { id: AppNavigationTabId }>(tabs: readonly T[]) {
  const tabMap = new Map(tabs.map(tab => [tab.id, tab]))

  return APP_NAVIGATION_GROUPS.map(group => ({
    ...group,
    items: group.tabIds
      .map(tabId => tabMap.get(tabId))
      .filter((tab): tab is T => Boolean(tab)),
  }))
}
