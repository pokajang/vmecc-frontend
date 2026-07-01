import {
  DRILL_TOUR_ANCHOR_SELECTORS,
  DRILL_TOUR_MODULE_SELECTOR,
  DRILL_TOUR_STEPS,
} from 'src/onboarding/drillTourDefinition'
import {
  DRILL_ONBOARDING_MODULE_ID,
  DRILL_TOUR_ANCHOR_TIMEOUT_MS,
  DRILL_TOUR_ID,
  DRILL_TOUR_KEY,
  DRILL_TOUR_LOCALIZED,
  DRILL_TOUR_REPLAY_EVENT,
  DRILL_TOUR_REQUEST_EVENT,
  DRILL_TOUR_SOURCE_DEFAULTS,
  DRILL_TOUR_VERSION,
} from 'src/onboarding/drillOnboardingContract'
import {
  getDrillTourLaunchEligibility,
  getDrillTourPromptEligibility,
  isDrillTourSuppressed,
  readDrillTourRecord,
  writeDrillTourRecord,
} from 'src/onboarding/drillTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'
import { buildSharedReportRoutePattern } from 'src/onboarding/sharedReportOnboarding'

export const drillQuickTour = {
  id: DRILL_TOUR_ID,
  moduleId: DRILL_ONBOARDING_MODULE_ID,
  localized: DRILL_TOUR_LOCALIZED,
  key: DRILL_TOUR_KEY,
  version: DRILL_TOUR_VERSION,
  route: '/report/drill',
  routePattern: buildSharedReportRoutePattern('drill'),
  replayRoutePattern: buildSharedReportRoutePattern('drill'),
  requestEvent: DRILL_TOUR_REQUEST_EVENT,
  replayEvent: DRILL_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: DRILL_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getDrillTourLaunchEligibility,
  canLaunch: getDrillTourLaunchEligibility,
  canAutoPrompt: getDrillTourPromptEligibility,
  readFallbackRecord: readDrillTourRecord,
  suppression: isDrillTourSuppressed,
  writeFallbackRecord: writeDrillTourRecord,
  selectors: {
    module: DRILL_TOUR_MODULE_SELECTOR,
    anchors: DRILL_TOUR_ANCHOR_SELECTORS,
  },
  steps: DRILL_TOUR_STEPS,
  prompt: {
    title: 'Start Drill tutorial?',
    body: 'See where drill records, quick-start entry, and review routes are located.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Drill controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The Drill controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: DRILL_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(drillQuickTour, 'drillQuickTour')
