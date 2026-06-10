import {
  calculateOvertimeDurationMinutes,
  formatDuration,
  isOvernightWindow,
  normalizeOvertimeClockTime,
  normalizeOvertimeType,
} from '../utils'

export const normalizeOvertimeDraftPayload = (draft = null) => {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null
  const sourceRecordId = String(draft.sourceRecordId || '').trim()
  return {
    overtimeType: normalizeOvertimeType(draft.overtimeType || 'weekday'),
    overtimeTypeConfirmed: Boolean(draft.overtimeTypeConfirmed),
    claimDate: String(draft.claimDate || ''),
    startTime: normalizeOvertimeClockTime(draft.startTime),
    endTime: normalizeOvertimeClockTime(draft.endTime),
    reason: String(draft.reason || ''),
    savedAt: String(draft.savedAt || new Date().toISOString()),
    sourceRecordId,
  }
}

export const buildDraftOvertimeRow = (
  draft = null,
  userId = '',
  defaultOvertimeType = 'weekday',
) => {
  if (!draft) return null
  if (String(draft.sourceRecordId || '').trim()) return null
  const overtimeType = normalizeOvertimeType(draft.overtimeType || defaultOvertimeType)
  const startTime = normalizeOvertimeClockTime(draft.startTime)
  const endTime = normalizeOvertimeClockTime(draft.endTime)
  const durationMinutes = calculateOvertimeDurationMinutes(startTime, endTime)
  return {
    id: 'DRAFT',
    serverId: null,
    ownerUserId: String(userId || ''),
    recordKey: `draft::${String(userId || '')}`,
    overtimeType,
    claimDate: String(draft.claimDate || ''),
    startTime,
    endTime,
    isOvernight: isOvernightWindow(startTime, endTime),
    durationMinutes,
    durationLabel: formatDuration(durationMinutes),
    reason: String(draft.reason || ''),
    status: 'Draft',
    appliedAt: String(draft.savedAt || new Date().toISOString()),
    submittedBy: '',
    workflowSnapshot: null,
    workflowStage: 'review',
    nextActionRole: null,
    applicantRoles: [],
    approvalHistory: [],
    overtimeTypeConfirmed: Boolean(draft.overtimeTypeConfirmed),
    isDraft: true,
  }
}

export const getFormValuesFromRecord = (row = null, defaultOvertimeType = 'weekday') => ({
  overtimeType: normalizeOvertimeType(row?.overtimeType || defaultOvertimeType),
  claimDate: String(row?.claimDate || ''),
  startTime: normalizeOvertimeClockTime(row?.startTime),
  endTime: normalizeOvertimeClockTime(row?.endTime),
  reason: String(row?.reason || ''),
})

export const buildFormSnapshot = ({
  editingRecordId = null,
  overtimeType = 'weekday',
  overtimeTypeConfirmed = false,
  claimDate = '',
  startTime = '',
  endTime = '',
  reason = '',
} = {}) => ({
  editingRecordId: String(editingRecordId || ''),
  overtimeType: normalizeOvertimeType(overtimeType || 'weekday'),
  overtimeTypeConfirmed: Boolean(overtimeTypeConfirmed),
  claimDate: String(claimDate || ''),
  startTime: String(startTime || ''),
  endTime: String(endTime || ''),
  reason: String(reason || ''),
})

export const isSameFormSnapshot = (left, right) =>
  Boolean(
    left &&
      right &&
      left.editingRecordId === right.editingRecordId &&
      left.overtimeType === right.overtimeType &&
      left.overtimeTypeConfirmed === right.overtimeTypeConfirmed &&
      left.claimDate === right.claimDate &&
      left.startTime === right.startTime &&
      left.endTime === right.endTime &&
      left.reason === right.reason,
  )
