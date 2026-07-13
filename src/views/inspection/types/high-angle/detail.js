import React from 'react'
import {
  DetailEvidenceBlock,
  DetailStatusRow,
  DetailValueBlock,
  detailPhotoSummary,
  detailText,
  issueBadge,
} from '../../records/InspectionDetailReadOnly'

export const buildHighAngleDetailFindingItems = (_form = {}, summary = null) =>
  (summary?.visibleGroups || []).flatMap((group, groupIndex) =>
    (group.rows || []).map((row, rowIndex) => {
      const issue = detailText(row.condition) === 'Not Good'
      const photos = row.conditionPhotos || row.photos || []
      return {
        key: detailText(row.id) || `high-angle:${groupIndex}:${rowIndex}`,
        title: detailText(row.equipment) || `Equipment ${rowIndex + 1}`,
        summaryLines: [
          [detailText(row.condition), detailText(row.quantity) && `Qty ${row.quantity}`]
            .filter(Boolean)
            .join(' · '),
          detailText(group.title),
          detailPhotoSummary(photos),
        ].filter(Boolean),
        badges: issue ? [issueBadge()] : [],
        row,
        group,
      }
    }),
  )

export const renderHighAngleDetailFindingContent = ({ row, group } = {}) =>
  row ? (
    <div className="inspection-form-section d-grid gap-3">
      <DetailStatusRow label="Condition" value={row.condition} />
      <DetailValueBlock label="Quantity" value={row.quantity} />
      <DetailValueBlock label="Storage location" value={row.location || group?.location} />
      <DetailValueBlock label="Compartment" value={row.subLocation || group?.subLocation} />
      <DetailEvidenceBlock
        title="Condition evidence"
        remarks={row.conditionRemarks || row.remarks}
        photos={row.conditionPhotos || row.photos}
      />
    </div>
  ) : null
