import {
  PAYROLL_CLAIMS_TOUR_ANCHOR_SELECTORS,
  PAYROLL_CLAIMS_TOUR_MODULE_SELECTOR,
  PAYROLL_CLAIMS_TOUR_STEPS,
} from 'src/onboarding/payrollClaimsTourDefinition'
import {
  PAYROLL_CLAIMS_ONBOARDING_MODULE_ID,
  PAYROLL_CLAIMS_TOUR_ANCHOR_TIMEOUT_MS,
  PAYROLL_CLAIMS_TOUR_ID,
  PAYROLL_CLAIMS_TOUR_KEY,
  PAYROLL_CLAIMS_TOUR_LOCALIZED,
  PAYROLL_CLAIMS_TOUR_REPLAY_EVENT,
  PAYROLL_CLAIMS_TOUR_REQUEST_EVENT,
  PAYROLL_CLAIMS_TOUR_SOURCE_DEFAULTS,
  PAYROLL_CLAIMS_TOUR_VERSION,
} from 'src/onboarding/payrollClaimsOnboardingContract'
import {
  getPayrollClaimsTourLaunchEligibility,
  getPayrollClaimsTourPromptEligibility,
  isPayrollClaimsTourSuppressed,
  readPayrollClaimsTourRecord,
  writePayrollClaimsTourRecord,
} from 'src/onboarding/payrollClaimsTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const payrollClaimsQuickTour = {
  id: PAYROLL_CLAIMS_TOUR_ID,
  moduleId: PAYROLL_CLAIMS_ONBOARDING_MODULE_ID,
  localized: PAYROLL_CLAIMS_TOUR_LOCALIZED,
  key: PAYROLL_CLAIMS_TOUR_KEY,
  version: PAYROLL_CLAIMS_TOUR_VERSION,
  route: '/payroll',
  routePattern:
    /^\/payroll(?:\/claims(?:\/new(?:\/(?:expense|salary))?|\/[^/]+)?|\/payslips)?\/?$/i,
  replayRoutePattern:
    /^\/payroll(?:\/claims(?:\/new(?:\/(?:expense|salary))?|\/[^/]+)?|\/payslips)?\/?$/i,
  requestEvent: PAYROLL_CLAIMS_TOUR_REQUEST_EVENT,
  replayEvent: PAYROLL_CLAIMS_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: PAYROLL_CLAIMS_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getPayrollClaimsTourLaunchEligibility,
  canLaunch: getPayrollClaimsTourLaunchEligibility,
  canAutoPrompt: getPayrollClaimsTourPromptEligibility,
  readFallbackRecord: readPayrollClaimsTourRecord,
  suppression: isPayrollClaimsTourSuppressed,
  writeFallbackRecord: writePayrollClaimsTourRecord,
  selectors: {
    module: PAYROLL_CLAIMS_TOUR_MODULE_SELECTOR,
    anchors: PAYROLL_CLAIMS_TOUR_ANCHOR_SELECTORS,
  },
  steps: PAYROLL_CLAIMS_TOUR_STEPS,
  prompt: {
    title: 'Start Payroll tutorial?',
    body: 'See where payroll claim records, claim entry, claim detail, and payslips are located.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Payroll controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The Payroll controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: PAYROLL_CLAIMS_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(payrollClaimsQuickTour, 'payrollClaimsQuickTour')
