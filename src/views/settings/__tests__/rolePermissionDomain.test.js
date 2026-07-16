import { describe, expect, it } from 'vitest'

import { hasFullRoleAccess, isRolePermissionsLocked } from '../rolePermissionDomain'

describe('role permission access contract', () => {
  it('uses the server contract as the authority', () => {
    const roleAccess = {
      'System Administrator': { full_access: true, permissions_locked: true },
      Auditor: { full_access: false, permissions_locked: true },
    }

    expect(hasFullRoleAccess('System Administrator', roleAccess)).toBe(true)
    expect(isRolePermissionsLocked('System Administrator', roleAccess)).toBe(true)
    expect(hasFullRoleAccess('Auditor', roleAccess)).toBe(false)
    expect(isRolePermissionsLocked('Auditor', roleAccess)).toBe(true)
  })

  it('keeps the legacy system administrator behavior for older API responses', () => {
    expect(hasFullRoleAccess('System Administrator')).toBe(true)
    expect(isRolePermissionsLocked('System Administrator')).toBe(true)
    expect(hasFullRoleAccess('Admin')).toBe(false)
    expect(isRolePermissionsLocked('Admin')).toBe(false)
  })
})
