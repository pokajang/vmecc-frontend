import React from 'react'
import { getScbaFieldEvidenceKeys } from './helpers'
import {
  DetailEvidenceBlock,
  DetailStatusRow,
  DetailValueBlock,
  detailPhotoSummary,
  detailText,
  issueBadge,
} from '../../records/InspectionDetailReadOnly'

const rowTitle = (row) =>
  [detailText(row.brand), detailText(row.serialNo)].filter(Boolean).join(' ') || 'SCBA item'

export const buildScbaDetailFindingItems = (form = {}, summary = null) => {
  const submittedRows = [
    ...(form.scbaBackPlateChecks || []),
    ...(form.scbaCylinderChecks || []),
    ...(form.scbaFaceMaskChecks || []),
    ...(form.scbaCustomSections || []).flatMap(
      (section) => section.visibleRows || section.rows || section.checks || [],
    ),
  ]
  const submittedIds = new Set(submittedRows.map((row) => detailText(row.id)).filter(Boolean))
  const hasSubmittedRows = submittedRows.length > 0

  return (summary?.visibleSections || []).flatMap((section, sectionIndex) =>
    (section.visibleRows || [])
      .filter((row) => !hasSubmittedRows || submittedIds.has(detailText(row.id)))
      .map((row, rowIndex) => {
        const issueFields = (section.fields || []).filter(
          (field) => field.kind === 'status' && detailText(row[field.key]) === 'Not Good',
        )
        const photos = [
          ...(row.photos || []),
          ...(section.fields || []).flatMap((field) => {
            const { photosKey } = getScbaFieldEvidenceKeys(field)
            return row[photosKey] || []
          }),
        ]
        return {
          key: detailText(row.id) || `scba:${sectionIndex}:${rowIndex}`,
          title: rowTitle(row),
          summaryLines: [
            [
              detailText(section.title),
              issueFields.length
                ? `${issueFields.length} issue${issueFields.length === 1 ? '' : 's'}`
                : 'All checks good',
            ]
              .filter(Boolean)
              .join(' · '),
            [detailText(row.size) && `Size ${row.size}`, detailText(row.cylinderType)]
              .filter(Boolean)
              .join(' · '),
            detailPhotoSummary(photos),
          ].filter(Boolean),
          badges: issueFields.length ? [issueBadge(issueFields.length)] : [],
          row,
          section,
        }
      }),
  )
}

export const renderScbaDetailFindingContent = ({ row, section } = {}) => {
  if (!row || !section) return null
  return (
    <div className="inspection-form-section d-grid gap-3">
      <DetailValueBlock label="SCBA item type" value={section.title} />
      <DetailValueBlock label="Equipment description" value={row.equipmentDescription} />
      {(section.fields || []).map((field) => {
        const { remarksKey, photosKey } = getScbaFieldEvidenceKeys(field)
        return (
          <div key={field.key} className="d-grid gap-2">
            {field.kind === 'status' ? (
              <DetailStatusRow label={field.label} value={row[field.key]} />
            ) : (
              <DetailValueBlock label={field.label} value={row[field.key] || '--'} />
            )}
            <DetailEvidenceBlock
              title={`${field.label} evidence`}
              remarks={row[remarksKey]}
              photos={row[photosKey]}
            />
          </div>
        )
      })}
      <DetailEvidenceBlock title="General SCBA remarks" remarks={row.remarks} photos={row.photos} />
    </div>
  )
}
