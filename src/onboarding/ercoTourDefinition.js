import { createSharedReportTourDefinition } from 'src/onboarding/sharedReportOnboarding'

const ercoTourDefinition = createSharedReportTourDefinition({
  prefix: 'erco-report',
  reportSlug: 'erco',
  moduleLabel: 'ERCO',
  mobileTypeLabel: 'Choose emergency / incident type',
  reviewLabel: 'Review report',
  detailLabel: 'Report detail',
  supportsTypeManager: true,
})

export const ERCO_TOUR_MODULE_SELECTOR = ercoTourDefinition.moduleSelector
export const ERCO_TOUR_ANCHOR_SELECTORS = ercoTourDefinition.anchorSelectors
export const ERCO_TOUR_STEPS = ercoTourDefinition.steps
