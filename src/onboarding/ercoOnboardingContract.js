import { createTourSourceDefaults } from 'src/onboarding/sharedReportOnboarding'

export const ERCO_ONBOARDING_MODULE_ID = 'erco'
export const ERCO_TOUR_ID = 'erco-quick-tour'
export const ERCO_TOUR_LOCALIZED = false

export const ERCO_TOUR_KEY = 'erco_quick_tour'
export const ERCO_TOUR_VERSION = 'v2'
export const ERCO_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${ERCO_TOUR_KEY}:${ERCO_TOUR_VERSION}`
export const ERCO_TOUR_REQUEST_EVENT = 'vmecc:onboarding:erco-quick-tour-requested'
export const ERCO_TOUR_REPLAY_EVENT = 'vmecc:onboarding:erco-tour-replay'

export const ERCO_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const ERCO_TOUR_SOURCE_DEFAULTS = createTourSourceDefaults('erco')
