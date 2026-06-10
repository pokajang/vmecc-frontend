import React, { useCallback, useMemo, useRef, useState } from 'react'
import { CBadge, CContainer, CToaster } from '@coreui/react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import useTableRows from 'src/hooks/useTableRows'
import useStaffDirectory from 'src/hooks/useStaffDirectory'
import {
  LEAVE_MANAGEMENT_ALLOWED_PERMISSIONS,
  assignmentSortOptions,
  holidaySortOptions,
  leaveSortOptions,
  leaveTypeCatalog,
  statusColorMap,
} from './leave-management/data'
import { hasAnyPermission } from 'src/utils/authz'
import LeaveDetailSection from './leave-management/components/LeaveDetailSection'
import LeaveRecordsSection from './leave-management/components/LeaveRecordsSection'
import {
  formatDate as formatLeaveDate,
  formatDateTime as formatLeaveDateTime,
  getDisplayLeaveId,
  getEndDateTimeLabel,
  getScheduleLabel,
  getStartDateTimeLabel,
} from './leave-management/leaveRecordUtils'
import LeaveManagementTabsContent from './leave-management/components/LeaveManagementTabsContent'
import useLeaveAdminData from './leave-management/hooks/useLeaveAdminData'
import LeaveWorkflowActionModal from './leave-management/components/LeaveWorkflowActionModal'
import useLeaveAssignmentState from './leave-management/hooks/useLeaveAssignmentState'
import useLeaveAdminWorkflow from './leave-management/hooks/useLeaveAdminWorkflow'
import useLeaveManagementDataActions from './leave-management/hooks/useLeaveManagementDataActions'
import useLeaveManagementDerivedState from './leave-management/hooks/useLeaveManagementDerivedState'
import useLeaveManagementRouting from './leave-management/hooks/useLeaveManagementRouting'
import { LEAVE_WORKFLOW_DECLARATION_LABEL } from './shared/workflowDeclarations'

const getStatusBadge = (status, label = status) => (
  <CBadge color={statusColorMap[status] || 'secondary'}>{label || '-'}</CBadge>
)

const LeaveManagement = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { leaveId } = useParams()
  const user = useSelector((state) => state.authUser)
  const isHrUser = useMemo(
    () => hasAnyPermission(user, LEAVE_MANAGEMENT_ALLOWED_PERMISSIONS),
    [user],
  )
  const actorName = user?.name || user?.full_name || user?.email || 'System user'

  const toaster = useRef()
  const [isBulkLeaveSubmitting, setIsBulkLeaveSubmitting] = useState(false)
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    period,
    setPeriod,
    sort,
    setSort,
    assignmentSearch,
    setAssignmentSearch,
    assignmentTypeFilter,
    setAssignmentTypeFilter,
    assignmentTeamFilter,
    setAssignmentTeamFilter,
    assignmentSort,
    setAssignmentSort,
    holidaySearch,
    setHolidaySearch,
    holidayScopeFilter,
    setHolidayScopeFilter,
    holidayStateFilter,
    setHolidayStateFilter,
    holidayYearFilter,
    setHolidayYearFilter,
    holidaySort,
    setHolidaySort,
    clearFilters,
    clearAssignmentFilters,
    clearHolidayFilters,
  } = useLeaveAdminData()

  const {
    assignmentRows,
    allLeaveRecords,
    holidayRows,
    isLeaveRecordsLoading,
    isAssignmentsLoading,
    isHolidaysLoading,
    toast,
    pushToast,
    hydrateAssignmentsFromStorage,
    refreshAllLeaveRecords,
    onSaveHoliday,
    onWizardSavedSummary,
    onDeleteHoliday,
    existingNationalDefaultsForYear,
  } = useLeaveManagementDataActions({
    userId: user?.id,
    isHrUser,
    holidayYearFilter,
  })

  const { loading: staffDirectoryLoading, optionsAll: staffDirectory } = useStaffDirectory({
    enabled: Boolean(user?.id && isHrUser),
  })
  const { assignmentHistory, onCreateAssignment } = useLeaveAssignmentState({
    userId: user?.id,
    hydrateAssignmentsFromStorage,
    pushToast,
    leaveTypeCount: leaveTypeCatalog.length,
  })

  const {
    isDetailSection,
    resolvedManagementTab,
    resolvedManagementPath,
    switchManagementTab,
    leaveRouteValue,
    parsedRouteRecordKey,
    openRecord,
  } = useLeaveManagementRouting({
    location,
    navigate,
    leaveId,
    hydrateAssignmentsFromStorage,
  })

  const {
    actorRoles,
    isSystemAdministrator,
    adminLeaveRows,
    filteredRecords,
    filteredAssignments,
    filteredHolidays,
    selectedRecord,
    selectedRecordPendingActionHint,
    selectedRecordHistoryEntries,
    typeOptions,
    statusOptions,
    assignmentTypeOptions,
    assignmentTeamOptions,
    holidayScopeOptions,
    holidayStateOptions,
    holidayYearOptions,
    staffOptions,
    getApplicantRolesForRecord,
  } = useLeaveManagementDerivedState({
    leaveId,
    leaveRouteValue,
    parsedRouteRecordKey,
    actorName,
    user,
    allLeaveRecords,
    assignmentRows,
    holidayRows,
    staffDirectory,
    search,
    statusFilter,
    typeFilter,
    period,
    sort,
    assignmentSearch,
    assignmentTypeFilter,
    assignmentTeamFilter,
    assignmentSort,
    holidaySearch,
    holidayScopeFilter,
    holidayStateFilter,
    holidayYearFilter,
    holidaySort,
  })

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filteredRecords)
  const {
    rowsToShow: assignmentRowsToShow,
    setRowsToShow: setAssignmentRowsToShow,
    visibleRows: visibleAssignmentRows,
  } = useTableRows(filteredAssignments)
  const {
    rowsToShow: holidayRowsToShow,
    setRowsToShow: setHolidayRowsToShow,
    visibleRows: visibleHolidayRows,
  } = useTableRows(filteredHolidays)
  const {
    getReviewActionConfig,
    approveLeave,
    rejectLeave,
    runLeaveWorkflowAction,
    workflowModalState,
    workflowModalActionLabel,
    isRejectWorkflowModal,
    workflowModalActionDisabled,
    workflowRemarks,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    handleWorkflowRemarksChange,
    handleWorkflowDeclarationChange,
    closeWorkflowModal,
    submitWorkflowApprove,
    submitWorkflowReject,
  } = useLeaveAdminWorkflow({
    actorRoles,
    isSystemAdministrator,
    pushToast,
    refreshAllLeaveRecords,
    getApplicantRolesForRecord,
  })

  const runBulkLeaveWorkflowAction = useCallback(
    async ({ action, rows, remarks = '', declarationChecked = false } = {}) => {
      if (isBulkLeaveSubmitting) return { processed: 0, succeeded: 0, failed: 0 }
      const selectedRows = Array.isArray(rows) ? rows.filter((row) => row?.id) : []
      if (selectedRows.length === 0) return { processed: 0, succeeded: 0, failed: 0 }

      setIsBulkLeaveSubmitting(true)
      try {
        let succeeded = 0
        let failed = 0
        for (const row of selectedRows) {
          const ok = await runLeaveWorkflowAction(
            row,
            {
              decision: action === 'reject' ? 'reject' : 'approve',
              remarks,
              declarationChecked,
            },
            {
              refreshAfter: false,
              showSuccessToast: false,
              showFailureToast: false,
            },
          )
          if (ok) {
            succeeded += 1
          } else {
            failed += 1
          }
        }

        if (succeeded > 0) {
          await refreshAllLeaveRecords({ showWarningToast: false })
        }

        const actionLabel = action === 'reject' ? 'Rejected' : 'Processed'
        const summaryMessage =
          failed > 0
            ? `${actionLabel} ${succeeded} leave record${succeeded === 1 ? '' : 's'} (${failed} failed).`
            : `${actionLabel} ${succeeded} leave record${succeeded === 1 ? '' : 's'}.`

        pushToast(summaryMessage, {
          title: failed > 0 ? 'Bulk action completed with issues' : 'Bulk action completed',
          color: failed > 0 ? (succeeded > 0 ? 'warning' : 'danger') : 'success',
        })

        return { processed: selectedRows.length, succeeded, failed }
      } finally {
        setIsBulkLeaveSubmitting(false)
      }
    },
    [isBulkLeaveSubmitting, pushToast, refreshAllLeaveRecords, runLeaveWorkflowAction],
  )

  if (!user) {
    return (
      <div className="my-4 text-danger">Unable to load leave management. Please sign in again.</div>
    )
  }

  if (!isHrUser) {
    return (
      <div className="my-4 text-danger">You do not have permission to view leave management.</div>
    )
  }

  return (
    <CContainer fluid>
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />
      <LeaveWorkflowActionModal
        visible={workflowModalState.visible}
        record={workflowModalState.record}
        actionLabel={workflowModalActionLabel}
        actionType={isRejectWorkflowModal ? 'reject' : 'approve'}
        actionDisabled={workflowModalActionDisabled}
        remarks={workflowRemarks}
        onRemarksChange={handleWorkflowRemarksChange}
        showDeclaration={!isRejectWorkflowModal}
        declarationRequired={!isRejectWorkflowModal}
        declarationChecked={workflowDeclarationChecked}
        onDeclarationChange={handleWorkflowDeclarationChange}
        declarationLabel={LEAVE_WORKFLOW_DECLARATION_LABEL}
        declarationError={workflowDeclarationError}
        rejectError={workflowRejectError}
        statusColorMap={statusColorMap}
        formatDate={formatLeaveDate}
        getDisplayLeaveId={getDisplayLeaveId}
        getStartDateTimeLabel={getStartDateTimeLabel}
        getEndDateTimeLabel={getEndDateTimeLabel}
        onClose={closeWorkflowModal}
        onSubmit={isRejectWorkflowModal ? submitWorkflowReject : submitWorkflowApprove}
      />

      {!isDetailSection && (
        <LeaveManagementTabsContent
          resolvedManagementTab={resolvedManagementTab}
          switchManagementTab={switchManagementTab}
          isLeaveRecordsLoading={isLeaveRecordsLoading}
          search={search}
          setSearch={setSearch}
          period={period}
          setPeriod={setPeriod}
          sort={sort}
          setSort={setSort}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeOptions={typeOptions}
          statusOptions={statusOptions}
          filteredRecords={filteredRecords}
          visibleRows={visibleRows}
          rowsToShow={rowsToShow}
          setRowsToShow={setRowsToShow}
          adminLeaveRows={adminLeaveRows}
          clearFilters={clearFilters}
          openRecord={openRecord}
          approveLeave={approveLeave}
          rejectLeave={rejectLeave}
          onBulkLeaveAction={runBulkLeaveWorkflowAction}
          isBulkLeaveSubmitting={isBulkLeaveSubmitting}
          bulkDeclarationLabel={LEAVE_WORKFLOW_DECLARATION_LABEL}
          getReviewActionConfig={getReviewActionConfig}
          isAssignmentsLoading={isAssignmentsLoading}
          assignmentSearch={assignmentSearch}
          setAssignmentSearch={setAssignmentSearch}
          assignmentSort={assignmentSort}
          setAssignmentSort={setAssignmentSort}
          assignmentTypeFilter={assignmentTypeFilter}
          setAssignmentTypeFilter={setAssignmentTypeFilter}
          assignmentTeamFilter={assignmentTeamFilter}
          setAssignmentTeamFilter={setAssignmentTeamFilter}
          assignmentTypeOptions={assignmentTypeOptions}
          assignmentTeamOptions={assignmentTeamOptions}
          filteredAssignments={filteredAssignments}
          visibleAssignmentRows={visibleAssignmentRows}
          assignmentRowsToShow={assignmentRowsToShow}
          setAssignmentRowsToShow={setAssignmentRowsToShow}
          assignmentRows={assignmentRows}
          clearAssignmentFilters={clearAssignmentFilters}
          staffOptions={staffOptions}
          staffDirectoryLoading={staffDirectoryLoading}
          assignmentHistory={assignmentHistory}
          onCreateAssignment={onCreateAssignment}
          holidaySearch={holidaySearch}
          setHolidaySearch={setHolidaySearch}
          holidaySort={holidaySort}
          setHolidaySort={setHolidaySort}
          holidayScopeFilter={holidayScopeFilter}
          setHolidayScopeFilter={setHolidayScopeFilter}
          holidayStateFilter={holidayStateFilter}
          setHolidayStateFilter={setHolidayStateFilter}
          holidayYearFilter={holidayYearFilter}
          setHolidayYearFilter={setHolidayYearFilter}
          holidayScopeOptions={holidayScopeOptions}
          holidayStateOptions={holidayStateOptions}
          holidayYearOptions={holidayYearOptions}
          holidayRows={holidayRows}
          existingNationalDefaultsForYear={existingNationalDefaultsForYear}
          filteredHolidays={filteredHolidays}
          visibleHolidayRows={visibleHolidayRows}
          holidayRowsToShow={holidayRowsToShow}
          setHolidayRowsToShow={setHolidayRowsToShow}
          clearHolidayFilters={clearHolidayFilters}
          onSaveHoliday={onSaveHoliday}
          onDeleteHoliday={onDeleteHoliday}
          onWizardSavedSummary={onWizardSavedSummary}
          isHolidaysLoading={isHolidaysLoading}
        />
      )}

      {isDetailSection && (
        <LeaveDetailSection
          selectedRecord={selectedRecord}
          selectedRecordPendingActionHint={selectedRecordPendingActionHint}
          selectedRecordHistoryEntries={selectedRecordHistoryEntries}
          onBack={() => navigate(`/staff/leave-management/${resolvedManagementPath}`)}
          getDisplayLeaveId={getDisplayLeaveId}
          getScheduleLabel={getScheduleLabel}
          getStatusBadge={getStatusBadge}
          formatDate={formatLeaveDate}
          formatDateTime={formatLeaveDateTime}
        />
      )}
    </CContainer>
  )
}

export default LeaveManagement
