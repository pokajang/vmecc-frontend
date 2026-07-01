import { hasPermission } from 'src/utils/authz'
import {
  OVERTIME_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  OVERTIME_MANAGEMENT_TOUR_KEY,
  OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT,
  OVERTIME_MANAGEMENT_TOUR_REQUEST_EVENT,
  OVERTIME_MANAGEMENT_TOUR_STORAGE_PREFIX,
  OVERTIME_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/overtimeManagementOnboardingContract'

export {
  OVERTIME_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  OVERTIME_MANAGEMENT_TOUR_KEY,
  OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT,
  OVERTIME_MANAGEMENT_TOUR_REQUEST_EVENT,
  OVERTIME_MANAGEMENT_TOUR_STORAGE_PREFIX,
  OVERTIME_MANAGEMENT_TOUR_VERSION,
}

export const getOvertimeManagementTourStorageKey = (userId) =>
  `${OVERTIME_MANAGEMENT_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readOvertimeManagementTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getOvertimeManagementTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeOvertimeManagementTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readOvertimeManagementTourRecord(userId) || {}
    localStorage.setItem(
      getOvertimeManagementTourStorageKey(userId),
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

export const isOvertimeManagementTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getOvertimeManagementTourLaunchEligibility = (user) => {
  const canViewOvertimeManagement = hasPermission(user, 'staff.overtime.manage')

  return {
    canViewOvertimeManagement,
    eligible: canViewOvertimeManagement,
  }
}
