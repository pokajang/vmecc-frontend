import {
  IMAGE_COMPRESSION_MAX_DIMENSION,
  IMAGE_COMPRESSION_MIN_QUALITY,
  IMAGE_COMPRESSION_TARGET_BYTES,
  LEAVE_TYPE_ID_MARKERS,
  MOCK_LEAVE_RECORD_IDS,
  SUPPORTED_DOCUMENT_MIME_TYPES,
  SUPPORTED_IMAGE_EXTENSIONS,
  SUPPORTED_IMAGE_MIME_TYPES,
  shiftConfigs,
} from './constants'

export const formatFileSize = (sizeInBytes) => {
  const size = Number(sizeInBytes || 0)
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

export const getFileExtension = (fileName) => {
  const tokens = String(fileName || '')
    .trim()
    .toLowerCase()
    .split('.')
  return tokens.length > 1 ? tokens[tokens.length - 1] : ''
}

export const isImageAttachment = (file) => {
  if (!file) return false
  const mimeType = String(file.type || '').toLowerCase()
  if (SUPPORTED_IMAGE_MIME_TYPES.has(mimeType) || mimeType.startsWith('image/')) return true
  return SUPPORTED_IMAGE_EXTENSIONS.has(getFileExtension(file.name))
}

export const isPdfAttachment = (file) => {
  if (!file) return false
  const mimeType = String(file.type || '').toLowerCase()
  if (SUPPORTED_DOCUMENT_MIME_TYPES.has(mimeType)) return true
  return getFileExtension(file.name) === 'pdf'
}

export const isSupportedAttachment = (file) => isImageAttachment(file) || isPdfAttachment(file)

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to read selected image.'))
    }
    image.src = objectUrl
  })

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to compress selected image.'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })

export const compressImageAttachment = async (file) => {
  const image = await loadImageElement(file)
  const mimeType = SUPPORTED_IMAGE_MIME_TYPES.has(String(file.type || '').toLowerCase())
    ? file.type
    : 'image/jpeg'
  const dimensionCandidates = [IMAGE_COMPRESSION_MAX_DIMENSION, 1600, 1280]
  let bestBlob = null

  for (const maxDimension of dimensionCandidates) {
    const ratio = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1))
    const nextWidth = Math.max(1, Math.round((image.width || 1) * ratio))
    const nextHeight = Math.max(1, Math.round((image.height || 1) * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = nextWidth
    canvas.height = nextHeight

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Unable to process selected image.')
    }

    context.drawImage(image, 0, 0, nextWidth, nextHeight)

    const qualityCandidates = [0.86, 0.78, 0.7, 0.62, IMAGE_COMPRESSION_MIN_QUALITY]
    for (const quality of qualityCandidates) {
      const nextBlob = await canvasToBlob(canvas, mimeType, quality)
      if (!bestBlob || nextBlob.size < bestBlob.size) {
        bestBlob = nextBlob
      }
      if (nextBlob.size <= IMAGE_COMPRESSION_TARGET_BYTES) {
        break
      }
    }

    if (bestBlob?.size <= IMAGE_COMPRESSION_TARGET_BYTES) {
      break
    }
  }

  if (!bestBlob) {
    throw new Error('Unable to compress selected image.')
  }

  const compressedFile = new File([bestBlob], file.name, {
    type: bestBlob.type || file.type || 'image/jpeg',
    lastModified: Date.now(),
  })

  return {
    file: compressedFile,
    wasCompressed: compressedFile.size < file.size,
  }
}

export const formatDayCount = (value) => {
  if (!Number.isFinite(value)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export const getStartBoundaryUnits = (startSlot) => (startSlot === 'midpoint' ? 0.5 : 1)
export const getEndBoundaryUnits = (endSlot) => (endSlot === 'midpoint' ? 0.5 : 1)

const toStartOfDay = (value) => new Date(`${value}T00:00:00`)

const isWeekend = (date) => {
  const day = date.getDay()
  return day === 0 || day === 6
}

export const getBusinessDaysInRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 0
  const start = toStartOfDay(startDate)
  const end = toStartOfDay(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0

  let count = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    if (!isWeekend(cursor)) {
      count += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
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

export const formatSubmitPreviewPeriod = (preview) => {
  if (!preview) return '-'
  const startLabel = `${formatDate(preview.startDate)} ${preview.startTimeLabel || ''}`.trim()
  const endLabel = `${formatDate(preview.endDate)} ${preview.endTimeLabel || ''}`.trim()
  return `${startLabel} - ${endLabel}`
}

export const getLeaveTypeIdMarker = (leaveType) => LEAVE_TYPE_ID_MARKERS[leaveType] || 'OL'

export const getDisplayLeaveId = (row) => {
  // Prefer the explicit display_id field set by the API normalizer.
  if (row?.display_id) return String(row.display_id)
  const currentId = String(row?.id || '').trim()
  if (!currentId) return '-'
  if (/^LV-[A-Z]{2}-\d{4}-\d+$/i.test(currentId)) return currentId
  if (!currentId.startsWith('LV-')) return `${getLeaveTypeIdMarker(row?.leaveType)}-${currentId}`
  return currentId.replace(/^LV-/, `LV-${getLeaveTypeIdMarker(row?.leaveType)}-`)
}

export const getShiftConfigByKey = (workShift) => shiftConfigs[workShift] || shiftConfigs.normal

export const getRowTimeLabel = (row, slotType) => {
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

export const toSortableDate = (value) => {
  const parsed = new Date(value).getTime()
  if (Number.isNaN(parsed)) return -Infinity
  return parsed
}

export const calculateDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
}

export const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const getUserNameCandidates = (user) => {
  const directNames = [
    user?.name,
    user?.full_name,
    user?.fullName,
    user?.display_name,
    user?.displayName,
  ]
  const baseNames = directNames.map((value) => String(value || '').trim()).filter(Boolean)

  const emailName = String(user?.email || '')
    .split('@')[0]
    ?.trim()
  if (emailName) baseNames.push(emailName)

  return Array.from(new Set(baseNames.map((value) => normalizeText(value)).filter(Boolean)))
}

export const getEffectiveLeaveYear = (startDate) => {
  if (startDate) {
    const parsed = new Date(startDate)
    if (!Number.isNaN(parsed.getTime())) return parsed.getFullYear()
  }
  return new Date().getFullYear()
}

export const sanitizeLeaveRecords = (rows) =>
  (Array.isArray(rows) ? rows : []).filter(
    (row) => !MOCK_LEAVE_RECORD_IDS.has(String(row?.id || '')),
  )

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

export const createApprovalHistoryEntry = (
  action,
  by,
  remarks,
  now = new Date(),
  { byUserId } = {},
) => {
  const normalizedByUserId = String(byUserId || '').trim()
  return {
    id: `lh-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    at: now.toISOString(),
    action,
    by,
    ...(normalizedByUserId ? { byUserId: normalizedByUserId } : {}),
    remarks,
  }
}
