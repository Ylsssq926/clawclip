const DASHBOARD_DIAGNOSTICS_DISMISSED_KEY = 'clawclip-dashboard-diagnostics-dismissed'

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) {
    return storage
  }

  if (typeof localStorage === 'undefined') {
    return null
  }

  return localStorage
}

export function readDashboardDiagnosticsDismissed(storage?: Storage): boolean {
  const target = resolveStorage(storage)

  if (!target) {
    return false
  }

  try {
    return target.getItem(DASHBOARD_DIAGNOSTICS_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function writeDashboardDiagnosticsDismissed(dismissed: boolean, storage?: Storage): void {
  const target = resolveStorage(storage)

  if (!target) {
    return
  }

  try {
    if (dismissed) {
      target.setItem(DASHBOARD_DIAGNOSTICS_DISMISSED_KEY, '1')
      return
    }

    target.removeItem(DASHBOARD_DIAGNOSTICS_DISMISSED_KEY)
  } catch {
    /* ignore storage failures */
  }
}
