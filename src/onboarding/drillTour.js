import {
  DRILL_TOUR_ANCHOR_TIMEOUT_MS,
  DRILL_TOUR_KEY,
  DRILL_TOUR_REPLAY_EVENT,
  DRILL_TOUR_REQUEST_EVENT,
  DRILL_TOUR_STORAGE_PREFIX,
  DRILL_TOUR_VERSION,
} from 'src/onboarding/drillOnboardingContract'
import {
  getReplayOnlyTourPromptEligibility,
  getSharedReportTourLaunchEligibility,
  getSharedReportTourStorageKey,
  isSharedReportTourSuppressed,
  readSharedReportTourRecord,
  writeSharedReportTourRecord,
} from 'src/onboarding/sharedReportOnboarding'

export {
  DRILL_TOUR_ANCHOR_TIMEOUT_MS,
  DRILL_TOUR_KEY,
  DRILL_TOUR_REPLAY_EVENT,
  DRILL_TOUR_REQUEST_EVENT,
  DRILL_TOUR_STORAGE_PREFIX,
  DRILL_TOUR_VERSION,
}

export const getDrillTourStorageKey = (userId) =>
  getSharedReportTourStorageKey(DRILL_TOUR_STORAGE_PREFIX, userId)

export const readDrillTourRecord = (userId) =>
  readSharedReportTourRecord(DRILL_TOUR_STORAGE_PREFIX, userId)

export const writeDrillTourRecord = (userId, patch) =>
  writeSharedReportTourRecord(DRILL_TOUR_STORAGE_PREFIX, userId, patch)

export const isDrillTourSuppressed = (record) => isSharedReportTourSuppressed(record)

export const getDrillTourLaunchEligibility = (user) =>
  getSharedReportTourLaunchEligibility(user, 'reports.drill.view')

export const getDrillTourPromptEligibility = (user) =>
  getReplayOnlyTourPromptEligibility(user, 'reports.drill.view')
