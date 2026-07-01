import { hasPermission } from 'src/utils/authz'
import {
  MY_LEAVE_TOUR_ANCHOR_TIMEOUT_MS,
  MY_LEAVE_TOUR_KEY,
  MY_LEAVE_TOUR_REPLAY_EVENT,
  MY_LEAVE_TOUR_REQUEST_EVENT,
  MY_LEAVE_TOUR_STORAGE_PREFIX,
  MY_LEAVE_TOUR_VERSION,
} from 'src/onboarding/myLeaveOnboardingContract'

export {
  MY_LEAVE_TOUR_ANCHOR_TIMEOUT_MS,
  MY_LEAVE_TOUR_KEY,
  MY_LEAVE_TOUR_REPLAY_EVENT,
  MY_LEAVE_TOUR_REQUEST_EVENT,
  MY_LEAVE_TOUR_STORAGE_PREFIX,
  MY_LEAVE_TOUR_VERSION,
}

export const getMyLeaveTourStorageKey = (userId) =>
  `${MY_LEAVE_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readMyLeaveTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getMyLeaveTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeMyLeaveTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readMyLeaveTourRecord(userId) || {}
    localStorage.setItem(
      getMyLeaveTourStorageKey(userId),
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

export const isMyLeaveTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getMyLeaveTourLaunchEligibility = (user) => {
  const canViewLeave = hasPermission(user, 'self.leave')

  return {
    canViewLeave,
    eligible: canViewLeave,
  }
}
