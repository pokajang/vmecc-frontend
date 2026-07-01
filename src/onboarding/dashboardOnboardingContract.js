export const DASHBOARD_ONBOARDING_MODULE_ID = 'dashboard'
export const DASHBOARD_TOUR_ID = 'dashboard-quick-tour'
export const DASHBOARD_TOUR_LOCALIZED = false

export const DASHBOARD_TOUR_KEY = 'dashboard_quick_tour'
export const DASHBOARD_TOUR_VERSION = 'v1'
export const DASHBOARD_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${DASHBOARD_TOUR_KEY}:${DASHBOARD_TOUR_VERSION}`
export const DASHBOARD_TOUR_REQUEST_EVENT = 'vmecc:onboarding:dashboard-quick-tour-requested'
export const DASHBOARD_TOUR_REPLAY_EVENT = 'vmecc:onboarding:dashboard-tour-replay'

export const DASHBOARD_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const DASHBOARD_TOUR_SOURCE_PROMPT = 'dashboard_prompt'
export const DASHBOARD_TOUR_SOURCE_REQUEST = 'dashboard_request'
export const DASHBOARD_TOUR_SOURCE_REPLAY = 'replay'
export const DASHBOARD_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const DASHBOARD_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: DASHBOARD_TOUR_SOURCE_PROMPT,
  request: DASHBOARD_TOUR_SOURCE_REQUEST,
  replay: DASHBOARD_TOUR_SOURCE_REPLAY,
  tutorialHub: DASHBOARD_TOUR_SOURCE_TUTORIAL_HUB,
})
