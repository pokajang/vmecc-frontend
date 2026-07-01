export const PAYROLL_CLAIMS_ONBOARDING_MODULE_ID = 'payroll_claims'
export const PAYROLL_CLAIMS_TOUR_ID = 'payroll-claims-quick-tour'
export const PAYROLL_CLAIMS_TOUR_LOCALIZED = false

export const PAYROLL_CLAIMS_TOUR_KEY = 'payroll_claims_quick_tour'
export const PAYROLL_CLAIMS_TOUR_VERSION = 'v2'
export const PAYROLL_CLAIMS_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${PAYROLL_CLAIMS_TOUR_KEY}:${PAYROLL_CLAIMS_TOUR_VERSION}`
export const PAYROLL_CLAIMS_TOUR_REQUEST_EVENT =
  'vmecc:onboarding:payroll-claims-quick-tour-requested'
export const PAYROLL_CLAIMS_TOUR_REPLAY_EVENT = 'vmecc:onboarding:payroll-claims-tour-replay'

export const PAYROLL_CLAIMS_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const PAYROLL_CLAIMS_TOUR_SOURCE_PROMPT = 'payroll_claims_prompt'
export const PAYROLL_CLAIMS_TOUR_SOURCE_REQUEST = 'payroll_claims_request'
export const PAYROLL_CLAIMS_TOUR_SOURCE_REPLAY = 'replay'
export const PAYROLL_CLAIMS_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const PAYROLL_CLAIMS_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: PAYROLL_CLAIMS_TOUR_SOURCE_PROMPT,
  request: PAYROLL_CLAIMS_TOUR_SOURCE_REQUEST,
  replay: PAYROLL_CLAIMS_TOUR_SOURCE_REPLAY,
  tutorialHub: PAYROLL_CLAIMS_TOUR_SOURCE_TUTORIAL_HUB,
})
