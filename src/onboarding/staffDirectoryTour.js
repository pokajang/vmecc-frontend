import { hasAnyPermission } from 'src/utils/authz'
import {
  STAFF_DIRECTORY_TOUR_ANCHOR_TIMEOUT_MS,
  STAFF_DIRECTORY_TOUR_KEY,
  STAFF_DIRECTORY_TOUR_REPLAY_EVENT,
  STAFF_DIRECTORY_TOUR_REQUEST_EVENT,
  STAFF_DIRECTORY_TOUR_STORAGE_PREFIX,
  STAFF_DIRECTORY_TOUR_VERSION,
} from 'src/onboarding/staffDirectoryOnboardingContract'

export {
  STAFF_DIRECTORY_TOUR_ANCHOR_TIMEOUT_MS,
  STAFF_DIRECTORY_TOUR_KEY,
  STAFF_DIRECTORY_TOUR_REPLAY_EVENT,
  STAFF_DIRECTORY_TOUR_REQUEST_EVENT,
  STAFF_DIRECTORY_TOUR_STORAGE_PREFIX,
  STAFF_DIRECTORY_TOUR_VERSION,
}

export const getStaffDirectoryTourStorageKey = (userId) =>
  `${STAFF_DIRECTORY_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readStaffDirectoryTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getStaffDirectoryTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeStaffDirectoryTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readStaffDirectoryTourRecord(userId) || {}
    localStorage.setItem(
      getStaffDirectoryTourStorageKey(userId),
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

export const isStaffDirectoryTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getStaffDirectoryTourLaunchEligibility = (user) => {
  const canViewStaffDirectory = hasAnyPermission(user, ['staff.view', 'staff.manage'])

  return {
    canViewStaffDirectory,
    eligible: canViewStaffDirectory,
  }
}
