export const USERS_ONBOARDING_MODULE_ID = 'users'
export const USERS_TOUR_ID = 'users-quick-tour'
export const USERS_TOUR_LOCALIZED = false

export const USERS_TOUR_KEY = 'users_quick_tour'
export const USERS_TOUR_VERSION = 'v1'
export const USERS_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${USERS_TOUR_KEY}:${USERS_TOUR_VERSION}`
export const USERS_TOUR_REQUEST_EVENT = 'vmecc:onboarding:users-quick-tour-requested'
export const USERS_TOUR_REPLAY_EVENT = 'vmecc:onboarding:users-tour-replay'

export const USERS_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const USERS_TOUR_SOURCE_PROMPT = 'users_manage_prompt'
export const USERS_TOUR_SOURCE_REQUEST = 'users_manage_request'
export const USERS_TOUR_SOURCE_REPLAY = 'replay'
export const USERS_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const USERS_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: USERS_TOUR_SOURCE_PROMPT,
  request: USERS_TOUR_SOURCE_REQUEST,
  replay: USERS_TOUR_SOURCE_REPLAY,
  tutorialHub: USERS_TOUR_SOURCE_TUTORIAL_HUB,
})
