import {
  DASHBOARD_TOUR_ANCHOR_SELECTORS,
  DASHBOARD_TOUR_MODULE_SELECTOR,
  DASHBOARD_TOUR_STEPS,
} from 'src/onboarding/dashboardTourDefinition'
import {
  DASHBOARD_ONBOARDING_MODULE_ID,
  DASHBOARD_TOUR_ANCHOR_TIMEOUT_MS,
  DASHBOARD_TOUR_ID,
  DASHBOARD_TOUR_KEY,
  DASHBOARD_TOUR_LOCALIZED,
  DASHBOARD_TOUR_REPLAY_EVENT,
  DASHBOARD_TOUR_REQUEST_EVENT,
  DASHBOARD_TOUR_SOURCE_DEFAULTS,
  DASHBOARD_TOUR_VERSION,
} from 'src/onboarding/dashboardOnboardingContract'
import {
  getDashboardTourLaunchEligibility,
  isDashboardTourSuppressed,
  readDashboardTourRecord,
  writeDashboardTourRecord,
} from 'src/onboarding/dashboardTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const dashboardQuickTour = {
  id: DASHBOARD_TOUR_ID,
  moduleId: DASHBOARD_ONBOARDING_MODULE_ID,
  localized: DASHBOARD_TOUR_LOCALIZED,
  key: DASHBOARD_TOUR_KEY,
  version: DASHBOARD_TOUR_VERSION,
  route: '/dashboard',
  routePattern: /^\/dashboard\/?$/i,
  promptRoutePattern: /^\/dashboard\/?$/i,
  replayRoutePattern: /^\/dashboard\/?$/i,
  requestEvent: DASHBOARD_TOUR_REQUEST_EVENT,
  replayEvent: DASHBOARD_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: DASHBOARD_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getDashboardTourLaunchEligibility,
  canLaunch: getDashboardTourLaunchEligibility,
  canAutoPrompt: getDashboardTourLaunchEligibility,
  readFallbackRecord: readDashboardTourRecord,
  suppression: isDashboardTourSuppressed,
  writeFallbackRecord: writeDashboardTourRecord,
  selectors: {
    module: DASHBOARD_TOUR_MODULE_SELECTOR,
    anchors: DASHBOARD_TOUR_ANCHOR_SELECTORS,
  },
  steps: DASHBOARD_TOUR_STEPS,
  prompt: {
    title: 'Start Dashboard tutorial?',
    body: 'See where the dashboard overview, period switcher, personal summary, and action queue are located.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible dashboard panels before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The dashboard panels are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: DASHBOARD_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(dashboardQuickTour, 'dashboardQuickTour')
