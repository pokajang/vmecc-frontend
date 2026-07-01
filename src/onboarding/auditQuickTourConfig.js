import {
  AUDIT_TOUR_ANCHOR_SELECTORS,
  AUDIT_TOUR_MODULE_SELECTOR,
  AUDIT_TOUR_STEPS,
} from 'src/onboarding/auditTourDefinition'
import {
  AUDIT_ONBOARDING_MODULE_ID,
  AUDIT_TOUR_ANCHOR_TIMEOUT_MS,
  AUDIT_TOUR_ID,
  AUDIT_TOUR_KEY,
  AUDIT_TOUR_LOCALIZED,
  AUDIT_TOUR_REPLAY_EVENT,
  AUDIT_TOUR_REQUEST_EVENT,
  AUDIT_TOUR_SOURCE_DEFAULTS,
  AUDIT_TOUR_VERSION,
} from 'src/onboarding/auditOnboardingContract'
import {
  getAuditTourAutoPromptEligibility,
  getAuditTourLaunchEligibility,
  isAuditTourSuppressed,
  readAuditTourRecord,
  writeAuditTourRecord,
} from 'src/onboarding/auditTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const auditQuickTour = {
  id: AUDIT_TOUR_ID,
  moduleId: AUDIT_ONBOARDING_MODULE_ID,
  localized: AUDIT_TOUR_LOCALIZED,
  key: AUDIT_TOUR_KEY,
  version: AUDIT_TOUR_VERSION,
  route: '/admin/audit',
  routePattern: /^\/admin\/audit\/?$/i,
  promptRoutePattern: /^\/admin\/audit\/?$/i,
  replayRoutePattern: /^\/admin\/audit\/?$/i,
  requestEvent: AUDIT_TOUR_REQUEST_EVENT,
  replayEvent: AUDIT_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: AUDIT_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getAuditTourLaunchEligibility,
  canLaunch: getAuditTourLaunchEligibility,
  canAutoPrompt: getAuditTourAutoPromptEligibility,
  readFallbackRecord: readAuditTourRecord,
  suppression: isAuditTourSuppressed,
  writeFallbackRecord: writeAuditTourRecord,
  selectors: {
    module: AUDIT_TOUR_MODULE_SELECTOR,
    anchors: AUDIT_TOUR_ANCHOR_SELECTORS,
  },
  steps: AUDIT_TOUR_STEPS,
  prompt: {
    title: 'Start Audit tutorial?',
    body: 'See where to filter audit activity, review the results list, and confirm the visible result counts.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Audit controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The Audit controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: AUDIT_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(auditQuickTour, 'auditQuickTour')
