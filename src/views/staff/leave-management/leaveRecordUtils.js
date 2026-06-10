const LEAVE_TYPE_ID_MARKERS = {
  'Annual Leave': 'AL',
  'Medical Leave': 'ML',
  'Emergency Leave': 'EL',
  'Compassionate Leave': 'CL',
  'Maternity Leave': 'MAT',
  'Paternity Leave': 'PAT',
  'Unpaid Leave': 'UL',
  'Other Leave': 'OL',
}

const shiftConfigs = {
  normal: {
    startOptions: [
      { value: 'shift-start', label: '08:30 AM' },
      { value: 'midpoint', label: '01:00 PM' },
    ],
    endOptions: [
      { value: 'midpoint', label: '01:00 PM' },
      { value: 'shift-end', label: '05:30 PM' },
    ],
  },
  day12: {
    startOptions: [
      { value: 'shift-start', label: '07:00 AM' },
      { value: 'midpoint', label: '01:00 PM' },
    ],
    endOptions: [
      { value: 'midpoint', label: '01:00 PM' },
      { value: 'shift-end', label: '07:00 PM' },
    ],
  },
  night12: {
    startOptions: [
      { value: 'shift-start', label: '07:00 PM' },
      { value: 'midpoint', label: '01:00 AM (+1 day)' },
    ],
    endOptions: [
      { value: 'midpoint', label: '01:00 AM (+1 day)' },
      { value: 'shift-end', label: '07:00 AM (+1 day)' },
    ],
  },
}

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

const getLeaveTypeIdMarker = (leaveType) => LEAVE_TYPE_ID_MARKERS[leaveType] || 'OL'

export const getDisplayLeaveId = (row) => {
  if (row?.display_id) return String(row.display_id)
  const currentId = String(row?.id || '').trim()
  if (!currentId) return '-'
  if (/^LV-[A-Z]{2,3}-\d{4}-\d+$/i.test(currentId)) return currentId
  if (!currentId.startsWith('LV-')) return `${getLeaveTypeIdMarker(row?.leaveType)}-${currentId}`
  return currentId.replace(/^LV-/, `LV-${getLeaveTypeIdMarker(row?.leaveType)}-`)
}

const getShiftConfigByKey = (workShift) => shiftConfigs[workShift] || shiftConfigs.normal

const getRowTimeLabel = (row, slotType) => {
  if (!row) return ''
  const config = getShiftConfigByKey(row.workShift)
  const options = slotType === 'start' ? config.startOptions : config.endOptions
  const slotValue = slotType === 'start' ? row.startTimeSlot : row.endTimeSlot
  return options.find((option) => option.value === slotValue)?.label || ''
}

export const getScheduleLabel = (row) => {
  if (!row?.startDate) return '-'
  const startDateTime = `${formatDate(row.startDate)} ${getRowTimeLabel(row, 'start')}`.trim()
  const endDateTime =
    `${formatDate(row.endDate || row.startDate)} ${getRowTimeLabel(row, 'end')}`.trim()
  return `${startDateTime} - ${endDateTime}`
}

export const getStartDateTimeLabel = (row) => {
  if (!row?.startDate) return '-'
  const timeLabel = getRowTimeLabel(row, 'start')
  return `${formatDate(row.startDate)}${timeLabel ? ` ${timeLabel}` : ''}`
}

export const getEndDateTimeLabel = (row) => {
  if (!row?.endDate && !row?.startDate) return '-'
  const dateValue = row?.endDate || row?.startDate
  const timeLabel = getRowTimeLabel(row, 'end')
  return `${formatDate(dateValue)}${timeLabel ? ` ${timeLabel}` : ''}`
}

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const normalizeWorkflowStage = (stage) =>
  ['review', 'recommend', 'approve', 'done'].includes(stage) ? stage : 'review'

const getWorkflowStageLabel = (stage) => {
  if (stage === 'review') return 'Review'
  if (stage === 'recommend') return 'Recommendation'
  return 'Approval'
}

const resolveWorkflowStageForRecord = (record) => {
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
  if (stage === 'recommend' && !requireRecommendation) {
    stage = 'approve'
  }

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

export const getWorkflowPendingActionHint = (record) => {
  if (String(record?.status || '') !== 'Pending') return ''
  const nextRole = String(record?.nextActionRole || '').trim()
  return nextRole ? `Awaiting ${nextRole}` : ''
}

export const buildLeaveWorkflowTimeline = (record, approvalHistory = []) => {
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
