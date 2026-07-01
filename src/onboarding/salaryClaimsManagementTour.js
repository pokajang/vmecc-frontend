import { hasPermission } from 'src/utils/authz'
import {
  SALARY_CLAIMS_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  SALARY_CLAIMS_MANAGEMENT_TOUR_KEY,
  SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT,
  SALARY_CLAIMS_MANAGEMENT_TOUR_REQUEST_EVENT,
  SALARY_CLAIMS_MANAGEMENT_TOUR_STORAGE_PREFIX,
  SALARY_CLAIMS_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/salaryClaimsManagementOnboardingContract'

export {
  SALARY_CLAIMS_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  SALARY_CLAIMS_MANAGEMENT_TOUR_KEY,
  SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT,
  SALARY_CLAIMS_MANAGEMENT_TOUR_REQUEST_EVENT,
  SALARY_CLAIMS_MANAGEMENT_TOUR_STORAGE_PREFIX,
  SALARY_CLAIMS_MANAGEMENT_TOUR_VERSION,
}

export const getSalaryClaimsManagementTourStorageKey = (userId) =>
  `${SALARY_CLAIMS_MANAGEMENT_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readSalaryClaimsManagementTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(
      localStorage.getItem(getSalaryClaimsManagementTourStorageKey(userId)) || 'null',
    )
  } catch {
    return null
  }
}

export const writeSalaryClaimsManagementTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readSalaryClaimsManagementTourRecord(userId) || {}
    localStorage.setItem(
      getSalaryClaimsManagementTourStorageKey(userId),
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

export const isSalaryClaimsManagementTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getSalaryClaimsManagementTourLaunchEligibility = (user) => {
  const canViewSalaryClaimsManagement = hasPermission(user, 'staff.salary.manage')

  return {
    canViewSalaryClaimsManagement,
    eligible: canViewSalaryClaimsManagement,
  }
}
