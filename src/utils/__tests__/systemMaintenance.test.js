import { describe, expect, it } from 'vitest'
import {
  isEnforcedPhase,
  isGracePhase,
  shouldShowMaintenancePage,
} from 'src/utils/systemMaintenance'

describe('system maintenance policy helpers', () => {
  it('treats grace as active and not enforced', () => {
    const setting = { enabled: true, phase: 'grace' }
    expect(isGracePhase(setting)).toBe(true)
    expect(isEnforcedPhase(setting)).toBe(false)
  })

  it('shows maintenance page only for enforced non-admin users', () => {
    const enforced = { enabled: true, phase: 'enforced' }
    expect(
      shouldShowMaintenancePage({
        setting: enforced,
        authUser: { id: 1 },
        isSystemAdministratorFn: () => false,
      }),
    ).toBe(true)

    expect(
      shouldShowMaintenancePage({
        setting: enforced,
        authUser: { id: 2 },
        isSystemAdministratorFn: () => true,
      }),
    ).toBe(false)
  })

  it('does not show maintenance page while in grace or off', () => {
    expect(
      shouldShowMaintenancePage({
        setting: { enabled: true, phase: 'grace' },
        authUser: { id: 3 },
        isSystemAdministratorFn: () => false,
      }),
    ).toBe(false)

    expect(
      shouldShowMaintenancePage({
        setting: { enabled: false, phase: 'off' },
        authUser: { id: 4 },
        isSystemAdministratorFn: () => false,
      }),
    ).toBe(false)
  })
})
