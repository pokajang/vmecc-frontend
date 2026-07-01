import {
  MESSAGES_TOUR_ANCHOR_TIMEOUT_MS,
  MESSAGES_TOUR_KEY,
  MESSAGES_TOUR_REPLAY_EVENT,
  MESSAGES_TOUR_REQUEST_EVENT,
  MESSAGES_TOUR_STORAGE_PREFIX,
  MESSAGES_TOUR_VERSION,
} from 'src/onboarding/messagesOnboardingContract'
import {
  getReplayOnlyTourPromptEligibility,
  getSharedReportTourLaunchEligibility,
  getSharedReportTourStorageKey,
  isSharedReportTourSuppressed,
  readSharedReportTourRecord,
  writeSharedReportTourRecord,
} from 'src/onboarding/sharedReportOnboarding'

export {
  MESSAGES_TOUR_ANCHOR_TIMEOUT_MS,
  MESSAGES_TOUR_KEY,
  MESSAGES_TOUR_REPLAY_EVENT,
  MESSAGES_TOUR_REQUEST_EVENT,
  MESSAGES_TOUR_STORAGE_PREFIX,
  MESSAGES_TOUR_VERSION,
}

export const getMessagesTourStorageKey = (userId) =>
  getSharedReportTourStorageKey(MESSAGES_TOUR_STORAGE_PREFIX, userId)

export const readMessagesTourRecord = (userId) =>
  readSharedReportTourRecord(MESSAGES_TOUR_STORAGE_PREFIX, userId)

export const writeMessagesTourRecord = (userId, patch) =>
  writeSharedReportTourRecord(MESSAGES_TOUR_STORAGE_PREFIX, userId, patch)

export const isMessagesTourSuppressed = (record) => isSharedReportTourSuppressed(record)

export const getMessagesTourLaunchEligibility = (user) =>
  getSharedReportTourLaunchEligibility(user, 'self.messages')

export const getMessagesTourPromptEligibility = (user) =>
  getReplayOnlyTourPromptEligibility(user, 'self.messages')
