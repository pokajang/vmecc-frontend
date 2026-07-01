export const MY_LEAVE_ONBOARDING_MODULE_ID = 'my_leave'
export const MY_LEAVE_TOUR_ID = 'my-leave-quick-tour'
export const MY_LEAVE_TOUR_LOCALIZED = false

export const MY_LEAVE_TOUR_KEY = 'my_leave_quick_tour'
export const MY_LEAVE_TOUR_VERSION = 'v2'
export const MY_LEAVE_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${MY_LEAVE_TOUR_KEY}:${MY_LEAVE_TOUR_VERSION}`
export const MY_LEAVE_TOUR_REQUEST_EVENT = 'vmecc:onboarding:my-leave-quick-tour-requested'
export const MY_LEAVE_TOUR_REPLAY_EVENT = 'vmecc:onboarding:my-leave-tour-replay'

export const MY_LEAVE_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const MY_LEAVE_TOUR_SOURCE_PROMPT = 'my_leave_prompt'
export const MY_LEAVE_TOUR_SOURCE_REQUEST = 'my_leave_request'
export const MY_LEAVE_TOUR_SOURCE_REPLAY = 'replay'
export const MY_LEAVE_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const MY_LEAVE_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: MY_LEAVE_TOUR_SOURCE_PROMPT,
  request: MY_LEAVE_TOUR_SOURCE_REQUEST,
  replay: MY_LEAVE_TOUR_SOURCE_REPLAY,
  tutorialHub: MY_LEAVE_TOUR_SOURCE_TUTORIAL_HUB,
})
