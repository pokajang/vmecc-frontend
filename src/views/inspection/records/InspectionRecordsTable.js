import React from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CTooltip,
} from '@coreui/react'
import ButtonLoader from 'src/components/ButtonLoader'
import RecordStateBadge from 'src/components/RecordStateBadge'
import RowActionCell from 'src/components/RowActionCell'
import RowActions from 'src/components/RowActions'
import WorkflowStatusSummary from 'src/components/WorkflowStatusSummary'
import { stripInspectionContext } from 'src/views/inspection/typeOptionUtils'

import { REPORT_GATES, getInspectionApprovalHistory } from './inspectionRecordActions'
import {
  formatInspectionDisplayId,
  formatInspectionRowDateTime,
  getInspectionTypeSubtext,
  getInspectionWorkflowNextActionLabel,
  getInspectionWorkflowStatusLabel,
} from './inspectionRecordFormatters'

const DraftStatus = ({ direction = 'vertical' }) => {
  const isHorizontal = direction === 'horizontal'
  return <RecordStateBadge state="draft" className={isHorizontal ? 'flex-shrink-0' : ''} />
}

const QueuedStatus = () => <RecordStateBadge state="queued" />

const InspectionRecordsTable = ({
  visibleRows,
  downloadingId,
  buildActions,
  formatDateTime,
  onEditRecord,
  onViewRecord,
}) => (
  <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-body">
    <CTable align="middle" className="mb-0" hover responsive>
      <CTableHead color="light">
        <CTableRow>
          <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
            #
          </CTableHeaderCell>
          <CTableHeaderCell>Report ID</CTableHeaderCell>
          <CTableHeaderCell>Type</CTableHeaderCell>
          <CTableHeaderCell>Location</CTableHeaderCell>
          <CTableHeaderCell>Reported By</CTableHeaderCell>
          <CTableHeaderCell>Reported At</CTableHeaderCell>
          <CTableHeaderCell>Status</CTableHeaderCell>
          <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {visibleRows.map((row, index) => {
          const reportedBy = row.timeline?.[0]?.by || row.submittedBy || '--'
          const rowSubtext = getInspectionTypeSubtext(row)
          const isGeneratingDownload = downloadingId === row.id
          const openRow = () =>
            row.recordKind === 'queued'
              ? undefined
              : row.recordKind === 'draft'
                ? onEditRecord(row)
                : onViewRecord(row.id)
          const handleRowKeyDown = (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            openRow()
          }
          return (
            <CTableRow
              key={row.recordKey || row.id}
              className="cursor-pointer"
              role="button"
              tabIndex={row.recordKind === 'queued' ? -1 : 0}
              aria-label={`Open inspection record ${formatInspectionDisplayId(row, index)} summary`}
              style={{ cursor: 'pointer' }}
              onClick={openRow}
              onKeyDown={handleRowKeyDown}
            >
              <CTableDataCell className="text-center text-body-secondary">
                {index + 1}
              </CTableDataCell>
              <CTableDataCell className="fw-semibold">
                {formatInspectionDisplayId(row, index)}
              </CTableDataCell>
              <CTableDataCell>
                <div>{stripInspectionContext(row.incidentType) || '--'}</div>
                {rowSubtext ? (
                  <CTooltip content={rowSubtext} placement="top">
                    <div className="small text-muted text-truncate" style={{ maxWidth: '220px' }}>
                      {rowSubtext}
                    </div>
                  </CTooltip>
                ) : null}
              </CTableDataCell>
              <CTableDataCell>{row.location || '--'}</CTableDataCell>
              <CTableDataCell>{reportedBy}</CTableDataCell>
              <CTableDataCell>{formatInspectionRowDateTime(row, formatDateTime)}</CTableDataCell>
              <CTableDataCell>
                {row.recordKind === 'draft' ? (
                  <DraftStatus />
                ) : row.recordKind === 'queued' ? (
                  <QueuedStatus />
                ) : (
                  <WorkflowStatusSummary
                    statusLabel={getInspectionWorkflowStatusLabel(row)}
                    nextActionLabel={getInspectionWorkflowNextActionLabel(row)}
                    gates={REPORT_GATES}
                    approvalHistory={getInspectionApprovalHistory(row)}
                    isCancelled={row.status === 'Cancelled'}
                  />
                )}
              </CTableDataCell>
              <RowActionCell className="text-center">
                {isGeneratingDownload ? (
                  <span className="small text-muted">
                    <ButtonLoader label="Generating..." size={13} />
                  </span>
                ) : (
                  <RowActions hitArea={44} items={buildActions(row)} />
                )}
              </RowActionCell>
            </CTableRow>
          )
        })}
      </CTableBody>
    </CTable>
  </div>
)

export default InspectionRecordsTable
