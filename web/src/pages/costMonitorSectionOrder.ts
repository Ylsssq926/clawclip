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

const sectionRank = new Map(COST_MONITOR_SECTION_ORDER.map((id, index) => [id, index]))

export function orderCostMonitorSections<T extends { id: CostMonitorSectionId }>(sections: T[]): T[] {
  return sections
    .slice()
    .sort((left, right) => (sectionRank.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (sectionRank.get(right.id) ?? Number.MAX_SAFE_INTEGER))
}
