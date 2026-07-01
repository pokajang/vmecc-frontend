export const TEAM_DIRECTORY_ONBOARDING_MODULE_ID = 'team_directory'
export const TEAM_DIRECTORY_TOUR_ID = 'team-directory-quick-tour'
export const TEAM_DIRECTORY_TOUR_LOCALIZED = false

export const TEAM_DIRECTORY_TOUR_KEY = 'team_directory_quick_tour'
export const TEAM_DIRECTORY_TOUR_VERSION = 'v2'
export const TEAM_DIRECTORY_TOUR_STORAGE_PREFIX = `vmecc_onboarding:${TEAM_DIRECTORY_TOUR_KEY}:${TEAM_DIRECTORY_TOUR_VERSION}`
export const TEAM_DIRECTORY_TOUR_REQUEST_EVENT =
  'vmecc:onboarding:team-directory-quick-tour-requested'
export const TEAM_DIRECTORY_TOUR_REPLAY_EVENT = 'vmecc:onboarding:team-directory-tour-replay'

export const TEAM_DIRECTORY_TOUR_ANCHOR_TIMEOUT_MS = 5000
export const TEAM_DIRECTORY_TOUR_SOURCE_PROMPT = 'team_directory_prompt'
export const TEAM_DIRECTORY_TOUR_SOURCE_REQUEST = 'team_directory_request'
export const TEAM_DIRECTORY_TOUR_SOURCE_REPLAY = 'replay'
export const TEAM_DIRECTORY_TOUR_SOURCE_TUTORIAL_HUB = 'tutorial_hub'

export const TEAM_DIRECTORY_TOUR_SOURCE_DEFAULTS = Object.freeze({
  prompt: TEAM_DIRECTORY_TOUR_SOURCE_PROMPT,
  request: TEAM_DIRECTORY_TOUR_SOURCE_REQUEST,
  replay: TEAM_DIRECTORY_TOUR_SOURCE_REPLAY,
  tutorialHub: TEAM_DIRECTORY_TOUR_SOURCE_TUTORIAL_HUB,
})
