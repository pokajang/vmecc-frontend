import React from 'react'
import {
  DetailEvidenceBlock,
  DetailStatusRow,
  DetailValueBlock,
  detailPhotoSummary,
  detailText,
  issueBadge,
} from '../../records/InspectionDetailReadOnly'
import { normalizeFrtDailyChecks, normalizeFrtOneOffChecks } from './helpers'

const buildItems = (sections, kind, submittedIds) =>
  (sections || []).flatMap((section, sectionIndex) =>
    (section.visibleRows || [])
      .filter((row) => submittedIds.has(detailText(row.id)))
      .map((row, rowIndex) => {
        const isReading = kind === 'daily' && row.rowKind === 'reading'
        const result = isReading
          ? detailText(row.readingValue)
          : detailText(kind === 'daily' ? row.status : row.condition)
        const issue = kind === 'daily' ? row.status === 'Issue' : row.condition === 'Not Good'
        const photos = [...(row.photos || []), ...(row.additionalPhotos || [])]
        return {
          key: detailText(row.id) || `frt:${kind}:${sectionIndex}:${rowIndex}`,
          groupLabel: detailText(row.compartment || row.location || section.title),
          title: detailText(row.equipment) || `Truck check ${rowIndex + 1}`,
          summaryLines: [
            [
              isReading ? `Reading ${result || '--'}` : result,
              detailText(row.location || section.title),
            ]
              .filter(Boolean)
              .join(' · '),
            kind === 'oneOff' ? 'One-Off Readiness Checklist' : 'Truck Readiness',
            detailPhotoSummary(photos),
          ].filter(Boolean),
          badges: issue ? [issueBadge()] : [],
          row,
          section,
          kind,
        }
      }),
  )

export const buildFrtDetailFindingItems = (form = {}, summary = null) => {
  const dailyRows = normalizeFrtDailyChecks(form.frtDailyChecks || form.frt_daily_checks)
  const oneOffRows = normalizeFrtOneOffChecks(form.frtOneOffChecks || form.frt_one_off_checks)
  const dailyIds = new Set(dailyRows.map((row) => detailText(row.id)).filter(Boolean))
  const oneOffIds = new Set(oneOffRows.map((row) => detailText(row.id)).filter(Boolean))
  return [
    ...buildItems(summary?.visibleDailySections, 'daily', dailyIds),
    ...buildItems(summary?.visibleOneOffSections, 'oneOff', oneOffIds),
  ]
}

export const renderFrtDetailFindingContent = ({ row, section, kind } = {}) => {
  if (!row) return null
  const isReading = kind === 'daily' && row.rowKind === 'reading'
  return (
    <div className="inspection-form-section d-grid gap-3">
      <DetailValueBlock
        label="Checklist"
        value={kind === 'oneOff' ? 'One-Off Readiness Checklist' : 'Truck Readiness'}
      />
      <DetailValueBlock
        label="Compartment"
        value={row.location || section?.title || row.compartment}
      />
      {isReading ? (
        <DetailValueBlock label="Reading" value={row.readingValue || '--'} />
      ) : (
        <DetailStatusRow
          label={kind === 'daily' ? 'Status' : 'Condition'}
          value={kind === 'daily' ? row.status : row.condition}
        />
      )}
      {kind === 'daily' && !isReading ? (
        <DetailValueBlock label="Quantity" value={row.quantity || '--'} />
      ) : null}
      <DetailEvidenceBlock title="Issue evidence" remarks={row.remarks} photos={row.photos} />
      <DetailEvidenceBlock
        title="General equipment remarks"
        remarks={row.additionalNotes}
        photos={row.additionalPhotos}
      />
    </div>
  )
}
