import {
  ERCO_TOUR_ANCHOR_SELECTORS,
  ERCO_TOUR_MODULE_SELECTOR,
  ERCO_TOUR_STEPS,
} from 'src/onboarding/ercoTourDefinition'
import {
  ERCO_ONBOARDING_MODULE_ID,
  ERCO_TOUR_ANCHOR_TIMEOUT_MS,
  ERCO_TOUR_ID,
  ERCO_TOUR_KEY,
  ERCO_TOUR_LOCALIZED,
  ERCO_TOUR_REPLAY_EVENT,
  ERCO_TOUR_REQUEST_EVENT,
  ERCO_TOUR_SOURCE_DEFAULTS,
  ERCO_TOUR_VERSION,
} from 'src/onboarding/ercoOnboardingContract'
import {
  getErcoTourLaunchEligibility,
  getErcoTourPromptEligibility,
  isErcoTourSuppressed,
  readErcoTourRecord,
  writeErcoTourRecord,
} from 'src/onboarding/ercoTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'
import { buildSharedReportRoutePattern } from 'src/onboarding/sharedReportOnboarding'

export const ercoQuickTour = {
  id: ERCO_TOUR_ID,
  moduleId: ERCO_ONBOARDING_MODULE_ID,
  localized: ERCO_TOUR_LOCALIZED,
  key: ERCO_TOUR_KEY,
  version: ERCO_TOUR_VERSION,
  route: '/report/erco',
  routePattern: buildSharedReportRoutePattern('erco'),
  replayRoutePattern: buildSharedReportRoutePattern('erco'),
  requestEvent: ERCO_TOUR_REQUEST_EVENT,
  replayEvent: ERCO_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: ERCO_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getErcoTourLaunchEligibility,
  canLaunch: getErcoTourLaunchEligibility,
  canAutoPrompt: getErcoTourPromptEligibility,
  readFallbackRecord: readErcoTourRecord,
  suppression: isErcoTourSuppressed,
  writeFallbackRecord: writeErcoTourRecord,
  selectors: {
    module: ERCO_TOUR_MODULE_SELECTOR,
    anchors: ERCO_TOUR_ANCHOR_SELECTORS,
  },
  steps: ERCO_TOUR_STEPS,
  prompt: {
    title: 'Start ERCO tutorial?',
    body: 'See where ERCO records, quick-start entry, and review routes are located.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible ERCO controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The ERCO controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: ERCO_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(ercoQuickTour, 'ercoQuickTour')
