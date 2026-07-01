import {
  SALARY_CLAIMS_MANAGEMENT_TOUR_ANCHOR_SELECTORS,
  SALARY_CLAIMS_MANAGEMENT_TOUR_MODULE_SELECTOR,
  SALARY_CLAIMS_MANAGEMENT_TOUR_STEPS,
} from 'src/onboarding/salaryClaimsManagementTourDefinition'
import {
  SALARY_CLAIMS_MANAGEMENT_ONBOARDING_MODULE_ID,
  SALARY_CLAIMS_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  SALARY_CLAIMS_MANAGEMENT_TOUR_ID,
  SALARY_CLAIMS_MANAGEMENT_TOUR_KEY,
  SALARY_CLAIMS_MANAGEMENT_TOUR_LOCALIZED,
  SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT,
  SALARY_CLAIMS_MANAGEMENT_TOUR_REQUEST_EVENT,
  SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_DEFAULTS,
  SALARY_CLAIMS_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/salaryClaimsManagementOnboardingContract'
import {
  getSalaryClaimsManagementTourLaunchEligibility,
  isSalaryClaimsManagementTourSuppressed,
  readSalaryClaimsManagementTourRecord,
  writeSalaryClaimsManagementTourRecord,
} from 'src/onboarding/salaryClaimsManagementTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const salaryClaimsManagementQuickTour = {
  id: SALARY_CLAIMS_MANAGEMENT_TOUR_ID,
  moduleId: SALARY_CLAIMS_MANAGEMENT_ONBOARDING_MODULE_ID,
  localized: SALARY_CLAIMS_MANAGEMENT_TOUR_LOCALIZED,
  key: SALARY_CLAIMS_MANAGEMENT_TOUR_KEY,
  version: SALARY_CLAIMS_MANAGEMENT_TOUR_VERSION,
  route: '/staff/salary-claims/claims',
  routePattern:
    /^\/staff\/(?:salary-claims\/(?:claims|salary|set-salary|claim\/[^/]+|assignment\/(?:new|[^/]+\/(?:edit|view)))|set-salary\/assignment\/(?:new|[^/]+\/(?:edit|view)))\/?$/i,
  promptRoutePattern: /^\/staff\/salary-claims\/claims\/?$/i,
  replayRoutePattern:
    /^\/staff\/(?:salary-claims\/(?:claims|salary|set-salary|claim\/[^/]+|assignment\/(?:new|[^/]+\/(?:edit|view)))|set-salary\/assignment\/(?:new|[^/]+\/(?:edit|view)))\/?$/i,
  requestEvent: SALARY_CLAIMS_MANAGEMENT_TOUR_REQUEST_EVENT,
  replayEvent: SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: SALARY_CLAIMS_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getSalaryClaimsManagementTourLaunchEligibility,
  canLaunch: getSalaryClaimsManagementTourLaunchEligibility,
  canAutoPrompt: getSalaryClaimsManagementTourLaunchEligibility,
  readFallbackRecord: readSalaryClaimsManagementTourRecord,
  suppression: isSalaryClaimsManagementTourSuppressed,
  writeFallbackRecord: writeSalaryClaimsManagementTourRecord,
  selectors: {
    module: SALARY_CLAIMS_MANAGEMENT_TOUR_MODULE_SELECTOR,
    anchors: SALARY_CLAIMS_MANAGEMENT_TOUR_ANCHOR_SELECTORS,
  },
  steps: SALARY_CLAIMS_MANAGEMENT_TOUR_STEPS,
  prompt: {
    title: 'Start Salary Claims Management tutorial?',
    body: 'See where to review claim records, salary records, and claim detail inside payroll administration.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody:
      'Loading the visible Salary Claims Management controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody:
      'The Salary Claims Management controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(salaryClaimsManagementQuickTour, 'salaryClaimsManagementQuickTour')
