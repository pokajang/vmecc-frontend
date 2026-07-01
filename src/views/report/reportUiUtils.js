const MOBILE_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const FILE_DATE_FALLBACK = 'undated'

export const getReportRecordDate = (record) =>
  record?.timeline?.[0]?.at ||
  record?.incidentDate ||
  record?.reportDate ||
  record?.submittedAt ||
  record?.createdAt ||
  record?.updatedAt ||
  record?.savedAt ||
  ''

const parseDateValue = (dateValue, timeValue = '') => {
  const dateText = String(dateValue || '').trim()
  if (!dateText) return null
  const timeText = String(timeValue || '').trim()
  const value = dateText.includes('T') || !timeText ? dateText : `${dateText}T${timeText}`
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatMobileReportDate = (record, fallback = '--') => {
  if (record?.recordKind === 'draft') {
    const savedAt = parseDateValue(record.savedAt)
    return savedAt ? `Saved ${MOBILE_DATE_FORMATTER.format(savedAt)}` : 'Draft'
  }

  const primaryDate = parseDateValue(
    record?.incidentDate || record?.reportDate,
    record?.incidentTime || record?.reportTime,
  )
  const fallbackDate =
    parseDateValue(record?.timeline?.[0]?.at) ||
    parseDateValue(record?.submittedAt) ||
    parseDateValue(record?.createdAt) ||
    parseDateValue(record?.updatedAt)
  const displayDate = primaryDate || fallbackDate
  return displayDate ? MOBILE_DATE_FORMATTER.format(displayDate) : fallback
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
  const rawDate = String(record?.incidentDate || record?.reportDate || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate

  const candidates = [rawDate, record?.submittedAt, record?.createdAt, record?.updatedAt].filter(
    Boolean,
  )

  for (const candidate of candidates) {
    const parsed = new Date(candidate)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  }

  return FILE_DATE_FALLBACK
}

export const getReportRecordOwner = (record, user = null) => {
  const timeline = Array.isArray(record?.timeline) ? record.timeline : []
  const submittedEntry = timeline.find(
    (entry) =>
      normalizeText(entry?.action) === 'submitted' || normalizeText(entry?.action) === 'draft',
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
        user?.id ||
        '',
    ).trim() || ''
  )
}

export const isReportRecordMine = (record, user = null) => {
  if (!record || !user) return true
  const owner = normalizeText(getReportRecordOwner(record, user))
  const candidates = [
    user?.name,
    user?.full_name,
    user?.fullName,
    user?.display_name,
    user?.displayName,
    user?.email,
    user?.id,
  ]
    .map(normalizeText)
    .filter(Boolean)

  if (!owner) return true
  return candidates.some((candidate) => owner === candidate)
}

const getReportTypeFallbackName = (reportTypeSlug) => {
  const slug = String(reportTypeSlug || '').trim()
  if (!slug) return 'Report'
  if (slug.toLowerCase() === 'erco') return 'ERCO'
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

export const buildReportPdfFilename = (record, user = null, reportTypeSlug = '') => {
  const date = formatFilenameDate(record)
  const type = truncateFilenameSegment(
    sanitizeFilenameSegment(record?.incidentType, getReportTypeFallbackName(reportTypeSlug)),
    42,
  )
  const staff = truncateFilenameSegment(
    sanitizeFilenameSegment(getReportRecordOwner(record, user), 'staff'),
    18,
  )

  return `${date} - ${type} - ${staff}.pdf`
}
