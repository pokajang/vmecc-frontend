import { hasPermission } from 'src/utils/authz'
import {
  ROSTER_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  ROSTER_MANAGEMENT_TOUR_KEY,
  ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT,
  ROSTER_MANAGEMENT_TOUR_REQUEST_EVENT,
  ROSTER_MANAGEMENT_TOUR_STORAGE_PREFIX,
  ROSTER_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/rosterManagementOnboardingContract'

export {
  ROSTER_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  ROSTER_MANAGEMENT_TOUR_KEY,
  ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT,
  ROSTER_MANAGEMENT_TOUR_REQUEST_EVENT,
  ROSTER_MANAGEMENT_TOUR_STORAGE_PREFIX,
  ROSTER_MANAGEMENT_TOUR_VERSION,
}

export const getRosterManagementTourStorageKey = (userId) =>
  `${ROSTER_MANAGEMENT_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readRosterManagementTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getRosterManagementTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeRosterManagementTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readRosterManagementTourRecord(userId) || {}
    localStorage.setItem(
      getRosterManagementTourStorageKey(userId),
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

export const isRosterManagementTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getRosterManagementTourLaunchEligibility = (user) => {
  const canManageRoster = hasPermission(user, 'rosters.manage')

  return {
    canManageRoster,
    eligible: canManageRoster,
  }
}
