// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ONBOARDING_PREFERENCE_KEYS,
  readOnboardingPreference,
  writeOnboardingPreference,
} from '../onboardingPreferences'
import { ONBOARDING_LOCALE_STORAGE_KEY } from '../onboardingLocale'
import { getTrtInspectionTourStorageKey } from '../trtInspectionTour'

const createStorageMock = () => {
  let values = {}
  return {
    getItem: vi.fn((key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
    ),
    setItem: vi.fn((key, value) => {
      values[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete values[key]
    }),
    clear: vi.fn(() => {
      values = {}
    }),
  }
}

describe('onboardingPreferences', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('exposes the supported preference keys and reads the locale preference', () => {
    expect(ONBOARDING_PREFERENCE_KEYS).toEqual(['locale'])
    expect(readOnboardingPreference('locale')).toBe('en')
  })

  it('writes the locale preference to its dedicated storage key', () => {
    expect(writeOnboardingPreference('locale', 'bm')).toBe('bm')
    expect(localStorage.setItem).toHaveBeenCalledWith(ONBOARDING_LOCALE_STORAGE_KEY, 'bm')
    expect(readOnboardingPreference('locale')).toBe('bm')
  })

  it('keeps onboarding preferences separate from inspection suppression storage', () => {
    const suppressionKey = getTrtInspectionTourStorageKey(44)
    const suppressionRecord = { dismissedAt: '2026-06-29T01:00:00.000Z' }
    localStorage.setItem(suppressionKey, JSON.stringify(suppressionRecord))

    writeOnboardingPreference('locale', 'bm')

    expect(JSON.parse(localStorage.getItem(suppressionKey))).toEqual(suppressionRecord)
    expect(localStorage.getItem(ONBOARDING_LOCALE_STORAGE_KEY)).toBe('bm')
  })
})
