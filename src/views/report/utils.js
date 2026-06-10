export const normalizeReportTypeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const uid = () => Math.random().toString(36).slice(2, 10)

const randomHexToken = (length = 10) => {
  const size = Math.max(1, Math.ceil(length / 2))
  const cryptoObj = globalThis.crypto

  if (cryptoObj?.getRandomValues) {
    const values = new Uint8Array(size)
    cryptoObj.getRandomValues(values)
    return Array.from(values, (value) => value.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, length)
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.slice(-length)
}

export const formatReportDisplayId = (idPrefix, sequence, nowIso = new Date().toISOString()) => {
  const prefix =
    String(idPrefix || 'RPT')
      .trim()
      .toUpperCase() || 'RPT'
  const parsed = new Date(nowIso)
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  const datePart = `${date.getDate()}${date.getMonth() + 1}${date.getFullYear()}`
  const numericSequence = Math.max(1, Number(sequence) || 1)
  const sequencePart = numericSequence < 10 ? `0${numericSequence}` : String(numericSequence)

  return `${prefix}-${sequencePart}-${datePart}`
}

export const createReportIdentity = (
  idPrefix,
  nowIso = new Date().toISOString(),
  sequence = null,
) => {
  const prefix =
    String(idPrefix || 'RPT')
      .trim()
      .toUpperCase() || 'RPT'
  const parsed = new Date(nowIso)
  const datePart = Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(2, 10).replace(/-/g, '')
    : parsed.toISOString().slice(2, 10).replace(/-/g, '')
  const token = randomHexToken(10).toUpperCase()

  return {
    id: `report-${prefix.toLowerCase()}-${datePart}-${token.toLowerCase()}`,
    displayId:
      sequence === null || sequence === undefined
        ? `${prefix}-${datePart}-${token.slice(0, 6)}`
        : formatReportDisplayId(prefix, sequence, nowIso),
  }
}

export const parse = (raw, fallback) => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export const storageKey = (prefix, userId) => `${prefix}${String(userId || 'unknown')}`

export const readStorageValue = (key) => {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export const writeStorageValue = (key, value) => {
  try {
    const storage = globalThis.localStorage
    if (!storage) return false
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export const removeStorageValue = (key) => {
  try {
    const storage = globalThis.localStorage
    if (!storage) return false
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

const inferReportTypeFromDisplayId = (displayId) => {
  const prefix = String(displayId || '')
    .trim()
    .split('-')[0]
    ?.toLowerCase()

  if (prefix === 'erco') return 'erco'
  if (prefix === 'drl') return 'drill'
  if (prefix === 'fit') return 'fitness-test'
  return ''
}

export const normalizeReportRecord = (row) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null

  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  const merged = { ...payload, ...row }

  const id = String(merged.id || merged.report_uid || merged.reportUid || '').trim()
  const displayId = String(merged.displayId || merged.display_id || '').trim()
  if (!id && !displayId) return null

  const incidentDate = String(
    merged.incidentDate || merged.incident_date || merged.reportDate || merged.report_date || '',
  ).trim()
  const incidentTime = String(
    merged.incidentTime || merged.incident_time || merged.reportTime || merged.report_time || '',
  ).trim()
  const reportDate = String(
    merged.reportDate || merged.report_date || merged.incidentDate || merged.incident_date || '',
  ).trim()
  const reportTime = String(
    merged.reportTime || merged.report_time || merged.incidentTime || merged.incident_time || '',
  ).trim()
  const reportType =
    normalizeReportTypeSlug(merged.reportType || merged.report_type) ||
    inferReportTypeFromDisplayId(displayId)
  if (!reportType) return null

  const location = Array.isArray(merged.location)
    ? merged.location
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .join(', ')
    : String(merged.location || merged.location_name || '').trim()

  return {
    ...merged,
    id: id || displayId,
    displayId: displayId || id,
    reportType,
    status: String(merged.status || 'Submitted').trim() || 'Submitted',
    incidentDate,
    incidentTime,
    reportDate: reportDate || incidentDate,
    reportTime: reportTime || incidentTime,
    incidentType: String(merged.incidentType || merged.incident_type || '').trim(),
    description: String(merged.description || merged.details || '').trim(),
    location,
    chronology: Array.isArray(merged.chronology) ? merged.chronology : [],
    timeline: Array.isArray(merged.timeline) ? merged.timeline : [],
    photos: Array.isArray(merged.photos) ? merged.photos : [],
    findings: Array.isArray(merged.findings) ? merged.findings : [],
    version: Number(merged.version || 0) || 0,
    revision: Number(merged.revision || 0) || 0,
    submittedAt: String(merged.submittedAt || merged.submitted_at || '').trim(),
    submittedBy: String(merged.submittedBy || merged.submitted_by || '').trim(),
    createdAt: String(merged.createdAt || merged.created_at || '').trim(),
    updatedAt: String(merged.updatedAt || merged.updated_at || '').trim(),
  }
}

export const normalizeReportRecords = (rows) =>
  (Array.isArray(rows) ? rows : []).map(normalizeReportRecord).filter(Boolean)

export const toDateTime = (row) => {
  const date = String(row?.incidentDate || row?.reportDate || '').trim()
  const time = String(row?.incidentTime || row?.reportTime || '').trim()
  if (!date && row?.savedAt) {
    const savedAt = new Date(row.savedAt)
    return Number.isNaN(savedAt.getTime()) ? Number.NEGATIVE_INFINITY : savedAt.getTime()
  }
  if (!date) {
    const submittedAt = new Date(String(row?.submittedAt || '').trim())
    if (!Number.isNaN(submittedAt.getTime())) return submittedAt.getTime()
    const createdAt = new Date(String(row?.createdAt || '').trim())
    if (!Number.isNaN(createdAt.getTime())) return createdAt.getTime()
  }
  if (!date) return Number.NEGATIVE_INFINITY
  const dt = new Date(`${date}T${time || '00:00'}:00`)
  return Number.isNaN(dt.getTime()) ? Number.NEGATIVE_INFINITY : dt.getTime()
}

export const getRecordDateTime = (row) => ({
  date: String(row?.incidentDate || row?.reportDate || '').trim(),
  time: String(row?.incidentTime || row?.reportTime || '').trim(),
})

export const scrollToFirstError = () => {
  window.setTimeout(() => {
    const el = document.querySelector('.is-invalid') || document.querySelector('.alert-danger')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 0)
}

export const formatDateTime = (date, time) => {
  if (!date && !time) return '--'
  if (!date) return time || '--'
  const parsed = new Date(`${date}T00:00:00`)
  const dateText = Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString()
  return time ? `${dateText}, ${time}` : dateText
}
