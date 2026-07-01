import {
  MY_OVERTIME_TOUR_ANCHOR_SELECTORS,
  MY_OVERTIME_TOUR_MODULE_SELECTOR,
  MY_OVERTIME_TOUR_STEPS,
} from 'src/onboarding/myOvertimeTourDefinition'
import {
  MY_OVERTIME_ONBOARDING_MODULE_ID,
  MY_OVERTIME_TOUR_ANCHOR_TIMEOUT_MS,
  MY_OVERTIME_TOUR_ID,
  MY_OVERTIME_TOUR_KEY,
  MY_OVERTIME_TOUR_LOCALIZED,
  MY_OVERTIME_TOUR_REPLAY_EVENT,
  MY_OVERTIME_TOUR_REQUEST_EVENT,
  MY_OVERTIME_TOUR_SOURCE_DEFAULTS,
  MY_OVERTIME_TOUR_VERSION,
} from 'src/onboarding/myOvertimeOnboardingContract'
import {
  getMyOvertimeTourLaunchEligibility,
  isMyOvertimeTourSuppressed,
  readMyOvertimeTourRecord,
  writeMyOvertimeTourRecord,
} from 'src/onboarding/myOvertimeTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const myOvertimeQuickTour = {
  id: MY_OVERTIME_TOUR_ID,
  moduleId: MY_OVERTIME_ONBOARDING_MODULE_ID,
  localized: MY_OVERTIME_TOUR_LOCALIZED,
  key: MY_OVERTIME_TOUR_KEY,
  version: MY_OVERTIME_TOUR_VERSION,
  route: '/overtime',
  routePattern: /^\/overtime(?:\/new|\/[^/]+)?\/?$/i,
  promptRoutePattern: /^\/overtime\/?$/i,
  replayRoutePattern: /^\/overtime(?:\/new|\/[^/]+)?\/?$/i,
  requestEvent: MY_OVERTIME_TOUR_REQUEST_EVENT,
  replayEvent: MY_OVERTIME_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: MY_OVERTIME_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getMyOvertimeTourLaunchEligibility,
  canLaunch: getMyOvertimeTourLaunchEligibility,
  canAutoPrompt: getMyOvertimeTourLaunchEligibility,
  readFallbackRecord: readMyOvertimeTourRecord,
  suppression: isMyOvertimeTourSuppressed,
  writeFallbackRecord: writeMyOvertimeTourRecord,
  selectors: {
    module: MY_OVERTIME_TOUR_MODULE_SELECTOR,
    anchors: MY_OVERTIME_TOUR_ANCHOR_SELECTORS,
  },
  steps: MY_OVERTIME_TOUR_STEPS,
  prompt: {
    title: 'Start Overtime tutorial?',
    body: 'See where to review overtime records, resume drafts, and start a new overtime claim.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Overtime controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The Overtime controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: MY_OVERTIME_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(myOvertimeQuickTour, 'myOvertimeQuickTour')
