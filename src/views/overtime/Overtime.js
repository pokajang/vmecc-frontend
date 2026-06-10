import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CBadge,
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
import { isHolidayGuidanceOvertimeEnabledForUser } from 'src/config/featureFlags'
import { hasPermission, isSystemAdministrator } from 'src/utils/authz'
import useTableRows from 'src/hooks/useTableRows'
import useOvertimeEligibility from 'src/hooks/useOvertimeEligibility'
import { overtimeSortOptions, statusColorMap } from './constants'
import {
  APPLICANT_OVERTIME_EDIT_LOCK_REASON,
  canApplicantEditOvertimeRecord,
  formatDate,
  formatDateTime,
  getDisplayOvertimeId,
  getEndDateTimeLabel,
  getScheduleLabel,
  getStartDateTimeLabel,
  getWorkflowPendingActionHint,
  getWorkflowStatusLabel,
  normalizeOvertimeType,
} from './utils'
import OvertimeApplySection from './components/OvertimeApplySection'
import OvertimeDetailSection from './components/OvertimeDetailSection'
import OvertimeDiscardConfirmModal from './components/OvertimeDiscardConfirmModal'
import OvertimeRecordsSection from './components/OvertimeRecordsSection'
import OvertimeSubmitConfirmModal from './components/OvertimeSubmitConfirmModal'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { buildFormSnapshot, getFormValuesFromRecord } from './domain/overtimeFormDomain'
import useOvertimeData from './hooks/useOvertimeData'
import useOvertimeForm from './hooks/useOvertimeForm'
import useOvertimeActions from './hooks/useOvertimeActions'
import useOvertimeRecordsViewModel from './hooks/useOvertimeRecordsViewModel'
import useOvertimeDraftHydration from './hooks/useOvertimeDraftHydration'
import useOvertimeTypeGuidance from './hooks/useOvertimeTypeGuidance'

const getStatusBadge = (status, label = status) => (
  <CBadge color={statusColorMap[status] || 'secondary'}>{label || '-'}</CBadge>
)

const Overtime = () => {
  const overtimeTypeDerivedMode = false
  const location = useLocation()
  const navigate = useNavigate()
  const { overtimeId } = useParams()
  const user = useSelector((state) => state.authUser)
  const isSysAdmin = isSystemAdministrator(user)
  const canUseOvertimeModule = hasPermission(user, 'self.overtime')
  const {
    data: overtimeEligibility,
    eligible: isOvertimeEligible,
    isResolved: overtimeEligibilityResolved,
    isLoading: isOvertimeEligibilityLoading,
  } = useOvertimeEligibility({ enabled: canUseOvertimeModule })
  const isOvertimeEligibleEffective = isSysAdmin || isOvertimeEligible
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('appliedAt:desc')
  const [isDiscardConfirmVisible, setIsDiscardConfirmVisible] = useState(false)
  const [pendingDiscardAction, setPendingDiscardAction] = useState(null)
  const [editingRecordId, setEditingRecordId] = useState(null)
  const toaster = useRef()
  const draftHydratedRef = useRef(false)
  const [toast, addToast] = useState(null)
  const actorName = user?.name || user?.full_name || user?.email || 'System user'
  const isOvertimeGuidanceEnabled = isHolidayGuidanceOvertimeEnabledForUser(user)
  const handleHydrationStart = useCallback(() => {
    draftHydratedRef.current = false
  }, [])

  const {
    overtimeType,
    setOvertimeType,
    overtimeTypeConfirmed,
    setOvertimeTypeConfirmed,
    claimDate,
    setClaimDate,
    isOvertimeTypeDeriving,
    setIsOvertimeTypeDeriving,
    overtimeGuidanceMessage,
    setOvertimeGuidanceMessage,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    reason,
    setReason,
    fieldErrors,
    setFieldErrors,
    formBaseline,
    setFormBaseline,
    clearInlineErrors,
    clearFieldError,
    handleClaimDateChange,
    handleStartTimeChange,
    handleEndTimeChange,
    handleReasonChange,
    handleSelectOvertimeType,
    handleContinueOvertimeType,
    handleBackToOvertimeType,
    durationMinutes,
    isOvernight,
    isFormDirty,
  } = useOvertimeForm({ overtimeTypeDerivedMode, editingRecordId })

  const pushToast = useCallback((message, { title, color = 'light', delay = 6000 } = {}) => {
    addToast(
      <CToast autohide delay={delay} color={color}>
        {title ? (
          <CToastHeader closeButton>
            <strong className="me-auto">{title}</strong>
          </CToastHeader>
        ) : null}
        <CToastBody>{message}</CToastBody>
      </CToast>,
    )
  }, [])

  const {
    overtimePolicy,
    overtimeRecords,
    setOvertimeRecords,
    overtimeDraft,
    setOvertimeDraft,
    isOvertimeLoading,
  } = useOvertimeData({
    userId: user?.id,
    canUseOvertimeModule,
    isOvertimeEligibilityLoading,
    overtimeEligibilityResolved,
    isOvertimeEligibleEffective,
    pushToast,
    onHydrationStart: handleHydrationStart,
  })

  const {
    activeSection,
    defaultOvertimeType,
    draftListRow,
    filteredRecords,
    linkedDraftRecordId,
    overtimeRecordsWithDraftState,
    selectedRecord,
    selectedRecordHistoryEntries,
    selectedRecordPendingActionHint,
    selectedRecordStatusLabel,
    visibleOvertimeTypeOptions,
  } = useOvertimeRecordsViewModel({
    actorName,
    location,
    overtimeDraft,
    overtimeId,
    overtimePolicy,
    overtimeRecords,
    period,
    search,
    sort,
    statusFilter,
    userId: user?.id,
  })

  useOvertimeDraftHydration({
    activeSection,
    claimDate,
    defaultOvertimeType,
    draftHydratedRef,
    editingRecordId,
    endTime,
    overtimeDraft,
    overtimeTypeDerivedMode,
    overtimeType,
    overtimeTypeConfirmed,
    pushToast,
    reason,
    setClaimDate,
    setEndTime,
    setFormBaseline,
    setOvertimeType,
    setOvertimeTypeConfirmed,
    setReason,
    setStartTime,
    startTime,
    userId: user?.id,
  })

  useOvertimeTypeGuidance({
    activeSection,
    claimDate,
    defaultOvertimeType,
    isOvertimeGuidanceEnabled,
    overtimeType,
    overtimeTypeDerivedMode,
    setIsOvertimeTypeDeriving,
    setOvertimeGuidanceMessage,
  })

  useEffect(() => {
    if (!overtimeType) return
    const hasCurrentType = visibleOvertimeTypeOptions.some(
      (option) => option.value === overtimeType,
    )
    if (hasCurrentType) return
    setOvertimeType(defaultOvertimeType)
    setOvertimeTypeConfirmed(overtimeTypeDerivedMode)
  }, [
    defaultOvertimeType,
    overtimeType,
    overtimeTypeDerivedMode,
    setOvertimeType,
    setOvertimeTypeConfirmed,
    visibleOvertimeTypeOptions,
  ])

  const { rowsToShow, setRowsToShow, visibleRows } = useTableRows(filteredRecords)
  const editingPersistedRecord = useMemo(
    () =>
      overtimeRecords.find((row) => String(row?.id || '') === String(editingRecordId || '')) ||
      null,
    [editingRecordId, overtimeRecords],
  )
  const hasPersistedEditTarget = Boolean(editingPersistedRecord?.id)
  const isResubmittingClaim =
    hasPersistedEditTarget && String(editingPersistedRecord?.status || '') === 'Pending'
  const isResumeEditMode = Boolean(editingRecordId)
  const isLinkedDraftForEditing =
    hasPersistedEditTarget &&
    linkedDraftRecordId !== '' &&
    linkedDraftRecordId === String(editingRecordId || '').trim()
  const submitButtonLabel = isResubmittingClaim ? 'Update request' : 'Submit request'
  const submittingButtonLabel = isResubmittingClaim
    ? 'Updating request...'
    : 'Submitting request...'
  const clearButtonLabel = hasPersistedEditTarget
    ? isLinkedDraftForEditing
      ? 'Discard draft changes'
      : 'Reset to submitted'
    : 'Clear form'
  const clearingButtonLabel = hasPersistedEditTarget
    ? isLinkedDraftForEditing
      ? 'Discarding...'
      : 'Resetting...'
    : 'Clearing...'

  useEffect(() => {
    if (activeSection !== 'new-overtime') return undefined
    const onBeforeUnload = (event) => {
      if (!isFormDirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [activeSection, isFormDirty])

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: 'All status' },
      ...Array.from(
        new Set(
          (draftListRow
            ? [draftListRow, ...overtimeRecordsWithDraftState]
            : overtimeRecordsWithDraftState
          ).map((row) => row.status),
        ),
      ).map((status) => ({ value: status, label: status })),
    ],
    [draftListRow, overtimeRecordsWithDraftState],
  )

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatusFilter('All')
    setPeriod('all')
    setSort('appliedAt:desc')
  }, [])

  const handleDiscardConfirmClose = useCallback(() => {
    setIsDiscardConfirmVisible(false)
    setPendingDiscardAction(null)
  }, [])

  const resetForm = () => {
    setEditingRecordId(null)
    setOvertimeType('')
    setOvertimeTypeConfirmed(overtimeTypeDerivedMode)
    setClaimDate('')
    setStartTime('')
    setEndTime('')
    setReason('')
    setFormBaseline(
      buildFormSnapshot({
        editingRecordId: null,
        overtimeType: '',
        overtimeTypeConfirmed: overtimeTypeDerivedMode,
        claimDate: '',
        startTime: '',
        endTime: '',
        reason: '',
      }),
    )
    setFieldErrors({})
  }

  const confirmDiscardAndContinue = () => {
    setIsDiscardConfirmVisible(false)
    const action = pendingDiscardAction
    setPendingDiscardAction(null)
    resetForm()
    if (typeof action === 'function') action()
  }

  const runWithDiscardGuard = useCallback(
    (action) => {
      if (activeSection === 'new-overtime' && isFormDirty) {
        setPendingDiscardAction(() => action)
        setIsDiscardConfirmVisible(true)
        return
      }
      action()
    },
    [activeSection, isFormDirty],
  )

  const startNewOvertime = () => {
    setOvertimeType('')
    setOvertimeTypeConfirmed(overtimeTypeDerivedMode)
    draftHydratedRef.current = false
    setEditingRecordId(null)
    setClaimDate('')
    setStartTime('')
    setEndTime('')
    setReason('')
    setFormBaseline(
      buildFormSnapshot({
        editingRecordId: null,
        overtimeType: '',
        overtimeTypeConfirmed: overtimeTypeDerivedMode,
        claimDate: '',
        startTime: '',
        endTime: '',
        reason: '',
      }),
    )
    setFieldErrors({})
    navigate('/overtime/new')
  }

  const resetFormToSubmittedRecord = () => {
    if (!editingPersistedRecord?.id) return false
    const submittedValues = getFormValuesFromRecord(editingPersistedRecord, defaultOvertimeType)
    setOvertimeType(submittedValues.overtimeType)
    setOvertimeTypeConfirmed(true)
    setClaimDate(submittedValues.claimDate)
    setStartTime(submittedValues.startTime)
    setEndTime(submittedValues.endTime)
    setReason(submittedValues.reason)
    setFormBaseline(
      buildFormSnapshot({
        editingRecordId: editingPersistedRecord.id,
        overtimeType: submittedValues.overtimeType,
        overtimeTypeConfirmed: true,
        claimDate: submittedValues.claimDate,
        startTime: submittedValues.startTime,
        endTime: submittedValues.endTime,
        reason: submittedValues.reason,
      }),
    )
    setFieldErrors({})
    return true
  }

  const openOvertimeForEdit = (row) => {
    if (!row?.id) return
    if (!canApplicantEditOvertimeRecord(row)) {
      pushToast(APPLICANT_OVERTIME_EDIT_LOCK_REASON, {
        title: 'Edit unavailable',
        color: 'warning',
      })
      return
    }
    const linkedDraft =
      overtimeDraft &&
      String(overtimeDraft?.sourceRecordId || '').trim() === String(row.id || '').trim()
        ? overtimeDraft
        : null
    const mergedSource = linkedDraft ? { ...row, ...linkedDraft } : row
    const nextFormValues = getFormValuesFromRecord(mergedSource, defaultOvertimeType)

    setEditingRecordId(row.id)
    setOvertimeType(nextFormValues.overtimeType)
    setOvertimeTypeConfirmed(true)
    setClaimDate(nextFormValues.claimDate)
    setStartTime(nextFormValues.startTime)
    setEndTime(nextFormValues.endTime)
    setReason(nextFormValues.reason)
    setFormBaseline(
      buildFormSnapshot({
        editingRecordId: row.id,
        overtimeType: nextFormValues.overtimeType,
        overtimeTypeConfirmed: true,
        claimDate: nextFormValues.claimDate,
        startTime: nextFormValues.startTime,
        endTime: nextFormValues.endTime,
        reason: nextFormValues.reason,
      }),
    )
    if (linkedDraft) {
      pushToast(`Loaded draft changes for ${getDisplayOvertimeId(row)}.`, {
        title: 'Draft loaded',
        color: 'info',
      })
    }
    setFieldErrors({})
    navigate('/overtime/new')
  }

  const openRecord = (row) => {
    if (!row?.id) return
    if (row?.isDraft) {
      openOvertimeForEdit(row)
      return
    }
    navigate(`/overtime/${row.id}`)
  }

  const handleContinueOvertimeTypeWithToast = useCallback(
    () => handleContinueOvertimeType(pushToast),
    [handleContinueOvertimeType, pushToast],
  )

  const {
    isSubmitConfirmVisible,
    submitPreview,
    closeSubmitConfirmModal,
    isCancelConfirmVisible,
    cancelPreviewRecord,
    closeCancelConfirmModal,
    isDeleteConfirmVisible,
    deletePreviewRecord,
    closeDeleteConfirmModal,
    isDiscardDraftChangesConfirmVisible,
    setIsDiscardDraftChangesConfirmVisible,
    isDraftSaving,
    isFormClearing,
    isSubmittingClaim,
    cancelOvertime,
    confirmCancelOvertime,
    deleteOvertime,
    confirmDeleteOvertime,
    handleSubmit,
    confirmAndSubmit,
    handleDraft,
    confirmDiscardDraftChanges,
    handleClearForm,
  } = useOvertimeActions({
    userId: user?.id,
    userRoles: user?.roles,
    actorName,
    overtimePolicy,
    overtimeRecords,
    setOvertimeRecords,
    setOvertimeDraft,
    draftListRow,
    overtimeId,
    navigate,
    pushToast,
    overtimeTypeDerivedMode,
    isResumeEditMode,
    hasPersistedEditTarget,
    isResubmittingClaim,
    isLinkedDraftForEditing,
    editingRecordId,
    resetForm,
    resetFormToSubmittedRecord,
    isOvertimeGuidanceEnabled,
    form: {
      overtimeType,
      overtimeTypeConfirmed,
      claimDate,
      startTime,
      endTime,
      reason,
      durationMinutes,
      isOvernight,
      setFieldErrors,
      setFormBaseline,
    },
    isOvertimeTypeDeriving,
  })

  if (!user) {
    return (
      <div className="my-4 text-danger">Unable to load overtime page. Please sign in again.</div>
    )
  }

  if (!canUseOvertimeModule) {
    return (
      <CAlert color="warning" className="m-4">
        You do not have access to overtime management.
      </CAlert>
    )
  }

  if (isOvertimeEligibilityLoading) {
    return (
      <CAlert color="info" className="m-4">
        Checking overtime eligibility...
      </CAlert>
    )
  }

  if (overtimeEligibilityResolved && !isOvertimeEligibleEffective) {
    return (
      <CAlert color="warning" className="m-4">
        <div className="fw-semibold mb-1">Overtime not applicable for your current role.</div>
        <div className="small">
          Applicable roles: {(overtimeEligibility?.applicableRoles || []).join(', ') || '-'}
        </div>
        <div className="small">
          Your active roles: {(overtimeEligibility?.userRoles || []).join(', ') || '-'}
        </div>
      </CAlert>
    )
  }

  return (
    <CContainer fluid>
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />
      <OvertimeSubmitConfirmModal
        visible={isSubmitConfirmVisible}
        submitPreview={submitPreview}
        onClose={closeSubmitConfirmModal}
        onConfirm={confirmAndSubmit}
        isSubmitting={isSubmittingClaim}
      />
      <OvertimeDiscardConfirmModal
        visible={isDiscardConfirmVisible}
        onClose={handleDiscardConfirmClose}
        onConfirm={confirmDiscardAndContinue}
      />
      <ActionConfirmModal
        visible={isDiscardDraftChangesConfirmVisible}
        title="Discard Draft Changes"
        message={
          editingPersistedRecord
            ? `Discard saved draft changes for ${getDisplayOvertimeId(editingPersistedRecord)} and revert to submitted values?`
            : 'Discard saved draft changes and revert to submitted values?'
        }
        confirmLabel="Discard Changes"
        confirmColor="danger"
        onClose={() => setIsDiscardDraftChangesConfirmVisible(false)}
        onConfirm={confirmDiscardDraftChanges}
      />
      <ActionConfirmModal
        visible={isCancelConfirmVisible}
        title="Cancel Overtime Claim"
        message={
          cancelPreviewRecord
            ? `Cancel overtime claim ${getDisplayOvertimeId(cancelPreviewRecord)}?`
            : 'Cancel this overtime claim?'
        }
        confirmLabel="Cancel Claim"
        confirmColor="warning"
        onClose={closeCancelConfirmModal}
        onConfirm={confirmCancelOvertime}
      />
      <ActionConfirmModal
        visible={isDeleteConfirmVisible}
        title={deletePreviewRecord?.isDraft ? 'Delete Overtime Draft' : 'Delete Overtime Claim'}
        message={
          deletePreviewRecord?.isDraft
            ? 'Delete this saved overtime draft?'
            : deletePreviewRecord
              ? `Delete overtime claim ${getDisplayOvertimeId(deletePreviewRecord)}? This action cannot be undone.`
              : 'Delete this overtime claim? This action cannot be undone.'
        }
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={closeDeleteConfirmModal}
        onConfirm={confirmDeleteOvertime}
      />
      <CNav variant="underline" role="tablist" className="mb-3 flex-nowrap overflow-auto">
        <CNavItem role="presentation">
          <CNavLink
            active={activeSection === 'overtime-records' || activeSection === 'overtime-detail'}
            onClick={() => runWithDiscardGuard(() => navigate('/overtime'))}
            style={{ cursor: 'pointer' }}
            className={
              activeSection === 'overtime-records' || activeSection === 'overtime-detail'
                ? 'text-primary'
                : ''
            }
          >
            Overtime Records
          </CNavLink>
        </CNavItem>
        <CNavItem role="presentation">
          <CNavLink
            active={activeSection === 'new-overtime'}
            onClick={() => runWithDiscardGuard(startNewOvertime)}
            style={{ cursor: 'pointer' }}
            className={activeSection === 'new-overtime' ? 'text-primary' : ''}
          >
            Apply Overtime
          </CNavLink>
        </CNavItem>
      </CNav>

      {activeSection === 'overtime-records' ? (
        <OvertimeRecordsSection
          search={search}
          setSearch={setSearch}
          period={period}
          setPeriod={setPeriod}
          sort={sort}
          setSort={setSort}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          overtimeSortOptions={overtimeSortOptions}
          statusOptions={statusOptions}
          clearFilters={clearFilters}
          filteredRecords={filteredRecords}
          visibleRows={visibleRows}
          rowsToShow={rowsToShow}
          setRowsToShow={setRowsToShow}
          overtimeRecordsCount={overtimeRecords.length + (draftListRow ? 1 : 0)}
          startNewOvertime={startNewOvertime}
          openRecord={openRecord}
          openOvertimeForEdit={openOvertimeForEdit}
          cancelOvertime={cancelOvertime}
          deleteOvertime={deleteOvertime}
          getDisplayOvertimeId={getDisplayOvertimeId}
          getStatusLabel={getWorkflowStatusLabel}
          getPendingActionHint={getWorkflowPendingActionHint}
          getStatusBadge={getStatusBadge}
          getStartDateTimeLabel={getStartDateTimeLabel}
          getEndDateTimeLabel={getEndDateTimeLabel}
          isLoading={isOvertimeLoading}
        />
      ) : null}

      {activeSection === 'overtime-detail' ? (
        <OvertimeDetailSection
          selectedRecord={selectedRecord}
          selectedRecordPendingActionHint={selectedRecordPendingActionHint}
          selectedRecordHistoryEntries={selectedRecordHistoryEntries}
          onBack={() => navigate('/overtime')}
          getDisplayOvertimeId={getDisplayOvertimeId}
          getScheduleLabel={getScheduleLabel}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
        />
      ) : null}

      {activeSection === 'new-overtime' ? (
        <OvertimeApplySection
          overtimeTypeConfirmed={overtimeTypeConfirmed}
          overtimeType={overtimeType}
          isOvertimeTypeDerived={overtimeTypeDerivedMode}
          overtimeTypeOptions={visibleOvertimeTypeOptions}
          onSelectOvertimeType={handleSelectOvertimeType}
          onContinueOvertimeType={handleContinueOvertimeTypeWithToast}
          onBackToOvertimeType={handleBackToOvertimeType}
          onSubmit={handleSubmit}
          onBack={() => runWithDiscardGuard(() => navigate('/overtime'))}
          claimDate={claimDate}
          startTime={startTime}
          endTime={endTime}
          reason={reason}
          fieldErrors={fieldErrors}
          onClaimDateChange={handleClaimDateChange}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
          onReasonChange={handleReasonChange}
          durationMinutes={durationMinutes}
          isOvernight={isOvernight}
          onClearForm={handleClearForm}
          clearButtonLabel={clearButtonLabel}
          clearingButtonLabel={clearingButtonLabel}
          onDraft={handleDraft}
          editingRecordId={editingRecordId}
          isResumeEditMode={isResumeEditMode}
          submitButtonLabel={submitButtonLabel}
          submittingButtonLabel={submittingButtonLabel}
          isDraftSaving={isDraftSaving}
          isFormClearing={isFormClearing}
          isSubmittingClaim={isSubmittingClaim}
          guidanceMessage={isOvertimeGuidanceEnabled ? overtimeGuidanceMessage : ''}
        />
      ) : null}
    </CContainer>
  )
}

export default Overtime
