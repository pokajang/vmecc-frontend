import { useCallback } from 'react'
import {
  clearPayrollDraftRetryEntry,
  clearPayrollDraftRetryEntriesByType,
  deleteMyPayrollClaimDraftApiFirst,
  loadMyPayrollClaimDraftsApiFirst,
  submitMyPayrollClaimApiFirst,
} from 'src/services/payrollClaimsApi'
import { generateSubmissionKey } from '../utils/claimFormUtils'
import {
  CLAIM_PERIOD_OPTIONS,
  createClaimItem,
  normalizeItem,
  validateClaimSubmissionDraft,
} from '../utils/claimSubmissionUtils'
import useClaimSavedItemActions from './useClaimSavedItemActions'

const useClaimSubmissionActions = ({
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
}) => {
  const handleBack = useCallback(() => {
    if (!hasUnsavedChanges) {
      requestNavigation(() => onBack())
      return
    }
    pendingLeaveActionRef.current = () => requestNavigation(() => onBack())
    setLeaveModalVisible(true)
  }, [hasUnsavedChanges, onBack, pendingLeaveActionRef, requestNavigation, setLeaveModalVisible])

  const handleEditType = useCallback(async () => {
    if (isClaimTypeLocked) {
      pushToast(
        'Claim type is locked for this draft. Create a new claim to use a different claim type.',
        {
          title: 'Claim type locked',
          color: 'warning',
        },
      )
      return
    }
    const payload = (await saveDraft({ showNotice: false })) || buildDraftPayload()
    if (onEditType) {
      onEditType({ draftPayload: payload, claimType })
      return
    }
    if (onChangeType) {
      onChangeType('salary')
    }
  }, [
    buildDraftPayload,
    claimType,
    isClaimTypeLocked,
    onChangeType,
    onEditType,
    pushToast,
    saveDraft,
  ])

  const handleConfirmPeriod = useCallback(() => {
    if (!header.period) {
      pushToast('Please select a claim month to continue.', {
        title: 'Missing month',
        color: 'danger',
      })
      return
    }
    setPeriodConfirmed(true)
    if (onPeriodConfirmedChange) {
      onPeriodConfirmedChange(true)
    }
  }, [header.period, onPeriodConfirmedChange, pushToast, setPeriodConfirmed])

  const handleChangePeriod = useCallback(async () => {
    const payload = (await saveDraft({ showNotice: false })) || buildDraftPayload()
    if (onEditType) {
      onEditType({ draftPayload: payload, claimType, lockClaimType: isClaimTypeLocked })
      return
    }
    setPeriodConfirmed(false)
    setShowForm(false)
    if (onPeriodConfirmedChange) {
      onPeriodConfirmedChange(false)
    }
  }, [
    buildDraftPayload,
    claimType,
    isClaimTypeLocked,
    onEditType,
    onPeriodConfirmedChange,
    saveDraft,
    setPeriodConfirmed,
    setShowForm,
  ])

  const closeLeaveModal = useCallback(() => {
    setLeaveModalVisible(false)
    pendingLeaveActionRef.current = null
  }, [pendingLeaveActionRef, setLeaveModalVisible])

  const discardChangesAndLeave = useCallback(() => {
    const pendingAction = pendingLeaveActionRef.current
    const attachmentIds = [...savedItems.map((item) => item?.attachmentId), draftItem?.attachmentId]
    releaseAttachmentIds(attachmentIds)
    setLeaveModalVisible(false)
    pendingLeaveActionRef.current = null
    try {
      localStorage.removeItem(localAutosaveKey)
    } catch {}
    if (pendingAction) {
      pendingAction()
    }
  }, [
    draftItem?.attachmentId,
    localAutosaveKey,
    pendingLeaveActionRef,
    releaseAttachmentIds,
    savedItems,
    setLeaveModalVisible,
  ])

  const saveDraftAndLeave = useCallback(async () => {
    const pendingAction = pendingLeaveActionRef.current
    await saveDraft({ showNotice: false })
    setLeaveModalVisible(false)
    pendingLeaveActionRef.current = null
    if (pendingAction) {
      pendingAction()
    }
  }, [pendingLeaveActionRef, saveDraft, setLeaveModalVisible])

  const { cancelAddItem, editSavedItem, handleAddItem, removeSavedItem, saveItem } =
    useClaimSavedItemActions({
      addToast,
      buildDraftPayload,
      claimType,
      draftItem,
      editingIndex,
      header,
      isExceptionalClaim,
      pushToast,
      releaseAttachmentIds,
      resetDraft,
      saveDraft,
      savedItems,
      setDraftItem,
      setEditingIndex,
      setSavedItems,
      setShowForm,
      writeLocalBackup,
    })

  const submitClaim = useCallback(() => {
    if (isSubmittingClaim) return
    if (savedItems.length === 0) {
      pushToast('Add at least one saved claim item before submitting.', {
        title: 'Nothing to submit',
        color: 'warning',
      })
      return
    }
    if (editingIndex !== null) {
      pushToast('Finish updating the current item or cancel edit mode before submitting.', {
        title: 'Item in edit mode',
        color: 'warning',
      })
      return
    }
    setSubmitDeclarationChecked(false)
    setSubmitModalVisible(true)
  }, [
    editingIndex,
    isSubmittingClaim,
    pushToast,
    savedItems.length,
    setSubmitDeclarationChecked,
    setSubmitModalVisible,
  ])

  const confirmSubmit = useCallback(async () => {
    if (isSubmittingClaim) return
    const periodLabel =
      CLAIM_PERIOD_OPTIONS.find((option) => option.value === header.period)?.label ||
      header.period ||
      ''
    const sourceClaimId = String(draftPayload?.sourceClaimId || '').trim()
    const sourceServerId = draftPayload?.sourceServerId || null
    const isEditingSubmittedClaimRecord = Boolean(sourceClaimId)
    const resolvedItems = savedItems.map((item) => ({
      ...normalizeItem(item),
      legacyAttachmentDataUrl: '',
    }))
    const invalidItem = resolvedItems
      .map((item, index) => ({
        index,
        error: validateClaimSubmissionDraft(item, isExceptionalClaim),
      }))
      .find((entry) => Boolean(entry.error))
    if (invalidItem?.error) {
      pushToast(`Claim item ${invalidItem.index + 1}: ${invalidItem.error}`, {
        title: 'Invalid claim item',
        color: 'danger',
      })
      return
    }
    const hasInvalidAttachment = resolvedItems.some(
      (item) =>
        !item?.attachmentId || item?.attachmentUploadState === 'uploading' || item?.needsReattach,
    )
    if (hasInvalidAttachment) {
      pushToast(
        'Some item attachments are missing or not uploaded. Reattach and retry submission.',
        {
          title: 'Attachment required',
          color: 'danger',
        },
      )
      return
    }
    const submissionKey = generateSubmissionKey(claimType, user?.id)
    setIsSubmittingClaim(true)
    try {
      const baseRecordPayload = {
        period: periodLabel,
        periodValue: header.period,
        category:
          savedItems.length === 1
            ? savedItems[0]?.category || (isExceptionalClaim ? 'Exceptional' : 'Expense')
            : savedItems.length > 1
              ? 'Multiple'
              : isExceptionalClaim
                ? 'Exceptional'
                : 'Expense',
        amount: totalAmount,
        attachmentAvailable: resolvedItems.some((item) => item.attachmentName),
        attachmentName: resolvedItems.find((item) => item.attachmentName)?.attachmentName || '',
        attachmentMimeType:
          resolvedItems.find((item) => item.attachmentMimeType)?.attachmentMimeType || '',
        attachmentSizeBytes:
          resolvedItems.find((item) => item.attachmentSizeBytes)?.attachmentSizeBytes || 0,
        attachmentId: resolvedItems.find((item) => item.attachmentId)?.attachmentId || null,
        notes: savedItems[0]?.lineNotes || '',
        items: resolvedItems.map((item) => ({ ...item })),
        type: claimType,
        sourceDraftId: String(activeDraftId || draftPayload?.id || '').trim() || null,
        sourceDraftType: claimType,
        submissionKey,
      }
      const submitResult = await submitMyPayrollClaimApiFirst(baseRecordPayload, sourceServerId)
      if (!submitResult?.ok || !submitResult?.data) {
        pushToast('Unable to submit claim to backend. Please retry.', {
          title: 'Submit failed',
          color: 'danger',
        })
        return
      }
      const record = { ...submitResult.data }
      const consumedDraftId = String(
        record?.consumedDraftId || record?.consumed_draft_id || '',
      ).trim()
      const currentDraftIds = [
        String(activeDraftId || '').trim(),
        String(draftPayload?.id || '').trim(),
      ].filter(Boolean)
      const backendConsumedCurrentDraft =
        consumedDraftId !== '' && currentDraftIds.includes(consumedDraftId)

      if ((activeDraftId || draftPayload?.id) && !backendConsumedCurrentDraft) {
        let resolvedDraftBackendId =
          Number(activeDraftBackendId || draftPayload?.backendId || 0) || 0
        if (!resolvedDraftBackendId) {
          const draftLookupId = String(activeDraftId || draftPayload?.id || '').trim()
          const draftLookupType = String(claimType || 'expense').trim() || 'expense'
          if (draftLookupId) {
            const lookup = await loadMyPayrollClaimDraftsApiFirst(user?.id, draftLookupType)
            if (lookup?.ok) {
              const matched = (Array.isArray(lookup?.data) ? lookup.data : []).find(
                (entry) => String(entry?.id || '').trim() === draftLookupId,
              )
              resolvedDraftBackendId = Number(matched?.backendId || 0) || 0
            }
          }
        }
        if (resolvedDraftBackendId) {
          const draftDeleteResult = await deleteMyPayrollClaimDraftApiFirst({
            backendId: resolvedDraftBackendId,
          })
          if (!draftDeleteResult?.ok) {
            pushToast('Unable to delete draft from backend. Please retry.', {
              title: 'Draft delete failed',
              color: 'warning',
            })
          }
        }
      }
      const draftRetryIds = Array.from(
        new Set(
          [activeDraftId, draftPayload?.id, consumedDraftId]
            .map((value) => String(value || '').trim())
            .filter(Boolean),
        ),
      )
      draftRetryIds.forEach((draftId) => {
        clearPayrollDraftRetryEntry(user?.id, claimType, draftId)
      })
      clearPayrollDraftRetryEntriesByType(user?.id, claimType)
      setActiveDraftId(null)
      setActiveDraftBackendId(null)
      if (isEditingSubmittedClaimRecord) {
        pushToast(`Claim ${record.id} updated and resubmitted.`, {
          title: 'Claim updated',
          color: 'success',
        })
      }
      setPostSubmitClaimId(record.id)
      setPostSubmitVisible(true)
      setSubmitModalVisible(false)
      setSubmitDeclarationChecked(false)
      setSavedItems([])
      setDraftItem(createClaimItem(claimType))
      setEditingIndex(null)
      setShowForm(false)
      setLastSavedSnapshot(
        buildSnapshot({
          period: header.period,
          periodConfirmed: Boolean(periodConfirmed),
          savedItems: [],
          draftItem: createClaimItem(claimType),
        }),
      )
      try {
        localStorage.removeItem(localAutosaveKey)
      } catch {}
    } finally {
      setIsSubmittingClaim(false)
    }
  }, [
    activeDraftBackendId,
    activeDraftId,
    buildSnapshot,
    claimType,
    draftPayload,
    header.period,
    isSubmittingClaim,
    isExceptionalClaim,
    localAutosaveKey,
    periodConfirmed,
    pushToast,
    savedItems,
    setActiveDraftBackendId,
    setActiveDraftId,
    setDraftItem,
    setEditingIndex,
    setIsSubmittingClaim,
    setLastSavedSnapshot,
    setPostSubmitClaimId,
    setPostSubmitVisible,
    setSavedItems,
    setShowForm,
    setSubmitDeclarationChecked,
    setSubmitModalVisible,
    totalAmount,
    user?.id,
  ])

  return {
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
  }
}

export default useClaimSubmissionActions
