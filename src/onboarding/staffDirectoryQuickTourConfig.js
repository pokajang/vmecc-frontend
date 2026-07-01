import {
  STAFF_DIRECTORY_TOUR_ANCHOR_SELECTORS,
  STAFF_DIRECTORY_TOUR_MODULE_SELECTOR,
  STAFF_DIRECTORY_TOUR_STEPS,
} from 'src/onboarding/staffDirectoryTourDefinition'
import {
  STAFF_DIRECTORY_ONBOARDING_MODULE_ID,
  STAFF_DIRECTORY_TOUR_ANCHOR_TIMEOUT_MS,
  STAFF_DIRECTORY_TOUR_ID,
  STAFF_DIRECTORY_TOUR_KEY,
  STAFF_DIRECTORY_TOUR_LOCALIZED,
  STAFF_DIRECTORY_TOUR_REPLAY_EVENT,
  STAFF_DIRECTORY_TOUR_REQUEST_EVENT,
  STAFF_DIRECTORY_TOUR_SOURCE_DEFAULTS,
  STAFF_DIRECTORY_TOUR_VERSION,
} from 'src/onboarding/staffDirectoryOnboardingContract'
import {
  getStaffDirectoryTourLaunchEligibility,
  isStaffDirectoryTourSuppressed,
  readStaffDirectoryTourRecord,
  writeStaffDirectoryTourRecord,
} from 'src/onboarding/staffDirectoryTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const staffDirectoryQuickTour = {
  id: STAFF_DIRECTORY_TOUR_ID,
  moduleId: STAFF_DIRECTORY_ONBOARDING_MODULE_ID,
  localized: STAFF_DIRECTORY_TOUR_LOCALIZED,
  key: STAFF_DIRECTORY_TOUR_KEY,
  version: STAFF_DIRECTORY_TOUR_VERSION,
  route: '/staff/details',
  routePattern: /^\/staff\/(?:details|profile\/[^/]+)\/?$/i,
  promptRoutePattern: /^\/staff\/details\/?$/i,
  replayRoutePattern: /^\/staff\/(?:details|profile\/[^/]+)\/?$/i,
  requestEvent: STAFF_DIRECTORY_TOUR_REQUEST_EVENT,
  replayEvent: STAFF_DIRECTORY_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: STAFF_DIRECTORY_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getStaffDirectoryTourLaunchEligibility,
  canLaunch: getStaffDirectoryTourLaunchEligibility,
  canAutoPrompt: getStaffDirectoryTourLaunchEligibility,
  readFallbackRecord: readStaffDirectoryTourRecord,
  suppression: isStaffDirectoryTourSuppressed,
  writeFallbackRecord: writeStaffDirectoryTourRecord,
  selectors: {
    module: STAFF_DIRECTORY_TOUR_MODULE_SELECTOR,
    anchors: STAFF_DIRECTORY_TOUR_ANCHOR_SELECTORS,
  },
  steps: STAFF_DIRECTORY_TOUR_STEPS,
  prompt: {
    title: 'Start Staff Directory tutorial?',
    body: 'See where to search staff records, review a staff profile, and find the stable profile action shells.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Staff Directory controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody:
      'The Staff Directory controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: STAFF_DIRECTORY_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(staffDirectoryQuickTour, 'staffDirectoryQuickTour')
