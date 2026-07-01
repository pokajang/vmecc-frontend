import {
  INSPECTION_TOUR_ANCHOR_SELECTORS,
  INSPECTION_TOUR_MODULE_SELECTOR,
  INSPECTION_TOUR_STEPS,
} from 'src/onboarding/trtInspectionTourDefinition'
import {
  INSPECTION_ONBOARDING_MODULE_ID,
  INSPECTION_TOUR_ANCHOR_TIMEOUT_MS,
  INSPECTION_TOUR_ID,
  INSPECTION_TOUR_LOCALIZED,
  INSPECTION_TOUR_SOURCE_DEFAULTS,
  TRT_INSPECTION_TOUR_KEY,
  TRT_INSPECTION_TOUR_REPLAY_EVENT,
  TRT_INSPECTION_TOUR_REQUEST_EVENT,
  TRT_INSPECTION_TOUR_VERSION,
} from 'src/onboarding/inspectionOnboardingContract'
import {
  getInspectionTourLaunchEligibility,
  getTrtInspectionTourEligibility,
  isTrtInspectionTourSuppressed,
  readTrtInspectionTourRecord,
  writeTrtInspectionTourRecord,
} from 'src/onboarding/trtInspectionTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const inspectionQuickTour = {
  id: INSPECTION_TOUR_ID,
  moduleId: INSPECTION_ONBOARDING_MODULE_ID,
  localized: INSPECTION_TOUR_LOCALIZED,
  key: TRT_INSPECTION_TOUR_KEY,
  version: TRT_INSPECTION_TOUR_VERSION,
  route: '/inspection',
  routePattern: /^\/inspection\/?$/i,
  requestEvent: TRT_INSPECTION_TOUR_REQUEST_EVENT,
  replayEvent: TRT_INSPECTION_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: INSPECTION_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getInspectionTourLaunchEligibility,
  canLaunch: getInspectionTourLaunchEligibility,
  canAutoPrompt: getTrtInspectionTourEligibility,
  readFallbackRecord: readTrtInspectionTourRecord,
  suppression: isTrtInspectionTourSuppressed,
  writeFallbackRecord: writeTrtInspectionTourRecord,
  selectors: {
    module: INSPECTION_TOUR_MODULE_SELECTOR,
    anchors: INSPECTION_TOUR_ANCHOR_SELECTORS,
  },
  steps: INSPECTION_TOUR_STEPS,
  prompt: {
    title: {
      en: 'Start Inspection tutorial?',
      bm: 'Mulakan tutorial Pemeriksaan?',
    },
    body: {
      en: 'See where records, filters, and the new inspection action are located.',
      bm: 'Lihat lokasi rekod, penapis dan tindakan pemeriksaan baharu.',
    },
    preparingTitle: {
      en: 'Preparing tutorial...',
      bm: 'Menyediakan tutorial...',
    },
    preparingBody: {
      en: 'Loading the visible Inspection controls before the tutorial starts.',
      bm: 'Memuatkan kawalan Pemeriksaan yang kelihatan sebelum tutorial bermula.',
    },
    notReadyTitle: {
      en: 'Tutorial is not ready yet.',
      bm: 'Tutorial belum sedia lagi.',
    },
    notReadyBody: {
      en: 'The Inspection controls are still loading. Try again when the page settles.',
      bm: 'Kawalan Pemeriksaan masih dimuatkan. Cuba lagi apabila halaman sudah stabil.',
    },
    startLabel: {
      en: 'Start tutorial',
      bm: 'Mula tutorial',
    },
    retryLabel: {
      en: 'Try again',
      bm: 'Cuba lagi',
    },
    skipLabel: {
      en: 'Skip',
      bm: 'Langkau',
    },
  },
  sourceDefaults: INSPECTION_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(inspectionQuickTour, 'inspectionQuickTour')
