export const OVERTIME_MANAGEMENT_ONBOARDING_MODULE_ID = 'overtime_management'
export const OVERTIME_MANAGEMENT_TOUR_ID = 'overtime-management-quick-tour'
export const OVERTIME_MANAGEMENT_TOUR_LOCALIZED = false

export const OVERTIME_MANAGEMENT_TOUR_KEY = 'overtime_management_quick_tour'
export const OVERTIME_MANAGEMENT_TOUR_VERSION = 'v1'
export const OVERTIME_MANAGEMENT_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${OVERTIME_MANAGEMENT_TOUR_KEY}:${OVERTIME_MANAGEMENT_TOUR_VERSION}`
export const OVERTIME_MANAGEMENT_TOUR_REQUEST_EVENT =
  'vmecc:onboarding:overtime-management-quick-tour-requested'
export const OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT =
  'vmecc:onboarding:overtime-management-tour-replay'

export const OVERTIME_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const OVERTIME_MANAGEMENT_TOUR_SOURCE_PROMPT = 'overtime_management_prompt'
export const OVERTIME_MANAGEMENT_TOUR_SOURCE_REQUEST = 'overtime_management_request'
export const OVERTIME_MANAGEMENT_TOUR_SOURCE_REPLAY = 'replay'
export const OVERTIME_MANAGEMENT_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const OVERTIME_MANAGEMENT_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: OVERTIME_MANAGEMENT_TOUR_SOURCE_PROMPT,
  request: OVERTIME_MANAGEMENT_TOUR_SOURCE_REQUEST,
  replay: OVERTIME_MANAGEMENT_TOUR_SOURCE_REPLAY,
  tutorialHub: OVERTIME_MANAGEMENT_TOUR_SOURCE_TUTORIAL_HUB,
})
