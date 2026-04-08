export type SupportingElementKey =
  | 'replayListMeta'
  | 'replayDetailMeta'
  | 'replayMetaBadge'
  | 'replayInsightToggle'
  | 'replayInsightCard'
  | 'benchmarkShareAction'
  | 'benchmarkHelpAction'
  | 'benchmarkSupportNote'
  | 'benchmarkSupportChip'
  | 'benchmarkSupportCard'

const SUPPORTING_ELEMENT_PRIORITY: Record<SupportingElementKey, { priority: number; className: string }> = {
  replayListMeta: {
    priority: 3,
    className: 'text-[11px] text-slate-400',
  },
  replayDetailMeta: {
    priority: 3,
    className: 'text-[11px] leading-5 text-slate-400',
  },
  replayMetaBadge: {
    priority: 4,
    className: 'text-[10px] px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-500 font-medium',
  },
  replayInsightToggle: {
    priority: 4,
    className: 'text-xs text-slate-500 hover:text-slate-700',
  },
  replayInsightCard: {
    priority: 5,
    className: 'border-slate-200/70 bg-slate-50/70 text-slate-600',
  },
  benchmarkShareAction: {
    priority: 4,
    className: 'border border-surface-border bg-white/70 text-slate-500 hover:text-slate-700',
  },
  benchmarkHelpAction: {
    priority: 5,
    className: 'text-[11px] text-slate-400 hover:text-slate-600',
  },
  benchmarkSupportNote: {
    priority: 4,
    className: 'text-[11px] leading-5 text-slate-500',
  },
  benchmarkSupportChip: {
    priority: 4,
    className: 'text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500',
  },
  benchmarkSupportCard: {
    priority: 5,
    className: 'rounded-lg border border-slate-200/70 bg-slate-50/70 text-slate-500',
  },
}

export function getSupportingElementPriority(key: SupportingElementKey) {
  return SUPPORTING_ELEMENT_PRIORITY[key]
}
