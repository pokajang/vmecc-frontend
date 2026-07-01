export const STAFF_DIRECTORY_ONBOARDING_MODULE_ID = 'staff_directory'
export const STAFF_DIRECTORY_TOUR_ID = 'staff-directory-quick-tour'
export const STAFF_DIRECTORY_TOUR_LOCALIZED = false

export const STAFF_DIRECTORY_TOUR_KEY = 'staff_directory_quick_tour'
export const STAFF_DIRECTORY_TOUR_VERSION = 'v2'
export const STAFF_DIRECTORY_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${STAFF_DIRECTORY_TOUR_KEY}:${STAFF_DIRECTORY_TOUR_VERSION}`
export const STAFF_DIRECTORY_TOUR_REQUEST_EVENT =
  'vmecc:onboarding:staff-directory-quick-tour-requested'
export const STAFF_DIRECTORY_TOUR_REPLAY_EVENT = 'vmecc:onboarding:staff-directory-tour-replay'

export const STAFF_DIRECTORY_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const STAFF_DIRECTORY_TOUR_SOURCE_PROMPT = 'staff_directory_prompt'
export const STAFF_DIRECTORY_TOUR_SOURCE_REQUEST = 'staff_directory_request'
export const STAFF_DIRECTORY_TOUR_SOURCE_REPLAY = 'replay'
export const STAFF_DIRECTORY_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const STAFF_DIRECTORY_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: STAFF_DIRECTORY_TOUR_SOURCE_PROMPT,
  request: STAFF_DIRECTORY_TOUR_SOURCE_REQUEST,
  replay: STAFF_DIRECTORY_TOUR_SOURCE_REPLAY,
  tutorialHub: STAFF_DIRECTORY_TOUR_SOURCE_TUTORIAL_HUB,
})
