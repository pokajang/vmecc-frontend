import React from 'react'
import {
  DetailEvidenceBlock,
  DetailStatusRow,
  DetailValueBlock,
  detailPhotoSummary,
  detailText,
  issueBadge,
} from '../../records/InspectionDetailReadOnly'
import { isInspectionIssueStatus } from '../../domain/inspectionStatusSemantics'

const isIssue = (value) => isInspectionIssueStatus(detailText(value))

export const buildErAuxDetailFindingItems = (form = {}, summary = null) =>
  (summary?.visibleChecks || []).map((row, index) => ({
    key: detailText(row.id) || `er-aux:${index}`,
    groupLabel: [
      detailText(row.zone || form.zone),
      detailText(row.mainLocation || row.location || form.mainLocation),
      detailText(row.subLocation || form.subLocation),
    ]
      .filter(Boolean)
      .join(' > '),
    title: detailText(row.equipment) || `Equipment ${index + 1}`,
    summaryLines: [
      [detailText(row.condition), detailText(row.quantity) && `Qty ${row.quantity}`]
        .filter(Boolean)
        .join(' · '),
      detailText(row.equipmentDescription),
      detailPhotoSummary([...(row.defectPhotos || []), ...(row.photos || [])]),
    ].filter(Boolean),
    badges: isIssue(row.condition) ? [issueBadge(1, detailText(row.condition))] : [],
    row,
  }))

export const renderErAuxDetailFindingContent = ({ row } = {}) =>
  row ? (
    <div className="inspection-form-section d-grid gap-3">
      <DetailStatusRow label="Condition" value={row.condition} />
      <DetailValueBlock label="Quantity" value={row.quantity ?? row.defaultQuantity} />
      <DetailEvidenceBlock
        title="Defect evidence"
        remarks={row.defectRemarks}
        photos={row.defectPhotos}
      />
      <DetailEvidenceBlock
        title="General equipment remarks"
        remarks={row.additionalNotes}
        photos={row.photos}
      />
    </div>
  ) : null
