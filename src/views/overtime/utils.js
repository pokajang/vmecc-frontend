export const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const toSortableDate = (value) => {
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? -Infinity : parsed
}

export const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const normalizeOvertimeClockTime = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  let match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    const hour = Number(match[1])
    const minute = Number(match[2])
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }

  match = raw.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
  if (match) {
    const hour = Number(match[1])
    const minute = Number(match[2])
    const second = Number(match[3])
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }

  match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/)
  if (match) {
    let hour = Number(match[1])
    const minute = Number(match[2])
    const meridiem = match[3].toUpperCase()
    if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
      if (meridiem === 'AM') hour = hour === 12 ? 0 : hour
      if (meridiem === 'PM') hour = hour === 12 ? 12 : hour + 12
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }

  return ''
}

const OVERTIME_TYPE_LABEL_MAP = {
  weekday: 'Weekday Overtime',
  weekend: 'Weekend Overtime',
  publicHoliday: 'Public Holiday Overtime',
}

const OVERTIME_TYPE_SHORT_LABEL_MAP = {
  weekday: 'Weekday',
  weekend: 'Weekend',
  publicHoliday: 'Public Holiday',
}

export const normalizeOvertimeType = (value) => {
  const normalized = String(value || '').trim()
  if (normalized === 'weekend') return 'weekend'
  if (normalized === 'publicHoliday') return 'publicHoliday'
  return 'weekday'
}

export const getOvertimeTypeLabel = (value, { short = false } = {}) => {
  const normalized = normalizeOvertimeType(value)
  return short ? OVERTIME_TYPE_SHORT_LABEL_MAP[normalized] : OVERTIME_TYPE_LABEL_MAP[normalized]
}

export const formatTime = (timeValue) => {
  const normalizedTime = normalizeOvertimeClockTime(timeValue)
  const tokens = String(normalizedTime || '').split(':')
  if (tokens.length < 2) return timeValue || '-'
  const hours = Number(tokens[0])
  const minutes = Number(tokens[1])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return timeValue || '-'
  const date = new Date(2000, 0, 1, hours, minutes, 0, 0)
  return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
}

export const timeToMinutes = (timeValue) => {
  const normalizedTime = normalizeOvertimeClockTime(timeValue)
  const tokens = String(normalizedTime || '').split(':')
  if (tokens.length < 2) return null
  const hours = Number(tokens[0])
  const minutes = Number(tokens[1])
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

export const calculateOvertimeDurationMinutes = (startTime, endTime) => {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (start === null || end === null) return 0
  if (end > start) return end - start
  return end + 24 * 60 - start
}

export const isOvernightWindow = (startTime, endTime) => {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  if (start === null || end === null) return false
  return end <= start
}

export const formatDuration = (minutesValue) => {
  const minutes = Number(minutesValue || 0)
  if (!Number.isFinite(minutes) || minutes <= 0) return '0h 0m'
  const hours = Math.floor(minutes / 60)
  const balanceMinutes = Math.floor(minutes % 60)
  return `${hours}h ${balanceMinutes}m`
}

export const getStartDateTimeLabel = (row) => {
  if (!row?.claimDate) return '-'
  return `${formatDate(row.claimDate)} ${formatTime(row.startTime)}`
}

export const getEndDateTimeLabel = (row) => {
  if (!row?.claimDate) return '-'
  const suffix = row?.isOvernight ? ' (+1 day)' : ''
  return `${formatDate(row.claimDate)} ${formatTime(row.endTime)}${suffix}`
}

export const getScheduleLabel = (row) => {
  if (!row?.claimDate) return '-'
  return `${formatTime(row.startTime)} - ${formatTime(row.endTime)}${
    row?.isOvernight ? ' (+1 day)' : ''
  }`
}

export const getDisplayOvertimeId = (row) => String(row?.id || '').trim() || '-'
export const APPLICANT_OVERTIME_EDIT_LOCK_REASON =
  'Only Draft or pre-review Pending overtime claims can be edited. Editing is locked after first approval step.'
const OVERTIME_FIRST_APPROVAL_ACTIONS = new Set(['reviewed', 'recommended', 'approved', 'rejected'])

export const hasReachedFirstOvertimeApprovalStep = (record) => {
  if (!record || typeof record !== 'object') return false
  const normalizedStage = String(record?.workflowStage || '')
    .trim()
    .toLowerCase()
  if (normalizedStage && normalizedStage !== 'review') return true
  const history = Array.isArray(record?.approvalHistory) ? record.approvalHistory : []
  return history.some((entry) =>
    OVERTIME_FIRST_APPROVAL_ACTIONS.has(
      String(entry?.action || '')
        .trim()
        .toLowerCase(),
    ),
  )
}

export const canApplicantEditOvertimeRecord = (record) => {
  const status = String(record?.status || '').trim()
  if (status === 'Draft') return true
  if (status !== 'Pending') return false
  return !hasReachedFirstOvertimeApprovalStep(record)
}

const normalizeWorkflowStage = (stage) =>
  ['review', 'recommend', 'approve', 'done'].includes(stage) ? stage : 'review'

const getWorkflowStageLabel = (stage) => {
  if (stage === 'review') return 'Review'
  if (stage === 'recommend') return 'Recommendation'
  return 'Approval'
}

export const resolveWorkflowStageForRecord = (record) => {
  if (!record || String(record.status || '') !== 'Pending') return 'done'

  const snapshot =
    record.workflowSnapshot &&
    typeof record.workflowSnapshot === 'object' &&
    !Array.isArray(record.workflowSnapshot)
      ? record.workflowSnapshot
      : null
  const requireRecommendation = snapshot?.requireRecommendation !== false
  let stage = normalizeWorkflowStage(record.workflowStage)

  if (stage === 'done') stage = 'review'
  if (stage === 'recommend' && !requireRecommendation) stage = 'approve'

  if (stage === 'review' && snapshot) {
    const reviewRole = String(snapshot.reviewRole || '').trim()
    const recommendRole = String(snapshot.recommendRole || '').trim()
    const approveRole = String(snapshot.approveRole || '').trim()
    const nextActionRole = String(record.nextActionRole || '').trim()
    if (
      nextActionRole &&
      recommendRole &&
      nextActionRole === recommendRole &&
      requireRecommendation
    ) {
      return 'recommend'
    }
    if (nextActionRole && approveRole && nextActionRole === approveRole) {
      return 'approve'
    }
    if (nextActionRole && reviewRole && nextActionRole === reviewRole) {
      return 'review'
    }
  }

  return stage
}

export const getWorkflowStatusLabel = (record) => {
  const baseStatus = String(record?.status || '').trim()
  if (!baseStatus) return '-'
  if (baseStatus !== 'Pending') return baseStatus

  const stage = resolveWorkflowStageForRecord(record)
  if (stage === 'review') return 'Pending Review'
  if (stage === 'recommend') return 'Pending Recommendation'
  if (stage === 'approve') return 'Pending Approval'
  return 'Pending'
}

export const getWorkflowPendingActionHint = (record) => {
  if (String(record?.status || '').trim() !== 'Pending') return ''
  const nextRole = String(record?.nextActionRole || '').trim()
  return nextRole ? `Awaiting ${nextRole}` : ''
}

export const buildOvertimeWorkflowTimeline = (record, approvalHistory = []) => {
  if (!record) return []

  const safeHistory = Array.isArray(approvalHistory) ? approvalHistory : []
  const findAction = (actionName) =>
    safeHistory.find((item) => normalizeText(item?.action) === normalizeText(actionName)) || null

  const reviewedEntry = findAction('Reviewed')
  const recommendedEntry = findAction('Recommended')
  const approvedEntry = findAction('Approved')
  const rejectedEntry = findAction('Rejected')
  const requireRecommendation = record?.workflowSnapshot?.requireRecommendation !== false
  const stageDefs = [
    { key: 'review', label: 'Review', historyEntry: reviewedEntry },
    ...(requireRecommendation
      ? [{ key: 'recommend', label: 'Recommend', historyEntry: recommendedEntry }]
      : []),
    { key: 'approve', label: 'Approve', historyEntry: approvedEntry },
  ]

  const currentStage = resolveWorkflowStageForRecord(record)
  const currentStageIndex = stageDefs.findIndex((stage) => stage.key === currentStage)
  const status = String(record?.status || '').trim()

  let rejectedStageKey = null
  if (rejectedEntry) {
    if (recommendedEntry) {
      rejectedStageKey = 'approve'
    } else if (reviewedEntry) {
      rejectedStageKey = requireRecommendation ? 'recommend' : 'approve'
    } else {
      rejectedStageKey = 'review'
    }
  }
  const rejectedStageIndex = stageDefs.findIndex((stage) => stage.key === rejectedStageKey)

  return stageDefs.map((stage, index) => {
    const actionEntry = stage.historyEntry
    let state = actionEntry ? 'completed' : 'upcoming'
    let by = actionEntry?.by || ''
    let at = actionEntry?.at || ''
    let remarks = actionEntry?.remarks || ''

    if (status === 'Pending') {
      if (index < currentStageIndex) {
        state = 'completed'
      } else if (index === currentStageIndex) {
        state = 'pending'
      }
    } else if (status === 'Approved') {
      state = 'completed'
      if (stage.key === 'approve' && approvedEntry) {
        by = approvedEntry.by || by
        at = approvedEntry.at || at
        remarks = approvedEntry.remarks || remarks
      }
    } else if (status === 'Rejected' && rejectedEntry) {
      if (index < rejectedStageIndex) {
        state = 'completed'
      } else if (index === rejectedStageIndex) {
        state = 'rejected'
        by = rejectedEntry.by || by
        at = rejectedEntry.at || at
        remarks = rejectedEntry.remarks || remarks
      } else {
        state = 'upcoming'
      }
    }

    return {
      ...stage,
      state,
      stateLabel:
        state === 'completed'
          ? 'Completed'
          : state === 'pending'
            ? `Pending ${getWorkflowStageLabel(stage.key)}`
            : state === 'rejected'
              ? 'Rejected'
              : 'Not reached',
      by,
      at,
      remarks,
    }
  })
}

export const resolveOvertimeGates = (record) => {
  const requireRecommendation = record?.workflowSnapshot?.requireRecommendation !== false
  return [
    { action: 'Reviewed', label: 'Reviewed' },
    ...(requireRecommendation ? [{ action: 'Recommended', label: 'Recommended' }] : []),
    { action: 'Approved', label: 'Approved' },
  ]
}

export const createApprovalHistoryEntry = (
  action,
  by,
  remarks,
  now = new Date(),
  { byUserId } = {},
) => {
  const normalizedByUserId = String(byUserId || '').trim()
  return {
    id: `oh-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    at: now.toISOString(),
    action,
    by,
    ...(normalizedByUserId ? { byUserId: normalizedByUserId } : {}),
    remarks,
  }
}
