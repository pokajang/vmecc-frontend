import { hasPermission } from 'src/utils/authz'
import {
  DASHBOARD_TOUR_ANCHOR_TIMEOUT_MS,
  DASHBOARD_TOUR_KEY,
  DASHBOARD_TOUR_REPLAY_EVENT,
  DASHBOARD_TOUR_REQUEST_EVENT,
  DASHBOARD_TOUR_STORAGE_PREFIX,
  DASHBOARD_TOUR_VERSION,
} from 'src/onboarding/dashboardOnboardingContract'

export {
  DASHBOARD_TOUR_ANCHOR_TIMEOUT_MS,
  DASHBOARD_TOUR_KEY,
  DASHBOARD_TOUR_REPLAY_EVENT,
  DASHBOARD_TOUR_REQUEST_EVENT,
  DASHBOARD_TOUR_STORAGE_PREFIX,
  DASHBOARD_TOUR_VERSION,
}

export const getDashboardTourStorageKey = (userId) =>
  `${DASHBOARD_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readDashboardTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getDashboardTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeDashboardTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readDashboardTourRecord(userId) || {}
    localStorage.setItem(
      getDashboardTourStorageKey(userId),
      JSON.stringify({
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      }),
    )
  } catch {
    // Non-fatal. Tour state can be offered again if storage is unavailable.
  }
}

export const isDashboardTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getDashboardTourLaunchEligibility = (user) => {
  const canViewDashboard = hasPermission(user, 'self.dashboard')

  return {
    canViewDashboard,
    eligible: canViewDashboard,
  }
}
