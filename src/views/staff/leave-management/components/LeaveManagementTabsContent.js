import React from 'react'
import { CNav, CNavItem, CNavLink } from '@coreui/react'
import { assignmentSortOptions, holidaySortOptions, leaveSortOptions } from '../data'
import AssignmentsTab from './AssignmentsTab'
import HolidaysTab from './HolidaysTab'
import LeaveRecordsSection from './LeaveRecordsSection'
import LeaveApprovalRules from 'src/views/settings/components/LeaveApprovalRules'
import {
  formatDate as formatLeaveDate,
  getDisplayLeaveId,
  getEndDateTimeLabel,
  getStartDateTimeLabel,
} from '../leaveRecordUtils'

const LeaveManagementTabsContent = ({
  resolvedManagementTab,
  switchManagementTab,
  isLeaveRecordsLoading,
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
  typeOptions,
  statusOptions,
  filteredRecords,
  visibleRows,
  rowsToShow,
  setRowsToShow,
  adminLeaveRows,
  clearFilters,
  openRecord,
  approveLeave,
  rejectLeave,
  onBulkLeaveAction,
  isBulkLeaveSubmitting = false,
  bulkDeclarationLabel = '',
  getReviewActionConfig,
  isAssignmentsLoading,
  assignmentSearch,
  setAssignmentSearch,
  assignmentSort,
  setAssignmentSort,
  assignmentTypeFilter,
  setAssignmentTypeFilter,
  assignmentTeamFilter,
  setAssignmentTeamFilter,
  assignmentTypeOptions,
  assignmentTeamOptions,
  filteredAssignments,
  visibleAssignmentRows,
  assignmentRowsToShow,
  setAssignmentRowsToShow,
  assignmentRows,
  clearAssignmentFilters,
  staffOptions,
  staffDirectoryLoading,
  assignmentHistory,
  onCreateAssignment,
  holidaySearch,
  setHolidaySearch,
  holidaySort,
  setHolidaySort,
  holidayScopeFilter,
  setHolidayScopeFilter,
  holidayStateFilter,
  setHolidayStateFilter,
  holidayYearFilter,
  setHolidayYearFilter,
  holidayScopeOptions,
  holidayStateOptions,
  holidayYearOptions,
  holidayRows,
  existingNationalDefaultsForYear,
  filteredHolidays,
  visibleHolidayRows,
  holidayRowsToShow,
  setHolidayRowsToShow,
  clearHolidayFilters,
  onSaveHoliday,
  onDeleteHoliday,
  onWizardSavedSummary,
  isHolidaysLoading,
}) => (
  <>
    <CNav variant="underline" role="tablist" className="mb-3">
      <CNavItem role="presentation">
        <CNavLink
          active={resolvedManagementTab === 'records'}
          onClick={() => switchManagementTab('records')}
          style={{ cursor: 'pointer' }}
          className={resolvedManagementTab === 'records' ? 'text-primary' : ''}
        >
          All Leaves
        </CNavLink>
      </CNavItem>
      <CNavItem role="presentation">
        <CNavLink
          active={resolvedManagementTab === 'assignments'}
          onClick={() => switchManagementTab('assignments')}
          style={{ cursor: 'pointer' }}
          className={resolvedManagementTab === 'assignments' ? 'text-primary' : ''}
        >
          Set Leaves
        </CNavLink>
      </CNavItem>
      <CNavItem role="presentation">
        <CNavLink
          active={resolvedManagementTab === 'holidays'}
          onClick={() => switchManagementTab('holidays')}
          style={{ cursor: 'pointer' }}
          className={resolvedManagementTab === 'holidays' ? 'text-primary' : ''}
        >
          Set Holidays
        </CNavLink>
      </CNavItem>
      <CNavItem role="presentation">
        <CNavLink
          active={resolvedManagementTab === 'rules'}
          onClick={() => switchManagementTab('rules')}
          style={{ cursor: 'pointer' }}
          className={resolvedManagementTab === 'rules' ? 'text-primary' : ''}
        >
          Leave Workflow
        </CNavLink>
      </CNavItem>
    </CNav>

    {resolvedManagementTab === 'records' && (
      <LeaveRecordsSection
        isLoading={isLeaveRecordsLoading}
        title="All Leaves"
        showPrimaryAction={false}
        actionMode="review"
        unknownGroupLabel="Unknown period"
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
        leaveSortOptions={leaveSortOptions}
        searchPlaceholder="Search leave ID, leave type, status, employee, or team"
        filteredRecords={filteredRecords}
        visibleRows={visibleRows}
        rowsToShow={rowsToShow}
        setRowsToShow={setRowsToShow}
        leaveRecordsCount={adminLeaveRows.length}
        clearFilters={clearFilters}
        openRecord={openRecord}
        approveLeave={approveLeave}
        rejectLeave={rejectLeave}
        onBulkWorkflowAction={onBulkLeaveAction}
        isBulkSubmitting={isBulkLeaveSubmitting}
        bulkDeclarationLabel={bulkDeclarationLabel}
        getReviewActionConfig={getReviewActionConfig}
        getDisplayLeaveId={getDisplayLeaveId}
        getStartDateTimeLabel={getStartDateTimeLabel}
        getEndDateTimeLabel={getEndDateTimeLabel}
        formatDate={formatLeaveDate}
      />
    )}

    {resolvedManagementTab === 'assignments' && (
      <AssignmentsTab
        isLoading={isAssignmentsLoading}
        assignmentSearch={assignmentSearch}
        setAssignmentSearch={setAssignmentSearch}
        assignmentSort={assignmentSort}
        setAssignmentSort={setAssignmentSort}
        assignmentTypeFilter={assignmentTypeFilter}
        setAssignmentTypeFilter={setAssignmentTypeFilter}
        assignmentTeamFilter={assignmentTeamFilter}
        setAssignmentTeamFilter={setAssignmentTeamFilter}
        assignmentSortOptions={assignmentSortOptions}
        assignmentTypeOptions={assignmentTypeOptions}
        assignmentTeamOptions={assignmentTeamOptions}
        filteredAssignments={filteredAssignments}
        visibleAssignmentRows={visibleAssignmentRows}
        assignmentRowsToShow={assignmentRowsToShow}
        setAssignmentRowsToShow={setAssignmentRowsToShow}
        totalCount={assignmentRows.length}
        clearAssignmentFilters={clearAssignmentFilters}
        staffOptions={staffOptions}
        staffLoading={staffDirectoryLoading}
        existingAssignments={assignmentRows}
        assignmentHistory={assignmentHistory}
        onCreateAssignment={onCreateAssignment}
      />
    )}

    {resolvedManagementTab === 'holidays' && (
      <HolidaysTab
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
        holidaySortOptions={holidaySortOptions}
        holidayScopeOptions={holidayScopeOptions}
        holidayStateOptions={holidayStateOptions}
        holidayYearOptions={holidayYearOptions}
        allHolidayRows={holidayRows}
        existingNationalDefaultsForYear={existingNationalDefaultsForYear}
        filteredHolidays={filteredHolidays}
        visibleHolidayRows={visibleHolidayRows}
        holidayRowsToShow={holidayRowsToShow}
        setHolidayRowsToShow={setHolidayRowsToShow}
        totalCount={holidayRows.length}
        clearHolidayFilters={clearHolidayFilters}
        onSaveHoliday={onSaveHoliday}
        onDeleteHoliday={onDeleteHoliday}
        onWizardSavedSummary={onWizardSavedSummary}
        initialYear={
          holidayYearFilter && holidayYearFilter !== 'All'
            ? Number(holidayYearFilter)
            : new Date().getFullYear()
        }
        isLoading={isHolidaysLoading}
      />
    )}

    {resolvedManagementTab === 'rules' && <LeaveApprovalRules />}
  </>
)

export default LeaveManagementTabsContent
