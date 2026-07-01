export const SUPPORTED_ONBOARDING_LOCALES = ['en', 'bm']
export const DEFAULT_ONBOARDING_LOCALE = 'en'
export const ONBOARDING_LOCALE_STORAGE_KEY = 'vmecc_onboarding_language'
export const ONBOARDING_LOCALE_CHANGED_EVENT = 'vmecc:onboarding:locale-changed'

export const normalizeOnboardingLocale = (value) =>
  SUPPORTED_ONBOARDING_LOCALES.includes(value) ? value : DEFAULT_ONBOARDING_LOCALE

export const onboardingPreferenceDefinitions = {
  locale: {
    defaultValue: DEFAULT_ONBOARDING_LOCALE,
    normalize: normalizeOnboardingLocale,
    changedEvent: ONBOARDING_LOCALE_CHANGED_EVENT,
    storageKey: ONBOARDING_LOCALE_STORAGE_KEY,
  },
}
