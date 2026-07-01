import { hasPermission } from 'src/utils/authz'
import {
  PAYROLL_CLAIMS_TOUR_ANCHOR_TIMEOUT_MS,
  PAYROLL_CLAIMS_TOUR_KEY,
  PAYROLL_CLAIMS_TOUR_REPLAY_EVENT,
  PAYROLL_CLAIMS_TOUR_REQUEST_EVENT,
  PAYROLL_CLAIMS_TOUR_STORAGE_PREFIX,
  PAYROLL_CLAIMS_TOUR_VERSION,
} from 'src/onboarding/payrollClaimsOnboardingContract'

export {
  PAYROLL_CLAIMS_TOUR_ANCHOR_TIMEOUT_MS,
  PAYROLL_CLAIMS_TOUR_KEY,
  PAYROLL_CLAIMS_TOUR_REPLAY_EVENT,
  PAYROLL_CLAIMS_TOUR_REQUEST_EVENT,
  PAYROLL_CLAIMS_TOUR_STORAGE_PREFIX,
  PAYROLL_CLAIMS_TOUR_VERSION,
}

export const getPayrollClaimsTourStorageKey = (userId) =>
  `${PAYROLL_CLAIMS_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readPayrollClaimsTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getPayrollClaimsTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writePayrollClaimsTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readPayrollClaimsTourRecord(userId) || {}
    localStorage.setItem(
      getPayrollClaimsTourStorageKey(userId),
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

export const isPayrollClaimsTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getPayrollClaimsTourLaunchEligibility = (user) => {
  const canViewPayroll = hasPermission(user, 'self.payroll')

  return {
    canViewPayroll,
    eligible: canViewPayroll,
  }
}

export const getPayrollClaimsTourPromptEligibility = (user) => {
  const eligibility = getPayrollClaimsTourLaunchEligibility(user)

  return {
    ...eligibility,
    eligible: false,
  }
}
