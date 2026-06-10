import React, { useCallback, useRef, useState } from 'react'
import {
  CAlert,
  CContainer,
  CNav,
  CNavItem,
  CNavLink,
  CToast,
  CToastBody,
  CToastHeader,
  CToaster,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { isHolidayGuidanceLeaveEnabledForUser } from 'src/config/featureFlags'
import { hasPermission } from 'src/utils/authz'
import useTableRows from 'src/hooks/useTableRows'
import { leaveSortOptions, shiftOptions } from './constants'
import {
  calculateDays,
  formatDate,
  formatDateTime,
  formatDayCount,
  getDisplayLeaveId,
  getEndDateTimeLabel,
  getScheduleLabel,
  getStartDateTimeLabel,
  getWorkflowPendingActionHint,
  getWorkflowStatusLabel,
} from './utils'
import LeaveApplySection from './components/LeaveApplySection'
import LeaveCancelConfirmModal from './components/LeaveCancelConfirmModal'
import LeaveDetailSection from './components/LeaveDetailSection'
import LeaveDiscardConfirmModal from './components/LeaveDiscardConfirmModal'
import LeaveRecordsSection from './components/LeaveRecordsSection'
import LeaveSubmitConfirmModal from './components/LeaveSubmitConfirmModal'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import useLeaveDerivedState from './hooks/useLeaveDerivedState'
import useLeaveBootEffects from './hooks/useLeaveBootEffects'
import useLeaveFormUiEffects from './hooks/useLeaveFormUiEffects'
import useLeaveGuidanceMessage from './hooks/useLeaveGuidanceMessage'
import useLeaveRecords from './hooks/useLeaveRecords'
import useLeaveActions from './hooks/useLeaveActions'
import useLeaveFilters from './hooks/useLeaveFilters'
import useLeaveForm from './hooks/useLeaveForm'
import useLeaveViewControls from './hooks/useLeaveViewControls'
import useAttachment from './hooks/useAttachment'
import StatusBadge from './components/StatusBadge'

const LEAVE_MODULE_LOADED_AT_MS = Date.now()

const getStatusBadge = (status, label = status) => <StatusBadge status={status} label={label} />

const Leave = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { leaveId } = useParams()
  const user = useSelector((state) => state.authUser)
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
    activeSection,
    clearFilters,
    openRecord,
  } = useLeaveViewControls({ pathname: location.pathname, navigate })
  const {
    leaveType,
    setLeaveType,
    leaveTypeConfirmed,
    setLeaveTypeConfirmed,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    workShift,
    setWorkShift,
    startTimeSlot,
    setStartTimeSlot,
    endTimeSlot,
    setEndTimeSlot,
    reason,
    setReason,
    coverBy,
    setCoverBy,
    fieldErrors,
    setFieldErrors,
    clearInlineErrors,
    resetForm,
    handleShiftChange,
    handleStartDateChange,
    handleEndDateChange,
    handleStartTimeChange,
    handleEndTimeChange,
    handleCoverByChange,
    handleReasonChange,
    handleLeaveTypeContinue,
  } = useLeaveForm()

  const {
    leaveRecords,
    setLeaveRecords,
    assignmentRows,
    setAssignmentRows,
    loadMeta,
    isLoading: isLeaveLoading,
  } = useLeaveRecords(user?.id)
  const [editingRecordId, setEditingRecordId] = useState(null)
  const [originalAttachmentId, setOriginalAttachmentId] = useState(null)
  const toaster = useRef()
  const cameraInputRef = useRef(null)
  const draftHydratedRef = useRef(false)
  const [toast, addToast] = useState(null)
  const actorName = user?.name || user?.full_name || user?.email || 'System user'
  const isLeaveGuidanceEnabled = isHolidayGuidanceLeaveEnabledForUser(user)

  const pushToast = useCallback((message, { title, color = 'light', delay = 6000 } = {}) => {
    addToast(
      <CToast autohide delay={delay} color={color}>
        {title && (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        )}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  const {
    attachmentName,
    setAttachmentName,
    attachmentId,
    setAttachmentId,
    attachmentMeta,
    setAttachmentMeta,
    attachmentStatus,
    setAttachmentStatus,
    isAttachmentProcessing,
    setIsAttachmentProcessing,
    clearAttachment,
    handleAttachmentChange,
    openCameraCapture,
    untrackTransientAttachment,
    deleteBlob: deleteAttachmentBlobSafe,
    cleanupTransientOnly,
    commitAttachmentReplacement,
  } = useAttachment({
    userId: user?.id,
    cameraInputRef,
    pushToast,
    originalAttachmentId,
  })

  const shouldShowLeaveGuidanceMessage =
    isLeaveGuidanceEnabled &&
    activeSection === 'new-leave' &&
    leaveTypeConfirmed &&
    startDate &&
    endDate

  const { filteredRecords, typeOptions, statusOptions } = useLeaveFilters({
    leaveRecords,
    search,
    sort,
    statusFilter,
    typeFilter,
    period,
    moduleLoadedAtMs: LEAVE_MODULE_LOADED_AT_MS,
    getWorkflowStatusLabel,
    getWorkflowPendingActionHint,
    getDisplayLeaveId,
  })
  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filteredRecords)

  const {
    selectedRecord,
    selectedRecordPendingActionHint,
    selectedRecordHistoryEntries,
    selectedLeaveTypeOption,
    SelectedLeaveIcon,
    selectedShiftConfig,
    requestedDays,
    activeFieldRule,
    selectedAssignment,
    balanceSummary,
    balanceStats,
    isSubmitBlockedByBalance,
    isFormDirty,
  } = useLeaveDerivedState({
    leaveRecords,
    leaveId,
    actorName,
    leaveType,
    workShift,
    startDate,
    endDate,
    startTimeSlot,
    endTimeSlot,
    assignmentRows,
    user,
    editingRecordId,
    reason,
    coverBy,
    attachmentName,
    attachmentMeta,
    attachmentId,
    formatDayCount,
  })

  useLeaveBootEffects({
    userId: user?.id,
    loadMeta,
    draftHydratedRef,
    activeSection,
    editingRecordId,
    setAssignmentRows,
    setLeaveType,
    setLeaveTypeConfirmed,
    setStartDate,
    setEndDate,
    setWorkShift,
    setStartTimeSlot,
    setEndTimeSlot,
    setReason,
    setCoverBy,
    setAttachmentName,
    setAttachmentId,
    setAttachmentMeta,
    setAttachmentStatus,
    pushToast,
  })

  useLeaveFormUiEffects({
    activeSection,
    isFormDirty,
    activeFieldRule,
    setFieldErrors,
  })

  const leaveGuidanceMessage = useLeaveGuidanceMessage({
    shouldShowLeaveGuidanceMessage,
    startDate,
    endDate,
    startTimeSlot,
    endTimeSlot,
    requestedDays,
    formatDayCount,
  })

  const {
    isSubmitConfirmVisible,
    submitPreview,
    isCancelConfirmVisible,
    cancelPreviewRecord,
    isDeleteConfirmVisible,
    deletePreviewRecord,
    isDiscardConfirmVisible,
    closeSubmitConfirmModal,
    closeCancelConfirmModal,
    closeDeleteConfirmModal,
    handleDiscardConfirmClose,
    confirmDiscardAndContinue,
    startNewLeave,
    runWithDiscardGuard,
    openLeaveForEdit,
    canCancelLeave,
    cancelLeave,
    confirmCancelLeave,
    deleteLeave,
    confirmDeleteLeave,
    handleDraft,
    confirmAndSubmit,
    handleSubmit,
    handleBackToLeaveType,
    handleClearForm,
  } = useLeaveActions({
    activeSection,
    isFormDirty,
    user,
    leaveId,
    navigate,
    leaveRecords,
    setLeaveRecords,
    setAssignmentRows,
    editingRecordId,
    setEditingRecordId,
    draftHydratedRef,
    originalAttachmentId,
    setOriginalAttachmentId,
    leaveType,
    setLeaveType,
    setLeaveTypeConfirmed,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    workShift,
    setWorkShift,
    startTimeSlot,
    setStartTimeSlot,
    endTimeSlot,
    setEndTimeSlot,
    reason,
    setReason,
    coverBy,
    setCoverBy,
    setFieldErrors,
    clearInlineErrors,
    resetForm,
    attachmentName,
    setAttachmentName,
    attachmentId,
    setAttachmentId,
    attachmentMeta,
    setAttachmentMeta,
    setAttachmentStatus,
    isAttachmentProcessing,
    setIsAttachmentProcessing,
    cleanupTransientOnly,
    untrackTransientAttachment,
    deleteAttachmentBlobSafe,
    commitAttachmentReplacement,
    requestedDays,
    activeFieldRule,
    balanceSummary,
    selectedShiftConfig,
    selectedAssignment,
    pushToast,
    getDisplayLeaveId,
    formatDayCount,
    calculateDays,
  })

  if (!user) {
    return <div className="my-4 text-danger">Unable to load leave page. Please sign in again.</div>
  }

  if (!hasPermission(user, 'self.leave')) {
    return (
      <CAlert color="warning" className="m-4">
        You do not have access to leave management.
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />
      <LeaveSubmitConfirmModal
        visible={isSubmitConfirmVisible}
        submitPreview={submitPreview}
        onClose={closeSubmitConfirmModal}
        onConfirm={confirmAndSubmit}
      />
      <LeaveDiscardConfirmModal
        visible={isDiscardConfirmVisible}
        onClose={handleDiscardConfirmClose}
        onConfirm={confirmDiscardAndContinue}
      />
      <LeaveCancelConfirmModal
        visible={isCancelConfirmVisible}
        record={cancelPreviewRecord}
        statusLabel={getWorkflowStatusLabel(cancelPreviewRecord)}
        pendingActionHint={getWorkflowPendingActionHint(cancelPreviewRecord)}
        getDisplayLeaveId={getDisplayLeaveId}
        onClose={closeCancelConfirmModal}
        onConfirm={confirmCancelLeave}
      />
      <ActionConfirmModal
        visible={isDeleteConfirmVisible}
        title="Delete Leave Request"
        message={
          deletePreviewRecord
            ? `Delete draft leave request ${getDisplayLeaveId(deletePreviewRecord)}? This action cannot be undone.`
            : 'Delete this draft leave request? This action cannot be undone.'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={closeDeleteConfirmModal}
        onConfirm={confirmDeleteLeave}
      />
      <CNav variant="underline" role="tablist" className="mb-3 flex-nowrap overflow-auto">
        <CNavItem role="presentation">
          <CNavLink
            active={activeSection === 'leave-records' || activeSection === 'leave-detail'}
            onClick={() => runWithDiscardGuard(() => navigate('/leave'))}
            style={{ cursor: 'pointer' }}
            className={
              activeSection === 'leave-records' || activeSection === 'leave-detail'
                ? 'text-primary'
                : ''
            }
          >
            Leave Records
          </CNavLink>
        </CNavItem>
        <CNavItem role="presentation">
          <CNavLink
            active={activeSection === 'new-leave'}
            onClick={() => runWithDiscardGuard(startNewLeave)}
            style={{ cursor: 'pointer' }}
            className={activeSection === 'new-leave' ? 'text-primary' : ''}
          >
            Apply Leave
          </CNavLink>
        </CNavItem>
      </CNav>

      {activeSection === 'leave-records' && (
        <LeaveRecordsSection
          title="My Leave Records"
          showPrimaryAction
          actionMode="self"
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
          leaveSortOptions={leaveSortOptions}
          typeOptions={typeOptions}
          statusOptions={statusOptions}
          clearFilters={clearFilters}
          filteredRecords={filteredRecords}
          visibleRows={visibleRows}
          rowsToShow={rowsToShow}
          setRowsToShow={setRowsToShow}
          leaveRecordsCount={leaveRecords.length}
          startNewLeave={startNewLeave}
          openRecord={openRecord}
          openLeaveForEdit={openLeaveForEdit}
          cancelLeave={cancelLeave}
          canCancelLeave={canCancelLeave}
          deleteLeave={deleteLeave}
          getDisplayLeaveId={getDisplayLeaveId}
          getStatusLabel={getWorkflowStatusLabel}
          getPendingActionHint={getWorkflowPendingActionHint}
          getStatusBadge={getStatusBadge}
          getStartDateTimeLabel={getStartDateTimeLabel}
          getEndDateTimeLabel={getEndDateTimeLabel}
          formatDate={formatDate}
          isLoading={isLeaveLoading}
        />
      )}

      {activeSection === 'leave-detail' && (
        <LeaveDetailSection
          selectedRecord={selectedRecord}
          selectedRecordPendingActionHint={selectedRecordPendingActionHint}
          selectedRecordHistoryEntries={selectedRecordHistoryEntries}
          onBack={() => navigate('/leave')}
          getDisplayLeaveId={getDisplayLeaveId}
          getScheduleLabel={getScheduleLabel}
          getStatusBadge={getStatusBadge}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
        />
      )}

      {activeSection === 'new-leave' && (
        <LeaveApplySection
          leaveTypeConfirmed={leaveTypeConfirmed}
          leaveType={leaveType}
          onSelectLeaveType={setLeaveType}
          onContinueLeaveType={handleLeaveTypeContinue}
          onBack={() => runWithDiscardGuard(() => navigate('/leave'))}
          onBackToLeaveType={handleBackToLeaveType}
          onSubmit={handleSubmit}
          selectedLeaveTypeOption={selectedLeaveTypeOption}
          SelectedLeaveIcon={SelectedLeaveIcon}
          balanceStats={balanceStats}
          balanceSummary={balanceSummary}
          workShift={workShift}
          handleShiftChange={handleShiftChange}
          shiftOptions={shiftOptions}
          selectedShiftConfig={selectedShiftConfig}
          startDate={startDate}
          handleStartDateChange={handleStartDateChange}
          startTimeSlot={startTimeSlot}
          handleStartTimeChange={handleStartTimeChange}
          endDate={endDate}
          handleEndDateChange={handleEndDateChange}
          endTimeSlot={endTimeSlot}
          handleEndTimeChange={handleEndTimeChange}
          fieldErrors={fieldErrors}
          activeFieldRule={activeFieldRule}
          coverBy={coverBy}
          onCoverByChange={handleCoverByChange}
          handleAttachmentChange={handleAttachmentChange}
          openCameraCapture={openCameraCapture}
          isAttachmentProcessing={isAttachmentProcessing}
          cameraInputRef={cameraInputRef}
          attachmentStatus={attachmentStatus}
          attachmentMeta={attachmentMeta}
          clearAttachment={clearAttachment}
          requestedDays={requestedDays}
          formatDayCount={formatDayCount}
          reason={reason}
          onReasonChange={handleReasonChange}
          onClearForm={handleClearForm}
          onDraft={handleDraft}
          isSubmitBlockedByBalance={isSubmitBlockedByBalance}
          editingRecordId={editingRecordId}
          guidanceMessage={shouldShowLeaveGuidanceMessage ? leaveGuidanceMessage : ''}
        />
      )}
    </CContainer>
  )
}

export default Leave
