export const LEAVE_MANAGEMENT_ONBOARDING_MODULE_ID = 'leave_management'
export const LEAVE_MANAGEMENT_TOUR_ID = 'leave-management-quick-tour'
export const LEAVE_MANAGEMENT_TOUR_LOCALIZED = false

export const LEAVE_MANAGEMENT_TOUR_KEY = 'leave_management_quick_tour'
export const LEAVE_MANAGEMENT_TOUR_VERSION = 'v2'
export const LEAVE_MANAGEMENT_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${LEAVE_MANAGEMENT_TOUR_KEY}:${LEAVE_MANAGEMENT_TOUR_VERSION}`
export const LEAVE_MANAGEMENT_TOUR_REQUEST_EVENT =
  'vmecc:onboarding:leave-management-quick-tour-requested'
export const LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT = 'vmecc:onboarding:leave-management-tour-replay'

export const LEAVE_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const LEAVE_MANAGEMENT_TOUR_SOURCE_PROMPT = 'leave_management_prompt'
export const LEAVE_MANAGEMENT_TOUR_SOURCE_REQUEST = 'leave_management_request'
export const LEAVE_MANAGEMENT_TOUR_SOURCE_REPLAY = 'replay'
export const LEAVE_MANAGEMENT_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const LEAVE_MANAGEMENT_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: LEAVE_MANAGEMENT_TOUR_SOURCE_PROMPT,
  request: LEAVE_MANAGEMENT_TOUR_SOURCE_REQUEST,
  replay: LEAVE_MANAGEMENT_TOUR_SOURCE_REPLAY,
  tutorialHub: LEAVE_MANAGEMENT_TOUR_SOURCE_TUTORIAL_HUB,
})
