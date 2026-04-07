export type ReplayDetailSectionId = 'timeline' | 'insights'

export interface ReplayDetailSectionsState {
  insightsLoading: boolean
  insightCount: number
}

export const REPLAY_DETAIL_SECTION_ORDER: readonly ReplayDetailSectionId[] = [
  'timeline',
  'insights',
] as const

export function getReplayDetailSections({ insightsLoading, insightCount }: ReplayDetailSectionsState): ReplayDetailSectionId[] {
  return REPLAY_DETAIL_SECTION_ORDER.filter(sectionId => {
    if (sectionId === 'insights') {
      return insightsLoading || insightCount > 0
    }
    return true
  })
}
