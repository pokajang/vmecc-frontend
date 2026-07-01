import {
  USERS_TOUR_ANCHOR_SELECTORS,
  USERS_TOUR_MODULE_SELECTOR,
  USERS_TOUR_STEPS,
} from 'src/onboarding/usersTourDefinition'
import {
  USERS_ONBOARDING_MODULE_ID,
  USERS_TOUR_ANCHOR_TIMEOUT_MS,
  USERS_TOUR_ID,
  USERS_TOUR_KEY,
  USERS_TOUR_LOCALIZED,
  USERS_TOUR_REPLAY_EVENT,
  USERS_TOUR_REQUEST_EVENT,
  USERS_TOUR_SOURCE_DEFAULTS,
  USERS_TOUR_VERSION,
} from 'src/onboarding/usersOnboardingContract'
import {
  getUsersTourAutoPromptEligibility,
  getUsersTourLaunchEligibility,
  isUsersTourSuppressed,
  readUsersTourRecord,
  writeUsersTourRecord,
} from 'src/onboarding/usersTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const usersQuickTour = {
  id: USERS_TOUR_ID,
  moduleId: USERS_ONBOARDING_MODULE_ID,
  localized: USERS_TOUR_LOCALIZED,
  key: USERS_TOUR_KEY,
  version: USERS_TOUR_VERSION,
  route: '/admin/users',
  routePattern: /^\/admin\/users(?:\/[^/]+(?:\/[^/]+)?)?\/?$/i,
  promptRoutePattern: /^\/admin\/users\/?$/i,
  replayRoutePattern: /^\/admin\/users(?:\/[^/]+(?:\/[^/]+)?)?\/?$/i,
  requestEvent: USERS_TOUR_REQUEST_EVENT,
  replayEvent: USERS_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: USERS_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getUsersTourLaunchEligibility,
  canLaunch: getUsersTourLaunchEligibility,
  canAutoPrompt: getUsersTourAutoPromptEligibility,
  readFallbackRecord: readUsersTourRecord,
  suppression: isUsersTourSuppressed,
  writeFallbackRecord: writeUsersTourRecord,
  selectors: {
    module: USERS_TOUR_MODULE_SELECTOR,
    anchors: USERS_TOUR_ANCHOR_SELECTORS,
  },
  steps: USERS_TOUR_STEPS,
  prompt: {
    title: 'Start Users tutorial?',
    body: 'See where to review user records and open user profile details from one administration surface.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Users controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The Users controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: USERS_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(usersQuickTour, 'usersQuickTour')
