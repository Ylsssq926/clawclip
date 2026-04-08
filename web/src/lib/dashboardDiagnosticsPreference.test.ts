import { describe, expect, it } from 'vitest'
import { readDashboardDiagnosticsDismissed, writeDashboardDiagnosticsDismissed } from './dashboardDiagnosticsPreference'

function createMemoryStorage(initialValue: string | null = null): Storage {
  let value = initialValue

  return {
    getItem(key) {
      return key === 'clawclip-dashboard-diagnostics-dismissed' ? value : null
    },
    setItem(key, nextValue) {
      if (key === 'clawclip-dashboard-diagnostics-dismissed') {
        value = nextValue
      }
    },
    removeItem(key) {
      if (key === 'clawclip-dashboard-diagnostics-dismissed') {
        value = null
      }
    },
    clear() {
      value = null
    },
    key() {
      return null
    },
    get length() {
      return value == null ? 0 : 1
    },
  }
}

describe('dashboardDiagnosticsPreference', () => {
  it('默认返回未关闭状态', () => {
    expect(readDashboardDiagnosticsDismissed(createMemoryStorage())).toBe(false)
  })

  it('写入后能重新读出关闭状态', () => {
    const storage = createMemoryStorage()

    writeDashboardDiagnosticsDismissed(true, storage)

    expect(readDashboardDiagnosticsDismissed(storage)).toBe(true)
  })

  it('取消关闭后会清掉持久化状态', () => {
    const storage = createMemoryStorage('1')

    writeDashboardDiagnosticsDismissed(false, storage)

    expect(readDashboardDiagnosticsDismissed(storage)).toBe(false)
  })
})
