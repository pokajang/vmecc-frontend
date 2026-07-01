import { createSharedReportTourDefinition } from 'src/onboarding/sharedReportOnboarding'

const fitnessTestTourDefinition = createSharedReportTourDefinition({
  prefix: 'fitness-test-report',
  reportSlug: 'fitness-test',
  moduleLabel: 'Fitness Test',
  mobileTypeLabel: 'Choose fitness test type',
  reviewLabel: 'Review report',
  detailLabel: 'Report detail',
})

export const FITNESS_TEST_TOUR_MODULE_SELECTOR = fitnessTestTourDefinition.moduleSelector
export const FITNESS_TEST_TOUR_ANCHOR_SELECTORS = fitnessTestTourDefinition.anchorSelectors
export const FITNESS_TEST_TOUR_STEPS = fitnessTestTourDefinition.steps
