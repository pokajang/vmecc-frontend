import {
  FITNESS_TEST_TOUR_ANCHOR_TIMEOUT_MS,
  FITNESS_TEST_TOUR_KEY,
  FITNESS_TEST_TOUR_REPLAY_EVENT,
  FITNESS_TEST_TOUR_REQUEST_EVENT,
  FITNESS_TEST_TOUR_STORAGE_PREFIX,
  FITNESS_TEST_TOUR_VERSION,
} from 'src/onboarding/fitnessTestOnboardingContract'
import {
  getReplayOnlyTourPromptEligibility,
  getSharedReportTourLaunchEligibility,
  getSharedReportTourStorageKey,
  isSharedReportTourSuppressed,
  readSharedReportTourRecord,
  writeSharedReportTourRecord,
} from 'src/onboarding/sharedReportOnboarding'

export {
  FITNESS_TEST_TOUR_ANCHOR_TIMEOUT_MS,
  FITNESS_TEST_TOUR_KEY,
  FITNESS_TEST_TOUR_REPLAY_EVENT,
  FITNESS_TEST_TOUR_REQUEST_EVENT,
  FITNESS_TEST_TOUR_STORAGE_PREFIX,
  FITNESS_TEST_TOUR_VERSION,
}

export const getFitnessTestTourStorageKey = (userId) =>
  getSharedReportTourStorageKey(FITNESS_TEST_TOUR_STORAGE_PREFIX, userId)

export const readFitnessTestTourRecord = (userId) =>
  readSharedReportTourRecord(FITNESS_TEST_TOUR_STORAGE_PREFIX, userId)

export const writeFitnessTestTourRecord = (userId, patch) =>
  writeSharedReportTourRecord(FITNESS_TEST_TOUR_STORAGE_PREFIX, userId, patch)

export const isFitnessTestTourSuppressed = (record) => isSharedReportTourSuppressed(record)

export const getFitnessTestTourLaunchEligibility = (user) =>
  getSharedReportTourLaunchEligibility(user, 'reports.fitness.view')

export const getFitnessTestTourPromptEligibility = (user) =>
  getReplayOnlyTourPromptEligibility(user, 'reports.fitness.view')
