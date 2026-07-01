import { logOnboardingDebug } from 'src/onboarding/onboardingState'

export const ONBOARDING_TELEMETRY_EVENTS = Object.freeze({
  hubLanguageChanged: 'hub_language_changed',
  promptShown: 'prompt_shown',
  tourDismissed: 'tour_dismissed',
  tourStarted: 'tour_started',
  tourCompleted: 'tour_completed',
  targetNotFound: 'target_not_found',
})

export const trackOnboardingTelemetry = (eventName, payload = {}) => {
  const entry = {
    event: String(eventName || '').trim() || 'unknown',
    moduleId: payload.moduleId || null,
    tourKey: payload.tourKey || null,
    source: payload.source || null,
    locale: payload.locale || null,
    reason: payload.reason || null,
    promptState: payload.promptState || null,
    stepKey: payload.stepKey || null,
    detail: payload.detail || null,
  }

  logOnboardingDebug('telemetry', entry)
  return entry
}
