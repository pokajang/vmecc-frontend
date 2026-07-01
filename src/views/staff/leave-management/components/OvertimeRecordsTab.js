import React from 'react'
import {
  CButton,
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
import ApprovalGates from 'src/components/ApprovalGates'
import BulkSelectionActionBar from 'src/components/BulkSelectionActionBar'
import DataTableFooter from 'src/components/DataTableFooter'
import GroupedTableHeaderRow, { UserGroupLabel } from 'src/components/GroupedTableHeader'
import MobileRecordList from 'src/components/MobileRecordList'
import TypeDurationSummaryChips from 'src/views/overtime/components/TypeDurationSummaryChips'
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
  getWorkflowGroupSelectionState,
  normalizeWorkflowTeamLabel,
  toWorkflowTestIdToken,
} from '../workflowRecordHelpers'
import {
  formatDuration,
  getOvertimeTypeLabel,
  normalizeOvertimeType,
  resolveOvertimeGates,
} from 'src/views/overtime/utils'

const buildOvertimeMonthUserGroups = (rows = []) => {
  return buildWorkflowMonthUserGroups({
    entries: rows,
    unknownGroupLabel: 'Unknown period',
    includeUserGroups: true,
    createMonthExtras: () => ({ typeDurationMinutes: {} }),
    createUserExtras: () => ({ typeDurationMinutes: {} }),
    onAddToMonth: (monthGroup, row) => {
      const overtimeType = normalizeOvertimeType(row?.overtimeType)
      const durationMinutes = Number(row?.durationMinutes || 0)
      monthGroup.typeDurationMinutes[overtimeType] =
        Number(monthGroup.typeDurationMinutes[overtimeType] || 0) + durationMinutes
    },
    onAddToUser: (userGroup, row) => {
      const overtimeType = normalizeOvertimeType(row?.overtimeType)
      const durationMinutes = Number(row?.durationMinutes || 0)
      userGroup.typeDurationMinutes[overtimeType] =
        Number(userGroup.typeDurationMinutes[overtimeType] || 0) + durationMinutes
    },
    getTeam: (row) => normalizeWorkflowTeamLabel(row?.team),
  })
}

const OvertimeRecordsTab = (props) => {
  const usingVmContract = Boolean(props?.vm && props?.handlers)

  const vm = usingVmContract
    ? props.vm
    : {
        search: props.search,
        period: props.period,
        sort: props.sort,
        statusFilter: props.statusFilter,
        overtimeTypeFilter: props.overtimeTypeFilter || 'All',
        teamFilter: props.teamFilter || 'All',
        statusOptions: props.statusOptions,
        overtimeTypeOptions: props.overtimeTypeOptions || [],
        teamOptions: props.teamOptions || [],
        overtimeSortOptions: props.overtimeSortOptions,
        rows: props.rows || props.visibleRows || [],
        rowsToShow: props.rowsToShow,
        currentPage: props.currentPage || 1,
        lastPage: props.lastPage || 1,
        filteredCount: props.filteredCount ?? props.filteredRecords?.length ?? 0,
        totalCount: props.totalCount ?? 0,
        getDisplayOvertimeId: props.getDisplayOvertimeId,
        getStartDateTimeLabel: props.getStartDateTimeLabel,
        getEndDateTimeLabel: props.getEndDateTimeLabel,
        formatDate: props.formatDate,
        getStatusLabel: props.getStatusLabel,
        getPendingActionHint: props.getPendingActionHint,
        getReviewActionConfig: props.getReviewActionConfig,
        isLoading: props.isLoading || false,
      }

  const handlers = usingVmContract
    ? props.handlers
    : {
        setSearch: props.setSearch,
        setPeriod: props.setPeriod,
        setSort: props.setSort,
        setStatusFilter: props.setStatusFilter,
        setOvertimeTypeFilter: props.setOvertimeTypeFilter,
        setTeamFilter: props.setTeamFilter,
        clearFilters: props.clearFilters,
        setRowsToShow: props.setRowsToShow,
        setPage: props.setPage,
        approveOvertime: props.approveOvertime,
        rejectOvertime: props.rejectOvertime,
        openOvertimeDetail: props.openOvertimeDetail,
        onBulkWorkflowAction: props.onBulkWorkflowAction,
        isBulkSubmitting: props.isBulkSubmitting || false,
      }

  const {
    search,
    period,
    sort,
    statusFilter,
    overtimeTypeFilter,
    teamFilter,
    statusOptions,
    overtimeTypeOptions,
    teamOptions,
    overtimeSortOptions,
    rows = [],
    rowsToShow = 5,
    currentPage = 1,
    lastPage = 1,
    filteredCount = 0,
    totalCount = 0,
    getDisplayOvertimeId,
    getStartDateTimeLabel,
    getEndDateTimeLabel,
    formatDate,
    getStatusLabel,
    getPendingActionHint,
    getReviewActionConfig,
    isLoading = false,
  } = vm

  const {
    setSearch,
    setPeriod,
    setSort,
    setStatusFilter,
    setOvertimeTypeFilter,
    setTeamFilter,
    clearFilters,
    setRowsToShow,
    setPage,
    approveOvertime,
    rejectOvertime,
    openOvertimeDetail,
    onBulkWorkflowAction,
    isBulkSubmitting = false,
  } = handlers

  const getRowSelectionKey = React.useCallback(
    (row) => String(row?.recordKey || row?.id || '').trim(),
    [],
  )
  const canBulkActOnRow = React.useCallback(
    (row) => {
      const actionConfig = getReviewActionConfig?.(row) || {
        approveDisabled: row?.status !== 'Pending',
        rejectDisabled: row?.status !== 'Pending',
      }
      return !(actionConfig?.approveDisabled && actionConfig?.rejectDisabled)
    },
    [getReviewActionConfig],
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
    rows,
    getRowKey: getRowSelectionKey,
    canBulkActOnRow,
    getApproveActionLabel: (row) => getReviewActionConfig?.(row)?.approveLabel || 'Approve',
    onBulkWorkflowAction,
  })

  const groupedMonthRows = React.useMemo(() => buildOvertimeMonthUserGroups(rows), [rows])
  const canGoPrev = Number(currentPage) > 1
  const canGoNext = Number(currentPage) < Number(lastPage)

  const buildRowActionItems = React.useCallback(
    (row) => {
      const reviewActionConfig = getReviewActionConfig?.(row) || {
        approveLabel: 'Approve',
        approveDisabled: row.status !== 'Pending',
        rejectDisabled: row.status !== 'Pending',
      }
      return buildReviewWorkflowActionItems({
        row,
        actionKeyPrefix: 'overtime',
        actionConfig: reviewActionConfig,
        onApprove: approveOvertime,
        onReject: rejectOvertime,
        disableWhenHandlerMissing: true,
      })
    },
    [approveOvertime, getReviewActionConfig, rejectOvertime],
  )

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

  const buildMobileRecordItem = (row) => {
    const reviewActionConfig = getReviewActionConfig?.(row) || {}
    const statusLabel =
      typeof getStatusLabel === 'function'
        ? getStatusLabel(row)
        : String(row?.status || '').trim() || '-'
    const nextActionLabel =
      typeof getPendingActionHint === 'function'
        ? getPendingActionHint(row)
        : reviewActionConfig?.requiredRole
          ? `Requires ${reviewActionConfig.requiredRole}`
          : reviewActionConfig?.approveLabel || ''

    return {
      key: row.recordKey || row.id,
      title: getDisplayOvertimeId(row),
      subtitle: row.employee || row.submittedBy || '-',
      eyebrow: getOvertimeTypeLabel(row?.overtimeType, { short: true }),
      status: (
        <WorkflowStatusSummary
          statusLabel={statusLabel}
          nextActionLabel={nextActionLabel}
          gates={resolveOvertimeGates(row)}
          approvalHistory={row.approvalHistory}
          isCancelled={row.status === 'Cancelled'}
        />
      ),
      fields: [
        { key: 'start', label: 'Start', value: getStartDateTimeLabel(row) },
        { key: 'end', label: 'End', value: getEndDateTimeLabel(row) },
        { key: 'duration', label: 'Duration', value: formatDuration(row.durationMinutes) },
        { key: 'submitted', label: 'Submitted', value: formatDate(row.appliedAt) },
      ],
      detail: formatWorkflowTeamSuffix(row.team).replace(/^- /, '') || row.reason || '',
      ariaLabel: `Open overtime record ${getDisplayOvertimeId(row)}`,
      onOpen: () => openOvertimeDetail?.(row),
      actions: <RowActions items={buildRowActionItems(row)} />,
    }
  }

  const mobileRecordSections = buildWorkflowMobileSections({
    groups: groupedMonthRows,
    useUserGroups: true,
    buildGroupLabel: ({ group, userGroup }) => {
      const { eligibleKeys, allSelected } = getWorkflowGroupSelectionState({
        rows: userGroup.rows,
        canActOnRow: canBulkActOnRow,
        getRowKey: getRowSelectionKey,
        isSelectedKey,
      })

      return (
        <span className="d-inline-flex align-items-center gap-2">
          {renderMobileGroupSelect({
            id: `ot-mobile-group-select-${toWorkflowTestIdToken(userGroup.key)}`,
            ariaLabel: `Select actionable overtime records for ${group.label || 'Unknown period'} | ${userGroup.ownerLabel || 'Unknown'}`,
            eligibleKeys,
            allSelected,
          })}
          <span>
            {group.label ? `${group.label} | ` : ''}
            {userGroup.ownerLabel || 'Unknown'}
            {formatWorkflowTeamSuffix(userGroup.teamLabel)
              ? ` ${formatWorkflowTeamSuffix(userGroup.teamLabel)}`
              : ''}
          </span>
        </span>
      )
    },
    buildGroupSummary: ({ userGroup }) => (
      <TypeDurationSummaryChips typeDurationMinutes={userGroup.typeDurationMinutes} />
    ),
    buildItem: buildMobileRecordItem,
  })

  return (
    <CCard data-tour-id="overtime-management-records">
      <CCardHeader>Overtime Records</CCardHeader>
      <CCardBody>
        <div data-tour-id="overtime-management-filters">
          <TableFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search overtime ID, employee, status, team, type, or reason"
            periodValue={period}
            onPeriodChange={setPeriod}
            filters={[
              {
                key: 'sort',
                label: 'Sort',
                value: sort,
                onChange: setSort,
                options: overtimeSortOptions,
              },
              {
                key: 'status',
                label: 'Status',
                value: statusFilter,
                onChange: setStatusFilter,
                options: statusOptions,
              },
              {
                key: 'overtimeType',
                label: 'Type',
                value: overtimeTypeFilter,
                onChange: setOvertimeTypeFilter,
                options: overtimeTypeOptions,
              },
              {
                key: 'team',
                label: 'Team',
                value: teamFilter,
                onChange: setTeamFilter,
                options: teamOptions,
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
        ) : Number(filteredCount || 0) === 0 ? (
          <div className="text-body-secondary">No overtime records match the current filters.</div>
        ) : (
          <>
            {selectedVisibleCount > 0 ? (
              <BulkSelectionActionBar
                label={`${selectedVisibleCount} overtime record${selectedVisibleCount === 1 ? '' : 's'} selected`}
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
            <div className="d-none d-md-block rounded-3 shadow-sm overflow-hidden bg-white">
              <CTable align="middle" className="mb-0" hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell className="text-center" style={{ width: '56px' }}>
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell>Overtime ID</CTableHeaderCell>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Start</CTableHeaderCell>
                    <CTableHeaderCell>End</CTableHeaderCell>
                    <CTableHeaderCell>Duration</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Submitted On</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {(() => {
                    let rowIndex =
                      (Math.max(1, Number(currentPage) || 1) - 1) * (Number(rowsToShow) || 0)
                    return groupedMonthRows.flatMap((monthGroup) => {
                      const monthRows = []
                      monthRows.push(
                        <GroupedTableHeaderRow
                          key={monthGroup.key}
                          colSpan={9}
                          label={monthGroup.label}
                          count={monthGroup.rows.length}
                          countNoun={monthGroup.rows.length === 1 ? 'record' : 'records'}
                          className="table-secondary"
                          cellClassName="fw-semibold text-body"
                          testId={`ot-month-group-${toWorkflowTestIdToken(monthGroup.key)}`}
                        >
                          <TypeDurationSummaryChips
                            typeDurationMinutes={monthGroup.typeDurationMinutes}
                            align="end"
                            size="sm"
                            variant="subtle"
                          />
                        </GroupedTableHeaderRow>,
                      )

                      monthGroup.userGroups.forEach((userGroup) => {
                        const eligibleGroupKeys = userGroup.rows
                          .filter((row) => canBulkActOnRow(row))
                          .map((row) => getRowSelectionKey(row))
                          .filter(Boolean)
                        const selectedGroupCount = eligibleGroupKeys.filter((key) =>
                          isSelectedKey(key),
                        ).length
                        const allSelected =
                          eligibleGroupKeys.length > 0 &&
                          selectedGroupCount === eligibleGroupKeys.length

                        monthRows.push(
                          <CTableRow key={userGroup.key} className="table-light">
                            <CTableDataCell colSpan={9} className="fw-semibold text-body-secondary">
                              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                                <div className="d-flex flex-wrap align-items-center gap-2">
                                  <CFormCheck
                                    id={`ot-group-select-${toWorkflowTestIdToken(userGroup.key)}`}
                                    aria-label={`Select actionable overtime records for ${monthGroup.label || 'Unknown period'} | ${userGroup.ownerLabel || 'Unknown'}`}
                                    disabled={eligibleGroupKeys.length === 0}
                                    checked={allSelected}
                                    onChange={() => {
                                      toggleGroupSelection(eligibleGroupKeys, allSelected)
                                    }}
                                    onClick={(event) => event.stopPropagation()}
                                    onMouseDown={(event) => event.stopPropagation()}
                                  />
                                  <UserGroupLabel
                                    name={userGroup.ownerLabel}
                                    count={userGroup.rows.length}
                                    countNoun={userGroup.rows.length === 1 ? 'record' : 'records'}
                                    avatarUrl={userGroup.avatarUrl}
                                    testId={`ot-user-group-${toWorkflowTestIdToken(userGroup.key)}`}
                                  />
                                  {formatWorkflowTeamSuffix(userGroup.teamLabel) ? (
                                    <span className="small text-body-secondary">
                                      {formatWorkflowTeamSuffix(userGroup.teamLabel)}
                                    </span>
                                  ) : null}
                                </div>
                                <TypeDurationSummaryChips
                                  typeDurationMinutes={userGroup.typeDurationMinutes}
                                  align="end"
                                  size="sm"
                                  variant="subtle"
                                />
                              </div>
                            </CTableDataCell>
                          </CTableRow>,
                        )

                        userGroup.rows.forEach((row) => {
                          rowIndex += 1
                          monthRows.push(
                            <CTableRow
                              key={row.recordKey || row.id}
                              role="button"
                              className="cursor-pointer"
                              style={{ cursor: 'pointer' }}
                              tabIndex={0}
                              aria-label={`Open overtime record ${getDisplayOvertimeId(row)}`}
                              onClick={() => openOvertimeDetail?.(row)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  openOvertimeDetail?.(row)
                                }
                              }}
                            >
                              <CTableDataCell className="text-center text-body-secondary">
                                {rowIndex}
                              </CTableDataCell>
                              <CTableDataCell className="fw-semibold">
                                {getDisplayOvertimeId(row)}
                              </CTableDataCell>
                              <CTableDataCell>
                                {getOvertimeTypeLabel(row?.overtimeType, { short: true })}
                              </CTableDataCell>
                              <CTableDataCell>{getStartDateTimeLabel(row)}</CTableDataCell>
                              <CTableDataCell>{getEndDateTimeLabel(row)}</CTableDataCell>
                              <CTableDataCell>{formatDuration(row.durationMinutes)}</CTableDataCell>
                              <CTableDataCell>
                                <ApprovalGates
                                  gates={resolveOvertimeGates(row)}
                                  approvalHistory={row.approvalHistory}
                                  isCancelled={row.status === 'Cancelled'}
                                />
                              </CTableDataCell>
                              <CTableDataCell>{formatDate(row.appliedAt)}</CTableDataCell>
                              <RowActionCell>
                                <RowActions items={buildRowActionItems(row)} />
                              </RowActionCell>
                            </CTableRow>,
                          )
                        })
                      })

                      return monthRows
                    })
                  })()}
                </CTableBody>
              </CTable>
            </div>
            <DataTableFooter
              rowsToShow={rowsToShow}
              onRowsToShowChange={setRowsToShow}
              filteredCount={Number(filteredCount || 0)}
              totalCount={Number(totalCount || 0)}
            />
            <BulkWorkflowActionModal
              visible={bulkActionState.visible}
              action={bulkActionState.action}
              actionLabel={selectedApproveActionLabel}
              entityLabel="overtime record"
              selectedCount={selectedVisibleCount}
              remarks={bulkRemarks}
              declarationChecked={bulkDeclarationChecked}
              declarationLabel="I confirm these selected overtime workflow actions are accurate and authorized."
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
            <div className="d-flex justify-content-end align-items-center gap-2 text-muted small mt-2">
              <span>
                Page {currentPage} of {lastPage}
              </span>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                disabled={!canGoPrev}
                onClick={() => setPage?.(Math.max(1, Number(currentPage || 1) - 1))}
              >
                Previous
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                disabled={!canGoNext}
                onClick={() => setPage?.(Number(currentPage || 1) + 1)}
              >
                Next
              </CButton>
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default OvertimeRecordsTab
