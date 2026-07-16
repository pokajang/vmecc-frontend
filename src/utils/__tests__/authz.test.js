import { describe, expect, it } from 'vitest'

import {
  hasAnyPermission,
  hasPermission,
  hasScopedPermission,
  isSystemAdministrator,
} from '../authz'

describe('system administrator authorization', () => {
  it.each(['System Administrator', ' system admin ', 'SYSTEM ADMINISTRATOR'])(
    'grants full access from the %s role without permission rows',
    (role) => {
      const user = { roles: [role], permissions: [], role_assignments: [] }

      expect(isSystemAdministrator(user)).toBe(true)
      expect(hasPermission(user, 'permission.added.in.the.future')).toBe(true)
      expect(hasAnyPermission(user, ['missing.one', 'missing.two'])).toBe(true)
      expect(hasScopedPermission(user, 'team.restricted.permission', 999)).toBe(true)
    },
  )

  it('continues to deny users without the role or permission', () => {
    const user = { roles: ['Admin'], permissions: [], role_assignments: [] }

    expect(isSystemAdministrator(user)).toBe(false)
    expect(hasPermission(user, 'settings.manage')).toBe(false)
    expect(hasScopedPermission(user, 'teams.manage', 999)).toBe(false)
  })
})
