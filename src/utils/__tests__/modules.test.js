import { describe, expect, it } from 'vitest'
import {
  isModuleActivationHydrated,
  isModuleEnabled,
  normalizeModuleActivationPayload,
} from '../modules'

describe('module activation utilities', () => {
  it('keeps fallback modules enabled without treating activation as hydrated', () => {
    const initialState = {
      hydrated: false,
      effective: {},
      fallbackMode: true,
    }

    expect(isModuleEnabled(initialState, 'messages')).toBe(true)
    expect(isModuleActivationHydrated(initialState)).toBe(false)
  })

  it('marks normalized server activation data as hydrated', () => {
    const normalized = normalizeModuleActivationPayload({
      effective: {
        messages: { enabled: false, reason: 'configured_disabled' },
      },
    })

    expect(isModuleActivationHydrated(normalized)).toBe(true)
    expect(isModuleEnabled(normalized, 'messages')).toBe(false)
  })
})
