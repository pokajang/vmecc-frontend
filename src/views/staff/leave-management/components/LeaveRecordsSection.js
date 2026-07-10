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
import BulkSelectionActionBar from 'src/components/BulkSelectionActionBar'
import CreateActionButton from 'src/components/CreateActionButton'
import DataTableFooter from 'src/components/DataTableFooter'
import GroupedTableHeaderRow, {
  GroupTotalBadge,
  UserGroupLabel,
} from 'src/components/GroupedTableHeader'
import MobileRecordList from 'src/components/MobileRecordList'
import RowActionCell from 'src/components/RowActionCell'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
import WorkflowStatusSummary from 'src/components/WorkflowStatusSummary'
import BulkActionButton from 'src/views/staff/components/BulkActionButton'
import BulkWorkflowActionModal from './BulkWorkflowActionModal'
import useBulkWorkflowSelection from '../hooks/useBulkWorkflowSelection'
import {
  buildReviewWorkflowActionItems,
  buildWorkflowMobileSections,
  buildWorkflowMonthUserGroups,
  formatWorkflowTeamSuffix,
  formatWorkflowTotal,
  getWorkflowGroupSelectionState,
  toWorkflowTestIdToken,
} from '../workflowRecordHelpers'

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
  const indexedVisibleRows = (Array.isArray(visibleRows) ? visibleRows : []).map((row, index) => ({
    row,
    displayIndex: index + 1,
  }))

  const isReviewMode = actionMode === 'review'
  const shouldShowUserGroups = shouldGroupByMonth && isReviewMode
  const groupedVisibleRows = !shouldGroupByMonth
    ? [{ key: 'all-records', label: '', entries: indexedVisibleRows, totalDays: 0, userGroups: [] }]
    : buildWorkflowMonthUserGroups({
        entries: indexedVisibleRows,
        getRow: (entry) => entry.row,
        unknownGroupLabel,
        monthFormatter,
        includeUserGroups: shouldShowUserGroups,
        createMonthExtras: () => ({ totalDays: 0 }),
        createUserExtras: () => ({ totalDays: 0 }),
        onAddToMonth: (group, row) => {
          group.totalDays += Number(row?.days || 0)
        },
        onAddToUser: (group, row) => {
          group.totalDays += Number(row?.days || 0)
        },
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
    return formatWorkflowTeamSuffix(teamValue)
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
      return buildReviewWorkflowActionItems({
        row,
        actionKeyPrefix: 'leave',
        actionConfig: reviewActionConfig,
        onApprove: approveLeave,
        onReject: rejectLeave,
      })
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

  const renderMobileGroupSelect = ({ id, ariaLabel, eligibleKeys = [], allSelected = false }) => (
    <CFormCheck
      id={id}
      aria-label={ariaLabel}
      disabled={eligibleKeys.length === 0}
      checked={allSelected}
      onChange={() => toggleGroupSelection(eligibleKeys, allSelected)}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    />
  )

  const buildMobileRecordItem = ({ row }) => {
    const reviewActionConfig = actionMode === 'review' ? getReviewActionConfig?.(row) : null
    const statusLabel = String(row?.status || '').trim() || '-'
    const nextActionLabel =
      reviewActionConfig?.approveDisabled && reviewActionConfig?.rejectDisabled
        ? reviewActionConfig?.requiredRole
          ? `Requires ${reviewActionConfig.requiredRole}`
          : 'No workflow action available'
        : reviewActionConfig?.approveLabel || ''

    return {
      key: row.recordKey || row.id,
      title: getDisplayLeaveId(row),
      subtitle: row.employee || row.reason || '-',
      eyebrow: row.leaveType || 'Leave',
      status: (
        <WorkflowStatusSummary
          statusLabel={statusLabel}
          nextActionLabel={nextActionLabel}
          gates={resolveLeaveGates(row)}
          approvalHistory={row.approvalHistory}
          isCancelled={row.status === 'Cancelled'}
        />
      ),
      fields: [
        { key: 'start', label: 'Start', value: getStartDateTimeLabel(row) },
        { key: 'end', label: 'End', value: getEndDateTimeLabel(row) },
        { key: 'days', label: 'Days', value: row.days ?? '-' },
        {
          key: 'applied',
          label: 'Applied',
          value: typeof formatDate === 'function' ? formatDate(row.appliedAt) : '-',
        },
      ],
      detail: row.team ? getTeamSuffixLabel(row.team).replace(/^- /, '') : row.reason || '',
      ariaLabel: `Open leave record ${getDisplayLeaveId(row)}`,
      onOpen: () => openRecord(row),
      actions: <RowActions items={buildActionItemsForRow(row)} />,
    }
  }

  const mobileRecordSections = buildWorkflowMobileSections({
    groups: groupedVisibleRows,
    useUserGroups: shouldShowUserGroups,
    buildGroupLabel: ({ group, userGroup }) => {
      if (!shouldShowUserGroups) return shouldGroupByMonth ? group.label : ''
      const { eligibleKeys, allSelected } = getWorkflowGroupSelectionState({
        rows: userGroup.entries.map(({ row }) => row),
        canActOnRow: canBulkActOnRow,
        getRowKey: getRowSelectionKey,
        isSelectedKey,
      })

      return (
        <span className="d-inline-flex align-items-center gap-2">
          {renderMobileGroupSelect({
            id: `leave-mobile-group-select-${toWorkflowTestIdToken(userGroup.key)}`,
            ariaLabel: `Select actionable leave records for ${group.label || 'Unknown period'} | ${userGroup.ownerLabel || 'Unknown'}`,
            eligibleKeys,
            allSelected,
          })}
          <span>
            {group.label ? `${group.label} | ` : ''}
            {userGroup.ownerLabel || 'Unknown'}
            {getTeamSuffixLabel(userGroup.team) ? ` ${getTeamSuffixLabel(userGroup.team)}` : ''}
          </span>
        </span>
      )
    },
    buildGroupSummary: ({ group, userGroup }) =>
      shouldShowUserGroups
        ? `${formatWorkflowTotal(userGroup.totalDays)} day(s)`
        : shouldGroupByMonth
          ? `${formatWorkflowTotal(group.totalDays)} day(s)`
          : '',
    buildItem: buildMobileRecordItem,
  })

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
        <RowActionCell className="text-center align-middle">
          <RowActions items={actionItems} />
        </RowActionCell>
      </CTableRow>
    )
  }

  return (
    <CCard data-testid="leave-management-records">
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
        <div data-testid="leave-management-records-filters">
          <TableFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={searchPlaceholder}
            periodValue={period}
            onPeriodChange={setPeriod}
            filters={[
              {
                key: 'sort',
                label: 'Sort',
                value: sort,
                onChange: setSort,
                options: leaveSortOptions,
              },
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
            rowClassName="flex-md-nowrap align-items-md-end"
            searchColMd={3}
            periodColMd={2}
            filterColMd={2}
            clearColMd="auto"
            showDesktopLabels
          />
        </div>

        {isLoading ? (
          <TableLoader />
        ) : filteredRecords.length === 0 ? (
          <div className="text-body-secondary">No leave records match the current filters.</div>
        ) : (
          <>
            {actionMode === 'review' && selectedVisibleCount > 0 ? (
              <BulkSelectionActionBar
                label={`${selectedVisibleCount} leave record${selectedVisibleCount === 1 ? '' : 's'} selected`}
                actions={
                  <>
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
                  </>
                }
              />
            ) : null}
            <MobileRecordList sections={mobileRecordSections} variant="list-group" />
            <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-body">
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
                    <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
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
                          testId={`leave-month-group-${toWorkflowTestIdToken(group.key)}`}
                        >
                          <GroupTotalBadge
                            label="Total"
                            value={`${formatWorkflowTotal(group.totalDays)} day(s)`}
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
                                            id={`leave-group-select-${toWorkflowTestIdToken(userGroup.key)}`}
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
                                          testId={`leave-user-group-${toWorkflowTestIdToken(userGroup.key)}`}
                                        />
                                        {getTeamSuffixLabel(userGroup.team) ? (
                                          <span className="small text-body-secondary">
                                            {getTeamSuffixLabel(userGroup.team)}
                                          </span>
                                        ) : null}
                                      </div>
                                      <GroupTotalBadge
                                        label="Subtotal"
                                        value={`${formatWorkflowTotal(userGroup.totalDays)} day(s)`}
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
