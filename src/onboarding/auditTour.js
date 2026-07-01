import { hasPermission } from 'src/utils/authz'

import {
  AUDIT_TOUR_ANCHOR_TIMEOUT_MS,
  AUDIT_TOUR_KEY,
  AUDIT_TOUR_REPLAY_EVENT,
  AUDIT_TOUR_REQUEST_EVENT,
  AUDIT_TOUR_STORAGE_PREFIX,
  AUDIT_TOUR_VERSION,
} from 'src/onboarding/auditOnboardingContract'

export {
  AUDIT_TOUR_ANCHOR_TIMEOUT_MS,
  AUDIT_TOUR_KEY,
  AUDIT_TOUR_REPLAY_EVENT,
  AUDIT_TOUR_REQUEST_EVENT,
  AUDIT_TOUR_STORAGE_PREFIX,
  AUDIT_TOUR_VERSION,
}

export const getAuditTourStorageKey = (userId) =>
  `${AUDIT_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readAuditTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getAuditTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeAuditTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readAuditTourRecord(userId) || {}
    localStorage.setItem(
      getAuditTourStorageKey(userId),
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

export const isAuditTourSuppressed = (record) => Boolean(record?.completedAt || record?.dismissedAt)

export const getAuditTourLaunchEligibility = (user) => {
  const canViewAudit = hasPermission(user, 'audit.view')

  return {
    canViewAudit,
    eligible: canViewAudit,
  }
}

export const getAuditTourAutoPromptEligibility = (user) => getAuditTourLaunchEligibility(user)
