import React from 'react'
import { normalizeInspectionIssues } from '../inspectionIssues'
import { HSE_DETAIL_FIELDS, HSE_SELECTION_OPTIONS, normalizeHseFormFields } from './helpers'
import {
  DetailEvidenceBlock,
  DetailValueBlock,
  detailPhotoSummary,
  detailText,
  issueBadge,
} from '../../records/InspectionDetailReadOnly'

const findingSelections = new Set(['unsafeAct', 'unsafeCondition', 'environmental'])

const buildStructuredItems = (_form, normalized) =>
  normalized.hseSelections.map((selection, index) => {
    const option = HSE_SELECTION_OPTIONS.find((candidate) => candidate.value === selection)
    const field = HSE_DETAIL_FIELDS[selection]
    const isFinding = findingSelections.has(selection)
    return {
      key: `hse:${selection || index}`,
      title: option?.label || selection || `Observation ${index + 1}`,
      summaryLines:
        normalized.hsePayloadVersion === 2
          ? []
          : [
              isFinding && detailText(normalized.hseSeverity)
                ? normalized.hseSeverity
                : 'Satisfactory',
            ].filter(Boolean),
      badges: isFinding ? [issueBadge(1, 'Finding')] : [],
      selection,
      field,
      normalized,
    }
  })

const buildFollowUpItem = (form, normalized) => {
  const isVersion2 = normalized.hsePayloadVersion === 2
  const hasContent = (
    isVersion2
      ? [normalized.hseImmediateAction]
      : [
          normalized.hseImmediateAction,
          normalized.hseCorrectiveAction,
          normalized.hseResponsiblePerson,
          normalized.hseTargetDate,
          normalized.hseRemarks,
        ]
  ).some(detailText)
  const photos = Array.isArray(form.photos) ? form.photos : []
  if (!hasContent && photos.length === 0) return null
  return {
    key: 'hse:follow-up',
    title: 'Follow-up and evidence',
    summaryLines: isVersion2
      ? [detailPhotoSummary(photos)].filter(Boolean)
      : [
          detailText(normalized.hseResponsiblePerson),
          detailText(normalized.hseTargetDate),
          detailPhotoSummary(photos),
        ].filter(Boolean),
    normalized,
    photos,
    followUp: true,
  }
}

const buildLegacyItems = (form, existingDescriptions) =>
  normalizeInspectionIssues(form.inspectionIssues || form.issues)
    .filter((issue) => !existingDescriptions.has(detailText(issue.description).toLowerCase()))
    .map((issue, index) => ({
      key: detailText(issue.id) || `hse-legacy:${index}`,
      title: detailText(issue.description) || `Additional finding ${index + 1}`,
      summaryLines: ['Additional finding', detailPhotoSummary(issue.photos)].filter(Boolean),
      badges: [issueBadge(1, 'Finding')],
      issue,
    }))

export const buildHseDetailFindingItems = (form = {}) => {
  const normalized = normalizeHseFormFields(form)
  const structured = buildStructuredItems(form, normalized)
  const descriptions = new Set(
    structured
      .map((item) => detailText(item.field ? normalized[item.field.key] : '').toLowerCase())
      .filter(Boolean),
  )
  return [
    ...structured,
    buildFollowUpItem(form, normalized),
    ...(normalized.hsePayloadVersion === 2 ? [] : buildLegacyItems(form, descriptions)),
  ].filter(Boolean)
}

export const renderHseDetailFindingContent = (item = {}) => {
  if (item.issue) {
    return (
      <div className="inspection-form-section d-grid gap-3">
        <DetailValueBlock label="Finding" value={item.issue.description} />
        <DetailValueBlock label="Action required" value={item.issue.actionRequired} />
        <DetailEvidenceBlock title="Finding evidence" photos={item.issue.photos} />
      </div>
    )
  }
  if (item.followUp) {
    const { normalized = {}, photos = [] } = item
    const isVersion2 = normalized.hsePayloadVersion === 2
    return (
      <div className="inspection-form-section d-grid gap-3">
        <DetailValueBlock
          label={isVersion2 ? 'Immediate corrective action' : 'Immediate action'}
          value={normalized.hseImmediateAction}
        />
        {!isVersion2 ? (
          <>
            <DetailValueBlock label="Corrective action" value={normalized.hseCorrectiveAction} />
            <DetailValueBlock label="Responsible person" value={normalized.hseResponsiblePerson} />
            <DetailValueBlock label="Target date" value={normalized.hseTargetDate} />
            <DetailValueBlock label="General HSE remarks" value={normalized.hseRemarks} />
          </>
        ) : null}
        <DetailEvidenceBlock title="HSE evidence" photos={photos} />
      </div>
    )
  }
  const { normalized = {}, selection, field } = item
  const isFinding = findingSelections.has(selection)
  return (
    <div className="inspection-form-section d-grid gap-3">
      <DetailValueBlock
        label={
          normalized.hsePayloadVersion === 2
            ? 'Description'
            : field?.label || 'Area Condition Remarks'
        }
        value={field ? normalized[field.key] : normalized.hseAreaConditionRemarks}
      />
      {isFinding ? <DetailValueBlock label="Severity" value={normalized.hseSeverity} /> : null}
    </div>
  )
}
