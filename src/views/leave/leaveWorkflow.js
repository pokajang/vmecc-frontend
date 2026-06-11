import { normalizeLegacyRole } from 'src/constants/roles'

const normalizeRoleValue = (role) => normalizeLegacyRole(String(role || '').trim())
const normalizeRoleList = (roles = []) =>
  Array.from(
    new Set(
      (Array.isArray(roles) ? roles : []).map((role) => normalizeRoleValue(role)).filter(Boolean),
    ),
  )

const normalizeStage = (stage) => {
  if (['review', 'recommend', 'approve', 'done'].includes(stage)) return stage
  return 'review'
}

const NON_CANCELABLE_STATUSES = new Set(['rejected', 'cancelled'])
const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const isLeaveCancellableByApplicant = (row) => normalizeStatus(row?.status) === 'pending'

const isLeaveCancellableByAdmin = (row) => {
  const status = normalizeStatus(row?.status)
  return status === 'pending' || status === 'approved'
}

const isLeaveCancellable = (row) => {
  const status = normalizeStatus(row?.status)
  if (!status || NON_CANCELABLE_STATUSES.has(status)) return false
  if (status === 'approved') return true

  const workflowStage = String(row?.workflowStage || '')
    .trim()
    .toLowerCase()
  if (workflowStage && workflowStage !== 'done') return true

  if (status.startsWith('pending')) return true
  if (['reviewed', 'recommended'].includes(status)) return true
  return false
}

export {
  normalizeRoleList,
  normalizeRoleValue,
  normalizeStage,
  isLeaveCancellableByApplicant,
  isLeaveCancellableByAdmin,
  isLeaveCancellable,
}
