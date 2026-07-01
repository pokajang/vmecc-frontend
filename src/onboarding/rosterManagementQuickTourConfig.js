import {
  ROSTER_MANAGEMENT_TOUR_ANCHOR_SELECTORS,
  ROSTER_MANAGEMENT_TOUR_MODULE_SELECTOR,
  ROSTER_MANAGEMENT_TOUR_STEPS,
} from 'src/onboarding/rosterManagementTourDefinition'
import {
  ROSTER_MANAGEMENT_ONBOARDING_MODULE_ID,
  ROSTER_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  ROSTER_MANAGEMENT_TOUR_ID,
  ROSTER_MANAGEMENT_TOUR_KEY,
  ROSTER_MANAGEMENT_TOUR_LOCALIZED,
  ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT,
  ROSTER_MANAGEMENT_TOUR_REQUEST_EVENT,
  ROSTER_MANAGEMENT_TOUR_SOURCE_DEFAULTS,
  ROSTER_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/rosterManagementOnboardingContract'
import {
  getRosterManagementTourLaunchEligibility,
  isRosterManagementTourSuppressed,
  readRosterManagementTourRecord,
  writeRosterManagementTourRecord,
} from 'src/onboarding/rosterManagementTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const rosterManagementQuickTour = {
  id: ROSTER_MANAGEMENT_TOUR_ID,
  moduleId: ROSTER_MANAGEMENT_ONBOARDING_MODULE_ID,
  localized: ROSTER_MANAGEMENT_TOUR_LOCALIZED,
  key: ROSTER_MANAGEMENT_TOUR_KEY,
  version: ROSTER_MANAGEMENT_TOUR_VERSION,
  route: '/roster/overview',
  routePattern: /^\/roster(?:\/(?:overview|schedule))?\/?$/i,
  promptRoutePattern: /^\/roster\/overview\/?$/i,
  replayRoutePattern: /^\/roster(?:\/(?:overview|schedule))?\/?$/i,
  requestEvent: ROSTER_MANAGEMENT_TOUR_REQUEST_EVENT,
  replayEvent: ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: ROSTER_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getRosterManagementTourLaunchEligibility,
  canLaunch: getRosterManagementTourLaunchEligibility,
  canAutoPrompt: getRosterManagementTourLaunchEligibility,
  readFallbackRecord: readRosterManagementTourRecord,
  suppression: isRosterManagementTourSuppressed,
  writeFallbackRecord: writeRosterManagementTourRecord,
  selectors: {
    module: ROSTER_MANAGEMENT_TOUR_MODULE_SELECTOR,
    anchors: ROSTER_MANAGEMENT_TOUR_ANCHOR_SELECTORS,
  },
  steps: ROSTER_MANAGEMENT_TOUR_STEPS,
  prompt: {
    title: 'Start Roster Management tutorial?',
    body: 'See where to review coverage, enter the roster editor, and inspect the draft and publish shells.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Roster Management controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody:
      'The Roster Management controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: ROSTER_MANAGEMENT_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(rosterManagementQuickTour, 'rosterManagementQuickTour')
