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

const buildObservationItem = (form, normalized) => {
  const observations = normalized.hseSelections.map((selection, index) => {
    const option = HSE_SELECTION_OPTIONS.find((candidate) => candidate.value === selection)
    return {
      key: selection || String(index),
      label: option?.label || selection || `Observation ${index + 1}`,
      value: HSE_DETAIL_FIELDS[selection] ? normalized[HSE_DETAIL_FIELDS[selection].key] : '',
    }
  })
  const photos = Array.isArray(form.photos) ? form.photos : []
  if (
    observations.length === 0 &&
    !detailText(normalized.hseImmediateAction) &&
    photos.length === 0
  ) {
    return null
  }

  return {
    key: 'hse:observation',
    groupLabel: getHseGroupLabel(form),
    title: observations.map((observation) => observation.label).join(' and ') || 'Observation',
    summaryLines: [detailPhotoSummary(photos)].filter(Boolean),
    badges: [issueBadge(1, 'Finding')],
    normalized,
    observations,
    photos,
  }
}

export const buildHseDetailFindingItems = (form = {}) => {
  const normalized = normalizeHseFormFields(form)
  return [buildObservationItem(form, normalized)].filter(Boolean)
}

export const renderHseDetailFindingContent = (item = {}) => {
  const { normalized = {}, observations = [], photos = [] } = item
  return (
    <div className="inspection-form-section d-grid gap-3">
      {observations.map((observation) => (
        <DetailValueBlock
          key={observation.key}
          label={observations.length > 1 ? `${observation.label} description` : 'Description'}
          value={observation.value}
        />
      ))}
      <DetailValueBlock label="Immediate corrective action" value={normalized.hseImmediateAction} />
      <DetailEvidenceBlock
        photos={photos}
        hiddenDescriptionValues={[
          ...observations.flatMap((observation) => [observation.label, observation.value]),
          normalized.hseImmediateAction,
        ]}
      />
    </div>
  )
}
