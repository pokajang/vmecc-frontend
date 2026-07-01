// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import {
  DEFAULT_ONBOARDING_LOCALE,
  ONBOARDING_LOCALE_CHANGED_EVENT,
  ONBOARDING_LOCALE_STORAGE_KEY,
  readOnboardingLocale,
  useOnboardingLocale,
  writeOnboardingLocale,
} from '../onboardingLocale'

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

const LocaleProbe = () => {
  const { locale, setLocale } = useOnboardingLocale()

  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <button type="button" onClick={() => setLocale('bm')}>
        Set BM
      </button>
    </div>
  )
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('onboardingLocale', () => {
  it('defaults to English when storage is empty or invalid', () => {
    expect(readOnboardingLocale()).toBe(DEFAULT_ONBOARDING_LOCALE)

    localStorage.setItem(ONBOARDING_LOCALE_STORAGE_KEY, 'invalid')
    expect(readOnboardingLocale()).toBe(DEFAULT_ONBOARDING_LOCALE)
  })

  it('writes and reads supported locales', () => {
    expect(writeOnboardingLocale('bm')).toBe('bm')
    expect(localStorage.setItem).toHaveBeenCalledWith(ONBOARDING_LOCALE_STORAGE_KEY, 'bm')
    expect(readOnboardingLocale()).toBe('bm')
  })

  it('reacts to the custom locale changed event', () => {
    render(<LocaleProbe />)

    expect(screen.getByTestId('locale').textContent).toBe('en')

    fireEvent(
      window,
      new CustomEvent(ONBOARDING_LOCALE_CHANGED_EVENT, {
        detail: { locale: 'bm' },
      }),
    )

    return waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('bm'))
  })

  it('reacts to storage changes', () => {
    render(<LocaleProbe />)

    localStorage.setItem(ONBOARDING_LOCALE_STORAGE_KEY, 'bm')
    fireEvent(
      window,
      new StorageEvent('storage', {
        key: ONBOARDING_LOCALE_STORAGE_KEY,
        newValue: 'bm',
      }),
    )

    return waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('bm'))
  })

  it('updates hook state when setLocale is called', () => {
    render(<LocaleProbe />)

    fireEvent.click(screen.getByRole('button', { name: 'Set BM' }))

    expect(screen.getByTestId('locale').textContent).toBe('bm')
  })
})
