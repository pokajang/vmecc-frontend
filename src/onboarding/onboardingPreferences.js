import { useCallback, useEffect, useState } from 'react'

import { onboardingPreferenceDefinitions } from 'src/onboarding/onboardingPreferenceDefinitions'

export const ONBOARDING_PREFERENCE_KEYS = Object.freeze(
  Object.keys(onboardingPreferenceDefinitions),
)

const getPreferenceDefinition = (key) => onboardingPreferenceDefinitions[key] || null

export const readOnboardingPreference = (key) => {
  const definition = getPreferenceDefinition(key)

  if (!definition || typeof localStorage === 'undefined') {
    return definition?.defaultValue ?? null
  }

  try {
    return definition.normalize(localStorage.getItem(definition.storageKey))
  } catch {
    return definition.defaultValue
  }
}

export const writeOnboardingPreference = (key, value) => {
  const definition = getPreferenceDefinition(key)

  if (!definition) return null

  const nextValue = definition.normalize(value)

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(definition.storageKey, nextValue)
    } catch {
      // Non-fatal. The current tab can still update via the dispatched event.
    }
  }

  if (typeof window !== 'undefined' && definition.changedEvent) {
    window.dispatchEvent(
      new CustomEvent(definition.changedEvent, {
        detail: { [key]: nextValue, key, value: nextValue },
      }),
    )
  }

  return nextValue
}

export const useOnboardingPreference = (key) => {
  const definition = getPreferenceDefinition(key)
  const [value, setValueState] = useState(() => readOnboardingPreference(key))

  useEffect(() => {
    if (!definition || typeof window === 'undefined') return undefined

    const syncValue = () => {
      setValueState(readOnboardingPreference(key))
    }

    const handleCustomChange = (event) => {
      const nextValue = definition.normalize(event?.detail?.[key] ?? event?.detail?.value)
      setValueState(nextValue)
    }

    const handleStorage = (event) => {
      if (event?.key && event.key !== definition.storageKey) {
        return
      }

      syncValue()
    }

    window.addEventListener(definition.changedEvent, handleCustomChange)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(definition.changedEvent, handleCustomChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [definition, key])

  const setValue = useCallback(
    (nextValue) => {
      setValueState(writeOnboardingPreference(key, nextValue))
    },
    [key],
  )

  return { value, setValue }
}
