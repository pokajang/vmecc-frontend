import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CTooltip,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import ApprovalGates from 'src/components/ApprovalGates'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import RowActions from 'src/components/RowActions'
import { getPeriodOptions } from 'src/components/TablePeriodSelect'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
import { FilePenLine, Funnel, Search, X } from 'lucide-react'
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
) => [
  row.recordKind === 'draft'
    ? {
        key: 'edit',
        label: 'Open Draft',
        onClick: () => onEditRecord(row),
        disabled: !canEditRecord?.(row),
      }
    : {
        key: 'review',
        label: 'Review',
        onClick: () => onReviewTransition?.(row),
        disabled: !canReviewRecord?.(row),
      },
  ...(row.recordKind === 'draft'
    ? []
    : [
        {
          key: 'approve',
          label: 'Approve',
          disabled: !canApproveRecord?.(row),
          onClick: () => onApproveTransition?.(row),
        },
        {
          key: 'reject',
          label: 'Reject',
          className: 'text-danger',
          disabled: !canRejectRecord?.(row),
          onClick: () => onRejectTransition?.(row),
        },
        {
          key: 'edit',
          label: 'Edit',
          disabled: !canEditRecord?.(row),
          onClick: () => onEditRecord(row),
        },
        {
          key: 'download',
          label: downloadingId === row.id ? 'Generating...' : 'Download',
          disabled: Boolean(downloadingId),
          onClick: () => onDownloadRecord(row.id),
        },
      ]),
  {
    key: 'delete',
    label: 'Delete',
    className: 'text-danger',
    disabled: !canDeleteRecord?.(row),
    onClick: () => onDeleteRecord(row),
  },
]

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
}) => {
  const [mobileSearch, setMobileSearch] = useState(search)
  const [mobileFilterModalOpen, setMobileFilterModalOpen] = useState(false)

  useEffect(() => {
    setMobileSearch(search)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mobileSearch !== search) setSearch(mobileSearch)
    }, 250)
    return () => clearTimeout(timer)
  }, [mobileSearch, search, setSearch])

  const periodOptions = useMemo(() => getPeriodOptions(), [])
  const defaultSort = sortOptions?.[0]?.value || 'reportedAt:desc'
  const defaultType = typeOptions?.[0]?.value || 'All'
  const defaultStatus = statusOptions?.[0]?.value || 'All'
  const hasSearch = Boolean(String(search || '').trim())
  const periodActive = String(period || 'all') !== 'all'
  const typeActive = String(typeFilter || '') !== String(defaultType || '')
  const statusActive = String(statusFilter || '') !== String(defaultStatus || '')
  const sortActive = String(sort || '') !== String(defaultSort || '')
  const mobileFilterCount = [periodActive, typeActive, statusActive, sortActive].filter(
    Boolean,
  ).length
  const hasMobileFilter = mobileFilterCount > 0 || hasSearch

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>My Inspection Records</span>
        <CreateActionButton label="New Inspection" onClick={startNew} />
      </CCardHeader>
      <CCardBody>
        <div className="d-md-none mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="position-relative flex-grow-1">
              <Search
                size={14}
                className="position-absolute text-body-secondary"
                style={{ left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <CFormInput
                size="sm"
                className="ps-5 pe-4"
                placeholder="Search ID, type, location, status"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
              />
              {hasSearch ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  className="position-absolute border-0 bg-transparent text-body-secondary p-0"
                  style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  onClick={() => {
                    setMobileSearch('')
                    setSearch('')
                  }}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <CButton
              size="sm"
              color="primary"
              variant="outline"
              className="d-inline-flex align-items-center justify-content-center px-2 position-relative"
              onClick={() => setMobileFilterModalOpen(true)}
              aria-label="Open filters"
            >
              <Funnel size={14} />
              {mobileFilterCount > 0 ? (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary"
                  style={{ fontSize: '0.55rem' }}
                >
                  {mobileFilterCount}
                </span>
              ) : null}
            </CButton>
          </div>

          <CModal
            visible={mobileFilterModalOpen}
            onClose={() => setMobileFilterModalOpen(false)}
            alignment="center"
            fullscreen="sm"
            scrollable
          >
            <CModalHeader>
              <CModalTitle>Filter Records</CModalTitle>
            </CModalHeader>
            <CModalBody className="d-grid gap-3">
              <div className="d-grid gap-1">
                <label className="small text-body-secondary">Sort</label>
                <CFormSelect size="sm" value={sort} onChange={(e) => setSort(e.target.value)}>
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
              <div className="d-grid gap-1">
                <label className="small text-body-secondary">Period</label>
                <CFormSelect size="sm" value={period} onChange={(e) => setPeriod(e.target.value)}>
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
              <div className="d-grid gap-1">
                <label className="small text-body-secondary">Incident Type</label>
                <CFormSelect
                  size="sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
              <div className="d-grid gap-1">
                <label className="small text-body-secondary">Status</label>
                <CFormSelect
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            </CModalBody>
            <CModalFooter>
              {hasMobileFilter ? (
                <CButton size="sm" color="secondary" variant="outline" onClick={clearFilters}>
                  Reset
                </CButton>
              ) : null}
              <CButton size="sm" color="primary" onClick={() => setMobileFilterModalOpen(false)}>
                Done
              </CButton>
            </CModalFooter>
          </CModal>
        </div>

        <div className="d-none d-md-block">
          <TableFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search Inspection report ID, inspection type, or status"
            periodValue={period}
            onPeriodChange={setPeriod}
            filters={[
              { key: 'sort', value: sort, onChange: setSort, options: sortOptions },
              { key: 'type', value: typeFilter, onChange: setTypeFilter, options: typeOptions },
              {
                key: 'status',
                value: statusFilter,
                onChange: setStatusFilter,
                options: statusOptions,
              },
            ]}
            onClear={clearFilters}
            rowClassName="flex-md-nowrap"
            searchColMd={3}
            periodColMd={2}
            filterColMd={2}
            clearColMd="auto"
          />
        </div>
        {isLoading ? (
          <TableLoader />
        ) : filteredRecords.length === 0 ? (
          <div className="text-body-secondary">
            No inspection reports match the current filters.
          </div>
        ) : (
          <>
            <div className="d-md-none">
              {visibleRows.map((row, index) => {
                const reportedBy = row.timeline?.[0]?.by || row.submittedBy || null
                const rowSubtext = getInspectionTypeSubtext(row)
                const compactMeta = [
                  row.location || '--',
                  reportedBy || '--',
                  formatRowDateTime(row, formatDateTime),
                ]
                  .filter(Boolean)
                  .join(' • ')
                return (
                  <div
                    key={row.id}
                    className="d-flex justify-content-between align-items-start gap-3 border-bottom py-3"
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      row.recordKind === 'draft' ? onEditRecord(row) : onViewRecord(row.id)
                    }
                  >
                    <div className="d-grid gap-1 flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <div className="fw-semibold text-truncate">
                          {formatDisplayId(row, index)}
                        </div>
                        <div
                          className="flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <RowActions
                            hitArea={40}
                            items={buildRowActionItems(row, {
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
                            })}
                          />
                        </div>
                      </div>
                      <div>
                        {row.recordKind === 'draft' ? (
                          <DraftStatus direction="horizontal" />
                        ) : (
                          <ApprovalGates
                            gates={REPORT_GATES}
                            approvalHistory={getApprovalHistory(row)}
                            isCancelled={row.status === 'Cancelled'}
                            direction="horizontal"
                          />
                        )}
                      </div>
                      <div className="small">{row.incidentType || '--'}</div>
                      {rowSubtext ? (
                        <CTooltip content={rowSubtext} placement="top">
                          <div className="small text-muted text-truncate">{rowSubtext}</div>
                        </CTooltip>
                      ) : null}
                      <div className="small text-body-secondary text-truncate">{compactMeta}</div>
                    </div>
                  </div>
                )
              })}
            </div>

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
                        key={row.id}
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
                            <ApprovalGates
                              gates={REPORT_GATES}
                              approvalHistory={getApprovalHistory(row)}
                              isCancelled={row.status === 'Cancelled'}
                            />
                          )}
                        </CTableDataCell>
                        <CTableDataCell
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <RowActions
                            hitArea={40}
                            items={buildRowActionItems(row, {
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
                            })}
                          />
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </div>

            <DataTableFooter
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              filteredCount={filteredRecords.length}
              totalCount={totalCount}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default InspectionRecordsSection
