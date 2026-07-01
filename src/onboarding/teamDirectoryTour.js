import { hasPermission } from 'src/utils/authz'
import {
  TEAM_DIRECTORY_TOUR_ANCHOR_TIMEOUT_MS,
  TEAM_DIRECTORY_TOUR_KEY,
  TEAM_DIRECTORY_TOUR_REPLAY_EVENT,
  TEAM_DIRECTORY_TOUR_REQUEST_EVENT,
  TEAM_DIRECTORY_TOUR_STORAGE_PREFIX,
  TEAM_DIRECTORY_TOUR_VERSION,
} from 'src/onboarding/teamDirectoryOnboardingContract'

export {
  TEAM_DIRECTORY_TOUR_ANCHOR_TIMEOUT_MS,
  TEAM_DIRECTORY_TOUR_KEY,
  TEAM_DIRECTORY_TOUR_REPLAY_EVENT,
  TEAM_DIRECTORY_TOUR_REQUEST_EVENT,
  TEAM_DIRECTORY_TOUR_STORAGE_PREFIX,
  TEAM_DIRECTORY_TOUR_VERSION,
}

export const getTeamDirectoryTourStorageKey = (userId) =>
  `${TEAM_DIRECTORY_TOUR_STORAGE_PREFIX}:${userId || 'anonymous'}`

export const readTeamDirectoryTourRecord = (userId) => {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(getTeamDirectoryTourStorageKey(userId)) || 'null')
  } catch {
    return null
  }
}

export const writeTeamDirectoryTourRecord = (userId, patch) => {
  if (typeof localStorage === 'undefined') return
  try {
    const existing = readTeamDirectoryTourRecord(userId) || {}
    localStorage.setItem(
      getTeamDirectoryTourStorageKey(userId),
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

export const isTeamDirectoryTourSuppressed = (record) =>
  Boolean(record?.completedAt || record?.dismissedAt)

export const getTeamDirectoryTourLaunchEligibility = (user) => {
  const canViewTeamDirectory = hasPermission(user, 'teams.view')

  return {
    canViewTeamDirectory,
    eligible: canViewTeamDirectory,
  }
}
