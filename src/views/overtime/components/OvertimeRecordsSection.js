import React from 'react'
import {
  CBadge,
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
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import GroupedTableHeaderRow from 'src/components/GroupedTableHeader'
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import RowActionCell from 'src/components/RowActionCell'
import TypeDurationSummaryChips from 'src/views/overtime/components/TypeDurationSummaryChips'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import WorkflowStatusSummary from 'src/components/WorkflowStatusSummary'
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
  getStatusLabel,
  getPendingActionHint,
  getStatusBadge,
  getStartDateTimeLabel,
  getEndDateTimeLabel,
  isLoading = false,
  showPrimaryAction = true,
  filtersTestId = null,
}) => {
  const indexedVisibleRows = (Array.isArray(visibleRows) ? visibleRows : []).map((row, index) => ({
    row,
    displayIndex: index + 1,
  }))
  const renderStatusBadge = (row) =>
    getStatusBadge ? (
      getStatusBadge(row?.status || '-', getStatusLabel ? getStatusLabel(row) : row?.status || '-')
    ) : (
      <CBadge color="secondary">{getStatusLabel ? getStatusLabel(row) : row?.status || '-'}</CBadge>
    )
  const getDraftActionItems = (row) => [
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
  ]
  const getSubmittedActionItems = (row) => {
    const disableEdit = !canApplicantEditOvertimeRecord(row)
    const disableCancel = row.status === 'Cancelled'
    const disableDelete = row.status !== 'Cancelled'

    return [
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
        disabledReason: 'Cancelled overtime claims cannot be cancelled again.',
      },
      {
        key: 'delete-overtime',
        label: 'Delete',
        onClick: () => deleteOvertime(row),
        className: 'text-danger',
        disabled: disableDelete,
        disabledReason: 'Only cancelled overtime claims can be deleted.',
      },
    ]
  }
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
  const buildMobileItem = ({ row }) => {
    const isDraft = Boolean(row?.isDraft)
    const pendingActionHint = isDraft ? 'Draft saved' : getPendingActionHint?.(row)
    return {
      key: row.recordKey || row.id,
      title: getDisplayOvertimeId(row),
      eyebrow: getOvertimeTypeLabel(row?.overtimeType, { short: true }),
      subtitle: row.reason || '-',
      status: renderStatusBadge(row),
      ariaLabel: `Open overtime record ${getDisplayOvertimeId(row)} summary`,
      onOpen: () => openRecord(row),
      fields: [
        { key: 'start', label: 'Start', value: getStartDateTimeLabel(row) },
        { key: 'end', label: 'End', value: getEndDateTimeLabel(row) },
        { key: 'duration', label: 'Duration', value: formatDuration(row.durationMinutes) },
        {
          key: 'next',
          label: 'Next',
          value: pendingActionHint || getStatusLabel?.(row) || row.status || '-',
        },
      ],
      detail: row?.hasDraftChanges ? 'Draft saved changes are available for this claim.' : null,
      actions: (
        <RowActions items={isDraft ? getDraftActionItems(row) : getSubmittedActionItems(row)} />
      ),
    }
  }
  const mobileSections = [
    {
      key: 'drafts',
      label: draftVisibleRows.length ? 'Drafts' : '',
      summary: draftVisibleRows.length
        ? `${draftVisibleRows.length} ${draftVisibleRows.length === 1 ? 'record' : 'records'}`
        : '',
      items: draftVisibleRows.map(buildMobileItem),
    },
    ...groupedVisibleRows.map((group) => ({
      key: group.key,
      label: group.label,
      summary: `${group.entries.length} ${group.entries.length === 1 ? 'record' : 'records'}`,
      items: group.entries.map(buildMobileItem),
    })),
  ]

  return (
    <CCard>
      <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span>My Overtime Records</span>
        {showPrimaryAction ? (
          <CreateActionButton
            label="Apply Overtime"
            importance="section-primary"
            onClick={startNewOvertime}
            icon={<Plus size={13} />}
          />
        ) : null}
      </CCardHeader>
      <CCardBody>
        <div {...(filtersTestId ? { 'data-testid': filtersTestId } : {})}>
          <TableFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchLabel="Search overtime by ID, status, or reason"
            searchPlaceholder="Search overtime"
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
        </div>

        <ResponsiveRecordCollection
          isLoading={isLoading}
          isEmpty={filteredRecords.length === 0}
          emptyMessage={
            <div className="text-body-secondary">
              No overtime records match the current filters.
            </div>
          }
          mobileSections={mobileSections}
          mobileVariant="list-group"
          renderDesktop={() => (
            <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-body">
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
                    <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
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
                      <RowActionCell className="text-center align-middle">
                        <RowActions items={getDraftActionItems(row)} />
                      </RowActionCell>
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
                              <WorkflowStatusSummary
                                statusLabel={getStatusLabel?.(row) || row.status || '-'}
                                nextActionLabel={getPendingActionHint?.(row) || ''}
                                gates={resolveOvertimeGates(row)}
                                approvalHistory={row.approvalHistory}
                                isCancelled={row.status === 'Cancelled'}
                              />
                            </CTableDataCell>
                            <RowActionCell className="text-center align-middle">
                              <RowActions items={getSubmittedActionItems(row)} />
                            </RowActionCell>
                          </CTableRow>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}
          footer={
            <DataTableFooter
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              filteredCount={filteredRecords.length}
              totalCount={overtimeRecordsCount}
            />
          }
        />
      </CCardBody>
    </CCard>
  )
}

export default OvertimeRecordsSection
