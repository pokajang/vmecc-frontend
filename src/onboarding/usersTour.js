import { hasPermission } from 'src/utils/authz'

import {
  USERS_TOUR_ANCHOR_TIMEOUT_MS,
  USERS_TOUR_KEY,
  USERS_TOUR_REPLAY_EVENT,
  USERS_TOUR_REQUEST_EVENT,
  USERS_TOUR_STORAGE_PREFIX,
  USERS_TOUR_VERSION,
} from 'src/onboarding/usersOnboardingContract'

export {
  USERS_TOUR_ANCHOR_TIMEOUT_MS,
  USERS_TOUR_KEY,
  USERS_TOUR_REPLAY_EVENT,
  USERS_TOUR_REQUEST_EVENT,
  USERS_TOUR_STORAGE_PREFIX,
  USERS_TOUR_VERSION,
}

export const getUsersTourStorageKey = (userId) =>
  `${USERS_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readUsersTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getUsersTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeUsersTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readUsersTourRecord(userId) || {}
    localStorage.setItem(
      getUsersTourStorageKey(userId),
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

export const isUsersTourSuppressed = (record) => Boolean(record?.completedAt || record?.dismissedAt)

export const getUsersTourLaunchEligibility = (user) => {
  const canViewUsers = hasPermission(user, 'users.manage')

  return {
    canViewUsers,
    eligible: canViewUsers,
  }
}

export const getUsersTourAutoPromptEligibility = (user) => {
  const canViewUsers = hasPermission(user, 'users.manage')

  return {
    canViewUsers,
    eligible: false,
  }
}
