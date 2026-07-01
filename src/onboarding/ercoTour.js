import {
  ERCO_TOUR_ANCHOR_TIMEOUT_MS,
  ERCO_TOUR_KEY,
  ERCO_TOUR_REPLAY_EVENT,
  ERCO_TOUR_REQUEST_EVENT,
  ERCO_TOUR_STORAGE_PREFIX,
  ERCO_TOUR_VERSION,
} from 'src/onboarding/ercoOnboardingContract'
import {
  getReplayOnlyTourPromptEligibility,
  getSharedReportTourLaunchEligibility,
  getSharedReportTourStorageKey,
  isSharedReportTourSuppressed,
  readSharedReportTourRecord,
  writeSharedReportTourRecord,
} from 'src/onboarding/sharedReportOnboarding'

export {
  ERCO_TOUR_ANCHOR_TIMEOUT_MS,
  ERCO_TOUR_KEY,
  ERCO_TOUR_REPLAY_EVENT,
  ERCO_TOUR_REQUEST_EVENT,
  ERCO_TOUR_STORAGE_PREFIX,
  ERCO_TOUR_VERSION,
}

export const getErcoTourStorageKey = (userId) =>
  getSharedReportTourStorageKey(ERCO_TOUR_STORAGE_PREFIX, userId)

export const readErcoTourRecord = (userId) =>
  readSharedReportTourRecord(ERCO_TOUR_STORAGE_PREFIX, userId)

export const writeErcoTourRecord = (userId, patch) =>
  writeSharedReportTourRecord(ERCO_TOUR_STORAGE_PREFIX, userId, patch)

export const isErcoTourSuppressed = (record) => isSharedReportTourSuppressed(record)

export const getErcoTourLaunchEligibility = (user) =>
  getSharedReportTourLaunchEligibility(user, 'reports.erco.view')

export const getErcoTourPromptEligibility = (user) =>
  getReplayOnlyTourPromptEligibility(user, 'reports.erco.view')
