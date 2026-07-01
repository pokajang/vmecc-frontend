import {
  SETTINGS_TOUR_ANCHOR_SELECTORS,
  SETTINGS_TOUR_MODULE_SELECTOR,
  SETTINGS_TOUR_STEPS,
} from 'src/onboarding/settingsTourDefinition'
import {
  SETTINGS_ONBOARDING_MODULE_ID,
  SETTINGS_TOUR_ANCHOR_TIMEOUT_MS,
  SETTINGS_TOUR_ID,
  SETTINGS_TOUR_KEY,
  SETTINGS_TOUR_LOCALIZED,
  SETTINGS_TOUR_REPLAY_EVENT,
  SETTINGS_TOUR_REQUEST_EVENT,
  SETTINGS_TOUR_SOURCE_DEFAULTS,
  SETTINGS_TOUR_VERSION,
} from 'src/onboarding/settingsOnboardingContract'
import {
  getSettingsTourLaunchEligibility,
  getSettingsTourPromptEligibility,
  isSettingsTourSuppressed,
  readSettingsTourRecord,
  writeSettingsTourRecord,
} from 'src/onboarding/settingsTour'
import { assertValidTourConfig } from 'src/onboarding/onboardingContracts'

const settingsRoutePattern =
  /^\/settings(?:\/(?:role-permissions|dashboard-visibility|modules))?\/?$/i

export const settingsQuickTour = {
  id: SETTINGS_TOUR_ID,
  moduleId: SETTINGS_ONBOARDING_MODULE_ID,
  localized: SETTINGS_TOUR_LOCALIZED,
  key: SETTINGS_TOUR_KEY,
  version: SETTINGS_TOUR_VERSION,
  route: '/settings',
  routePattern: settingsRoutePattern,
  replayRoutePattern: settingsRoutePattern,
  requestEvent: SETTINGS_TOUR_REQUEST_EVENT,
  replayEvent: SETTINGS_TOUR_REPLAY_EVENT,
  anchorTimeoutMs: SETTINGS_TOUR_ANCHOR_TIMEOUT_MS,
  eligibility: getSettingsTourLaunchEligibility,
  canLaunch: getSettingsTourLaunchEligibility,
  canAutoPrompt: getSettingsTourPromptEligibility,
  readFallbackRecord: readSettingsTourRecord,
  suppression: isSettingsTourSuppressed,
  writeFallbackRecord: writeSettingsTourRecord,
  selectors: {
    module: SETTINGS_TOUR_MODULE_SELECTOR,
    anchors: SETTINGS_TOUR_ANCHOR_SELECTORS,
  },
  steps: SETTINGS_TOUR_STEPS,
  prompt: {
    title: 'Start Settings tutorial?',
    body: 'See where the main settings areas live before you move into deeper configuration work.',
    preparingTitle: 'Preparing tutorial...',
    preparingBody: 'Loading the visible Settings controls before the tutorial starts.',
    notReadyTitle: 'Tutorial is not ready yet.',
    notReadyBody: 'The Settings controls are still loading. Try again when the page settles.',
    startLabel: 'Start tutorial',
    retryLabel: 'Try again',
    skipLabel: 'Skip',
  },
  sourceDefaults: SETTINGS_TOUR_SOURCE_DEFAULTS,
}

assertValidTourConfig(settingsQuickTour, 'settingsQuickTour')
