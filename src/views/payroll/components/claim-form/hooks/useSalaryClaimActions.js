import { useCallback } from 'react'
import {
  createSalaryItem,
  normalizeItem,
  validateSalaryAdjustmentDraft,
} from '../utils/salaryClaimUtils'
import useSalaryClaimSubmit from './useSalaryClaimSubmit'

const useSalaryClaimActions = ({
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
  period,
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
  headerPeriod,
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
}) => {
  const requestLeave = useCallback(
    (action) => {
      if (!hasUnsavedChanges) {
        action()
        return
      }
      pendingLeaveActionRef.current = action
      setLeaveModalVisible(true)
    },
    [hasUnsavedChanges, pendingLeaveActionRef, setLeaveModalVisible],
  )

  const handleBack = useCallback(() => {
    requestLeave(() => requestNavigation(() => onBack()))
  }, [onBack, requestLeave, requestNavigation])

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
      onChangeType('expense')
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
    if (!period) {
      pushToast('Please select a payroll month to continue.', {
        title: 'Missing month',
        color: 'danger',
      })
      return
    }
    setPayrollBaselineConfirmed(false)
    setPeriodConfirmed(true)
    if (onPeriodConfirmedChange) {
      onPeriodConfirmedChange(true)
    }
  }, [onPeriodConfirmedChange, period, pushToast, setPayrollBaselineConfirmed, setPeriodConfirmed])

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
    } catch {
      // ignore storage errors
    }
    if (pendingAction) pendingAction()
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
    if (pendingAction) pendingAction()
  }, [pendingLeaveActionRef, saveDraft, setLeaveModalVisible])

  const validateDraft = useCallback(() => {
    return validateSalaryAdjustmentDraft(draftItem)
  }, [draftItem])

  const saveItem = useCallback(() => {
    const error = validateDraft()
    if (error) {
      pushToast(error, { title: 'Incomplete item', color: 'danger' })
      return
    }
    const normalizedItem = normalizeItem({ ...draftItem })
    const previousItem = editingIndex !== null ? savedItems[editingIndex] : null
    const previousAttachmentId = Number(previousItem?.attachmentId || 0) || 0
    const nextAttachmentId = Number(normalizedItem?.attachmentId || 0) || 0
    const nextSavedItems =
      editingIndex !== null
        ? savedItems.map((item, index) => (index === editingIndex ? normalizedItem : item))
        : [...savedItems, normalizedItem]
    const nextDraftItem = createSalaryItem()
    setSavedItems(nextSavedItems)

    pushToast(`Adjustment item ${editingIndex !== null ? 'updated' : 'saved'}.`, {
      title: 'Item saved',
      color: 'success',
    })
    setDraftItem(nextDraftItem)
    setEditingIndex(null)
    if (editingIndex === null) {
      setShowForm(false)
    }
    const payload = buildDraftPayload({
      savedItems: nextSavedItems,
      draftItem: nextDraftItem,
    })
    writeLocalBackup(payload)
    void saveDraft({
      showNotice: false,
      showErrorNotice: false,
      payloadOverride: payload,
      syncSource: 'item-commit',
    })
    if (previousAttachmentId > 0 && previousAttachmentId !== nextAttachmentId) {
      releaseAttachmentIds([previousAttachmentId])
    }
  }, [
    buildDraftPayload,
    draftItem,
    editingIndex,
    pushToast,
    releaseAttachmentIds,
    saveDraft,
    savedItems,
    setDraftItem,
    setEditingIndex,
    setSavedItems,
    setShowForm,
    validateDraft,
    writeLocalBackup,
  ])

  const editSavedItem = useCallback(
    (index) => {
      const item = savedItems[index]
      if (!item) return
      setDraftItem(normalizeItem({ ...item }))
      setEditingIndex(index)
      setShowForm(true)
    },
    [savedItems, setDraftItem, setEditingIndex, setShowForm],
  )

  const removeSavedItem = useCallback(
    (index) => {
      const removedItem = savedItems[index]
      const nextSavedItems = savedItems.filter((_, itemIndex) => itemIndex !== index)
      setSavedItems(nextSavedItems)
      const payloadOverrides = {
        savedItems: nextSavedItems,
      }
      if (editingIndex === index) {
        setDraftItem(createSalaryItem())
        setEditingIndex(null)
        payloadOverrides.draftItem = createSalaryItem()
      } else if (editingIndex !== null && index < editingIndex) {
        setEditingIndex((prev) => prev - 1)
      }
      pushToast('Adjustment item removed.', { title: 'Item removed', color: 'info' })
      const payload = buildDraftPayload(payloadOverrides)
      writeLocalBackup(payload)
      void saveDraft({
        showNotice: false,
        showErrorNotice: false,
        payloadOverride: payload,
        syncSource: 'item-remove',
      })
      releaseAttachmentIds([removedItem?.attachmentId])
    },
    [
      buildDraftPayload,
      editingIndex,
      pushToast,
      releaseAttachmentIds,
      saveDraft,
      savedItems,
      setDraftItem,
      setEditingIndex,
      setSavedItems,
      writeLocalBackup,
    ],
  )

  const submitClaim = useCallback(() => {
    if (isSubmittingClaim) return
    if (!hasAssignedSalaryBaseline) {
      pushToast("Your salary and allowances haven't been set yet. Please contact HR/Admin.", {
        title: 'Salary baseline unavailable',
        color: 'warning',
      })
      return
    }
    if (!payrollBaselineConfirmed) {
      pushToast('Confirm the assigned salary payout snapshot before submitting for review.', {
        title: 'Payout confirmation required',
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
    hasAssignedSalaryBaseline,
    payrollBaselineConfirmed,
    pushToast,
    isSubmittingClaim,
    setSubmitDeclarationChecked,
    setSubmitModalVisible,
  ])

  const confirmSubmit = useSalaryClaimSubmit({
    user,
    draftPayload,
    headerPeriod,
    savedItems,
    pushToast,
    overtimeBaseMode,
    overtimeAutoHourlyBaseRate,
    overtimeMonthlyDivisor,
    overtimeGlobalNormalHoursPerDay,
    overtimeRateMultipliers,
    overtimeRowsForPeriod,
    overtimeTotals,
    totalClaimImpact,
    assignedSalarySnapshot,
    payrollBaselineConfirmed,
    totalAmount,
    projectedNetPayout,
    activeDraftId,
    activeDraftBackendId,
    periodConfirmed,
    setActiveDraftId,
    setActiveDraftBackendId,
    setPostSubmitClaimId,
    setPostSubmitVisible,
    setSubmitModalVisible,
    setSubmitDeclarationChecked,
    setPayrollBaselineConfirmed,
    setSavedItems,
    setDraftItem,
    setEditingIndex,
    setShowForm,
    setLastSavedSnapshot,
    buildSnapshot,
    setIsSubmittingClaim,
    isSubmittingClaim,
    localAutosaveKey,
  })

  const handleAddItem = useCallback(() => {
    setShowForm(true)
    if (editingIndex === null) {
      setDraftItem(createSalaryItem())
      setEditingIndex(null)
    }
  }, [editingIndex, setDraftItem, setEditingIndex, setShowForm])

  const cancelAddItem = useCallback(() => {
    setDraftItem(createSalaryItem())
    setEditingIndex(null)
    setShowForm(false)
  }, [setDraftItem, setEditingIndex, setShowForm])

  return {
    requestLeave,
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

export default useSalaryClaimActions
