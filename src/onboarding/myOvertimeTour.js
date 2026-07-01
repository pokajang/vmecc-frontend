import { hasPermission } from 'src/utils/authz'
import {
  MY_OVERTIME_TOUR_ANCHOR_TIMEOUT_MS,
  MY_OVERTIME_TOUR_KEY,
  MY_OVERTIME_TOUR_REPLAY_EVENT,
  MY_OVERTIME_TOUR_REQUEST_EVENT,
  MY_OVERTIME_TOUR_STORAGE_PREFIX,
  MY_OVERTIME_TOUR_VERSION,
} from 'src/onboarding/myOvertimeOnboardingContract'

export {
  MY_OVERTIME_TOUR_ANCHOR_TIMEOUT_MS,
  MY_OVERTIME_TOUR_KEY,
  MY_OVERTIME_TOUR_REPLAY_EVENT,
  MY_OVERTIME_TOUR_REQUEST_EVENT,
  MY_OVERTIME_TOUR_STORAGE_PREFIX,
  MY_OVERTIME_TOUR_VERSION,
}

export const getMyOvertimeTourStorageKey = (userId) =>
  `${MY_OVERTIME_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readMyOvertimeTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getMyOvertimeTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeMyOvertimeTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readMyOvertimeTourRecord(userId) || {}
    localStorage.setItem(
      getMyOvertimeTourStorageKey(userId),
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

export const isMyOvertimeTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getMyOvertimeTourLaunchEligibility = (user) => {
  const canViewOvertime = hasPermission(user, 'self.overtime')

  return {
    canViewOvertime,
    eligible: canViewOvertime,
  }
}
