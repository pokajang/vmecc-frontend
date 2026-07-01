export const INSPECTION_ONBOARDING_MODULE_ID = 'inspection'
export const INSPECTION_TOUR_ID = 'trt-inspection-quick-tour'
export const INSPECTION_TOUR_LOCALIZED = true

export const TRT_INSPECTION_TOUR_KEY = 'inspection_quick_tour_trt'
export const TRT_INSPECTION_TOUR_VERSION = 'v1'
export const TRT_INSPECTION_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${TRT_INSPECTION_TOUR_KEY}:${TRT_INSPECTION_TOUR_VERSION}`
export const TRT_INSPECTION_TOUR_REQUEST_EVENT = 'vmecc:onboarding:trt-quick-tour-requested'
export const TRT_INSPECTION_TOUR_REPLAY_EVENT = 'vmecc:onboarding:trt-inspection-tour-replay'

export const INSPECTION_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const INSPECTION_TOUR_SOURCE_PROMPT = 'inspection_prompt'
export const INSPECTION_TOUR_SOURCE_REQUEST = 'profile_handoff'
export const INSPECTION_TOUR_SOURCE_REPLAY = 'replay'
export const INSPECTION_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const INSPECTION_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: INSPECTION_TOUR_SOURCE_PROMPT,
  request: INSPECTION_TOUR_SOURCE_REQUEST,
  replay: INSPECTION_TOUR_SOURCE_REPLAY,
  tutorialHub: INSPECTION_TOUR_SOURCE_TUTORIAL_HUB,
})
