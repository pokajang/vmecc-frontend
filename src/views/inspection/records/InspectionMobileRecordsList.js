import React from 'react'

import ButtonLoader from 'src/components/ButtonLoader'
import MobileRecordList from 'src/components/MobileRecordList'
import RowActions from 'src/components/RowActions'
import { stripInspectionContext } from 'src/views/inspection/typeOptionUtils'

import {
  formatInspectionDisplayId,
  formatMobileInspectionRecordDate,
  renderCompactInspectionStatus,
} from './inspectionRecordFormatters'

const InspectionMobileRecordsList = ({
  visibleRows,
  downloadingId,
  buildActions,
  onEditRecord,
  onViewRecord,
}) => {
  const mobileItems = visibleRows.map((row, index) => {
    const displayId = formatInspectionDisplayId(row, index)
    const isDownloading = downloadingId === row.id
    const mobileSubtitle = [
      stripInspectionContext(row.incidentType) || 'Record',
      row.location || 'No location',
    ]
      .filter(Boolean)
      .join(' - ')
    const isDraft = row?.recordKind === 'draft'
    const mobileDate = formatMobileInspectionRecordDate(row)
    const canInlineDraftLabel = isDraft && mobileDate !== 'Draft'
    const compactStatus = renderCompactInspectionStatus(row)
    const mobileTitle = canInlineDraftLabel ? (
      <div className="d-inline-flex align-items-center gap-1">
        <span>{mobileDate}</span>
        {compactStatus}
      </div>
    ) : (
      mobileDate
    )

    return {
      key: row.recordKey || row.id,
      layout: 'compact',
      title: mobileTitle,
      subtitle: mobileSubtitle,
      status: isDraft ? null : compactStatus,
      ariaLabel: `Open inspection record ${displayId} summary`,
      onOpen: () =>
        row.recordKind === 'queued'
          ? undefined
          : row.recordKind === 'draft'
            ? onEditRecord(row)
            : onViewRecord(row.id),
      actions: isDownloading ? (
        <span className="small text-muted">
          <ButtonLoader label="Downloading..." size={13} />
        </span>
      ) : (
        <RowActions
          hitArea={44}
          items={buildActions(row)}
          toggleClassName="inspection-mobile-kebab"
        />
      ),
    }
  })

  return (
    <MobileRecordList
      sections={[{ key: 'inspection', variant: 'list-group', items: mobileItems }]}
    />
  )
}

export default InspectionMobileRecordsList
