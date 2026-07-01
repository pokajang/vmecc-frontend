import { createSharedReportTourDefinition } from 'src/onboarding/sharedReportOnboarding'

const drillTourDefinition = createSharedReportTourDefinition({
  prefix: 'drill-report',
  reportSlug: 'drill',
  moduleLabel: 'Drill',
  mobileTypeLabel: 'Choose drill type',
  reviewLabel: 'Review report',
  detailLabel: 'Report detail',
  supportsLocationManager: true,
  supportsTypeManager: true,
})

export const DRILL_TOUR_MODULE_SELECTOR = drillTourDefinition.moduleSelector
export const DRILL_TOUR_ANCHOR_SELECTORS = drillTourDefinition.anchorSelectors
export const DRILL_TOUR_STEPS = drillTourDefinition.steps
