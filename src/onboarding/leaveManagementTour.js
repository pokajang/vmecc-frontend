import { hasPermission } from 'src/utils/authz'
import {
  LEAVE_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  LEAVE_MANAGEMENT_TOUR_KEY,
  LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT,
  LEAVE_MANAGEMENT_TOUR_REQUEST_EVENT,
  LEAVE_MANAGEMENT_TOUR_STORAGE_PREFIX,
  LEAVE_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/leaveManagementOnboardingContract'

export {
  LEAVE_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  LEAVE_MANAGEMENT_TOUR_KEY,
  LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT,
  LEAVE_MANAGEMENT_TOUR_REQUEST_EVENT,
  LEAVE_MANAGEMENT_TOUR_STORAGE_PREFIX,
  LEAVE_MANAGEMENT_TOUR_VERSION,
}

export const getLeaveManagementTourStorageKey = (userId) =>
  `${LEAVE_MANAGEMENT_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readLeaveManagementTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getLeaveManagementTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeLeaveManagementTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readLeaveManagementTourRecord(userId) || {}
    localStorage.setItem(
      getLeaveManagementTourStorageKey(userId),
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

export const isLeaveManagementTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getLeaveManagementTourLaunchEligibility = (user) => {
  const canViewLeaveManagement = hasPermission(user, 'staff.leave.manage')

  return {
    canViewLeaveManagement,
    eligible: canViewLeaveManagement,
  }
}
