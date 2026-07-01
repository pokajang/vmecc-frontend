export const SALARY_CLAIMS_MANAGEMENT_ONBOARDING_MODULE_ID = 'salary_claims_management'
export const SALARY_CLAIMS_MANAGEMENT_TOUR_ID = 'salary-claims-management-quick-tour'
export const SALARY_CLAIMS_MANAGEMENT_TOUR_LOCALIZED = false

export const SALARY_CLAIMS_MANAGEMENT_TOUR_KEY = 'salary_claims_management_quick_tour'
export const SALARY_CLAIMS_MANAGEMENT_TOUR_VERSION = 'v2'
export const SALARY_CLAIMS_MANAGEMENT_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${SALARY_CLAIMS_MANAGEMENT_TOUR_KEY}:${SALARY_CLAIMS_MANAGEMENT_TOUR_VERSION}`
export const SALARY_CLAIMS_MANAGEMENT_TOUR_REQUEST_EVENT =
  'vmecc:onboarding:salary-claims-management-quick-tour-requested'
export const SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT =
  'vmecc:onboarding:salary-claims-management-tour-replay'

export const SALARY_CLAIMS_MANAGEMENT_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_PROMPT = 'salary_claims_management_prompt'
export const SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_REQUEST = 'salary_claims_management_request'
export const SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_REPLAY = 'replay'
export const SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_PROMPT,
  request: SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_REQUEST,
  replay: SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_REPLAY,
  tutorialHub: SALARY_CLAIMS_MANAGEMENT_TOUR_SOURCE_TUTORIAL_HUB,
})
