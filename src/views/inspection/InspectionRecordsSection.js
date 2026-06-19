import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CTooltip,
} from '@coreui/react'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import RowActionCell from 'src/components/RowActionCell'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import WorkflowStatusSummary from 'src/components/WorkflowStatusSummary'
import { FilePenLine } from 'lucide-react'
import { formatReportDisplayId } from './inspectionSharedUtils'
import { INSPECTION_INCIDENT_TYPE_OPTIONS } from './constants'

const REPORT_GATES = [
  { action: 'Submitted', label: 'Submitted' },
  { action: 'Reviewed', label: 'Reviewed' },
  { action: 'Approved', label: 'Approved' },
]

const LEGACY_RANDOM_DISPLAY_ID = /^[A-Z]+-\d{6}-[A-Z0-9]+$/i

const formatDisplayId = (row, index) => {
  if (row?.recordKind === 'draft') return row.displayId || 'Draft'
  const raw = String(row.displayId || '')
  if (!raw) return '--'
  if (!LEGACY_RANDOM_DISPLAY_ID.test(raw)) return raw
  const prefix = raw.split('-')[0]
  const date = row.timeline?.[0]?.at || row.incidentDate || row.reportDate
  return formatReportDisplayId(prefix, index + 1, date)
}

const DraftStatus = ({ direction = 'vertical' }) => {
  const isHorizontal = direction === 'horizontal'
  return (
    <div
      className={`d-flex ${isHorizontal ? 'flex-row flex-wrap' : 'flex-column'}`}
      style={{ gap: isHorizontal ? '12px' : '3px' }}
    >
      <div className="d-flex align-items-center" style={{ gap: '4px' }}>
        <FilePenLine size={11} color="#f9b115" strokeWidth={3} />
        <span style={{ fontSize: '0.7rem', color: '#f9b115', lineHeight: 1 }}>Draft</span>
      </div>
    </div>
  )
}

const formatRowDateTime = (row, formatDateTime) => {
  if (row?.recordKind === 'draft' && row?.savedAt) {
    const savedAt = new Date(row.savedAt)
    if (!Number.isNaN(savedAt.getTime())) return `Saved ${savedAt.toLocaleString()}`
  }
  const display = formatDateTime(
    row.incidentDate || row.reportDate,
    row.incidentTime || row.reportTime,
  )
  if (display !== '--') return display
  const submittedAt = new Date(String(row?.submittedAt || '').trim())
  if (!Number.isNaN(submittedAt.getTime())) return `Submitted ${submittedAt.toLocaleString()}`
  const createdAt = new Date(String(row?.createdAt || '').trim())
  if (!Number.isNaN(createdAt.getTime())) return `Created ${createdAt.toLocaleString()}`
  return '--'
}

const INSPECTION_TYPE_DESCRIPTION_MAP = INSPECTION_INCIDENT_TYPE_OPTIONS.reduce((acc, row) => {
  const key = String(row?.value || '')
    .trim()
    .toLowerCase()
  if (!key) return acc
  acc[key] = String(row?.description || '').trim()
  return acc
}, {})

const getInspectionTypeSubtext = (row) => {
  const explicit = String(row?.incidentTypeDescription || row?.typeDescription || '').trim()
  if (explicit) return explicit
  const typeKey = String(row?.incidentType || '')
    .trim()
    .toLowerCase()
  const mapped = String(INSPECTION_TYPE_DESCRIPTION_MAP[typeKey] || '').trim()
  if (mapped) return mapped
  const summary = String(row?.description || row?.details || '').trim()
  if (!summary) return ''
  const firstSentence = summary.split(/[.!?](\s|$)/)[0] || summary
  return `${firstSentence.trim().slice(0, 120)}${firstSentence.length > 120 ? '...' : ''}`
}

const getApprovalHistory = (row) => {
  const history = Array.isArray(row?.timeline) ? row.timeline : []
  const hasAction = (action) =>
    history.some((entry) => String(entry?.action || '').toLowerCase() === action.toLowerCase())
  const status = String(row?.status || '')
    .trim()
    .toLowerCase()
  const fallback = []
  if (!hasAction('Submitted')) fallback.push({ action: 'Submitted' })
  if (status === 'reviewed' || status === 'approved' || hasAction('Reviewed')) {
    if (!hasAction('Reviewed')) fallback.push({ action: 'Reviewed' })
  }
  if (status === 'approved' || hasAction('Approved')) {
    if (!hasAction('Approved')) fallback.push({ action: 'Approved' })
  }
  return [...history, ...fallback]
}

const getWorkflowStatusLabel = (row) => {
  if (row?.recordKind === 'draft') return 'Draft saved'
  return String(row?.status || '').trim() || 'Status unavailable'
}

const getWorkflowNextActionLabel = (row) => {
  if (row?.recordKind === 'draft') return 'Open draft to continue'
  const status = String(row?.status || '')
    .trim()
    .toLowerCase()
  if (status === 'submitted') return 'Pending review'
  if (status === 'reviewed') return 'Pending approval'
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'cancelled') return 'Cancelled'
  return ''
}

const disabledReason = (isEnabled, reason) => (isEnabled ? undefined : reason)

const buildRowActionItems = (
  row,
  {
    onEditRecord,
    onReviewTransition,
    onApproveTransition,
    onRejectTransition,
    onDownloadRecord,
    onDeleteRecord,
    canEditRecord,
    canReviewRecord,
    canApproveRecord,
    canRejectRecord,
    canDeleteRecord,
    downloadingId,
  },
) => {
  const canEdit = Boolean(canEditRecord?.(row))
  const canReview = Boolean(canReviewRecord?.(row))
  const canApprove = Boolean(canApproveRecord?.(row))
  const canReject = Boolean(canRejectRecord?.(row))
  const canDelete = Boolean(canDeleteRecord?.(row))

  return [
    row.recordKind === 'draft'
      ? {
          key: 'edit',
          label: 'Open Draft',
          onClick: () => onEditRecord(row),
          disabled: !canEdit,
          disabledReason: disabledReason(canEdit, 'This draft cannot be opened.'),
        }
      : {
          key: 'review',
          label: 'Review',
          onClick: () => onReviewTransition?.(row),
          disabled: !canReview,
          disabledReason: disabledReason(canReview, 'Review is not available for this status.'),
        },
    ...(row.recordKind === 'draft'
      ? []
      : [
          {
            key: 'approve',
            label: 'Approve',
            disabled: !canApprove,
            disabledReason: disabledReason(canApprove, 'Approve is not available for this status.'),
            onClick: () => onApproveTransition?.(row),
          },
          {
            key: 'reject',
            label: 'Reject',
            className: 'text-danger',
            disabled: !canReject,
            disabledReason: disabledReason(canReject, 'Reject is not available for this status.'),
            onClick: () => onRejectTransition?.(row),
          },
          {
            key: 'edit',
            label: 'Edit',
            disabled: !canEdit,
            disabledReason: disabledReason(canEdit, 'Edit is not available for this status.'),
            onClick: () => onEditRecord(row),
          },
          {
            key: 'download',
            label: downloadingId === row.id ? 'Generating...' : 'Download',
            disabled: Boolean(downloadingId),
            disabledReason: downloadingId ? 'Another report PDF is being generated.' : undefined,
            onClick: () => onDownloadRecord?.(row.id),
          },
        ]),
    {
      key: 'delete',
      label: 'Delete',
      className: 'text-danger',
      disabled: !canDelete,
      disabledReason: disabledReason(canDelete, 'Delete is not available for this status.'),
      onClick: () => onDeleteRecord(row),
    },
  ]
}

const InspectionRecordsSection = ({
  startNew,
  search,
  setSearch,
  period,
  setPeriod,
  sort,
  setSort,
  typeFilter,
  setTypeFilter,
  typeOptions,
  statusFilter,
  setStatusFilter,
  statusOptions,
  sortOptions,
  clearFilters,
  isLoading,
  filteredRecords,
  visibleRows,
  onViewRecord,
  onDownloadRecord,
  downloadingId,
  onEditRecord,
  onDeleteRecord,
  onReviewTransition,
  onApproveTransition,
  onRejectTransition,
  canReviewRecord,
  canApproveRecord,
  canRejectRecord,
  canEditRecord,
  canDeleteRecord,
  formatDateTime,
  rowsToShow,
  setRowsToShow,
  totalCount,
  showPrimaryAction = true,
}) => {
  const buildActions = (row) =>
    buildRowActionItems(row, {
      onEditRecord,
      onReviewTransition,
      onApproveTransition,
      onRejectTransition,
      onDownloadRecord,
      onDeleteRecord,
      canEditRecord,
      canReviewRecord,
      canApproveRecord,
      canRejectRecord,
      canDeleteRecord,
      downloadingId,
    })

  const mobileItems = visibleRows.map((row, index) => {
    const displayId = formatDisplayId(row, index)
    const reportedBy = row.timeline?.[0]?.by || row.submittedBy || '--'
    const rowSubtext = getInspectionTypeSubtext(row)

    return {
      key: row.recordKey || row.id,
      title: displayId,
      eyebrow: row.incidentType || '--',
      subtitle: rowSubtext || row.location || '',
      status:
        row.recordKind === 'draft' ? (
          <DraftStatus direction="horizontal" />
        ) : (
          <WorkflowStatusSummary
            statusLabel={getWorkflowStatusLabel(row)}
            nextActionLabel={getWorkflowNextActionLabel(row)}
            gates={REPORT_GATES}
            approvalHistory={getApprovalHistory(row)}
            isCancelled={row.status === 'Cancelled'}
          />
        ),
      ariaLabel: `Open inspection record ${displayId} summary`,
      onOpen: () => (row.recordKind === 'draft' ? onEditRecord(row) : onViewRecord(row.id)),
      fields: [
        { key: 'location', label: 'Location', value: row.location || '--' },
        { key: 'reportedBy', label: 'Reported By', value: reportedBy },
        { key: 'reportedAt', label: 'Reported At', value: formatRowDateTime(row, formatDateTime) },
        {
          key: 'status',
          label: 'Status',
          value: row.recordKind === 'draft' ? 'Draft' : row.status || '--',
        },
      ],
      detail: null,
      actions: <RowActions hitArea={40} items={buildActions(row)} />,
    }
  })

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>My Inspection Records</span>
        {showPrimaryAction ? (
          <CreateActionButton label="New Inspection" onClick={startNew} />
        ) : null}
      </CCardHeader>
      <CCardBody>
        <TableFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search Inspection report ID, inspection type, or status"
          periodValue={period}
          onPeriodChange={setPeriod}
          filters={[
            { key: 'sort', label: 'Sort', value: sort, onChange: setSort, options: sortOptions },
            {
              key: 'type',
              label: 'Inspection Type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: typeOptions,
            },
            {
              key: 'status',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: statusOptions,
            },
          ]}
          onClear={clearFilters}
          rowClassName="flex-md-nowrap align-items-md-end"
          searchColMd={3}
          periodColMd={2}
          filterColMd={2}
          clearColMd="auto"
          showDesktopLabels
        />
        <ResponsiveRecordCollection
          isLoading={isLoading}
          isEmpty={filteredRecords.length === 0}
          emptyMessage={
            <div className="text-body-secondary">
              No inspection reports match the current filters.
            </div>
          }
          mobileSections={[{ key: 'inspection', items: mobileItems }]}
          renderDesktop={() => (
            <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-white">
              <CTable align="middle" className="mb-0" hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell>Report ID</CTableHeaderCell>
                    <CTableHeaderCell>Inspection Type</CTableHeaderCell>
                    <CTableHeaderCell>Location</CTableHeaderCell>
                    <CTableHeaderCell>Reported By</CTableHeaderCell>
                    <CTableHeaderCell>Reported At</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {visibleRows.map((row, index) => {
                    const reportedBy = row.timeline?.[0]?.by || row.submittedBy || '--'
                    const rowSubtext = getInspectionTypeSubtext(row)
                    return (
                      <CTableRow
                        key={row.recordKey || row.id}
                        className="cursor-pointer"
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          row.recordKind === 'draft' ? onEditRecord(row) : onViewRecord(row.id)
                        }
                      >
                        <CTableDataCell className="text-center text-body-secondary">
                          {index + 1}
                        </CTableDataCell>
                        <CTableDataCell className="fw-semibold">
                          {formatDisplayId(row, index)}
                        </CTableDataCell>
                        <CTableDataCell>
                          <div>{row.incidentType || '--'}</div>
                          {rowSubtext ? (
                            <CTooltip content={rowSubtext} placement="top">
                              <div
                                className="small text-muted text-truncate"
                                style={{ maxWidth: '220px' }}
                              >
                                {rowSubtext}
                              </div>
                            </CTooltip>
                          ) : null}
                        </CTableDataCell>
                        <CTableDataCell>{row.location || '--'}</CTableDataCell>
                        <CTableDataCell>{reportedBy}</CTableDataCell>
                        <CTableDataCell>{formatRowDateTime(row, formatDateTime)}</CTableDataCell>
                        <CTableDataCell>
                          {row.recordKind === 'draft' ? (
                            <DraftStatus />
                          ) : (
                            <WorkflowStatusSummary
                              statusLabel={getWorkflowStatusLabel(row)}
                              nextActionLabel={getWorkflowNextActionLabel(row)}
                              gates={REPORT_GATES}
                              approvalHistory={getApprovalHistory(row)}
                              isCancelled={row.status === 'Cancelled'}
                            />
                          )}
                        </CTableDataCell>
                        <RowActionCell className="text-center">
                          <RowActions hitArea={40} items={buildActions(row)} />
                        </RowActionCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </div>
          )}
          footer={
            <DataTableFooter
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              filteredCount={filteredRecords.length}
              totalCount={totalCount}
            />
          }
        />
      </CCardBody>
    </CCard>
  )
}

export default InspectionRecordsSection
