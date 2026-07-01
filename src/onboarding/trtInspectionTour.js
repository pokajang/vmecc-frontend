import { hasPermission } from 'src/utils/authz'
import {
  getTrtOperationalProfileCompleteness,
  isTacticalResponseTeamMember,
} from 'src/onboarding/trtProfileCompletion'
import {
  INSPECTION_TOUR_ANCHOR_TIMEOUT_MS,
  TRT_INSPECTION_TOUR_KEY,
  TRT_INSPECTION_TOUR_REPLAY_EVENT,
  TRT_INSPECTION_TOUR_REQUEST_EVENT,
  TRT_INSPECTION_TOUR_STORAGE_PREFIX,
  TRT_INSPECTION_TOUR_VERSION,
} from 'src/onboarding/inspectionOnboardingContract'

export {
  INSPECTION_TOUR_ANCHOR_TIMEOUT_MS,
  TRT_INSPECTION_TOUR_KEY,
  TRT_INSPECTION_TOUR_REPLAY_EVENT,
  TRT_INSPECTION_TOUR_REQUEST_EVENT,
  TRT_INSPECTION_TOUR_STORAGE_PREFIX,
  TRT_INSPECTION_TOUR_VERSION,
}

export const getTrtInspectionTourStorageKey = (userId) =>
  `${TRT_INSPECTION_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readTrtInspectionTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getTrtInspectionTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeTrtInspectionTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readTrtInspectionTourRecord(userId) || {}
    localStorage.setItem(
      getTrtInspectionTourStorageKey(userId),
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

export const isTrtInspectionTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getInspectionTourLaunchEligibility = (user) => {
  const canViewInspection = hasPermission(user, 'reports.inspection.view')

  return {
    canViewInspection,
    eligible: canViewInspection,
  }
}

export const getTrtInspectionTourEligibility = (user) => {
  const completeness = getTrtOperationalProfileCompleteness(user)
  const applies = isTacticalResponseTeamMember(user)
  const canViewInspection = hasPermission(user, 'reports.inspection.view')

  return {
    applies,
    canViewInspection,
    profileComplete: completeness.complete,
    eligible: applies && completeness.complete && canViewInspection,
  }
}
