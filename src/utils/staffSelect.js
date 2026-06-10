export const STAFF_SELECTOR_EXCLUDED_ROLES = ['Client', 'Representative', 'Client Contract Manager']

const resolveStaffKey = (row = {}) => {
  if (row?.id) return `id:${String(row.id).trim()}`
  const email = String(row?.email || '')
    .trim()
    .toLowerCase()
  if (email) return `email:${email}`
  const name = String(row?.name || row?.employee || '')
    .trim()
    .toLowerCase()
  if (name) return `name:${name}`
  return `staff:${Math.random().toString(36).slice(2, 10)}`
}

const resolveStaffIcNumber = (row = {}) => {
  const keys = ['icNumber', 'ic_number', 'icNo', 'ic_no', 'nric', 'nricNumber']
  for (const key of keys) {
    const value = row?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return ''
}

const normalizeRoleList = (roles = []) =>
  Array.isArray(roles) ? roles.map((role) => String(role || '').trim()).filter(Boolean) : []

export const isStaffOptionActive = (row = {}) => {
  if (row?.deleted_at) return false
  if (typeof row?.is_active === 'boolean') return row.is_active
  if (typeof row?.active === 'boolean') return row.active
  const status = String(row?.status || '')
    .trim()
    .toLowerCase()
  if (status === 'inactive' || status === 'disabled' || status === 'terminated') return false
  return true
}

export const normalizeStaffOption = (row = {}) => {
  const name = String(row?.name || row?.employee || row?.email || '').trim()
  const email = String(row?.email || '')
    .trim()
    .toLowerCase()
  const team = String(row?.team || '').trim() || 'Unassigned'
  const key = String(row?.key || resolveStaffKey(row))
  const id = row?.id ? String(row.id) : ''
  const roles = normalizeRoleList(row?.roles || [])
  const isActive =
    typeof row?.isActive === 'boolean' ? row.isActive : isStaffOptionActive({ ...row, roles })

  return {
    key,
    id,
    name,
    employee: name,
    email,
    team,
    isActive,
    avatarUrl:
      row?.avatarUrl ||
      row?.avatar_url ||
      row?.avatar ||
      row?.profile_photo_url ||
      row?.profile_photo ||
      row?.photo_url ||
      row?.photo ||
      row?.profilePic ||
      row?.profile_pic ||
      '',
    phone: String(row?.phone || '').trim(),
    icNumber: resolveStaffIcNumber(row),
    roles,
    raw: row,
  }
}

export const shouldExcludeStaffRow = (row = {}, excludedRoles = STAFF_SELECTOR_EXCLUDED_ROLES) => {
  const roles = normalizeRoleList(row?.roles || [])
  return roles.some((role) => excludedRoles.includes(role))
}

export const buildStaffOptionsFromUsers = (users = [], { excludedRoles } = {}) => {
  const map = new Map()
  const blockedRoles = Array.isArray(excludedRoles) ? excludedRoles : STAFF_SELECTOR_EXCLUDED_ROLES
  ;(Array.isArray(users) ? users : []).forEach((row) => {
    if (shouldExcludeStaffRow(row, blockedRoles)) return
    const option = normalizeStaffOption(row)
    if (!option.name) return
    map.set(option.key, option)
  })
  return Array.from(map.values()).sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      sensitivity: 'base',
    }),
  )
}

export const getSelectableStaffOptions = (
  options = [],
  { includeInactive = false, selectedKey = '' } = {},
) => {
  const normalized = Array.isArray(options) ? options : []
  if (includeInactive) return normalized
  const activeOnly = normalized.filter((row) => row?.isActive !== false)
  const selected = normalized.find((row) => row?.key === selectedKey)
  if (
    selected &&
    selected.isActive === false &&
    !activeOnly.some((row) => row.key === selected.key)
  ) {
    return [selected, ...activeOnly]
  }
  return activeOnly
}

export const toStaffOptionLabel = (option = {}) => {
  const name = option?.name || option?.employee || '-'
  const team = option?.team || 'Unassigned'
  const suffix = option?.isActive === false ? ' [Inactive]' : ''
  return `${name} (${team})${suffix}`
}
