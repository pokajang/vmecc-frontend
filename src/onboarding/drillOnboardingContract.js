import { createTourSourceDefaults } from 'src/onboarding/sharedReportOnboarding'

export const DRILL_ONBOARDING_MODULE_ID = 'drill'
export const DRILL_TOUR_ID = 'drill-quick-tour'
export const DRILL_TOUR_LOCALIZED = false

export const DRILL_TOUR_KEY = 'drill_quick_tour'
export const DRILL_TOUR_VERSION = 'v2'
export const DRILL_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${DRILL_TOUR_KEY}:${DRILL_TOUR_VERSION}`
export const DRILL_TOUR_REQUEST_EVENT = 'vmecc:onboarding:drill-quick-tour-requested'
export const DRILL_TOUR_REPLAY_EVENT = 'vmecc:onboarding:drill-tour-replay'

export const DRILL_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const DRILL_TOUR_SOURCE_DEFAULTS = createTourSourceDefaults('drill')
