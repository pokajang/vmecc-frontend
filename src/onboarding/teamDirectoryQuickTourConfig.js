import {
  TEAM_DIRECTORY_TOUR_ANCHOR_SELECTORS,
  TEAM_DIRECTORY_TOUR_MODULE_SELECTOR,
  TEAM_DIRECTORY_TOUR_STEPS,
} from 'src/onboarding/teamDirectoryTourDefinition'
import {
  TEAM_DIRECTORY_ONBOARDING_MODULE_ID,
  TEAM_DIRECTORY_TOUR_ANCHOR_TIMEOUT_MS,
  TEAM_DIRECTORY_TOUR_ID,
  TEAM_DIRECTORY_TOUR_KEY,
  TEAM_DIRECTORY_TOUR_LOCALIZED,
  TEAM_DIRECTORY_TOUR_REPLAY_EVENT,
  TEAM_DIRECTORY_TOUR_REQUEST_EVENT,
  TEAM_DIRECTORY_TOUR_SOURCE_DEFAULTS,
  TEAM_DIRECTORY_TOUR_VERSION,
} from 'src/onboarding/teamDirectoryOnboardingContract'
import {
  getTeamDirectoryTourLaunchEligibility,
  isTeamDirectoryTourSuppressed,
  readTeamDirectoryTourRecord,
  writeTeamDirectoryTourRecord,
} from 'src/onboarding/teamDirectoryTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

export const teamDirectoryQuickTour = {
  id: TEAM_DIRECTORY_TOUR_ID,
  moduleId: TEAM_DIRECTORY_ONBOARDING_MODULE_ID,
  localized: TEAM_DIRECTORY_TOUR_LOCALIZED,
  key: TEAM_DIRECTORY_TOUR_KEY,
  version: TEAM_DIRECTORY_TOUR_VERSION,
  route: '/team/details',
  routePattern: /^\/team\/details(?:\/[^/]+)?\/?$/i,
  promptRoutePattern: /^\/team\/details\/?$/i,
  replayRoutePattern: /^\/team\/details(?:\/[^/]+)?\/?$/i,
  requestEvent: TEAM_DIRECTORY_TOUR_REQUEST_EVENT,
  replayEvent: TEAM_DIRECTORY_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: TEAM_DIRECTORY_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getTeamDirectoryTourLaunchEligibility,
  canLaunch: getTeamDirectoryTourLaunchEligibility,
  canAutoPrompt: getTeamDirectoryTourLaunchEligibility,
  readFallbackRecord: readTeamDirectoryTourRecord,
  suppression: isTeamDirectoryTourSuppressed,
  writeFallbackRecord: writeTeamDirectoryTourRecord,
  selectors: {
    module: TEAM_DIRECTORY_TOUR_MODULE_SELECTOR,
    anchors: TEAM_DIRECTORY_TOUR_ANCHOR_SELECTORS,
  },
  steps: TEAM_DIRECTORY_TOUR_STEPS,
  prompt: {
    title: 'Start Team Directory tutorial?',
    body: 'See where to review team cards, add a team, and work through the team detail edit shells.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Team Directory controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The Team Directory controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: TEAM_DIRECTORY_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(teamDirectoryQuickTour, 'teamDirectoryQuickTour')
