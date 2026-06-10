import React, { useCallback, useMemo, useRef, useState } from 'react'
import { CButton, CToaster } from '@coreui/react'
import BackButton from 'src/components/BackButton'
import FormActionGroup from 'src/components/FormActionGroup'
import ClaimLeaveModal from './ClaimLeaveModal'
import ClaimSubmitModal from './ClaimSubmitModal'
import { generateDraftId } from 'src/views/payroll/components/claimRecords'
import { useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import {
  buildLocalAutosaveKey,
  formatCurrency,
  formatDate,
  parseAmount,
} from './utils/claimFormUtils'
import {
  CATEGORY_GUIDANCE,
  CLAIM_CATEGORY_OPTIONS,
  CLAIM_PERIOD_OPTIONS,
  createClaimItem,
  DEFAULT_HEADER,
  EXCEPTIONAL_CATEGORY_GUIDANCE,
  EXCEPTIONAL_REASON_OPTIONS,
  getItemSummaryText,
  normalizeItem,
} from './utils/claimSubmissionUtils'
import useAttachmentManager from './hooks/useAttachmentManager'
import useClaimDraft from './hooks/useClaimDraft'
import useClaimSubmissionActions from './hooks/useClaimSubmissionActions'
import useClaimSubmissionHydration from './hooks/useClaimSubmissionHydration'
import AttachmentPreviewModal from './AttachmentPreviewModal'
import ClaimFormHeaderRow from './ClaimFormHeaderRow'
import ClaimSubmissionSavedItemsCard from './ClaimSubmissionSavedItemsCard'
import ClaimSubmissionEditorCard from './ClaimSubmissionEditorCard'
import ClaimPostSubmitModal from './ClaimPostSubmitModal'
import ClaimDraftHeaderBar from './ClaimDraftHeaderBar'
import useClaimToast from './hooks/useClaimToast'

const ExpenseOtherClaimForm = ({
  user,
  claimType = 'expense',
  onBack,
  onChangeType,
  onEditType,
  periodValue = '',
  periodConfirmed: periodConfirmedProp = false,
  onPeriodChange,
  onPeriodConfirmedChange,
  draftPayload,
}) => {
  const isExceptionalClaim = claimType === 'other'
  const isEditingSubmittedClaim = Boolean(String(draftPayload?.sourceClaimId || '').trim())
  const [header, setHeader] = useState({ ...DEFAULT_HEADER, period: periodValue || '' })
  const [periodConfirmed, setPeriodConfirmed] = useState(Boolean(periodConfirmedProp))
  const [showForm, setShowForm] = useState(false)
  const [savedItems, setSavedItems] = useState([])
  const [draftItem, setDraftItem] = useState(createClaimItem(claimType))
  const [editingIndex, setEditingIndex] = useState(null)
  const [leaveModalVisible, setLeaveModalVisible] = useState(false)
  const [submitModalVisible, setSubmitModalVisible] = useState(false)
  const [postSubmitVisible, setPostSubmitVisible] = useState(false)
  const [postSubmitClaimId, setPostSubmitClaimId] = useState('')
  const [submitDeclarationChecked, setSubmitDeclarationChecked] = useState(false)
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false)
  const pendingLeaveActionRef = useRef(null)
  const hasHydratedDraftRef = useRef(false)
  const { toaster, toast, addToast, pushToast } = useClaimToast()
  const draftType = isExceptionalClaim ? 'other' : 'expense'
  const [activeDraftId, setActiveDraftId] = useState(null)
  const [activeDraftBackendId, setActiveDraftBackendId] = useState(null)
  const { registerGuard, unregisterGuard, requestNavigation } = useNavigationGuard()

  const claimCategoryOptions = isExceptionalClaim
    ? EXCEPTIONAL_REASON_OPTIONS
    : CLAIM_CATEGORY_OPTIONS
  const categoryGuidance = isExceptionalClaim
    ? EXCEPTIONAL_CATEGORY_GUIDANCE[draftItem.category] || EXCEPTIONAL_CATEGORY_GUIDANCE.default
    : CATEGORY_GUIDANCE[draftItem.category] || CATEGORY_GUIDANCE.default

  const totalAmount = useMemo(
    () => savedItems.reduce((sum, item) => sum + parseAmount(item.amount), 0),
    [savedItems],
  )
  const submitLineItems = useMemo(
    () =>
      savedItems.map((item, index) => ({
        id: `${item.category || 'expense'}-${item.expenseDate || 'date'}-${index}`,
        title: item.category || 'Expense',
        meta: [formatDate(item.expenseDate)].filter(Boolean).join(' | '),
        note: getItemSummaryText(item),
        attachmentId: item.attachmentId || null,
        attachmentName: item.attachmentName || '',
        attachmentMimeType: item.attachmentMimeType || '',
        amount: formatCurrency(parseAmount(item.amount)),
      })),
    [savedItems],
  )

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
          ...normalizeItem(value?.draftItem || createClaimItem(claimType)),
          legacyAttachmentDataUrl: '',
        },
      }),
    [claimType],
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
      }),
    [buildSnapshot, draftItem, header.period, periodConfirmed, savedItems],
  )
  const localAutosaveKey = useMemo(
    () => buildLocalAutosaveKey(user?.id, draftType),
    [draftType, user?.id],
  )

  const updateHeader = (field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }))
    if (field === 'period' && onPeriodChange) {
      onPeriodChange(value)
    }
  }

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
        claimType,
        backendId: activeDraftBackendId || null,
        period: nextPeriod,
        periodConfirmed: Boolean(nextPeriodConfirmed),
        savedItems: sanitizedSavedItems,
        draftItem: {
          ...normalizeItem(nextDraftItem || createClaimItem(claimType)),
          legacyAttachmentDataUrl: '',
        },
        updatedAt: new Date().toISOString(),
      }
    },
    [
      activeDraftBackendId,
      activeDraftId,
      claimType,
      draftItem,
      draftType,
      header.period,
      periodConfirmed,
      savedItems,
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
    navGuardKey: 'claim-submission-form',
    navGuardMessage:
      'You have unsaved changes in this claim form. Leave this page and discard them?',
    registerGuard,
    unregisterGuard,
    pushToast,
    saveDraftSuccessMessage: `${isExceptionalClaim ? 'Exceptional' : 'Expense'} claim draft saved.`,
    suppressAutosave: isSubmittingClaim,
  })

  const resetDraft = useCallback(() => {
    const protectedAttachmentId = getProtectedEditingAttachmentId()
    const draftAttachmentId = Number(draftItem?.attachmentId || 0) || 0
    if (draftAttachmentId > 0 && draftAttachmentId !== protectedAttachmentId) {
      releaseAttachmentIds([draftAttachmentId])
    }
    setDraftItem(createClaimItem(claimType))
    setEditingIndex(null)
  }, [claimType, draftItem.attachmentId, getProtectedEditingAttachmentId, releaseAttachmentIds])

  useClaimSubmissionHydration({
    claimType,
    periodValue,
    periodConfirmedProp,
    headerPeriod: header.period,
    periodConfirmed,
    localAutosaveKey,
    draftPayload,
    claimCategoryOptions,
    hasHydratedDraftRef,
    setSavedItems,
    setDraftItem,
    setHeader,
    setShowForm,
    setActiveDraftId,
    setActiveDraftBackendId,
    setPeriodConfirmed,
    onPeriodChange,
    onPeriodConfirmedChange,
    setLastSavedSnapshot,
    buildSnapshot,
    initialSnapshot,
    pushToast,
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
  } = useClaimSubmissionActions({
    user,
    claimType,
    isExceptionalClaim,
    header,
    savedItems,
    draftItem,
    editingIndex,
    setSavedItems,
    setDraftItem,
    setEditingIndex,
    setShowForm,
    setPeriodConfirmed,
    setLeaveModalVisible,
    setSubmitModalVisible,
    setPostSubmitVisible,
    setPostSubmitClaimId,
    setSubmitDeclarationChecked,
    setActiveDraftId,
    setActiveDraftBackendId,
    activeDraftId,
    activeDraftBackendId,
    draftPayload,
    localAutosaveKey,
    pendingLeaveActionRef,
    hasUnsavedChanges,
    isClaimTypeLocked,
    buildDraftPayload,
    saveDraft,
    writeLocalBackup,
    pushToast,
    addToast,
    resetDraft,
    releaseAttachmentIds,
    onBack,
    requestNavigation,
    onEditType,
    onChangeType,
    onPeriodConfirmedChange,
    totalAmount,
    buildSnapshot,
    periodConfirmed,
    setIsSubmittingClaim,
    isSubmittingClaim,
    setLastSavedSnapshot,
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
      <ClaimSubmitModal
        visible={submitModalVisible}
        title={isExceptionalClaim ? 'Submit Exceptional Claim' : 'Submit Expense Claim'}
        summaryItems={[
          {
            label: 'Claim type',
            value: isExceptionalClaim ? 'Exceptional Claim' : 'Expense Claim',
          },
          {
            label: 'Claim period',
            value:
              CLAIM_PERIOD_OPTIONS.find((option) => option.value === header.period)?.label ||
              header.period,
          },
          { label: 'Saved items', value: `${savedItems.length}` },
        ]}
        lineItems={submitLineItems}
        lineItemsLabel={isExceptionalClaim ? 'Exceptional Item Summary' : 'Expense Item Summary'}
        lineItemsVariant="compact"
        totalLabel={isExceptionalClaim ? 'Total Exceptional Claim Amount' : 'Total Claim Amount'}
        totalValue={formatCurrency(totalAmount)}
        onPreviewAttachment={openAttachmentPreview}
        declarationId="expense-submit-declaration"
        declarationLabel={
          isExceptionalClaim
            ? 'I confirm this exceptional claim is policy-approved, not salary-related, and not a normal operating expense.'
            : 'I confirm these expenses were incurred for company business and supported by valid documents.'
        }
        declarationChecked={submitDeclarationChecked}
        onDeclarationChange={setSubmitDeclarationChecked}
        onClose={() => {
          if (isSubmittingClaim) return
          setSubmitModalVisible(false)
          setSubmitDeclarationChecked(false)
        }}
        onConfirm={confirmSubmit}
        isSubmitting={isSubmittingClaim}
        confirmLabel={isSubmittingClaim ? 'Submitting...' : 'Confirm Submit'}
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

      <ClaimFormHeaderRow
        claimType={claimType}
        periodConfirmed={periodConfirmed}
        periodLabel={
          CLAIM_PERIOD_OPTIONS.find((option) => option.value === header.period)?.label ||
          header.period
        }
        periodValue={header.period}
        periodOptions={CLAIM_PERIOD_OPTIONS}
        isClaimTypeLocked={isClaimTypeLocked}
        onEditType={handleEditType}
        onEditPeriod={handleChangePeriod}
        onConfirmPeriod={handleConfirmPeriod}
        onPeriodValueChange={(value) => updateHeader('period', value)}
      />

      {periodConfirmed && (
        <>
          <ClaimSubmissionSavedItemsCard
            isExceptionalClaim={isExceptionalClaim}
            savedItems={savedItems}
            editingIndex={editingIndex}
            totalAmount={totalAmount}
            onAddItem={handleAddItem}
            onEditItem={editSavedItem}
            onRemoveItem={removeSavedItem}
            onPreviewAttachment={openAttachmentPreview}
          />

          {showForm && (
            <ClaimSubmissionEditorCard
              isExceptionalClaim={isExceptionalClaim}
              claimCategoryOptions={claimCategoryOptions}
              categoryGuidance={categoryGuidance}
              draftItem={draftItem}
              editingIndex={editingIndex}
              onUpdateDraftItem={updateDraftItem}
              onAttachmentChange={handleAttachmentChange}
              onClearAttachment={clearDraftAttachment}
              onResetDraft={resetDraft}
              onCancelAddItem={cancelAddItem}
              onSaveItem={saveItem}
            />
          )}

          <div className="px-1 small text-body-secondary">{draftSyncSummary}</div>
          <FormActionGroup leading={<BackButton onClick={handleBack} label="Back to claims" />}>
            <CButton color="secondary" variant="outline" onClick={resetDraft}>
              Clear form
            </CButton>
            <CButton color="primary" onClick={submitClaim} disabled={isSubmittingClaim}>
              {isSubmittingClaim
                ? 'Submitting...'
                : isEditingSubmittedClaim
                  ? 'Update request'
                  : 'Submit request'}
            </CButton>
          </FormActionGroup>
        </>
      )}
    </div>
  )
}

export default ExpenseOtherClaimForm
