import { calculateOvertimeDurationMinutes, isOvernightWindow } from '../utils'

export const MAX_OVERTIME_DURATION_MINUTES = 16 * 60

const blockedStatuses = new Set(['Cancelled', 'Rejected'])

const toWindow = (row) => {
  if (!row?.claimDate || !row?.startTime || !row?.endTime) return null
  const start = new Date(`${row.claimDate}T${row.startTime}:00`)
  const end = new Date(`${row.claimDate}T${row.endTime}:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (row.isOvernight) end.setDate(end.getDate() + 1)
  return { start, end }
}

export const findOvertimeWindowConflict = ({
  claimDate,
  startTime,
  endTime,
  isOvernight,
  records,
  excludeServerId,
}) => {
  const candidate = toWindow({ claimDate, startTime, endTime, isOvernight })
  if (!candidate) return null
  return (
    (Array.isArray(records) ? records : []).find((record) => {
      if (blockedStatuses.has(String(record?.status || '').trim())) return false
      if (String(record?.serverId || '') === String(excludeServerId || '')) return false
      const existing = toWindow(record)
      return existing && candidate.start < existing.end && candidate.end > existing.start
    }) || null
  )
}

export const validateOvertimeSubmission = ({
  form,
  records = [],
  excludeServerId = null,
  requireTypeConfirmation = true,
}) => {
  const errors = {}
  if (requireTypeConfirmation && (!form.overtimeTypeConfirmed || !form.overtimeType)) {
    errors.overtimeType = 'Overtime type is required.'
  }
  if (!form.claimDate) errors.claimDate = 'Date is required.'
  if (!form.startTime) errors.startTime = 'Start time is required.'
  if (!form.endTime) errors.endTime = 'End time is required.'
  if (!String(form.reason || '').trim()) errors.reason = 'Reason is required.'
  if (form.claimDate && form.claimDate > new Date().toISOString().slice(0, 10)) {
    errors.claimDate = 'Future overtime claims are not allowed.'
  }
  const duration = calculateOvertimeDurationMinutes(form.startTime, form.endTime)
  if (duration <= 0 || duration > MAX_OVERTIME_DURATION_MINUTES) {
    errors.window = 'Overtime duration must be between 1 minute and 16 hours.'
  }
  if (isOvernightWindow(form.startTime, form.endTime) && !form.isOvernightConfirmed) {
    errors.window = 'Confirm that this overtime ends on the next day.'
  }
  if (String(form.reason || '').trim().length > 0 && String(form.reason || '').trim().length < 10) {
    errors.reason = 'Provide at least 10 characters for reason/work done.'
  }
  if (Object.keys(errors).length > 0) return { errors, conflict: null }
  const conflict = findOvertimeWindowConflict({
    claimDate: form.claimDate,
    startTime: form.startTime,
    endTime: form.endTime,
    isOvernight: form.isOvernight,
    records,
    excludeServerId,
  })
  if (conflict) {
    return {
      errors: { window: `This window overlaps ${conflict.id || 'an existing overtime claim'}.` },
      conflict,
    }
  }
  return { errors: {}, conflict: null }
}
