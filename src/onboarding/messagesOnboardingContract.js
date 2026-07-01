import { createTourSourceDefaults } from 'src/onboarding/sharedReportOnboarding'

export const MESSAGES_ONBOARDING_MODULE_ID = 'messages'
export const MESSAGES_TOUR_ID = 'messages-quick-tour'
export const MESSAGES_TOUR_LOCALIZED = false

export const MESSAGES_TOUR_KEY = 'messages_quick_tour'
export const MESSAGES_TOUR_VERSION = 'v1'
export const MESSAGES_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${MESSAGES_TOUR_KEY}:${MESSAGES_TOUR_VERSION}`
export const MESSAGES_TOUR_REQUEST_EVENT = 'vmecc:onboarding:messages-quick-tour-requested'
export const MESSAGES_TOUR_REPLAY_EVENT = 'vmecc:onboarding:messages-tour-replay'

export const MESSAGES_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const MESSAGES_TOUR_SOURCE_DEFAULTS = createTourSourceDefaults('messages')
