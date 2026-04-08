import { describe, expect, it } from 'vitest'
import { getSupportingElementPriority } from './supportingElementPriority'

describe('getSupportingElementPriority', () => {
  it('把 Replay 元信息压到标题和步骤后面', () => {
    expect(getSupportingElementPriority('replayListMeta').priority).toBeGreaterThan(1)
    expect(getSupportingElementPriority('replayDetailMeta').priority).toBeGreaterThan(1)
    expect(getSupportingElementPriority('replayMetaBadge').className).toContain('text-slate-500')
  })

  it('让 Benchmark 的分享和帮助入口保持辅助层级', () => {
    const share = getSupportingElementPriority('benchmarkShareAction')
    const help = getSupportingElementPriority('benchmarkHelpAction')

    expect(share.priority).toBeGreaterThan(1)
    expect(share.className).not.toContain('bg-accent')
    expect(share.className).not.toContain('text-white')
    expect(help.priority).toBeGreaterThan(share.priority)
  })

  it('让说明卡片保持弱化表面', () => {
    expect(getSupportingElementPriority('replayInsightCard').className).toContain('bg-slate-50/70')
    expect(getSupportingElementPriority('benchmarkSupportCard').className).toContain('border-slate-200/70')
  })
})
