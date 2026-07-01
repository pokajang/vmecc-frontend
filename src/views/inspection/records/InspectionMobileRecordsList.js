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
    const isGeneratingDownload = downloadingId === row.id
    const mobileSubtitle = [
      stripInspectionContext(row.incidentType) || 'Record',
      row.location || 'No location',
    ]
      .filter(Boolean)
      .join(' - ')

    return {
      key: row.recordKey || row.id,
      layout: 'compact',
      title: formatMobileInspectionRecordDate(row),
      subtitle: mobileSubtitle,
      status: renderCompactInspectionStatus(row),
      ariaLabel: `Open inspection record ${displayId} summary`,
      onOpen: () =>
        row.recordKind === 'queued'
          ? undefined
          : row.recordKind === 'draft'
            ? onEditRecord(row)
            : onViewRecord(row.id),
      actions: isGeneratingDownload ? (
        <span className="small text-muted">
          <ButtonLoader label="Generating..." size={13} />
        </span>
      ) : (
        <RowActions hitArea={44} items={buildActions(row)} />
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
