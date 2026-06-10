import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CFormCheck,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { Clock3, Plus } from 'lucide-react'
import ApprovalGates from 'src/components/ApprovalGates'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import GroupedTableHeaderRow, {
  GroupTotalBadge,
  UserGroupLabel,
} from 'src/components/GroupedTableHeader'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
import BulkActionButton from 'src/views/staff/components/BulkActionButton'
import BulkWorkflowActionModal from './BulkWorkflowActionModal'
import useBulkWorkflowSelection from '../hooks/useBulkWorkflowSelection'

const resolveLeaveGates = (row) => {
  const requireRecommendation = row?.workflowSnapshot?.requireRecommendation !== false
  return [
    { action: 'Reviewed', label: 'Reviewed' },
    ...(requireRecommendation ? [{ action: 'Recommended', label: 'Recommended' }] : []),
    { action: 'Approved', label: 'Approved' },
  ]
}

const toMonthValue = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const toTestIdToken = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'group'

const buildMonthUserGroups = ({
  entries = [],
  unknownGroupLabel = 'Unknown month',
  monthFormatter,
  includeUserGroups = false,
}) => {
  const groups = []
  const monthMap = new Map()

  ;(Array.isArray(entries) ? entries : []).forEach((entry) => {
    const row = entry?.row || {}
    const monthValue = toMonthValue(row?.appliedAt)
    const appliedDate = new Date(row?.appliedAt)
    const monthLabel =
      monthValue === 'unknown' || Number.isNaN(appliedDate.getTime())
        ? unknownGroupLabel
        : monthFormatter.format(appliedDate)
    const monthKey = `month:${monthValue}`

    if (!monthMap.has(monthKey)) {
      const nextMonth = {
        key: monthKey,
        label: monthLabel,
        entries: [],
        totalDays: 0,
        userGroups: [],
        userMap: new Map(),
      }
      monthMap.set(monthKey, nextMonth)
      groups.push(nextMonth)
    }

    const monthGroup = monthMap.get(monthKey)
    monthGroup.entries.push(entry)
    monthGroup.totalDays += Number(row?.days || 0)

    if (!includeUserGroups) return

    const userKey =
      String(row?.ownerUserId || '').trim() ||
      String(row?.employee || '').trim() ||
      String(row?.id || '').trim() ||
      'unknown'
    const groupKey = `${monthKey}:user:${userKey}`

    if (!monthGroup.userMap.has(groupKey)) {
      const nextUser = {
        key: groupKey,
        ownerLabel: String(row?.employee || '').trim() || 'Unknown',
        avatarUrl: String(row?.avatarUrl || '').trim(),
        team: String(row?.team || '').trim(),
        entries: [],
        totalDays: 0,
      }
      monthGroup.userMap.set(groupKey, nextUser)
      monthGroup.userGroups.push(nextUser)
    }

    const userGroup = monthGroup.userMap.get(groupKey)
    userGroup.entries.push(entry)
    userGroup.totalDays += Number(row?.days || 0)
  })

  return groups.map((group) => {
    const { userMap, ...rest } = group
    void userMap
    return rest
  })
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
  onBulkWorkflowAction,
  isBulkSubmitting = false,
  bulkDeclarationLabel = '',
  getReviewActionConfig,
  getDisplayLeaveId,
  getStartDateTimeLabel,
  getEndDateTimeLabel,
  formatDate,
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

  const isReviewMode = actionMode === 'review'
  const shouldShowUserGroups = shouldGroupByMonth && isReviewMode
  const groupedVisibleRows = !shouldGroupByMonth
    ? [{ key: 'all-records', label: '', entries: indexedVisibleRows, totalDays: 0, userGroups: [] }]
    : buildMonthUserGroups({
        entries: indexedVisibleRows,
        unknownGroupLabel,
        monthFormatter,
        includeUserGroups: shouldShowUserGroups,
      })

  const getRowSelectionKey = React.useCallback(
    (row) => String(row?.recordKey || row?.id || '').trim(),
    [],
  )
  const canBulkActOnRow = React.useCallback(
    (row) => {
      if (actionMode !== 'review') return false
      const actionConfig = getReviewActionConfig?.(row) || {
        approveDisabled: row?.status !== 'Pending',
        rejectDisabled: row?.status !== 'Pending',
      }
      return !(actionConfig?.approveDisabled && actionConfig?.rejectDisabled)
    },
    [actionMode, getReviewActionConfig],
  )
  const {
    selectedVisibleCount,
    selectedApproveActionLabel,
    bulkActionState,
    bulkRemarks,
    bulkDeclarationChecked,
    bulkDeclarationError,
    bulkRejectError,
    setBulkRemarks,
    setBulkDeclarationChecked,
    setBulkDeclarationError,
    setBulkRejectError,
    isSelectedKey,
    clearSelection,
    toggleGroupSelection,
    openBulkModal,
    closeBulkModal,
    submitBulkModal,
  } = useBulkWorkflowSelection({
    rows: indexedVisibleRows.map((entry) => entry.row),
    getRowKey: getRowSelectionKey,
    canBulkActOnRow,
    getApproveActionLabel: (row) => getReviewActionConfig?.(row)?.approveLabel || 'Approve',
    onBulkWorkflowAction,
  })

  const getTeamSuffixLabel = (teamValue) => {
    const normalizedTeam = String(teamValue || '').trim()
    if (!normalizedTeam || normalizedTeam.toLowerCase() === 'unassigned') return ''
    return `- ${normalizedTeam}`
  }

  const buildActionItemsForRow = (row) => {
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

    if (actionMode === 'review') {
      return [
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
    }

    return [
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

  const renderRecordRow = ({ row, displayIndex }) => {
    const actionItems = buildActionItemsForRow(row)

    return (
      <CTableRow
        key={row.recordKey || row.id}
        role="button"
        className="cursor-pointer"
        style={{ cursor: 'pointer' }}
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
        <CTableDataCell className="text-center text-muted">{displayIndex}</CTableDataCell>
        <CTableDataCell className="fw-semibold">{getDisplayLeaveId(row)}</CTableDataCell>
        <CTableDataCell>{row.leaveType || '-'}</CTableDataCell>
        <CTableDataCell>{row.reason || '-'}</CTableDataCell>
        <CTableDataCell>{getStartDateTimeLabel(row)}</CTableDataCell>
        <CTableDataCell>{getEndDateTimeLabel(row)}</CTableDataCell>
        <CTableDataCell>{row.days ?? '-'}</CTableDataCell>
        <CTableDataCell>
          <ApprovalGates
            gates={resolveLeaveGates(row)}
            approvalHistory={row.approvalHistory}
            isCancelled={row.status === 'Cancelled'}
          />
        </CTableDataCell>
        <CTableDataCell>
          {typeof formatDate === 'function' ? formatDate(row.appliedAt) : '-'}
        </CTableDataCell>
        <CTableDataCell
          className="text-center align-middle"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <RowActions items={actionItems} />
        </CTableDataCell>
      </CTableRow>
    )
  }

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

        {isLoading ? (
          <TableLoader />
        ) : filteredRecords.length === 0 ? (
          <div className="text-body-secondary">No leave records match the current filters.</div>
        ) : (
          <>
            {actionMode === 'review' && selectedVisibleCount > 0 ? (
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 border rounded-3 p-2 bg-light">
                <div className="fw-semibold">
                  {selectedVisibleCount} leave record{selectedVisibleCount === 1 ? '' : 's'}{' '}
                  selected
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <BulkActionButton
                    label="Clear selection"
                    intent="neutral"
                    onClick={clearSelection}
                  />
                  <BulkActionButton
                    label="Reject selected"
                    intent="reject"
                    onClick={() => openBulkModal('reject')}
                  />
                  <BulkActionButton
                    label={`${selectedApproveActionLabel} selected`}
                    intent="approve"
                    onClick={() => openBulkModal('approve')}
                  />
                </div>
              </div>
            ) : null}
            <div className="rounded-3 shadow-sm overflow-hidden bg-white">
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
                    <CTableHeaderCell>Applied On</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {groupedVisibleRows.map((group) => (
                    <React.Fragment key={group.key || group.label || 'all-records'}>
                      {shouldGroupByMonth ? (
                        <GroupedTableHeaderRow
                          colSpan={10}
                          label={group.label}
                          count={group.entries.length}
                          countNoun={group.entries.length === 1 ? 'record' : 'records'}
                          className="table-secondary"
                          cellClassName="fw-semibold text-body"
                          testId={`leave-month-group-${toTestIdToken(group.key)}`}
                        >
                          <GroupTotalBadge
                            label="Total"
                            value={`${formatDayTotal(group.totalDays)} day(s)`}
                          />
                        </GroupedTableHeaderRow>
                      ) : null}
                      {shouldShowUserGroups
                        ? group.userGroups.map((userGroup) => {
                            const eligibleGroupKeys = userGroup.entries
                              .filter(({ row }) => canBulkActOnRow(row))
                              .map(({ row }) => getRowSelectionKey(row))
                              .filter(Boolean)
                            const selectedGroupCount = eligibleGroupKeys.filter((key) =>
                              isSelectedKey(key),
                            ).length
                            const allSelected =
                              eligibleGroupKeys.length > 0 &&
                              selectedGroupCount === eligibleGroupKeys.length

                            return (
                              <React.Fragment key={userGroup.key}>
                                <CTableRow className="table-light">
                                  <CTableDataCell
                                    colSpan={10}
                                    className="fw-semibold text-body-secondary"
                                  >
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                                      <div className="d-flex flex-wrap align-items-center gap-2">
                                        {actionMode === 'review' ? (
                                          <CFormCheck
                                            id={`leave-group-select-${toTestIdToken(userGroup.key)}`}
                                            aria-label={`Select actionable leave records for ${group.label || 'Unknown period'} | ${userGroup.ownerLabel || 'Unknown'}`}
                                            disabled={eligibleGroupKeys.length === 0}
                                            checked={allSelected}
                                            onChange={() => {
                                              toggleGroupSelection(eligibleGroupKeys, allSelected)
                                            }}
                                            onClick={(event) => event.stopPropagation()}
                                            onMouseDown={(event) => event.stopPropagation()}
                                          />
                                        ) : null}
                                        <UserGroupLabel
                                          name={userGroup.ownerLabel}
                                          count={userGroup.entries.length}
                                          countNoun={
                                            userGroup.entries.length === 1 ? 'record' : 'records'
                                          }
                                          avatarUrl={userGroup.avatarUrl}
                                          testId={`leave-user-group-${toTestIdToken(userGroup.key)}`}
                                        />
                                        {getTeamSuffixLabel(userGroup.team) ? (
                                          <span className="small text-body-secondary">
                                            {getTeamSuffixLabel(userGroup.team)}
                                          </span>
                                        ) : null}
                                      </div>
                                      <GroupTotalBadge
                                        label="Subtotal"
                                        value={`${formatDayTotal(userGroup.totalDays)} day(s)`}
                                      />
                                    </div>
                                  </CTableDataCell>
                                </CTableRow>
                                {userGroup.entries.map(renderRecordRow)}
                              </React.Fragment>
                            )
                          })
                        : group.entries.map(renderRecordRow)}
                    </React.Fragment>
                  ))}
                </CTableBody>
              </CTable>
            </div>
            <DataTableFooter
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              filteredCount={filteredRecords.length}
              totalCount={leaveRecordsCount}
            />
            {actionMode === 'review' ? (
              <BulkWorkflowActionModal
                visible={bulkActionState.visible}
                action={bulkActionState.action}
                actionLabel={selectedApproveActionLabel}
                entityLabel="leave record"
                selectedCount={selectedVisibleCount}
                remarks={bulkRemarks}
                declarationChecked={bulkDeclarationChecked}
                declarationLabel={bulkDeclarationLabel}
                declarationError={bulkDeclarationError}
                rejectError={bulkRejectError}
                isSubmitting={isBulkSubmitting}
                onClose={closeBulkModal}
                onSubmit={submitBulkModal}
                onRemarksChange={setBulkRemarks}
                onDeclarationChange={setBulkDeclarationChecked}
                onClearRejectError={() => setBulkRejectError('')}
                onClearDeclarationError={() => setBulkDeclarationError('')}
              />
            ) : null}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default LeaveRecordsSection
