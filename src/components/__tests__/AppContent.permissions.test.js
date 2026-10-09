import { describe, expect, it } from 'vitest'
import { canAccessRoute } from '../AppContent'

describe('AppContent route permissions', () => {
  const restrictedRoute = { permissions: ['settings.manage'] }

  it('allows routes without a permission contract', () => {
    expect(canAccessRoute({}, null)).toBe(true)
  })

  it('denies a staff manager from settings-only workflow routes', () => {
    expect(
      canAccessRoute(restrictedRoute, {
        roles: ['Human Resource'],
        permissions: ['staff.leave.manage', 'staff.overtime.manage'],
      }),
    ).toBe(false)
  })

  it('allows settings managers and wildcard system administrators', () => {
    expect(canAccessRoute(restrictedRoute, { permissions: ['settings.manage'] })).toBe(true)
    expect(
      canAccessRoute(restrictedRoute, {
        roles: ['System Administrator'],
        permissions: ['*'],
      }),
    ).toBe(true)
  })
})
