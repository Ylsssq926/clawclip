export type CostMonitorSectionId =
  | 'savings'
  | 'savings-empty'
  | 'token-waste'
  | 'trend'
  | 'model-breakdown'
  | 'model-value'
  | 'insights'
  | 'reference-compare'
  | 'reconciliation'
  | 'top-tasks'

export type CostMonitorSectionTier = 'primary' | 'secondary'

export const COST_MONITOR_SECTION_ORDER: readonly CostMonitorSectionId[] = [
  'savings',
  'savings-empty',
  'token-waste',
  'trend',
  'model-breakdown',
  'model-value',
  'insights',
  'reference-compare',
  'reconciliation',
  'top-tasks',
] as const

const PRIMARY_COST_MONITOR_SECTIONS = new Set<CostMonitorSectionId>([
  'savings',
  'savings-empty',
  'token-waste',
  'trend',
])

const sectionRank = new Map(COST_MONITOR_SECTION_ORDER.map((id, index) => [id, index]))

export function getCostMonitorSectionTier(id: CostMonitorSectionId): CostMonitorSectionTier {
  return PRIMARY_COST_MONITOR_SECTIONS.has(id) ? 'primary' : 'secondary'
}

export function orderCostMonitorSections<T extends { id: CostMonitorSectionId }>(sections: T[]): T[] {
  return sections
    .slice()
    .sort((left, right) => (sectionRank.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (sectionRank.get(right.id) ?? Number.MAX_SAFE_INTEGER))
}

export function splitCostMonitorSections<T extends { id: CostMonitorSectionId }>(sections: T[]): {
  primary: T[]
  secondary: T[]
} {
  const orderedSections = orderCostMonitorSections(sections)

  return {
    primary: orderedSections.filter(section => getCostMonitorSectionTier(section.id) === 'primary'),
    secondary: orderedSections.filter(section => getCostMonitorSectionTier(section.id) === 'secondary'),
  }
}
