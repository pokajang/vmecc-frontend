import React from 'react'
import { PhotoGallery } from '../form/components/InspectionFormDisplaySections'
import {
  isInspectionIssueStatus,
  isInspectionNeutralStatus,
} from '../domain/inspectionStatusSemantics'

export const detailText = (value) => String(value ?? '').trim()

export const getDetailStatusTone = (value) => {
  const normalized = detailText(value).toLowerCase()
  if (['good', 'ok', 'checked', 'yes', 'pass', 'passed', 'satisfactory'].includes(normalized)) {
    return 'success'
  }
  if (isInspectionIssueStatus(normalized)) return 'danger'
  if (isInspectionNeutralStatus(normalized)) return 'warning'
  return 'secondary'
}

export const DetailStatusRow = ({ label, value }) => {
  const displayValue = detailText(value) || '--'
  return (
    <div className="inspection-review-status-row">
      <div className="inspection-review-status-row__label">{label}</div>
      <span
        className={`inspection-review-status-pill inspection-review-status-pill--${getDetailStatusTone(
          displayValue,
        )}`}
      >
        {displayValue}
      </span>
    </div>
  )
}

export const DetailValueBlock = ({ label, value }) => {
  if (!detailText(value)) return null
  return (
    <div className="inspection-detail-value-block">
      <div className="small text-body-secondary">{label}</div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  )
}

export const DetailEvidenceBlock = ({ title, remarks = '', photos = [] }) => {
  const visiblePhotos = Array.isArray(photos) ? photos.filter(Boolean) : []
  if (!detailText(remarks) && visiblePhotos.length === 0) return null
  return (
    <div className="inspection-readonly-evidence rounded-3 border bg-light-subtle p-3 d-grid gap-2">
      <div className="small fw-semibold text-body-secondary">{title}</div>
      {detailText(remarks) ? <div style={{ whiteSpace: 'pre-wrap' }}>{remarks}</div> : null}
      {visiblePhotos.length > 0 ? (
        <PhotoGallery photos={visiblePhotos} readOnly emptyMessage="" />
      ) : null}
    </div>
  )
}

export const detailPhotoSummary = (photos = []) => {
  const count = Array.isArray(photos) ? photos.filter(Boolean).length : 0
  return count > 0 ? `${count} photo${count === 1 ? '' : 's'}` : ''
}

export const issueBadge = (count = 1, label = 'Issue') => ({
  key: `issue:${label}`,
  label: count > 1 ? `${label} (${count})` : label,
  color: 'danger',
})
