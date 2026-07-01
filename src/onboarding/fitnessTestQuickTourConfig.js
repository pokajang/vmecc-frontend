import {
  FITNESS_TEST_TOUR_ANCHOR_SELECTORS,
  FITNESS_TEST_TOUR_MODULE_SELECTOR,
  FITNESS_TEST_TOUR_STEPS,
} from 'src/onboarding/fitnessTestTourDefinition'
import {
  FITNESS_TEST_ONBOARDING_MODULE_ID,
  FITNESS_TEST_TOUR_ANCHOR_TIMEOUT_MS,
  FITNESS_TEST_TOUR_ID,
  FITNESS_TEST_TOUR_KEY,
  FITNESS_TEST_TOUR_LOCALIZED,
  FITNESS_TEST_TOUR_REPLAY_EVENT,
  FITNESS_TEST_TOUR_REQUEST_EVENT,
  FITNESS_TEST_TOUR_SOURCE_DEFAULTS,
  FITNESS_TEST_TOUR_VERSION,
} from 'src/onboarding/fitnessTestOnboardingContract'
import {
  getFitnessTestTourLaunchEligibility,
  getFitnessTestTourPromptEligibility,
  isFitnessTestTourSuppressed,
  readFitnessTestTourRecord,
  writeFitnessTestTourRecord,
} from 'src/onboarding/fitnessTestTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'
import { buildSharedReportRoutePattern } from 'src/onboarding/sharedReportOnboarding'

export const fitnessTestQuickTour = {
  id: FITNESS_TEST_TOUR_ID,
  moduleId: FITNESS_TEST_ONBOARDING_MODULE_ID,
  localized: FITNESS_TEST_TOUR_LOCALIZED,
  key: FITNESS_TEST_TOUR_KEY,
  version: FITNESS_TEST_TOUR_VERSION,
  route: '/report/fitness-test',
  routePattern: buildSharedReportRoutePattern('fitness-test'),
  replayRoutePattern: buildSharedReportRoutePattern('fitness-test'),
  requestEvent: FITNESS_TEST_TOUR_REQUEST_EVENT,
  replayEvent: FITNESS_TEST_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: FITNESS_TEST_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getFitnessTestTourLaunchEligibility,
  canLaunch: getFitnessTestTourLaunchEligibility,
  canAutoPrompt: getFitnessTestTourPromptEligibility,
  readFallbackRecord: readFitnessTestTourRecord,
  suppression: isFitnessTestTourSuppressed,
  writeFallbackRecord: writeFitnessTestTourRecord,
  selectors: {
    module: FITNESS_TEST_TOUR_MODULE_SELECTOR,
    anchors: FITNESS_TEST_TOUR_ANCHOR_SELECTORS,
  },
  steps: FITNESS_TEST_TOUR_STEPS,
  prompt: {
    title: 'Start Fitness Test tutorial?',
    body: 'See where fitness test records, quick-start entry, and review routes are located.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Fitness Test controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The Fitness Test controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: FITNESS_TEST_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(fitnessTestQuickTour, 'fitnessTestQuickTour')
