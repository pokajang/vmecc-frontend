export const MY_OVERTIME_ONBOARDING_MODULE_ID = 'my_overtime'
export const MY_OVERTIME_TOUR_ID = 'my-overtime-quick-tour'
export const MY_OVERTIME_TOUR_LOCALIZED = false

export const MY_OVERTIME_TOUR_KEY = 'my_overtime_quick_tour'
export const MY_OVERTIME_TOUR_VERSION = 'v2'
export const MY_OVERTIME_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${MY_OVERTIME_TOUR_KEY}:${MY_OVERTIME_TOUR_VERSION}`
export const MY_OVERTIME_TOUR_REQUEST_EVENT = 'vmecc:onboarding:my-overtime-quick-tour-requested'
export const MY_OVERTIME_TOUR_REPLAY_EVENT = 'vmecc:onboarding:my-overtime-tour-replay'

export const MY_OVERTIME_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const MY_OVERTIME_TOUR_SOURCE_PROMPT = 'my_overtime_prompt'
export const MY_OVERTIME_TOUR_SOURCE_REQUEST = 'my_overtime_request'
export const MY_OVERTIME_TOUR_SOURCE_REPLAY = 'replay'
export const MY_OVERTIME_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const MY_OVERTIME_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: MY_OVERTIME_TOUR_SOURCE_PROMPT,
  request: MY_OVERTIME_TOUR_SOURCE_REQUEST,
  replay: MY_OVERTIME_TOUR_SOURCE_REPLAY,
  tutorialHub: MY_OVERTIME_TOUR_SOURCE_TUTORIAL_HUB,
})
