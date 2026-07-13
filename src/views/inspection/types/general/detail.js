import React from 'react'
import { normalizeInspectionIssues } from '../inspectionIssues'
import {
  DetailEvidenceBlock,
  DetailValueBlock,
  detailPhotoSummary,
  detailText,
  issueBadge,
} from '../../records/InspectionDetailReadOnly'

const truncate = (value, max = 90) => {
  const normalized = detailText(value)
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized
}

export const buildGeneralDetailFindingItems = (form = {}) => {
  const issues = normalizeInspectionIssues(form.inspectionIssues || form.issues)
  if (issues.length === 0 && detailText(form.description)) {
    return [
      {
        key: 'general-summary',
        title: 'General inspection summary',
        summaryLines: [detailPhotoSummary(form.photos)].filter(Boolean),
        description: form.description,
        photos: form.photos || [],
      },
    ]
  }
  return issues.map((issue, index) => ({
    key: detailText(issue.id) || `general-finding:${index}`,
    title: detailText(issue.description)
      ? `${index + 1}. ${truncate(issue.description)}`
      : `Finding ${index + 1}`,
    summaryLines: [
      detailText(issue.actionRequired) ? 'Action required' : '',
      detailPhotoSummary(issue.photos),
    ].filter(Boolean),
    badges: [issueBadge(1, 'Finding')],
    issue,
  }))
}

export const renderGeneralDetailFindingContent = ({ issue, description, photos } = {}) =>
  issue || detailText(description) ? (
    <div className="inspection-form-section d-grid gap-3">
      <DetailValueBlock
        label={issue ? 'Finding' : 'Summary'}
        value={issue?.description || description}
      />
      <DetailValueBlock label="Action required" value={issue?.actionRequired} />
      <DetailEvidenceBlock
        title={issue ? 'Finding evidence' : 'Inspection evidence'}
        photos={issue?.photos || photos}
      />
    </div>
  ) : null
