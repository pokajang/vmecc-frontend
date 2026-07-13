import React from 'react'
import { HYDRAULIC_CHECK_FIELDS, getHydraulicRetainedEvidenceFields } from './helpers'
import {
  DetailEvidenceBlock,
  DetailStatusRow,
  detailPhotoSummary,
  detailText,
  issueBadge,
} from '../../records/InspectionDetailReadOnly'

const defectFields = (row) =>
  HYDRAULIC_CHECK_FIELDS.filter((field) => detailText(row?.[field.key]) === 'Defect')

export const buildHydraulicDetailFindingItems = (_form = {}, summary = null) =>
  (summary?.visibleChecks || []).map((row, index) => {
    const defects = defectFields(row)
    const photos = [
      ...(row.photos || []),
      ...HYDRAULIC_CHECK_FIELDS.flatMap((field) => row[field.photosKey] || []),
    ]
    return {
      key: detailText(row.id) || `hydraulic:${index}`,
      title: detailText(row.equipment) || `Equipment ${index + 1}`,
      summaryLines: [
        defects.length > 0
          ? `${defects.length} defect${defects.length === 1 ? '' : 's'}`
          : 'All checks OK',
        detailText(row.equipmentDescription),
        detailPhotoSummary(photos),
      ].filter(Boolean),
      badges: defects.length > 0 ? [issueBadge(defects.length, 'Defect')] : [],
      row,
    }
  })

export const renderHydraulicDetailFindingContent = ({ row } = {}) => {
  if (!row) return null
  const retained = new Set(getHydraulicRetainedEvidenceFields(row).map((field) => field.key))
  return (
    <div className="inspection-form-section d-grid gap-3">
      {HYDRAULIC_CHECK_FIELDS.map((field) => {
        const status = detailText(row[field.key])
        const showEvidence = status === 'Defect' || status === 'N/A' || retained.has(field.key)
        return (
          <div key={field.key} className="d-grid gap-2">
            <DetailStatusRow label={field.label} value={status} />
            {showEvidence ? (
              <DetailEvidenceBlock
                title={`${field.label} ${retained.has(field.key) ? 'retained evidence' : 'evidence'}`}
                remarks={row[field.remarksKey]}
                photos={row[field.photosKey]}
              />
            ) : null}
          </div>
        )
      })}
      <DetailEvidenceBlock
        title="General equipment remarks"
        remarks={row.remarks}
        photos={row.photos}
      />
    </div>
  )
}
