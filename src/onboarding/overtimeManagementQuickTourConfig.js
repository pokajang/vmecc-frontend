import {
  OVERTIME_MANAGEMENT_TOUR_ANCHOR_SELECTORS,
  OVERTIME_MANAGEMENT_TOUR_MODULE_SELECTOR,
  OVERTIME_MANAGEMENT_TOUR_STEPS,
} from 'src/onboarding/overtimeManagementTourDefinition'
import {
  OVERTIME_MANAGEMENT_ONBOARDING_MODULE_ID,
  OVERTIME_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  OVERTIME_MANAGEMENT_TOUR_ID,
  OVERTIME_MANAGEMENT_TOUR_KEY,
  OVERTIME_MANAGEMENT_TOUR_LOCALIZED,
  OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT,
  OVERTIME_MANAGEMENT_TOUR_REQUEST_EVENT,
  OVERTIME_MANAGEMENT_TOUR_SOURCE_DEFAULTS,
  OVERTIME_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/overtimeManagementOnboardingContract'
import {
  getOvertimeManagementTourLaunchEligibility,
  isOvertimeManagementTourSuppressed,
  readOvertimeManagementTourRecord,
  writeOvertimeManagementTourRecord,
} from 'src/onboarding/overtimeManagementTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const overtimeManagementQuickTour = {
  id: OVERTIME_MANAGEMENT_TOUR_ID,
  moduleId: OVERTIME_MANAGEMENT_ONBOARDING_MODULE_ID,
  localized: OVERTIME_MANAGEMENT_TOUR_LOCALIZED,
  key: OVERTIME_MANAGEMENT_TOUR_KEY,
  version: OVERTIME_MANAGEMENT_TOUR_VERSION,
  route: '/staff/overtime-management/records',
  routePattern: /^\/staff\/overtime-management\/(?:records|rules|record\/[^/]+)\/?$/i,
  promptRoutePattern: /^\/staff\/overtime-management\/records\/?$/i,
  replayRoutePattern: /^\/staff\/overtime-management\/(?:records|rules|record\/[^/]+)\/?$/i,
  requestEvent: OVERTIME_MANAGEMENT_TOUR_REQUEST_EVENT,
  replayEvent: OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: OVERTIME_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getOvertimeManagementTourLaunchEligibility,
  canLaunch: getOvertimeManagementTourLaunchEligibility,
  canAutoPrompt: getOvertimeManagementTourLaunchEligibility,
  readFallbackRecord: readOvertimeManagementTourRecord,
  suppression: isOvertimeManagementTourSuppressed,
  writeFallbackRecord: writeOvertimeManagementTourRecord,
  selectors: {
    module: OVERTIME_MANAGEMENT_TOUR_MODULE_SELECTOR,
    anchors: OVERTIME_MANAGEMENT_TOUR_ANCHOR_SELECTORS,
  },
  steps: OVERTIME_MANAGEMENT_TOUR_STEPS,
  prompt: {
    title: 'Start Overtime Management tutorial?',
    body: 'See where to review overtime records, narrow the list, inspect rules, and open overtime detail.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Overtime Management controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody:
      'The Overtime Management controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: OVERTIME_MANAGEMENT_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(overtimeManagementQuickTour, 'overtimeManagementQuickTour')
