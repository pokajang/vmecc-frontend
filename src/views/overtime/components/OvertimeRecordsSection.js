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
} from '@coreui/react'
import { LoaderCircle, Plus } from 'lucide-react'
import ApprovalGates from 'src/components/ApprovalGates'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import GroupedTableHeaderRow from 'src/components/GroupedTableHeader'
import TypeDurationSummaryChips from 'src/views/overtime/components/TypeDurationSummaryChips'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
import {
  APPLICANT_OVERTIME_EDIT_LOCK_REASON,
  canApplicantEditOvertimeRecord,
  formatDuration,
  getOvertimeTypeLabel,
  normalizeOvertimeType,
  resolveOvertimeGates,
} from '../utils'

const monthFormatter = new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' })

const OvertimeRecordsSection = ({
  search,
  setSearch,
  period,
  setPeriod,
  sort,
  setSort,
  statusFilter,
  setStatusFilter,
  overtimeSortOptions,
  statusOptions,
  clearFilters,
  filteredRecords,
  visibleRows,
  rowsToShow,
  setRowsToShow,
  overtimeRecordsCount,
  startNewOvertime,
  openRecord,
  openOvertimeForEdit,
  cancelOvertime,
  deleteOvertime,
  getDisplayOvertimeId,
  getStartDateTimeLabel,
  getEndDateTimeLabel,
  isLoading = false,
}) => {
  const indexedVisibleRows = (Array.isArray(visibleRows) ? visibleRows : []).map((row, index) => ({
    row,
    displayIndex: index + 1,
  }))
  const draftVisibleRows = indexedVisibleRows.filter((entry) => Boolean(entry?.row?.isDraft))
  const groupedVisibleRows = indexedVisibleRows
    .filter((entry) => !entry?.row?.isDraft)
    .reduce((groups, entry) => {
      const appliedDate = new Date(entry.row?.appliedAt)
      const monthValue = Number.isNaN(appliedDate.getTime())
        ? 'unknown'
        : `${appliedDate.getFullYear()}-${String(appliedDate.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = Number.isNaN(appliedDate.getTime())
        ? 'Unknown month'
        : monthFormatter.format(appliedDate)
      const overtimeType = normalizeOvertimeType(entry.row?.overtimeType)
      const durationMinutes = Number(entry.row?.durationMinutes || 0)
      const existingGroup = groups.find((group) => group.key === monthValue)
      if (existingGroup) {
        existingGroup.entries.push(entry)
        existingGroup.typeDurationMinutes[overtimeType] =
          Number(existingGroup.typeDurationMinutes[overtimeType] || 0) + durationMinutes
      } else {
        groups.push({
          key: monthValue,
          label: monthLabel,
          entries: [entry],
          typeDurationMinutes: {
            [overtimeType]: durationMinutes,
          },
        })
      }
      return groups
    }, [])

  return (
    <CCard>
      <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span>My Overtime Records</span>
        <CreateActionButton
          label="Apply Overtime"
          onClick={startNewOvertime}
          icon={<Plus size={13} className="me-1 align-text-bottom" />}
        />
      </CCardHeader>
      <CCardBody>
        <TableFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search overtime ID, status, or reason"
          periodValue={period}
          onPeriodChange={setPeriod}
          filters={[
            {
              key: 'sort',
              value: sort,
              onChange: setSort,
              options: overtimeSortOptions,
            },
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

        {isLoading ? (
          <TableLoader />
        ) : filteredRecords.length === 0 ? (
          <div className="text-body-secondary">No overtime records match the current filters.</div>
        ) : (
          <>
            <div className="rounded-3 shadow-sm overflow-hidden bg-white">
              <CTable align="middle" className="mb-0" hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell>Overtime ID</CTableHeaderCell>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Reason</CTableHeaderCell>
                    <CTableHeaderCell>Start</CTableHeaderCell>
                    <CTableHeaderCell>End</CTableHeaderCell>
                    <CTableHeaderCell>Duration</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {draftVisibleRows.map(({ row, displayIndex }) => (
                    <CTableRow
                      key={row.recordKey || row.id}
                      role="button"
                      className="cursor-pointer"
                      tabIndex={0}
                      aria-label={`Open overtime record ${getDisplayOvertimeId(row)}`}
                      onClick={() => openRecord(row)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openRecord(row)
                        }
                      }}
                    >
                      <CTableDataCell className="text-center text-muted">
                        {displayIndex}
                      </CTableDataCell>
                      <CTableDataCell className="fw-semibold">
                        {getDisplayOvertimeId(row)}
                      </CTableDataCell>
                      <CTableDataCell>
                        {getOvertimeTypeLabel(row?.overtimeType, { short: true })}
                      </CTableDataCell>
                      <CTableDataCell>{row.reason || '-'}</CTableDataCell>
                      <CTableDataCell>{getStartDateTimeLabel(row)}</CTableDataCell>
                      <CTableDataCell>{getEndDateTimeLabel(row)}</CTableDataCell>
                      <CTableDataCell>{formatDuration(row.durationMinutes)}</CTableDataCell>
                      <CTableDataCell>
                        <span
                          className="d-inline-flex align-items-center text-body-secondary"
                          data-testid={`overtime-draft-status-${row.id}`}
                        >
                          <LoaderCircle size={13} className="me-1" />
                          Draft
                        </span>
                      </CTableDataCell>
                      <CTableDataCell className="text-center align-middle">
                        <RowActions
                          items={[
                            {
                              key: 'resume-draft-overtime',
                              label: 'Resume',
                              onClick: () => openOvertimeForEdit(row),
                            },
                            {
                              key: 'delete-draft-overtime',
                              label: 'Delete',
                              onClick: () => deleteOvertime(row),
                              className: 'text-danger',
                            },
                          ]}
                        />
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {groupedVisibleRows.map((group) => (
                    <React.Fragment key={group.key}>
                      <GroupedTableHeaderRow
                        colSpan={9}
                        label={group.label}
                        count={group.entries.length}
                        countNoun={group.entries.length === 1 ? 'record' : 'records'}
                        testId={`ot-month-group-${group.key}`}
                      >
                        <TypeDurationSummaryChips
                          typeDurationMinutes={group.typeDurationMinutes}
                          align="end"
                          size="sm"
                          variant="subtle"
                        />
                      </GroupedTableHeaderRow>
                      {group.entries.map(({ row, displayIndex }) => {
                        const disableEdit = !canApplicantEditOvertimeRecord(row)
                        const disableCancel = row.status === 'Cancelled'
                        const disableDelete = row.status !== 'Cancelled'
                        return (
                          <CTableRow
                            key={row.id}
                            role="button"
                            className="cursor-pointer"
                            tabIndex={0}
                            aria-label={`Open overtime record ${getDisplayOvertimeId(row)}`}
                            onClick={() => openRecord(row)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                openRecord(row)
                              }
                            }}
                          >
                            <CTableDataCell className="text-center text-muted">
                              {displayIndex}
                            </CTableDataCell>
                            <CTableDataCell className="fw-semibold">
                              {getDisplayOvertimeId(row)}
                            </CTableDataCell>
                            <CTableDataCell>
                              {getOvertimeTypeLabel(row?.overtimeType, { short: true })}
                            </CTableDataCell>
                            <CTableDataCell>{row.reason || '-'}</CTableDataCell>
                            <CTableDataCell>{getStartDateTimeLabel(row)}</CTableDataCell>
                            <CTableDataCell>{getEndDateTimeLabel(row)}</CTableDataCell>
                            <CTableDataCell>{formatDuration(row.durationMinutes)}</CTableDataCell>
                            <CTableDataCell>
                              {row?.hasDraftChanges ? (
                                <div
                                  className="small d-inline-flex align-items-center text-body-secondary mb-1"
                                  data-testid={`overtime-linked-draft-status-${row.id}`}
                                >
                                  <LoaderCircle size={12} className="me-1" />
                                  Draft saved
                                </div>
                              ) : null}
                              <ApprovalGates
                                gates={resolveOvertimeGates(row)}
                                approvalHistory={row.approvalHistory}
                                isCancelled={row.status === 'Cancelled'}
                              />
                            </CTableDataCell>
                            <CTableDataCell className="text-center align-middle">
                              <RowActions
                                items={[
                                  {
                                    key: 'edit-overtime',
                                    label: 'Edit',
                                    onClick: () => openOvertimeForEdit(row),
                                    disabled: disableEdit,
                                    disabledReason: APPLICANT_OVERTIME_EDIT_LOCK_REASON,
                                  },
                                  {
                                    key: 'cancel-overtime',
                                    label: 'Cancel',
                                    onClick: () => cancelOvertime(row),
                                    disabled: disableCancel,
                                    disabledReason:
                                      'Cancelled overtime claims cannot be cancelled again.',
                                  },
                                  {
                                    key: 'delete-overtime',
                                    label: 'Delete',
                                    onClick: () => deleteOvertime(row),
                                    className: 'text-danger',
                                    disabled: disableDelete,
                                    disabledReason:
                                      'Only cancelled overtime claims can be deleted.',
                                  },
                                ]}
                              />
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </CTableBody>
              </CTable>
            </div>
            <DataTableFooter
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              filteredCount={filteredRecords.length}
              totalCount={overtimeRecordsCount}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default OvertimeRecordsSection
