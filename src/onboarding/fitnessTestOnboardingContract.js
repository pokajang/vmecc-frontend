import { createTourSourceDefaults } from 'src/onboarding/sharedReportOnboarding'

export const FITNESS_TEST_ONBOARDING_MODULE_ID = 'fitness_test'
export const FITNESS_TEST_TOUR_ID = 'fitness-test-quick-tour'
export const FITNESS_TEST_TOUR_LOCALIZED = false

export const FITNESS_TEST_TOUR_KEY = 'fitness_test_quick_tour'
export const FITNESS_TEST_TOUR_VERSION = 'v2'
export const FITNESS_TEST_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${FITNESS_TEST_TOUR_KEY}:${FITNESS_TEST_TOUR_VERSION}`
export const FITNESS_TEST_TOUR_REQUEST_EVENT = 'vmecc:onboarding:fitness-test-quick-tour-requested'
export const FITNESS_TEST_TOUR_REPLAY_EVENT = 'vmecc:onboarding:fitness-test-tour-replay'

export const FITNESS_TEST_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const FITNESS_TEST_TOUR_SOURCE_DEFAULTS = createTourSourceDefaults('fitness_test')
