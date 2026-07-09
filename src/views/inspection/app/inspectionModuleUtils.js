import { stripInspectionContext } from 'src/views/inspection/typeOptionUtils'
import { getLocalDateInputValue, parseLocalDateValue } from 'src/utils/localDate'

export const REPORT_WORKFLOW_DECLARATION_LABEL =
  'I confirm this report workflow action is accurate and aligned with submitted incident details.'

export const statusToneMap = {
  draft: 'warning',
  submitted: 'info',
  reviewed: 'primary',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'secondary',
}

const HOME_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const FILE_DATE_FALLBACK = 'undated'

const parseHomeDate = (value) => {
  const parsed = parseLocalDateValue(value)
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
}

export const formatHomeDate = (value, fallback = '--') => {
  const parsed = parseHomeDate(value)
  return parsed ? HOME_DATE_FORMATTER.format(parsed) : fallback
}

const sanitizeFilenameSegment = (value, fallback = 'report') => {
  const cleaned = String(value || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()

  return cleaned || fallback
}

const truncateFilenameSegment = (value, maxLength) => {
  const text = String(value || '').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`
}

const formatFilenameDate = (record) => {
  const rawDate = String(
    record?.inspectedAt || record?.incidentDate || record?.reportDate || '',
  ).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate
  if (/^\d{4}-\d{2}-\d{2}T/.test(rawDate)) return rawDate.slice(0, 10)

  const candidates = [
    rawDate,
    record?.inspected_at,
    record?.submittedAt,
    record?.createdAt,
    record?.updatedAt,
  ].filter(Boolean)

  for (const candidate of candidates) {
    const parsed = new Date(candidate)
    if (!Number.isNaN(parsed.getTime())) return getLocalDateInputValue(parsed)
  }

  return FILE_DATE_FALLBACK
}

const getRecordStaffName = (record, user) => {
  const timeline = Array.isArray(record?.timeline) ? record.timeline : []
  const submittedEntry = timeline.find(
    (entry) =>
      String(entry?.action || '')
        .trim()
        .toLowerCase() === 'submitted',
  )

  return (
    String(
      record?.submittedBy ||
        submittedEntry?.by ||
        record?.reportedBy ||
        record?.createdBy ||
        user?.name ||
        user?.full_name ||
        user?.fullName ||
        user?.display_name ||
        user?.displayName ||
        user?.email ||
        '',
    ).trim() || 'staff'
  )
}

export const buildInspectionPdfFilename = (record, user) => {
  const date = formatFilenameDate(record)
  const type = truncateFilenameSegment(
    sanitizeFilenameSegment(stripInspectionContext(record?.incidentType), 'Inspection'),
    42,
  )
  const staff = truncateFilenameSegment(
    sanitizeFilenameSegment(getRecordStaffName(record, user), 'staff'),
    18,
  )

  return `${date} - ${type} - ${staff}.pdf`
}

export const getRecordDateValue = (row) =>
  row?.inspectedAt ||
  row?.inspected_at ||
  row?.incidentDate ||
  row?.reportDate ||
  row?.timeline?.[0]?.at ||
  row?.submittedAt ||
  row?.createdAt

export const formatSelectedChecklistLabels = (row = {}) => {
  const labels = (Array.isArray(row.checklist) ? row.checklist : [])
    .filter((item) => item && item.selected !== false)
    .map((item) => String(item.label || '').trim())
    .filter(Boolean)
  return labels.length ? labels.join('\n') : '--'
}

export const formatPhotoCaptions = (row = {}) => {
  const photos = Array.isArray(row.photos) ? row.photos : []
  if (!photos.length) return '0 photos'
  const captions = photos
    .map((photo, index) => {
      const caption = String(photo?.description || photo?.caption || '').trim()
      return caption ? `${index + 1}. ${caption}` : `${index + 1}. No caption`
    })
    .join('\n')
  return `${photos.length} photo${photos.length === 1 ? '' : 's'}\n${captions}`
}

export const buildQueueConflictFields = (queueConflictTarget) => {
  if (!queueConflictTarget) return []

  const conflictServer = queueConflictTarget.conflictServerSnapshot || {}
  return [
    {
      label: 'Inspection type',
      local: stripInspectionContext(queueConflictTarget.incidentType) || '--',
      server: stripInspectionContext(conflictServer.incidentType) || '--',
    },
    {
      label: 'Inspection location',
      local: queueConflictTarget.location || '--',
      server: conflictServer.location || '--',
    },
    {
      label: 'Description notes',
      local: queueConflictTarget.description || '--',
      server: conflictServer.description || '--',
    },
    {
      label: 'Selected checklist',
      local: formatSelectedChecklistLabels(queueConflictTarget),
      server: formatSelectedChecklistLabels(conflictServer),
    },
    {
      label: 'Photos and captions',
      local: formatPhotoCaptions(queueConflictTarget),
      server: formatPhotoCaptions(conflictServer),
    },
  ]
}

export const copyTextToClipboard = async (text) => {
  const value = String(text || '')
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'readonly')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}
