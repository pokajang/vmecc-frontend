import {
  MY_LEAVE_TOUR_ANCHOR_SELECTORS,
  MY_LEAVE_TOUR_MODULE_SELECTOR,
  MY_LEAVE_TOUR_STEPS,
} from 'src/onboarding/myLeaveTourDefinition'
import {
  MY_LEAVE_ONBOARDING_MODULE_ID,
  MY_LEAVE_TOUR_ANCHOR_TIMEOUT_MS,
  MY_LEAVE_TOUR_ID,
  MY_LEAVE_TOUR_LOCALIZED,
  MY_LEAVE_TOUR_SOURCE_DEFAULTS,
  MY_LEAVE_TOUR_KEY,
  MY_LEAVE_TOUR_REPLAY_EVENT,
  MY_LEAVE_TOUR_REQUEST_EVENT,
  MY_LEAVE_TOUR_VERSION,
} from 'src/onboarding/myLeaveOnboardingContract'
import {
  getMyLeaveTourLaunchEligibility,
  isMyLeaveTourSuppressed,
  readMyLeaveTourRecord,
  writeMyLeaveTourRecord,
} from 'src/onboarding/myLeaveTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const myLeaveQuickTour = {
  id: MY_LEAVE_TOUR_ID,
  moduleId: MY_LEAVE_ONBOARDING_MODULE_ID,
  localized: MY_LEAVE_TOUR_LOCALIZED,
  key: MY_LEAVE_TOUR_KEY,
  version: MY_LEAVE_TOUR_VERSION,
  route: '/leave',
  routePattern: /^\/leave(?:\/new|\/[^/]+)?\/?$/i,
  promptRoutePattern: /^\/leave\/?$/i,
  replayRoutePattern: /^\/leave(?:\/new|\/[^/]+)?\/?$/i,
  requestEvent: MY_LEAVE_TOUR_REQUEST_EVENT,
  replayEvent: MY_LEAVE_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: MY_LEAVE_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getMyLeaveTourLaunchEligibility,
  canLaunch: getMyLeaveTourLaunchEligibility,
  canAutoPrompt: getMyLeaveTourLaunchEligibility,
  readFallbackRecord: readMyLeaveTourRecord,
  suppression: isMyLeaveTourSuppressed,
  writeFallbackRecord: writeMyLeaveTourRecord,
  selectors: {
    module: MY_LEAVE_TOUR_MODULE_SELECTOR,
    anchors: MY_LEAVE_TOUR_ANCHOR_SELECTORS,
  },
  steps: MY_LEAVE_TOUR_STEPS,
  prompt: {
    title: 'Start Leave tutorial?',
    body: 'See where to review leave records, filter requests, and start a new application.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Leave controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The Leave controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: MY_LEAVE_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(myLeaveQuickTour, 'myLeaveQuickTour')
