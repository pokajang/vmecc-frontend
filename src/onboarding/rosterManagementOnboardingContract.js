export const ROSTER_MANAGEMENT_ONBOARDING_MODULE_ID = 'roster_management'
export const ROSTER_MANAGEMENT_TOUR_ID = 'roster-management-quick-tour'
export const ROSTER_MANAGEMENT_TOUR_LOCALIZED = false

export const ROSTER_MANAGEMENT_TOUR_KEY = 'roster_management_quick_tour'
export const ROSTER_MANAGEMENT_TOUR_VERSION = 'v2'
export const ROSTER_MANAGEMENT_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${ROSTER_MANAGEMENT_TOUR_KEY}:${ROSTER_MANAGEMENT_TOUR_VERSION}`
export const ROSTER_MANAGEMENT_TOUR_REQUEST_EVENT =
  'vmecc:onboarding:roster-management-quick-tour-requested'
export const ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT = 'vmecc:onboarding:roster-management-tour-replay'

export const ROSTER_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const ROSTER_MANAGEMENT_TOUR_SOURCE_PROMPT = 'roster_management_prompt'
export const ROSTER_MANAGEMENT_TOUR_SOURCE_REQUEST = 'roster_management_request'
export const ROSTER_MANAGEMENT_TOUR_SOURCE_REPLAY = 'replay'
export const ROSTER_MANAGEMENT_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const ROSTER_MANAGEMENT_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: ROSTER_MANAGEMENT_TOUR_SOURCE_PROMPT,
  request: ROSTER_MANAGEMENT_TOUR_SOURCE_REQUEST,
  replay: ROSTER_MANAGEMENT_TOUR_SOURCE_REPLAY,
  tutorialHub: ROSTER_MANAGEMENT_TOUR_SOURCE_TUTORIAL_HUB,
})
