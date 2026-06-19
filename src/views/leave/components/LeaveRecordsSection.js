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
import { Clock3, Plus } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import GroupedTableHeaderRow, { GroupTotalBadge } from 'src/components/GroupedTableHeader'
import ResponsiveRecordCollection from 'src/components/ResponsiveRecordCollection'
import RowActionCell from 'src/components/RowActionCell'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import WorkflowStatusSummary from 'src/components/WorkflowStatusSummary'

const resolveLeaveGates = (row) => {
  const requireRecommendation = row?.workflowSnapshot?.requireRecommendation !== false
  return [
    { action: 'Reviewed', label: 'Reviewed' },
    ...(requireRecommendation ? [{ action: 'Recommended', label: 'Recommended' }] : []),
    { action: 'Approved', label: 'Approved' },
  ]
}

const LeaveRecordsSection = ({
  title = 'My Leave Records',
  showPrimaryAction = true,
  primaryActionLabel = 'Apply Leave',
  primaryActionIcon,
  searchPlaceholder = 'Search leave ID, leave type, or status',
  unknownGroupLabel = 'Unknown month',
  actionMode = 'self',
  enableMonthGrouping = false,
  groupByMonth = false,
  onGroupByMonthChange,
  search,
  setSearch,
  period,
  setPeriod,
  sort,
  setSort,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  leaveSortOptions,
  typeOptions,
  statusOptions,
  clearFilters,
  filteredRecords,
  visibleRows,
  rowsToShow,
  setRowsToShow,
  leaveRecordsCount,
  startNewLeave,
  openRecord,
  openLeaveForEdit,
  cancelLeave,
  canCancelLeave,
  deleteLeave,
  approveLeave,
  rejectLeave,
  getReviewActionConfig,
  getDisplayLeaveId,
  getStatusLabel,
  getPendingActionHint,
  getStatusBadge,
  getStartDateTimeLabel,
  getEndDateTimeLabel,
  isLoading = false,
}) => {
  const monthFormatter = new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' })
  const shouldGroupByMonth = enableMonthGrouping ? Boolean(groupByMonth) : true
  const formatDayTotal = (value) => {
    const normalized = Number(value || 0)
    if (!Number.isFinite(normalized)) return '0'
    return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1)
  }
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
  const getLeaveActionItems = (row) => {
    const reviewActionConfig =
      actionMode === 'review'
        ? getReviewActionConfig?.(row) || {
            approveLabel: 'Approve',
            approveDisabled: row.status !== 'Pending',
            rejectDisabled: row.status !== 'Pending',
          }
        : null
    const disableEdit = !['Pending', 'Draft'].includes(row.status)
    const disableCancel =
      typeof canCancelLeave === 'function' ? !canCancelLeave(row) : row.status !== 'Pending'
    const disableDelete = String(row?.status || '') !== 'Draft'

    return actionMode === 'review'
      ? [
          {
            key: 'approve-leave',
            label: reviewActionConfig?.approveLabel || 'Approve',
            onClick: () => approveLeave?.(row),
            disabled: reviewActionConfig?.approveDisabled,
            disabledReason: reviewActionConfig?.requiredRole
              ? `This stage requires ${reviewActionConfig.requiredRole} role.`
              : 'This record is not eligible for this workflow action.',
          },
          {
            key: 'reject-leave',
            label: 'Reject',
            className: 'text-danger',
            onClick: () => rejectLeave?.(row),
            disabled: reviewActionConfig?.rejectDisabled,
            disabledReason: reviewActionConfig?.requiredRole
              ? `This stage requires ${reviewActionConfig.requiredRole} role.`
              : 'This record is not eligible for this workflow action.',
          },
        ]
      : [
          {
            key: 'edit-leave',
            label: 'Edit',
            onClick: () => openLeaveForEdit?.(row),
            disabled: disableEdit,
            disabledReason: 'Only Pending or Draft leave requests can be edited.',
          },
          {
            key: 'cancel-leave',
            label: 'Cancel',
            onClick: () => cancelLeave?.(row),
            disabled: disableCancel,
            disabledReason: 'Only pending leave requests can be cancelled.',
          },
          {
            key: 'delete-leave',
            label: 'Delete',
            className: 'text-danger',
            onClick: () => deleteLeave?.(row),
            disabled: disableDelete,
            disabledReason: 'Only Draft leave requests can be deleted.',
          },
        ]
  }

  const groupedVisibleRows = !shouldGroupByMonth
    ? [{ label: '', entries: indexedVisibleRows }]
    : indexedVisibleRows.reduce((groups, entry) => {
        const appliedDate = new Date(entry.row?.appliedAt)
        const monthLabel = Number.isNaN(appliedDate.getTime())
          ? unknownGroupLabel
          : monthFormatter.format(appliedDate)
        const existingGroup = groups.find((group) => group.label === monthLabel)
        if (existingGroup) {
          existingGroup.entries.push(entry)
          existingGroup.totalDays += Number(entry.row?.days || 0)
        } else {
          groups.push({
            label: monthLabel,
            entries: [entry],
            totalDays: Number(entry.row?.days || 0),
          })
        }
        return groups
      }, [])
  const mobileSections = groupedVisibleRows.map((group) => ({
    key: group.label || 'all-records',
    label: shouldGroupByMonth ? group.label : '',
    summary: shouldGroupByMonth ? `${formatDayTotal(group.totalDays)} day(s)` : '',
    items: group.entries.map(({ row }) => {
      const pendingActionHint = getPendingActionHint?.(row)
      return {
        key: row.recordKey || row.id,
        title: getDisplayLeaveId(row),
        eyebrow: row.leaveType || 'Leave request',
        subtitle: row.reason || '-',
        status: renderStatusBadge(row),
        ariaLabel: `Open leave record ${getDisplayLeaveId(row)} summary`,
        onOpen: () => openRecord(row),
        fields: [
          { key: 'start', label: 'Start', value: getStartDateTimeLabel(row) },
          { key: 'end', label: 'End', value: getEndDateTimeLabel(row) },
          { key: 'days', label: 'Days', value: row.days ?? '-' },
          {
            key: 'next',
            label: 'Next',
            value: pendingActionHint || getStatusLabel?.(row) || row.status || '-',
          },
        ],
        actions: <RowActions items={getLeaveActionItems(row)} />,
      }
    }),
  }))

  return (
    <CCard>
      <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span>{title}</span>
        <div className="d-flex align-items-center gap-2">
          {enableMonthGrouping ? (
            <CreateActionButton
              label={groupByMonth ? 'Grouped by month' : 'Group by month'}
              onClick={() => onGroupByMonthChange?.(!groupByMonth)}
              icon={<Clock3 size={13} className="me-1 align-text-bottom" />}
              className={groupByMonth ? 'fw-semibold' : 'text-body-secondary'}
            />
          ) : null}
          {showPrimaryAction ? (
            <CreateActionButton
              label={primaryActionLabel}
              onClick={startNewLeave}
              icon={primaryActionIcon || <Plus size={13} className="me-1 align-text-bottom" />}
            />
          ) : null}
        </div>
      </CCardHeader>
      <CCardBody>
        <TableFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={searchPlaceholder}
          periodValue={period}
          onPeriodChange={setPeriod}
          filters={[
            {
              key: 'sort',
              value: sort,
              onChange: setSort,
              options: leaveSortOptions,
            },
            {
              key: 'type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: typeOptions,
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

        <ResponsiveRecordCollection
          isLoading={isLoading}
          isEmpty={filteredRecords.length === 0}
          emptyMessage={
            <div className="text-body-secondary">No leave records match the current filters.</div>
          }
          mobileSections={mobileSections}
          renderDesktop={() => (
            <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-white">
              <CTable align="middle" className="mb-0" hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell>Leave ID</CTableHeaderCell>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Reason</CTableHeaderCell>
                    <CTableHeaderCell>Start</CTableHeaderCell>
                    <CTableHeaderCell>End</CTableHeaderCell>
                    <CTableHeaderCell>Days</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {groupedVisibleRows.map((group) => (
                    <React.Fragment key={group.label || 'all-records'}>
                      {shouldGroupByMonth ? (
                        <GroupedTableHeaderRow
                          colSpan={9}
                          label={group.label}
                          count={group.entries.length}
                          countNoun={group.entries.length === 1 ? 'record' : 'records'}
                          testId={`leave-month-group-${group.label || 'unknown'}`}
                        >
                          <GroupTotalBadge
                            label="Total"
                            value={`${formatDayTotal(group.totalDays)} day(s)`}
                          />
                        </GroupedTableHeaderRow>
                      ) : null}
                      {group.entries.map(({ row, displayIndex }) => {
                        const actionItems = getLeaveActionItems(row)

                        return (
                          <CTableRow
                            key={row.recordKey || row.id}
                            role="button"
                            className="cursor-pointer"
                            tabIndex={0}
                            aria-label={`Open leave record ${getDisplayLeaveId(row)}`}
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
                              {getDisplayLeaveId(row)}
                            </CTableDataCell>
                            <CTableDataCell>{row.leaveType || '-'}</CTableDataCell>
                            <CTableDataCell>{row.reason || '-'}</CTableDataCell>
                            <CTableDataCell>{getStartDateTimeLabel(row)}</CTableDataCell>
                            <CTableDataCell>{getEndDateTimeLabel(row)}</CTableDataCell>
                            <CTableDataCell>{row.days ?? '-'}</CTableDataCell>
                            <CTableDataCell>
                              <WorkflowStatusSummary
                                statusLabel={getStatusLabel?.(row) || row.status || '-'}
                                nextActionLabel={getPendingActionHint?.(row) || ''}
                                gates={resolveLeaveGates(row)}
                                approvalHistory={row.approvalHistory}
                                isCancelled={row.status === 'Cancelled'}
                              />
                            </CTableDataCell>
                            <RowActionCell className="text-center align-middle">
                              <RowActions items={actionItems} />
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
              totalCount={leaveRecordsCount}
            />
          }
        />
      </CCardBody>
    </CCard>
  )
}

export default LeaveRecordsSection
