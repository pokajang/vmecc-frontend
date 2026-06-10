import React, { useCallback, useMemo, useRef, useState } from 'react'
import { CButton, CToaster } from '@coreui/react'
import ClaimLeaveModal from './ClaimLeaveModal'
import { generateDraftId } from 'src/views/payroll/components/claimRecords'
import useAttachmentManager from './hooks/useAttachmentManager'
import useClaimDraft from './hooks/useClaimDraft'
import useSalaryAssignments from './hooks/useSalaryAssignments'
import useOvertimeCalc from './hooks/useOvertimeCalc'
import useSalaryClaimActions from './hooks/useSalaryClaimActions'
import useSalaryClaimHydration from './hooks/useSalaryClaimHydration'
import useClaimToast from './hooks/useClaimToast'
import useSalaryResetDraft from './hooks/useSalaryResetDraft'
import useAdjustmentFocus from './hooks/useAdjustmentFocus'
import { isSystemAdministrator } from 'src/utils/authz'
import { useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import { buildLocalAutosaveKey, formatCurrency } from './utils/claimFormUtils'
import {
  DEFAULT_HEADER,
  PAYROLL_MONTH_OPTIONS,
  createSalaryItem,
  normalizeItem,
} from './utils/salaryClaimUtils'
import AttachmentPreviewModal from './AttachmentPreviewModal'
import SalaryClaimBody from './SalaryClaimBody'
import ClaimPostSubmitModal from './ClaimPostSubmitModal'
import ClaimDraftHeaderBar from './ClaimDraftHeaderBar'
import SalaryClaimSubmitDialog from './SalaryClaimSubmitDialog'
import SalaryClaimHeaderRow from './SalaryClaimHeaderRow'

const SalaryClaimForm = ({
  user,
  claimType = 'salary',
  onBack,
  onChangeType,
  onEditType,
  periodValue = '',
  periodConfirmed: periodConfirmedProp = false,
  onPeriodChange,
  onPeriodConfirmedChange,
  draftPayload,
  overtimeEligibility = null,
}) => {
  const isEditingSubmittedClaim = Boolean(String(draftPayload?.sourceClaimId || '').trim())
  const [header, setHeader] = useState({ ...DEFAULT_HEADER, period: periodValue || '' })
  const [periodConfirmed, setPeriodConfirmed] = useState(Boolean(periodConfirmedProp))
  const [showForm, setShowForm] = useState(false)
  const [savedItems, setSavedItems] = useState([])
  const [draftItem, setDraftItem] = useState(createSalaryItem())
  const [editingIndex, setEditingIndex] = useState(null)
  const [leaveModalVisible, setLeaveModalVisible] = useState(false)
  const [submitModalVisible, setSubmitModalVisible] = useState(false)
  const [postSubmitVisible, setPostSubmitVisible] = useState(false)
  const [postSubmitClaimId, setPostSubmitClaimId] = useState('')
  const [submitDeclarationChecked, setSubmitDeclarationChecked] = useState(false)
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false)
  const [payrollBaselineConfirmed, setPayrollBaselineConfirmed] = useState(false)
  const pendingLeaveActionRef = useRef(null)
  const previousPeriodRef = useRef('')
  const hasInitializedPeriodRef = useRef(false)
  const adjustmentFormRef = useRef(null)
  const adjustmentDateInputRef = useRef(null)
  const { toaster, toast, pushToast } = useClaimToast()
  const draftType = 'salary'
  const [activeDraftId, setActiveDraftId] = useState(null)
  const [activeDraftBackendId, setActiveDraftBackendId] = useState(null)
  const hasHydratedDraftRef = useRef(false)
  const { registerGuard, unregisterGuard, requestNavigation } = useNavigationGuard()
  const isSysAdmin = isSystemAdministrator(user)
  const overtimeEligibilityResolved = Boolean(overtimeEligibility?.isResolved)
  const hasOvertimeEligibilityError = Boolean(overtimeEligibility?.error)
  const isOvertimeEligible =
    isSysAdmin || (overtimeEligibilityResolved && overtimeEligibility?.eligible === true)

  const {
    isSalaryAssignmentsLoading,
    totalAmount,
    assignedSalarySnapshot,
    allowanceItems,
    statutoryDeductionItems,
    additionAdjustmentRows,
    deductionAdjustmentRows,
    adjustedGrossSalary,
    adjustedTotalDeductions,
    adjustedNetBeforeOvertime,
    hasAssignedSalaryBaseline,
    submitLineItems,
  } = useSalaryAssignments({ user, period: header.period, savedItems, pushToast })

  const {
    overtimeBaseMode,
    overtimeRateMultipliers,
    overtimeMonthlyDivisor,
    overtimeGlobalNormalHoursPerDay,
    overtimeAutoHourlyBaseRate,
    overtimePreviewHoursPerDay,
    isOvertimeRowsLoading,
    overtimeRowsForPeriod,
    overtimeHourlySourceSummary,
    overtimeTotals,
    totalClaimImpact,
    projectedNetPayout,
  } = useOvertimeCalc({
    user,
    period: header.period,
    assignedSalaryBasic: assignedSalarySnapshot.basic,
    assignedSalaryNet: assignedSalarySnapshot.net,
    totalAmount,
    isSysAdmin,
    isOvertimeEligible,
    overtimeEligibilityResolved,
    hasOvertimeEligibilityError,
    pushToast,
  })

  const buildSnapshot = useCallback(
    (value = {}) =>
      JSON.stringify({
        period: String(value?.period || '').trim(),
        periodConfirmed: Boolean(value?.periodConfirmed),
        savedItems: Array.isArray(value?.savedItems)
          ? value.savedItems.map((item) => ({
              ...normalizeItem(item),
              legacyAttachmentDataUrl: '',
            }))
          : [],
        draftItem: {
          ...normalizeItem(value?.draftItem || createSalaryItem()),
          legacyAttachmentDataUrl: '',
        },
        payrollBaselineConfirmed: Boolean(value?.payrollBaselineConfirmed),
      }),
    [],
  )

  const initialSnapshot = useMemo(
    () => buildSnapshot({ period: '', periodConfirmed: false }),
    [buildSnapshot],
  )
  const currentSnapshot = useMemo(
    () =>
      buildSnapshot({
        period: header.period,
        periodConfirmed,
        savedItems,
        draftItem,
        payrollBaselineConfirmed,
      }),
    [
      buildSnapshot,
      draftItem,
      header.period,
      payrollBaselineConfirmed,
      periodConfirmed,
      savedItems,
    ],
  )
  const localAutosaveKey = useMemo(
    () => buildLocalAutosaveKey(user?.id, draftType),
    [draftType, user?.id],
  )

  const {
    updateDraftItem,
    getProtectedEditingAttachmentId,
    releaseAttachmentIds,
    clearDraftAttachment,
    handleAttachmentChange,
    attachmentPreviewVisible,
    attachmentPreviewItem,
    attachmentPreviewUrl,
    attachmentPreviewMimeType,
    attachmentPreviewLoading,
    attachmentPreviewZoom,
    isImageAttachmentPreview,
    openAttachmentPreview,
    closeAttachmentPreviewModal,
    updateAttachmentPreviewZoom,
  } = useAttachmentManager({
    draftItem,
    setDraftItem,
    editingIndex,
    savedItems,
    setSavedItems,
    pushToast,
    hasHydratedDraftRef,
    normalizeItem,
  })

  const buildDraftPayload = useCallback(
    (overrides = {}) => {
      const nextPeriod = Object.prototype.hasOwnProperty.call(overrides, 'period')
        ? overrides.period
        : header.period
      const nextPeriodConfirmed = Object.prototype.hasOwnProperty.call(overrides, 'periodConfirmed')
        ? overrides.periodConfirmed
        : periodConfirmed
      const nextPayrollBaselineConfirmed = Object.prototype.hasOwnProperty.call(
        overrides,
        'payrollBaselineConfirmed',
      )
        ? overrides.payrollBaselineConfirmed
        : payrollBaselineConfirmed
      const nextSavedItems = Object.prototype.hasOwnProperty.call(overrides, 'savedItems')
        ? overrides.savedItems
        : savedItems
      const nextDraftItem = Object.prototype.hasOwnProperty.call(overrides, 'draftItem')
        ? overrides.draftItem
        : draftItem
      const sanitizedSavedItems = Array.isArray(nextSavedItems)
        ? nextSavedItems.map((item) => ({ ...normalizeItem(item), legacyAttachmentDataUrl: '' }))
        : []
      return {
        id: activeDraftId || generateDraftId(draftType),
        backendId: activeDraftBackendId || null,
        period: nextPeriod,
        periodConfirmed: Boolean(nextPeriodConfirmed),
        payrollBaselineConfirmed: Boolean(nextPayrollBaselineConfirmed),
        payrollSnapshot: { ...assignedSalarySnapshot },
        adjustmentsTotal: totalAmount,
        approvedOvertimePayout: overtimeTotals.totalPayoutApproved,
        projectedNetPayout,
        savedItems: sanitizedSavedItems,
        draftItem: {
          ...normalizeItem(nextDraftItem || createSalaryItem()),
          legacyAttachmentDataUrl: '',
        },
        updatedAt: new Date().toISOString(),
      }
    },
    [
      activeDraftBackendId,
      activeDraftId,
      assignedSalarySnapshot,
      draftItem,
      draftType,
      header.period,
      overtimeTotals.totalPayoutApproved,
      payrollBaselineConfirmed,
      periodConfirmed,
      projectedNetPayout,
      savedItems,
      totalAmount,
    ],
  )

  const {
    hasUnsavedChanges,
    isClaimTypeLocked,
    draftSyncSummary,
    saveDraft,
    writeLocalBackup,
    setLastSavedSnapshot,
  } = useClaimDraft({
    hasHydratedDraftRef,
    currentSnapshot,
    initialSnapshot,
    buildDraftPayload,
    buildSnapshot,
    activeDraftId,
    setActiveDraftId,
    activeDraftBackendId,
    setActiveDraftBackendId,
    localAutosaveKey,
    draftType,
    userId: user?.id,
    savedItems,
    navGuardKey: 'salary-claim-form',
    navGuardMessage:
      'You have unsaved changes in this salary claim form. Leave this page and discard them?',
    registerGuard,
    unregisterGuard,
    pushToast,
    saveDraftSuccessMessage: 'Salary payout confirmation draft saved.',
    suppressAutosave: isSubmittingClaim,
  })

  const resetDraft = useSalaryResetDraft({
    draftAttachmentId: Number(draftItem?.attachmentId || 0) || 0,
    getProtectedEditingAttachmentId,
    releaseAttachmentIds,
    setDraftItem,
    setEditingIndex,
  })

  useSalaryClaimHydration({
    periodValue,
    periodConfirmedProp,
    periodConfirmed,
    headerPeriod: header.period,
    localAutosaveKey,
    draftPayload,
    hasHydratedDraftRef,
    setSavedItems,
    setDraftItem,
    setHeader,
    setShowForm,
    setActiveDraftId,
    setActiveDraftBackendId,
    setPayrollBaselineConfirmed,
    setPeriodConfirmed,
    onPeriodChange,
    onPeriodConfirmedChange,
    setLastSavedSnapshot,
    buildSnapshot,
    initialSnapshot,
    pushToast,
    previousPeriodRef,
    hasInitializedPeriodRef,
  })

  const {
    handleBack,
    handleEditType,
    handleConfirmPeriod,
    handleChangePeriod,
    closeLeaveModal,
    discardChangesAndLeave,
    saveDraftAndLeave,
    saveItem,
    editSavedItem,
    removeSavedItem,
    submitClaim,
    confirmSubmit,
    handleAddItem,
    cancelAddItem,
  } = useSalaryClaimActions({
    user,
    claimType,
    onBack,
    onChangeType,
    onEditType,
    onPeriodConfirmedChange,
    requestNavigation,
    hasUnsavedChanges,
    isClaimTypeLocked,
    pushToast,
    saveDraft,
    buildDraftPayload,
    period: header.period,
    setPeriodConfirmed,
    setShowForm,
    setLeaveModalVisible,
    pendingLeaveActionRef,
    savedItems,
    draftItem,
    releaseAttachmentIds,
    localAutosaveKey,
    payrollBaselineConfirmed,
    hasAssignedSalaryBaseline,
    overtimeTotals,
    editingIndex,
    setSubmitDeclarationChecked,
    setSubmitModalVisible,
    draftPayload,
    overtimeBaseMode,
    overtimeAutoHourlyBaseRate,
    overtimeMonthlyDivisor,
    overtimeGlobalNormalHoursPerDay,
    overtimeRateMultipliers,
    overtimeRowsForPeriod,
    headerPeriod: header.period,
    totalClaimImpact,
    assignedSalarySnapshot,
    totalAmount,
    projectedNetPayout,
    activeDraftId,
    activeDraftBackendId,
    periodConfirmed,
    setActiveDraftId,
    setActiveDraftBackendId,
    setPostSubmitClaimId,
    setPostSubmitVisible,
    setPayrollBaselineConfirmed,
    setSavedItems,
    setDraftItem,
    setEditingIndex,
    buildSnapshot,
    setIsSubmittingClaim,
    isSubmittingClaim,
    setLastSavedSnapshot,
    writeLocalBackup,
  })

  useAdjustmentFocus({
    showForm,
    adjustmentFormRef,
    adjustmentDateInputRef,
  })

  return (
    <div className="d-grid gap-4">
      <CToaster ref={toaster} push={toast} placement="bottom-end" className="mb-3 me-3" />
      <ClaimLeaveModal
        visible={leaveModalVisible}
        onClose={closeLeaveModal}
        onDiscard={discardChangesAndLeave}
        onSaveDraftAndLeave={saveDraftAndLeave}
      />
      <SalaryClaimSubmitDialog
        visible={submitModalVisible}
        period={header.period}
        assignedSalarySnapshot={assignedSalarySnapshot}
        totalAmount={totalAmount}
        overtimeTotals={overtimeTotals}
        projectedNetPayout={projectedNetPayout}
        submitLineItems={submitLineItems}
        submitDeclarationChecked={submitDeclarationChecked}
        setSubmitDeclarationChecked={setSubmitDeclarationChecked}
        setSubmitModalVisible={setSubmitModalVisible}
        openAttachmentPreview={openAttachmentPreview}
        confirmSubmit={confirmSubmit}
        isSubmitting={isSubmittingClaim}
      />

      <AttachmentPreviewModal
        visible={attachmentPreviewVisible}
        onClose={closeAttachmentPreviewModal}
        attachmentPreviewItem={attachmentPreviewItem}
        attachmentPreviewUrl={attachmentPreviewUrl}
        attachmentPreviewMimeType={attachmentPreviewMimeType}
        attachmentPreviewLoading={attachmentPreviewLoading}
        attachmentPreviewZoom={attachmentPreviewZoom}
        isImageAttachmentPreview={isImageAttachmentPreview}
        onZoomChange={updateAttachmentPreviewZoom}
      />

      <ClaimPostSubmitModal
        visible={postSubmitVisible}
        claimId={postSubmitClaimId}
        onClose={() => setPostSubmitVisible(false)}
        onBack={onBack}
      />

      <ClaimDraftHeaderBar activeDraftId={activeDraftId} />

      <SalaryClaimHeaderRow
        claimType={claimType}
        periodConfirmed={periodConfirmed}
        period={header.period}
        isClaimTypeLocked={isClaimTypeLocked}
        handleEditType={handleEditType}
        handleChangePeriod={handleChangePeriod}
        handleConfirmPeriod={handleConfirmPeriod}
        setHeader={setHeader}
        onPeriodChange={onPeriodChange}
      />
      {periodConfirmed && (
        <SalaryClaimBody
          headerPeriod={header.period}
          isSalaryAssignmentsLoading={isSalaryAssignmentsLoading}
          hasAssignedSalaryBaseline={hasAssignedSalaryBaseline}
          handleAddItem={handleAddItem}
          assignedSalarySnapshot={assignedSalarySnapshot}
          allowanceItems={allowanceItems}
          statutoryDeductionItems={statutoryDeductionItems}
          additionAdjustmentRows={additionAdjustmentRows}
          deductionAdjustmentRows={deductionAdjustmentRows}
          adjustedGrossSalary={adjustedGrossSalary}
          adjustedTotalDeductions={adjustedTotalDeductions}
          adjustedNetBeforeOvertime={adjustedNetBeforeOvertime}
          totalAmount={totalAmount}
          overtimeTotals={overtimeTotals}
          projectedNetPayout={projectedNetPayout}
          editingIndex={editingIndex}
          editSavedItem={editSavedItem}
          removeSavedItem={removeSavedItem}
          openAttachmentPreview={openAttachmentPreview}
          showForm={showForm}
          draftItem={draftItem}
          adjustmentFormRef={adjustmentFormRef}
          adjustmentDateInputRef={adjustmentDateInputRef}
          updateDraftItem={updateDraftItem}
          handleAttachmentChange={handleAttachmentChange}
          clearDraftAttachment={clearDraftAttachment}
          saveItem={saveItem}
          resetDraft={resetDraft}
          cancelAddItem={cancelAddItem}
          overtimeEligibilityResolved={overtimeEligibilityResolved}
          isOvertimeEligible={isOvertimeEligible}
          isSysAdmin={isSysAdmin}
          hasOvertimeEligibilityError={hasOvertimeEligibilityError}
          isOvertimeRowsLoading={isOvertimeRowsLoading}
          overtimeBaseMode={overtimeBaseMode}
          overtimeAutoHourlyBaseRate={overtimeAutoHourlyBaseRate}
          overtimeMonthlyDivisor={overtimeMonthlyDivisor}
          overtimePreviewHoursPerDay={overtimePreviewHoursPerDay}
          overtimeHourlySourceSummary={overtimeHourlySourceSummary}
          overtimeRowsForPeriod={overtimeRowsForPeriod}
          payrollBaselineConfirmed={payrollBaselineConfirmed}
          setPayrollBaselineConfirmed={setPayrollBaselineConfirmed}
          draftSyncSummary={draftSyncSummary}
          onBack={handleBack}
          saveDraft={saveDraft}
          submitClaim={submitClaim}
          isEditingSubmittedClaim={isEditingSubmittedClaim}
          isSubmittingClaim={isSubmittingClaim}
        />
      )}
    </div>
  )
}

export default SalaryClaimForm
