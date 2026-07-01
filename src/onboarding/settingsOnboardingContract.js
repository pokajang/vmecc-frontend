import { createTourSourceDefaults } from 'src/onboarding/sharedReportOnboarding'

export const SETTINGS_ONBOARDING_MODULE_ID = 'settings'
export const SETTINGS_TOUR_ID = 'settings-quick-tour'
export const SETTINGS_TOUR_LOCALIZED = false

export const SETTINGS_TOUR_KEY = 'settings_quick_tour'
export const SETTINGS_TOUR_VERSION = 'v1'
export const SETTINGS_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${SETTINGS_TOUR_KEY}:${SETTINGS_TOUR_VERSION}`
export const SETTINGS_TOUR_REQUEST_EVENT = 'vmecc:onboarding:settings-quick-tour-requested'
export const SETTINGS_TOUR_REPLAY_EVENT = 'vmecc:onboarding:settings-tour-replay'

export const SETTINGS_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const SETTINGS_TOUR_SOURCE_DEFAULTS = createTourSourceDefaults('settings')
