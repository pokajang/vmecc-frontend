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
import DataTableFooter from 'src/components/DataTableFooter'
import GroupedTableHeaderRow, { UserGroupLabel } from 'src/components/GroupedTableHeader'
import TypeDurationSummaryChips from 'src/views/overtime/components/TypeDurationSummaryChips'
import RowActions from 'src/components/RowActions'
import TableFilters from 'src/components/TableFilters'
import TableLoader from 'src/components/TableLoader'
import BulkActionButton from 'src/views/staff/components/BulkActionButton'
import BulkWorkflowActionModal from './BulkWorkflowActionModal'
import useBulkWorkflowSelection from '../hooks/useBulkWorkflowSelection'
import {
  formatDuration,
  getOvertimeTypeLabel,
  normalizeOvertimeType,
  resolveOvertimeGates,
} from 'src/views/overtime/utils'

const normalizeTeamLabel = (value) => {
  const normalized = String(value || '').trim()
  if (!normalized || normalized.toLowerCase() === 'unassigned') return ''
  return normalized
}

const formatTeamSuffix = (value) => {
  const normalized = normalizeTeamLabel(value)
  return normalized ? `- ${normalized}` : ''
}

const buildMonthUserGroups = (rows = []) => {
  const groups = []
  const monthMap = new Map()
  const monthFormatter = new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' })

  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    const appliedDate = new Date(row?.appliedAt)
    const hasAppliedDate = !Number.isNaN(appliedDate.getTime())
    const monthValue = hasAppliedDate
      ? `${appliedDate.getFullYear()}-${String(appliedDate.getMonth() + 1).padStart(2, '0')}`
      : 'unknown'
    const monthLabel = hasAppliedDate ? monthFormatter.format(appliedDate) : 'Unknown period'
    const monthKey = `month:${monthValue}`

    if (!monthMap.has(monthKey)) {
      const nextMonth = {
        key: monthKey,
        label: monthLabel,
        rows: [],
        typeDurationMinutes: {},
        userGroups: [],
        userMap: new Map(),
      }
      monthMap.set(monthKey, nextMonth)
      groups.push(nextMonth)
    }

    const monthGroup = monthMap.get(monthKey)
    monthGroup.rows.push(row)
    const overtimeType = normalizeOvertimeType(row?.overtimeType)
    const durationMinutes = Number(row?.durationMinutes || 0)
    monthGroup.typeDurationMinutes[overtimeType] =
      Number(monthGroup.typeDurationMinutes[overtimeType] || 0) + durationMinutes

    const userKey = String(
      row?.ownerUserId || row?.employee || row?.recordKey || row?.id || 'unknown',
    )
    if (!monthGroup.userMap.has(userKey)) {
      const nextUser = {
        key: `${monthKey}:user:${userKey}`,
        ownerLabel: String(row?.employee || row?.submittedBy || '').trim() || 'Unknown',
        avatarUrl: String(row?.avatarUrl || '').trim(),
        teamLabel: normalizeTeamLabel(row?.team),
        rows: [],
        typeDurationMinutes: {},
      }
      monthGroup.userMap.set(userKey, nextUser)
      monthGroup.userGroups.push(nextUser)
    }

    const userGroup = monthGroup.userMap.get(userKey)
    userGroup.rows.push(row)
    userGroup.typeDurationMinutes[overtimeType] =
      Number(userGroup.typeDurationMinutes[overtimeType] || 0) + durationMinutes
    const rowTeam = normalizeTeamLabel(row?.team)
    if (rowTeam) {
      if (!userGroup.teamLabel) {
        userGroup.teamLabel = rowTeam
      } else if (userGroup.teamLabel !== rowTeam) {
        userGroup.teamLabel = 'Multiple teams'
      }
    }
  })

  return groups
}

const toTestIdToken = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'group'

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

  const groupedMonthRows = React.useMemo(() => buildMonthUserGroups(rows), [rows])
  const canGoPrev = Number(currentPage) > 1
  const canGoNext = Number(currentPage) < Number(lastPage)

  return (
    <CCard>
      <CCardHeader>Overtime Records</CCardHeader>
      <CCardBody>
        <TableFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search overtime ID, employee, status, team, type, or reason"
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
            {
              key: 'overtimeType',
              value: overtimeTypeFilter,
              onChange: setOvertimeTypeFilter,
              options: overtimeTypeOptions,
            },
            {
              key: 'team',
              value: teamFilter,
              onChange: setTeamFilter,
              options: teamOptions,
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
        ) : Number(filteredCount || 0) === 0 ? (
          <div className="text-body-secondary">No overtime records match the current filters.</div>
        ) : (
          <>
            {selectedVisibleCount > 0 ? (
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 border rounded-3 p-2 bg-light">
                <div className="fw-semibold">
                  {selectedVisibleCount} overtime record{selectedVisibleCount === 1 ? '' : 's'}{' '}
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
                          testId={`ot-month-group-${toTestIdToken(monthGroup.key)}`}
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
                                    id={`ot-group-select-${toTestIdToken(userGroup.key)}`}
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
                                    testId={`ot-user-group-${toTestIdToken(userGroup.key)}`}
                                  />
                                  {formatTeamSuffix(userGroup.teamLabel) ? (
                                    <span className="small text-body-secondary">
                                      {formatTeamSuffix(userGroup.teamLabel)}
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
                          const reviewActionConfig = getReviewActionConfig?.(row) || {
                            approveLabel: 'Approve',
                            approveDisabled: row.status !== 'Pending',
                            rejectDisabled: row.status !== 'Pending',
                          }
                          monthRows.push(
                            <CTableRow
                              key={row.recordKey || row.id}
                              className="cursor-pointer"
                              style={{ cursor: 'pointer' }}
                              onClick={() => openOvertimeDetail?.(row)}
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
                              <CTableDataCell
                                className="text-center"
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                              >
                                <RowActions
                                  items={[
                                    {
                                      key: 'approve-overtime',
                                      label: reviewActionConfig?.approveLabel || 'Approve',
                                      onClick: () => approveOvertime?.(row),
                                      disabled:
                                        reviewActionConfig?.approveDisabled ||
                                        typeof approveOvertime !== 'function',
                                      disabledReason: reviewActionConfig?.requiredRole
                                        ? `This stage requires ${reviewActionConfig.requiredRole} role.`
                                        : 'This record is not eligible for this workflow action.',
                                    },
                                    {
                                      key: 'reject-overtime',
                                      label: 'Reject',
                                      className: 'text-danger',
                                      onClick: () => rejectOvertime?.(row),
                                      disabled:
                                        reviewActionConfig?.rejectDisabled ||
                                        typeof rejectOvertime !== 'function',
                                      disabledReason: reviewActionConfig?.requiredRole
                                        ? `This stage requires ${reviewActionConfig.requiredRole} role.`
                                        : 'This record is not eligible for this workflow action.',
                                    },
                                  ]}
                                />
                              </CTableDataCell>
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
