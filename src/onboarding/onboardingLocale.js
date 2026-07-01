import {
  DEFAULT_ONBOARDING_LOCALE,
  normalizeOnboardingLocale,
  ONBOARDING_LOCALE_CHANGED_EVENT,
  ONBOARDING_LOCALE_STORAGE_KEY,
  SUPPORTED_ONBOARDING_LOCALES,
} from 'src/onboarding/onboardingPreferenceDefinitions'
import {
  readOnboardingPreference,
  useOnboardingPreference,
  writeOnboardingPreference,
} from 'src/onboarding/onboardingPreferences'

export {
  DEFAULT_ONBOARDING_LOCALE,
  normalizeOnboardingLocale,
  ONBOARDING_LOCALE_CHANGED_EVENT,
  ONBOARDING_LOCALE_STORAGE_KEY,
  SUPPORTED_ONBOARDING_LOCALES,
}

export const readOnboardingLocale = () => {
  return readOnboardingPreference('locale')
}

export const writeOnboardingLocale = (locale) => {
  return writeOnboardingPreference('locale', locale)
}

export const useOnboardingLocale = () => {
  const { value, setValue } = useOnboardingPreference('locale')

  return { locale: value, setLocale: setValue }
}
