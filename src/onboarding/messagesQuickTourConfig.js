import {
  MESSAGES_TOUR_ANCHOR_SELECTORS,
  MESSAGES_TOUR_MODULE_SELECTOR,
  MESSAGES_TOUR_STEPS,
} from 'src/onboarding/messagesTourDefinition'
import {
  MESSAGES_ONBOARDING_MODULE_ID,
  MESSAGES_TOUR_ANCHOR_TIMEOUT_MS,
  MESSAGES_TOUR_ID,
  MESSAGES_TOUR_KEY,
  MESSAGES_TOUR_LOCALIZED,
  MESSAGES_TOUR_REPLAY_EVENT,
  MESSAGES_TOUR_REQUEST_EVENT,
  MESSAGES_TOUR_SOURCE_DEFAULTS,
  MESSAGES_TOUR_VERSION,
} from 'src/onboarding/messagesOnboardingContract'
import {
  getMessagesTourLaunchEligibility,
  getMessagesTourPromptEligibility,
  isMessagesTourSuppressed,
  readMessagesTourRecord,
  writeMessagesTourRecord,
} from 'src/onboarding/messagesTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

const messagesRoutePattern = /^\/messages\/?$/i

export const messagesQuickTour = {
  id: MESSAGES_TOUR_ID,
  moduleId: MESSAGES_ONBOARDING_MODULE_ID,
  localized: MESSAGES_TOUR_LOCALIZED,
  key: MESSAGES_TOUR_KEY,
  version: MESSAGES_TOUR_VERSION,
  route: '/messages',
  routePattern: messagesRoutePattern,
  replayRoutePattern: messagesRoutePattern,
  requestEvent: MESSAGES_TOUR_REQUEST_EVENT,
  replayEvent: MESSAGES_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: MESSAGES_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getMessagesTourLaunchEligibility,
  canLaunch: getMessagesTourLaunchEligibility,
  canAutoPrompt: getMessagesTourPromptEligibility,
  readFallbackRecord: readMessagesTourRecord,
  suppression: isMessagesTourSuppressed,
  writeFallbackRecord: writeMessagesTourRecord,
  selectors: {
    module: MESSAGES_TOUR_MODULE_SELECTOR,
    anchors: MESSAGES_TOUR_ANCHOR_SELECTORS,
  },
  steps: MESSAGES_TOUR_STEPS,
  prompt: {
    title: 'Start Messages tutorial?',
    body: 'See where the inbox, thread view, and message composer live before you start chatting.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Messages controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The Messages controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: MESSAGES_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(messagesQuickTour, 'messagesQuickTour')
