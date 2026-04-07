export type CostReconciliationSortKey = 'abs-delta' | 'current-cost' | 'tokens'

export interface CostReconciliationRowLike {
  delta: number
  estimated: boolean
  replayAvailable: boolean
  currentCost: number
  inputTokens: number
  outputTokens: number
}

export interface CostReconciliationDisplayOptions {
  sortBy?: CostReconciliationSortKey
  onlyEstimated?: boolean
  onlyReplayable?: boolean
}

export const DEFAULT_COST_RECONCILIATION_SORT: CostReconciliationSortKey = 'abs-delta'

function getTotalTokens(row: CostReconciliationRowLike): number {
  return row.inputTokens + row.outputTokens
}

function compareNumberDesc(left: number, right: number): number {
  return right - left
}

function compareRows(
  left: CostReconciliationRowLike,
  right: CostReconciliationRowLike,
  sortBy: CostReconciliationSortKey,
): number {
  if (sortBy === 'current-cost') {
    return compareNumberDesc(left.currentCost, right.currentCost)
      || compareNumberDesc(Math.abs(left.delta), Math.abs(right.delta))
      || compareNumberDesc(getTotalTokens(left), getTotalTokens(right))
  }

  if (sortBy === 'tokens') {
    return compareNumberDesc(getTotalTokens(left), getTotalTokens(right))
      || compareNumberDesc(Math.abs(left.delta), Math.abs(right.delta))
      || compareNumberDesc(left.currentCost, right.currentCost)
  }

  return compareNumberDesc(Math.abs(left.delta), Math.abs(right.delta))
    || compareNumberDesc(left.currentCost, right.currentCost)
    || compareNumberDesc(getTotalTokens(left), getTotalTokens(right))
}

export function getCostReconciliationDisplayRows<T extends CostReconciliationRowLike>(
  rows: T[],
  options: CostReconciliationDisplayOptions = {},
): T[] {
  const sortBy = options.sortBy ?? DEFAULT_COST_RECONCILIATION_SORT

  return rows
    .filter(row => (!options.onlyEstimated || row.estimated) && (!options.onlyReplayable || row.replayAvailable))
    .slice()
    .sort((left, right) => compareRows(left, right, sortBy))
}
