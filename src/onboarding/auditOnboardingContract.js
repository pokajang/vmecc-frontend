export const AUDIT_ONBOARDING_MODULE_ID = 'audit'
export const AUDIT_TOUR_ID = 'audit-quick-tour'
export const AUDIT_TOUR_LOCALIZED = false

export const AUDIT_TOUR_KEY = 'audit_quick_tour'
export const AUDIT_TOUR_VERSION = 'v1'
export const AUDIT_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${AUDIT_TOUR_KEY}:${AUDIT_TOUR_VERSION}`
export const AUDIT_TOUR_REQUEST_EVENT = 'vmecc:onboarding:audit-quick-tour-requested'
export const AUDIT_TOUR_REPLAY_EVENT = 'vmecc:onboarding:audit-tour-replay'

export const AUDIT_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const AUDIT_TOUR_SOURCE_PROMPT = 'audit_view_prompt'
export const AUDIT_TOUR_SOURCE_REQUEST = 'audit_view_request'
export const AUDIT_TOUR_SOURCE_REPLAY = 'replay'
export const AUDIT_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const AUDIT_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: AUDIT_TOUR_SOURCE_PROMPT,
  request: AUDIT_TOUR_SOURCE_REQUEST,
  replay: AUDIT_TOUR_SOURCE_REPLAY,
  tutorialHub: AUDIT_TOUR_SOURCE_TUTORIAL_HUB,
})
