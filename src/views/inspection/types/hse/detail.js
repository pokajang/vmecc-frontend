import React from 'react'
import { HSE_DETAIL_FIELDS, HSE_SELECTION_OPTIONS, normalizeHseFormFields } from './helpers'
import {
  DetailEvidenceBlock,
  DetailValueBlock,
  detailPhotoSummary,
  detailText,
  issueBadge,
} from '../../records/InspectionDetailReadOnly'

const getHseGroupLabel = (form = {}) =>
  [
    detailText(form.zone),
    detailText(form.mainLocation || form.location),
    detailText(form.subLocation),
  ]
    .filter(Boolean)
    .join(' > ')

const buildObservationItems = (form, normalized) =>
  normalized.hseSelections.map((selection, index) => {
    const option = HSE_SELECTION_OPTIONS.find((candidate) => candidate.value === selection)
    return {
      key: `hse:${selection || index}`,
      groupLabel: getHseGroupLabel(form),
      title: option?.label || selection || `Observation ${index + 1}`,
      summaryLines: [],
      badges: [issueBadge(1, 'Finding')],
      field: HSE_DETAIL_FIELDS[selection],
      normalized,
    }
  })

const buildFollowUpItem = (form, normalized) => {
  const photos = Array.isArray(form.photos) ? form.photos : []
  if (!detailText(normalized.hseImmediateAction) && photos.length === 0) return null

  return {
    key: 'hse:follow-up',
    groupLabel: getHseGroupLabel(form),
    title: 'Follow-up and evidence',
    summaryLines: [detailPhotoSummary(photos)].filter(Boolean),
    normalized,
    photos,
    followUp: true,
  }
}

export const buildHseDetailFindingItems = (form = {}) => {
  const normalized = normalizeHseFormFields(form)
  return [...buildObservationItems(form, normalized), buildFollowUpItem(form, normalized)].filter(
    Boolean,
  )
}

export const renderHseDetailFindingContent = (item = {}) => {
  if (item.followUp) {
    const { normalized = {}, photos = [] } = item
    return (
      <div className="inspection-form-section d-grid gap-3">
        <DetailValueBlock
          label="Immediate corrective action"
          value={normalized.hseImmediateAction}
        />
        <DetailEvidenceBlock title="HSE evidence" photos={photos} />
      </div>
    )
  }

  const { normalized = {}, field } = item
  return (
    <div className="inspection-form-section d-grid gap-3">
      <DetailValueBlock label="Description" value={field ? normalized[field.key] : ''} />
    </div>
  )
}
