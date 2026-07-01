import React from 'react'

import { formatReportDisplayId } from 'src/views/inspection/inspectionSharedUtils'
import { INSPECTION_INCIDENT_TYPE_OPTIONS } from 'src/views/inspection/constants'

const LEGACY_RANDOM_DISPLAY_ID = /^[A-Z]+-\d{6}-[A-Z0-9]+$/i

export const formatInspectionDisplayId = (row, index) => {
  if (row?.recordKind === 'draft') return row.displayId || 'Draft'
  const raw = String(row?.displayId || '')
  if (!raw) return '--'
  if (!LEGACY_RANDOM_DISPLAY_ID.test(raw)) return raw
  const prefix = raw.split('-')[0]
  const date = row?.timeline?.[0]?.at || row?.incidentDate || row?.reportDate
  return formatReportDisplayId(prefix, index + 1, date)
}

export const formatInspectionRowDateTime = (row, formatDateTime) => {
  if (row?.recordKind === 'draft' && row?.savedAt) {
    const savedAt = new Date(row.savedAt)
    if (!Number.isNaN(savedAt.getTime())) return `Saved ${savedAt.toLocaleString()}`
  }
  const display = formatDateTime(
    row?.incidentDate || row?.reportDate,
    row?.incidentTime || row?.reportTime,
  )
  if (display !== '--') return display
  const submittedAt = new Date(String(row?.submittedAt || '').trim())
  if (!Number.isNaN(submittedAt.getTime())) return `Submitted ${submittedAt.toLocaleString()}`
  const createdAt = new Date(String(row?.createdAt || '').trim())
  if (!Number.isNaN(createdAt.getTime())) return `Created ${createdAt.toLocaleString()}`
  return '--'
}

const MOBILE_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const parseDateValue = (dateValue, timeValue = '') => {
  const dateText = String(dateValue || '').trim()
  if (!dateText) return null
  const timeText = String(timeValue || '').trim()
  const value = dateText.includes('T') || !timeText ? dateText : `${dateText}T${timeText}`
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatMobileInspectionRecordDate = (row) => {
  if (row?.recordKind === 'draft') {
    const savedAt = parseDateValue(row.savedAt)
    return savedAt ? `Saved ${MOBILE_DATE_FORMATTER.format(savedAt)}` : 'Draft'
  }

  const primaryDate = parseDateValue(
    row?.incidentDate || row?.reportDate,
    row?.incidentTime || row?.reportTime,
  )
  const fallbackDate =
    parseDateValue(row?.timeline?.[0]?.at) ||
    parseDateValue(row?.submittedAt) ||
    parseDateValue(row?.createdAt)
  const displayDate = primaryDate || fallbackDate
  return displayDate ? MOBILE_DATE_FORMATTER.format(displayDate) : '--'
}

export const getCompactInspectionStatusLabel = (row) => {
  if (row?.recordKind === 'draft') return 'Draft'
  return String(row?.status || '').trim() || '--'
}

export const getCompactInspectionStatusStyle = (row) => {
  const status = getCompactInspectionStatusLabel(row).toLowerCase()
  if (status === 'approved') return { color: 'var(--vmecc-status-success-text)' }
  if (status === 'rejected' || status === 'cancelled') {
    return { color: 'var(--vmecc-status-danger-text)' }
  }
  if (status === 'draft') return { color: 'var(--vmecc-status-draft-text)' }
  return { color: 'var(--cui-secondary-color)' }
}

export const renderCompactInspectionStatus = (row) => (
  <span className="small fw-semibold text-nowrap" style={getCompactInspectionStatusStyle(row)}>
    {getCompactInspectionStatusLabel(row)}
  </span>
)

const INSPECTION_TYPE_DESCRIPTION_MAP = INSPECTION_INCIDENT_TYPE_OPTIONS.reduce((acc, row) => {
  const key = String(row?.value || '')
    .trim()
    .toLowerCase()
  if (!key) return acc
  acc[key] = String(row?.description || '').trim()
  return acc
}, {})

export const getInspectionTypeSubtext = (row) => {
  const explicit = String(row?.incidentTypeDescription || row?.typeDescription || '').trim()
  if (explicit) return explicit
  const typeKey = String(row?.incidentType || '')
    .trim()
    .toLowerCase()
  const mapped = String(INSPECTION_TYPE_DESCRIPTION_MAP[typeKey] || '').trim()
  if (mapped) return mapped
  const summary = String(row?.description || row?.details || '').trim()
  if (!summary) return ''
  const firstSentence = summary.split(/[.!?](\s|$)/)[0] || summary
  return `${firstSentence.trim().slice(0, 120)}${firstSentence.length > 120 ? '...' : ''}`
}

export const getInspectionWorkflowStatusLabel = (row) => {
  if (row?.recordKind === 'draft') return 'Draft saved'
  return String(row?.status || '').trim() || 'Status unavailable'
}

export const getInspectionWorkflowNextActionLabel = (row) => {
  if (row?.recordKind === 'draft') return 'Open draft to continue'
  const nextRole = String(row?.nextActionRole || '').trim()
  if (nextRole) return `Next action: ${nextRole}`
  const status = String(row?.status || '')
    .trim()
    .toLowerCase()
  if (status === 'submitted') return 'Pending review'
  if (status === 'reviewed') return 'Pending approval'
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'cancelled') return 'Cancelled'
  return ''
}
