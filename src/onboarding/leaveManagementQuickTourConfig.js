import {
  LEAVE_MANAGEMENT_TOUR_ANCHOR_SELECTORS,
  LEAVE_MANAGEMENT_TOUR_MODULE_SELECTOR,
  LEAVE_MANAGEMENT_TOUR_STEPS,
} from 'src/onboarding/leaveManagementTourDefinition'
import {
  LEAVE_MANAGEMENT_ONBOARDING_MODULE_ID,
  LEAVE_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  LEAVE_MANAGEMENT_TOUR_ID,
  LEAVE_MANAGEMENT_TOUR_KEY,
  LEAVE_MANAGEMENT_TOUR_LOCALIZED,
  LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT,
  LEAVE_MANAGEMENT_TOUR_REQUEST_EVENT,
  LEAVE_MANAGEMENT_TOUR_SOURCE_DEFAULTS,
  LEAVE_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/leaveManagementOnboardingContract'
import {
  getLeaveManagementTourLaunchEligibility,
  isLeaveManagementTourSuppressed,
  readLeaveManagementTourRecord,
  writeLeaveManagementTourRecord,
} from 'src/onboarding/leaveManagementTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const leaveManagementQuickTour = {
  id: LEAVE_MANAGEMENT_TOUR_ID,
  moduleId: LEAVE_MANAGEMENT_ONBOARDING_MODULE_ID,
  localized: LEAVE_MANAGEMENT_TOUR_LOCALIZED,
  key: LEAVE_MANAGEMENT_TOUR_KEY,
  version: LEAVE_MANAGEMENT_TOUR_VERSION,
  route: '/staff/leave-management/leaves',
  routePattern:
    /^\/staff\/leave-management\/(?:leaves|set-leaves|set-holidays|rules|record\/[^/]+)\/?$/i,
  promptRoutePattern: /^\/staff\/leave-management\/leaves\/?$/i,
  replayRoutePattern:
    /^\/staff\/leave-management\/(?:leaves|set-leaves|set-holidays|rules|record\/[^/]+)\/?$/i,
  requestEvent: LEAVE_MANAGEMENT_TOUR_REQUEST_EVENT,
  replayEvent: LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: LEAVE_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getLeaveManagementTourLaunchEligibility,
  canLaunch: getLeaveManagementTourLaunchEligibility,
  canAutoPrompt: getLeaveManagementTourLaunchEligibility,
  readFallbackRecord: readLeaveManagementTourRecord,
  suppression: isLeaveManagementTourSuppressed,
  writeFallbackRecord: writeLeaveManagementTourRecord,
  selectors: {
    module: LEAVE_MANAGEMENT_TOUR_MODULE_SELECTOR,
    anchors: LEAVE_MANAGEMENT_TOUR_ANCHOR_SELECTORS,
  },
  steps: LEAVE_MANAGEMENT_TOUR_STEPS,
  prompt: {
    title: 'Start Leave Management tutorial?',
    body: 'See where to review leave records, work through entitlement setup, and inspect leave record detail.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Leave Management controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody:
      'The Leave Management controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: LEAVE_MANAGEMENT_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(leaveManagementQuickTour, 'leaveManagementQuickTour')
