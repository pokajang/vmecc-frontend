import { ROLE_OPTIONS, ROLE_SCOPE_MAP, normalizeLegacyRole } from 'src/constants/roles'

export const isScopedScopeType = (scopeType) => scopeType === 'site' || scopeType === 'client_site'

export const getScopeTypeForRole = (role) => ROLE_SCOPE_MAP[normalizeLegacyRole(role)] || 'office'

export const createAssignmentFromRole = (role) => {
  const normalizedRole = normalizeLegacyRole(role)
  const scopeType = getScopeTypeForRole(normalizedRole)
  return {
    id: null,
    role: normalizedRole,
    scope_type: scopeType,
    team_id: null,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: null,
    is_primary: true,
    active: true,
  }
}

export const ensurePrimaryAssignment = (assignments = []) => {
  const next = Array.isArray(assignments) ? assignments.filter(Boolean) : []
  if (next.length === 0) {
    return [createAssignmentFromRole(ROLE_OPTIONS[0])]
  }

  let seenPrimary = false
  const normalized = next.map((row, index) => {
    const role = normalizeLegacyRole(row.role) || ROLE_OPTIONS[0]
    const scopeType = getScopeTypeForRole(role)
    const isPrimary = !seenPrimary && (row.is_primary || index === 0)
    if (isPrimary) {
      seenPrimary = true
    }
    return {
      id: row.id ?? null,
      role,
      scope_type: scopeType,
      team_id: isScopedScopeType(scopeType) ? (row.team_id ?? null) : null,
      start_date: row.start_date || new Date().toISOString().slice(0, 10),
      end_date: row.end_date || null,
      is_primary: !!isPrimary,
      active: row.active ?? true,
    }
  })

  if (!normalized.some((row) => row.is_primary)) {
    normalized[0] = { ...normalized[0], is_primary: true }
  }

  return normalized
}

export const toEditableRoleAssignments = (user) => {
  const source = Array.isArray(user?.role_assignments) ? user.role_assignments : []
  if (source.length > 0) {
    return ensurePrimaryAssignment(source.filter((row) => row.active !== false))
  }

  const roles = Array.isArray(user?.roles) ? user.roles : []
  if (roles.length > 0) {
    return ensurePrimaryAssignment(
      roles.map((role, index) => ({ ...createAssignmentFromRole(role), is_primary: index === 0 })),
    )
  }

  return ensurePrimaryAssignment([])
}

export const toApiRoleAssignmentsPayload = (assignments = []) =>
  ensurePrimaryAssignment(assignments).map((row) => ({
    role: normalizeLegacyRole(row.role),
    scope_type: getScopeTypeForRole(row.role),
    team_id: isScopedScopeType(getScopeTypeForRole(row.role))
      ? row.team_id
        ? Number(row.team_id)
        : null
      : null,
    start_date: row.start_date || new Date().toISOString().slice(0, 10),
    end_date: row.end_date || null,
    is_primary: !!row.is_primary,
  }))
