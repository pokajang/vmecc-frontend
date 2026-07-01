import {
  SETTINGS_TOUR_ANCHOR_TIMEOUT_MS,
  SETTINGS_TOUR_KEY,
  SETTINGS_TOUR_REPLAY_EVENT,
  SETTINGS_TOUR_REQUEST_EVENT,
  SETTINGS_TOUR_STORAGE_PREFIX,
  SETTINGS_TOUR_VERSION,
} from 'src/onboarding/settingsOnboardingContract'
import {
  getReplayOnlyTourPromptEligibility,
  getSharedReportTourLaunchEligibility,
  getSharedReportTourStorageKey,
  isSharedReportTourSuppressed,
  readSharedReportTourRecord,
  writeSharedReportTourRecord,
} from 'src/onboarding/sharedReportOnboarding'

export {
  SETTINGS_TOUR_ANCHOR_TIMEOUT_MS,
  SETTINGS_TOUR_KEY,
  SETTINGS_TOUR_REPLAY_EVENT,
  SETTINGS_TOUR_REQUEST_EVENT,
  SETTINGS_TOUR_STORAGE_PREFIX,
  SETTINGS_TOUR_VERSION,
}

export const getSettingsTourStorageKey = (userId) =>
  getSharedReportTourStorageKey(SETTINGS_TOUR_STORAGE_PREFIX, userId)

export const readSettingsTourRecord = (userId) =>
  readSharedReportTourRecord(SETTINGS_TOUR_STORAGE_PREFIX, userId)

export const writeSettingsTourRecord = (userId, patch) =>
  writeSharedReportTourRecord(SETTINGS_TOUR_STORAGE_PREFIX, userId, patch)

export const isSettingsTourSuppressed = (record) => isSharedReportTourSuppressed(record)

export const getSettingsTourLaunchEligibility = (user) =>
  getSharedReportTourLaunchEligibility(user, 'settings.manage')

export const getSettingsTourPromptEligibility = (user) =>
  getReplayOnlyTourPromptEligibility(user, 'settings.manage')
