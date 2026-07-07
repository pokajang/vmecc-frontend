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
import ButtonLoader from 'src/components/ButtonLoader'
import DataTableFooter from 'src/components/DataTableFooter'
import MobileRecordList from 'src/components/MobileRecordList'
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import RowActionCell from 'src/components/RowActionCell'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import WorkflowStatusSummary from 'src/components/WorkflowStatusSummary'
import RecordScopeSegmentedControl from 'src/components/report-workflow/RecordScopeSegmentedControl'
import { FilePenLine } from 'lucide-react'
import { formatMobileReportDate } from '../reportUiUtils'

const REPORT_GATES = [
  { action: 'Submitted', label: 'Submitted' },
  { action: 'Reviewed', label: 'Reviewed' },
  { action: 'Approved', label: 'Approved' },
]

const formatDisplayId = (row) => {
  if (row?.recordKind === 'draft') return row.displayId || 'Draft'
  const raw = String(row.displayId || '')
  return raw || '--'
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

const getRowSubtext = (row) => {
  const explicit = String(row?.incidentTypeDescription || row?.typeDescription || '').trim()
  if (explicit) return explicit
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

const ReportRecordsSection = ({
  reportTypeLabel,
  startNew,
  search,
  setSearch,
  recordScope,
  setRecordScope,
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
  isMobileCardless = false,
  moduleContextLabel = '',
  typeLabel = 'Incident Type',
  testAnchorPrefix = '',
}) => {
  const anchorPrefix = String(testAnchorPrefix || '').trim()
  const moduleRecordsTestId = anchorPrefix ? `${anchorPrefix}-records` : undefined
  const moduleFiltersTestId = anchorPrefix ? `${anchorPrefix}-filters` : undefined
  const moduleNewActionTestId = anchorPrefix ? `${anchorPrefix}-new-action` : undefined
  const firstDraftRow = visibleRows.find((row) => row?.recordKind === 'draft') || null
  const firstDraftRowKey = String(firstDraftRow?.recordKey || firstDraftRow?.id || '').trim()
  const resolvedContextLabel = String(moduleContextLabel || reportTypeLabel || 'report')
    .trim()
    .toLowerCase()
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
    const isGeneratingDownload = downloadingId === row.id
    const reportedBy = row.timeline?.[0]?.by || row.submittedBy || '--'
    const reportedAt = formatRowDateTime(row, formatDateTime)
    const mobileTitle = row.incidentType || (row.recordKind === 'draft' ? 'Draft' : 'Record')
    const mobileSubtitle = row.location || 'No location'

    return {
      key: row.recordKey || row.id,
      layout: 'compact',
      eyebrow: displayId,
      title: mobileTitle,
      subtitle: mobileSubtitle,
      searchText: [displayId, row.incidentType, row.location, reportedBy, reportedAt, row.status]
        .filter(Boolean)
        .join(' '),
      status: (
        <>
          <div className="small fw-semibold text-nowrap">
            {row.recordKind === 'draft' ? 'Draft' : row.status || '--'}
          </div>
          <div className="small text-body-secondary text-nowrap">{formatMobileReportDate(row)}</div>
        </>
      ),
      ariaLabel: `Open ${resolvedContextLabel} report ${displayId} summary`,
      onOpen: () => (row.recordKind === 'draft' ? onEditRecord(row) : onViewRecord(row.id)),
      actions: isGeneratingDownload ? (
        <span className="small text-muted">
          <ButtonLoader label="Generating..." size={13} />
        </span>
      ) : (
        <RowActions
          hitArea={40}
          items={buildActions(row)}
          toggleClassName={isMobileCardless ? 'inspection-mobile-kebab' : ''}
          testId={
            row.recordKind === 'draft' &&
            firstDraftRowKey === String(row.recordKey || row.id || '').trim() &&
            anchorPrefix
              ? `${anchorPrefix}-draft-resume-action`
              : ''
          }
        />
      ),
    }
  })

  const filters = (
    <TableFilters
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search records"
      periodValue={period}
      onPeriodChange={setPeriod}
      filters={[
        { key: 'sort', label: 'Sort', value: sort, onChange: setSort, options: sortOptions },
        {
          key: 'type',
          label: 'Type',
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
      rowClassName={`flex-md-nowrap align-items-md-end ${
        isMobileCardless ? 'inspection-records-filter-row' : ''
      }`.trim()}
      searchColMd={3}
      periodColMd={2}
      filterColMd={2}
      clearColMd="auto"
      showDesktopLabels
      labelClassName="text-muted"
    />
  )

  const footer = (
    <DataTableFooter
      rowsToShow={rowsToShow}
      onRowsToShowChange={setRowsToShow}
      filteredCount={filteredRecords.length}
      totalCount={totalCount}
    />
  )

  const emptyMessage = (
    <div className="text-body-secondary">
      No {reportTypeLabel.toLowerCase()} reports match the current filters.
    </div>
  )

  return (
    <>
      <div className={`${isMobileCardless ? 'inspection-mobile-section' : ''} d-md-none`.trim()}>
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
          <RecordScopeSegmentedControl value={recordScope} onChange={setRecordScope} />
          {showPrimaryAction ? (
            <CreateActionButton
              label="New"
              onClick={startNew}
              {...(moduleNewActionTestId ? { 'data-testid': moduleNewActionTestId } : {})}
            />
          ) : null}
        </div>
        <div {...(moduleFiltersTestId ? { 'data-testid': moduleFiltersTestId } : {})}>
          {filters}
        </div>
        {isLoading ? null : filteredRecords.length === 0 ? (
          emptyMessage
        ) : (
          <div {...(moduleRecordsTestId ? { 'data-testid': moduleRecordsTestId } : {})}>
            <MobileRecordList
              sections={[{ key: 'reports', items: mobileItems }]}
              variant="list-group"
            />
          </div>
        )}
        {isLoading ? (
          <div className="border rounded-3 bg-white">
            <ResponsiveRecordCollection isLoading />
          </div>
        ) : filteredRecords.length > 0 ? (
          footer
        ) : null}
      </div>

      <CCard
        className="d-none d-md-block"
        {...(moduleRecordsTestId ? { 'data-testid': moduleRecordsTestId } : {})}
      >
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <RecordScopeSegmentedControl value={recordScope} onChange={setRecordScope} />
          {showPrimaryAction ? (
            <CreateActionButton
              label={`New ${reportTypeLabel} Report`}
              onClick={startNew}
              {...(moduleNewActionTestId ? { 'data-testid': moduleNewActionTestId } : {})}
            />
          ) : null}
        </CCardHeader>
        <CCardBody>
          <div {...(moduleFiltersTestId ? { 'data-testid': moduleFiltersTestId } : {})}>
            {filters}
          </div>
          <ResponsiveRecordCollection
            isLoading={isLoading}
            isEmpty={filteredRecords.length === 0}
            emptyMessage={emptyMessage}
            mobileSections={[]}
            renderDesktop={() => (
              <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-white">
                <CTable align="middle" className="mb-0" hover responsive>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                        #
                      </CTableHeaderCell>
                      <CTableHeaderCell>Report ID</CTableHeaderCell>
                      <CTableHeaderCell>{typeLabel}</CTableHeaderCell>
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
                      const rowSubtext = getRowSubtext(row)
                      const isGeneratingDownload = downloadingId === row.id
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
                            {isGeneratingDownload ? (
                              <span className="small text-muted">
                                <ButtonLoader label="Generating..." size={13} />
                              </span>
                            ) : (
                              <RowActions
                                hitArea={40}
                                items={buildActions(row)}
                                testId={
                                  row.recordKind === 'draft' &&
                                  firstDraftRowKey ===
                                    String(row.recordKey || row.id || '').trim() &&
                                  anchorPrefix
                                    ? `${anchorPrefix}-draft-resume-action`
                                    : ''
                                }
                              />
                            )}
                          </RowActionCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </div>
            )}
            footer={footer}
          />
        </CCardBody>
      </CCard>
    </>
  )
}

export default ReportRecordsSection
