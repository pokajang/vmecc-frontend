import { ROLE_PRIORITY } from 'src/constants/roles'

const toPermissionSet = (user) => new Set(Array.isArray(user?.permissions) ? user.permissions : [])
const SYSTEM_ADMIN_ROLE_KEYS = new Set(['system administrator', 'system admin'])

export const isSystemAdministrator = (user) => {
  const roles = Array.isArray(user?.roles) ? user.roles : []
  const hasSystemAdminRole = roles.some((role) =>
    SYSTEM_ADMIN_ROLE_KEYS.has(
      String(role || '')
        .trim()
        .toLowerCase(),
    ),
  )
  if (hasSystemAdminRole) return true
  const perms = toPermissionSet(user)
  return perms.has('*') || perms.has('system.admin')
}

export const hasPermission = (user, permission) => {
  if (!user || !permission) return false
  if (isSystemAdministrator(user)) return true
  const perms = toPermissionSet(user)
  return perms.has('*') || perms.has(permission)
}

export const hasAnyPermission = (user, permissions = []) =>
  Array.isArray(permissions) && permissions.some((permission) => hasPermission(user, permission))

export const hasScopedPermission = (user, permission, teamId = null) => {
  if (!hasPermission(user, permission)) return false
  if (isSystemAdministrator(user)) return true
  if (!teamId) return true

  const assignments = Array.isArray(user?.role_assignments) ? user.role_assignments : []
  if (assignments.length === 0) return true

  return assignments.some((assignment) => {
    if (assignment?.active === false) return false
    const scopeType = assignment.scope_type
    if (scopeType === 'global' || scopeType === 'office') return true
    return String(assignment.team_id || '') === String(teamId)
  })
}

export const getPrimaryRoleLabel = (user) => {
  const roles = Array.isArray(user?.roles) ? user.roles : []
  if (roles.length === 0) return null

  const priorityIndex = (role) => {
    const idx = ROLE_PRIORITY.indexOf(role)
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
  }

  const sorted = [...roles].sort((a, b) => priorityIndex(a) - priorityIndex(b))
  return sorted[0] || null
}
