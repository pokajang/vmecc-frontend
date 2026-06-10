import { useMemo, useState } from 'react'
import {
  cancelMyOvertimeApiFirst,
  clearMyOvertimeDraftApiFirst,
  deleteMyOvertimeApiFirst,
  saveMyOvertimeDraftApiFirst,
  submitMyOvertimeApiFirst,
} from 'src/services/overtimeApi'
import {
  createApprovalHistoryEntry,
  formatDuration,
  getDisplayOvertimeId,
  normalizeOvertimeType,
} from '../utils'
import { normalizeOvertimeDraftPayload, buildFormSnapshot } from '../domain/overtimeFormDomain'
import {
  normalizeRoleList,
  OT_INELIGIBLE_MESSAGE,
  resolveWorkflowMetadataForSubmit,
} from '../domain/overtimeWorkflowDomain'

const useOvertimeActions = ({
  userId,
  userRoles,
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
  form,
  isOvertimeTypeDeriving,
}) => {
  const [isSubmitConfirmVisible, setIsSubmitConfirmVisible] = useState(false)
  const [submitPreview, setSubmitPreview] = useState(null)
  const [cancelPreviewRecordId, setCancelPreviewRecordId] = useState('')
  const [deletePreviewRecordId, setDeletePreviewRecordId] = useState('')
  const [isCancelConfirmVisible, setIsCancelConfirmVisible] = useState(false)
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)
  const [isDiscardDraftChangesConfirmVisible, setIsDiscardDraftChangesConfirmVisible] =
    useState(false)
  const [isDraftSaving, setIsDraftSaving] = useState(false)
  const [isFormClearing, setIsFormClearing] = useState(false)
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false)
  const isFormActionBusy =
    isDraftSaving || isFormClearing || isSubmittingClaim || isOvertimeTypeDeriving

  const cancelPreviewRecord = useMemo(
    () =>
      overtimeRecords.find(
        (row) => String(row?.id || '') === String(cancelPreviewRecordId || ''),
      ) || null,
    [cancelPreviewRecordId, overtimeRecords],
  )

  const deletePreviewRecord = useMemo(() => {
    const previewId = String(deletePreviewRecordId || '')
    if (!previewId) return null
    if (draftListRow && String(draftListRow?.id || '') === previewId) {
      return draftListRow
    }
    return overtimeRecords.find((row) => String(row?.id || '') === previewId) || null
  }, [deletePreviewRecordId, draftListRow, overtimeRecords])

  const closeSubmitConfirmModal = () => {
    setIsSubmitConfirmVisible(false)
    setSubmitPreview(null)
  }

  const closeCancelConfirmModal = () => {
    setIsCancelConfirmVisible(false)
    setCancelPreviewRecordId('')
  }

  const closeDeleteConfirmModal = () => {
    setIsDeleteConfirmVisible(false)
    setDeletePreviewRecordId('')
  }

  const validateSubmission = () => {
    const nextErrors = {}

    if (
      (!isResumeEditMode && !overtimeTypeDerivedMode && !form.overtimeTypeConfirmed) ||
      !form.overtimeType
    ) {
      nextErrors.overtimeType = 'Overtime type is required.'
      form.setFieldErrors(nextErrors)
      pushToast('Choose overtime type before submitting.', {
        title: 'Validation error',
        color: 'danger',
      })
      return false
    }

    if (!form.claimDate || !form.startTime || !form.endTime || !form.reason.trim()) {
      if (!form.claimDate) nextErrors.claimDate = 'Date is required.'
      if (!form.startTime) nextErrors.startTime = 'Start time is required.'
      if (!form.endTime) nextErrors.endTime = 'End time is required.'
      if (!form.reason.trim()) nextErrors.reason = 'Reason is required.'
      form.setFieldErrors(nextErrors)
      pushToast('Date, start time, end time, and reason are required before submitting.', {
        title: 'Validation error',
        color: 'danger',
      })
      return false
    }

    if (form.durationMinutes <= 0) {
      nextErrors.window = 'Overtime duration must be more than 0 minutes.'
      form.setFieldErrors(nextErrors)
      pushToast('Overtime duration must be more than 0 minutes.', {
        title: 'Validation error',
        color: 'danger',
      })
      return false
    }

    if (form.reason.trim().length < 10) {
      nextErrors.reason = 'Provide at least 10 characters for reason/work done.'
      form.setFieldErrors(nextErrors)
      pushToast('Reason must be at least 10 characters for audit clarity.', {
        title: 'Validation error',
        color: 'danger',
      })
      return false
    }

    form.setFieldErrors({})
    return true
  }

  const buildSubmitPreview = () => ({
    editingRecordId: hasPersistedEditTarget ? editingRecordId : null,
    isResubmission: isResubmittingClaim,
    overtimeType: normalizeOvertimeType(form.overtimeType),
    claimDate: form.claimDate,
    startTime: form.startTime,
    endTime: form.endTime,
    isOvernight: form.isOvernight,
    durationMinutes: form.durationMinutes,
    reason: form.reason.trim(),
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isFormActionBusy) return
    if (!validateSubmission()) return
    setSubmitPreview(buildSubmitPreview())
    setIsSubmitConfirmVisible(true)
  }

  const confirmAndSubmit = async () => {
    if (!submitPreview || isSubmittingClaim) return

    setIsSubmittingClaim(true)
    try {
      const now = new Date()
      const existingRecord = submitPreview.editingRecordId
        ? overtimeRecords.find((record) => record.id === submitPreview.editingRecordId)
        : null
      const appliedAt = existingRecord?.appliedAt || now.toISOString()
      const applicantRoles = normalizeRoleList(
        existingRecord?.applicantRoles?.length > 0 ? existingRecord.applicantRoles : userRoles,
      )
      const workflowMetadata = resolveWorkflowMetadataForSubmit(
        existingRecord,
        applicantRoles,
        overtimePolicy,
      )
      const submitHistoryEntry = createApprovalHistoryEntry(
        existingRecord ? 'Resubmitted' : 'Submitted',
        actorName,
        existingRecord ? 'Overtime claim resubmitted.' : 'Overtime claim submitted.',
        now,
        { byUserId: String(userId || '').trim() },
      )
      const baseApprovalHistory = Array.isArray(existingRecord?.approvalHistory)
        ? existingRecord.approvalHistory
        : []

      const nextRecord = {
        ...(existingRecord || {}),
        id: existingRecord?.id || '',
        overtimeType: normalizeOvertimeType(submitPreview.overtimeType),
        claimDate: submitPreview.claimDate,
        startTime: submitPreview.startTime,
        endTime: submitPreview.endTime,
        isOvernight: submitPreview.isOvernight,
        durationMinutes: submitPreview.durationMinutes,
        durationLabel: formatDuration(submitPreview.durationMinutes),
        reason: submitPreview.reason,
        status: 'Pending',
        appliedAt,
        submittedBy: existingRecord?.submittedBy || actorName,
        workflowSnapshot: workflowMetadata.workflowSnapshot,
        workflowStage: workflowMetadata.workflowStage,
        nextActionRole: workflowMetadata.nextActionRole,
        applicantRoles: workflowMetadata.applicantRoles,
        approvalHistory: [...baseApprovalHistory, submitHistoryEntry].slice(-20),
      }

      let persistedRecord = nextRecord
      const submitResult = await submitMyOvertimeApiFirst(
        userId,
        nextRecord,
        existingRecord?.serverId || null,
      )
      if (submitResult?.ok && submitResult?.data) {
        persistedRecord = { ...nextRecord, ...submitResult.data }
        if (isOvertimeGuidanceEnabled && submitResult?.meta?.overtime_type_adjusted_message) {
          pushToast(submitResult.meta.overtime_type_adjusted_message, {
            title: 'Recommended overtime type',
            color: 'info',
          })
        }
      } else if (!submitResult?.ok) {
        if (submitResult?.isIneligible) {
          pushToast(OT_INELIGIBLE_MESSAGE, { title: 'Overtime not applicable', color: 'warning' })
        } else {
          pushToast('Unable to submit overtime. API request failed.', {
            title: 'Submit failed',
            color: 'danger',
          })
        }
        return
      }
      const nextRecords = existingRecord
        ? overtimeRecords.map((record) =>
            record.id === existingRecord.id || record.id === persistedRecord.id
              ? persistedRecord
              : record,
          )
        : [persistedRecord, ...overtimeRecords]

      setOvertimeRecords(nextRecords)
      const clearResult = await clearMyOvertimeDraftApiFirst(userId)
      if (!clearResult?.ok) {
        pushToast('Overtime submitted, but clearing draft cache failed on backend.', {
          title: 'Submitted with warning',
          color: 'warning',
        })
      }
      setOvertimeDraft(null)
      closeSubmitConfirmModal()
      resetForm()
      navigate('/overtime')

      pushToast(
        `Overtime claim ${getDisplayOvertimeId(persistedRecord)} ${
          existingRecord ? 'resubmitted' : 'submitted'
        } (${submitPreview.durationMinutes} minute(s)).`,
        {
          title: existingRecord ? 'Resubmitted' : 'Submitted',
          color: 'success',
        },
      )
    } finally {
      setIsSubmittingClaim(false)
    }
  }

  const handleDraft = async () => {
    if (isFormActionBusy) return
    setIsDraftSaving(true)
    try {
      const draftPayload = {
        overtimeType: normalizeOvertimeType(form.overtimeType),
        overtimeTypeConfirmed:
          overtimeTypeDerivedMode || isResumeEditMode ? true : Boolean(form.overtimeTypeConfirmed),
        claimDate: form.claimDate,
        startTime: form.startTime,
        endTime: form.endTime,
        reason: form.reason,
        sourceRecordId: hasPersistedEditTarget ? String(editingRecordId || '').trim() : '',
        savedAt: new Date().toISOString(),
      }
      const result = await saveMyOvertimeDraftApiFirst(userId, draftPayload)
      if (!result.ok) {
        if (result?.isIneligible) {
          pushToast(OT_INELIGIBLE_MESSAGE, { title: 'Overtime not applicable', color: 'warning' })
        } else {
          pushToast('Unable to save overtime draft to backend. Please retry.', {
            title: 'Draft failed',
            color: 'danger',
          })
        }
        return
      }
      setOvertimeDraft(normalizeOvertimeDraftPayload(draftPayload))
      form.setFormBaseline(
        buildFormSnapshot({
          editingRecordId,
          overtimeType: normalizeOvertimeType(form.overtimeType),
          overtimeTypeConfirmed:
            overtimeTypeDerivedMode || isResumeEditMode
              ? true
              : Boolean(form.overtimeTypeConfirmed),
          claimDate: form.claimDate,
          startTime: form.startTime,
          endTime: form.endTime,
          reason: form.reason,
        }),
      )
      navigate('/overtime')
      pushToast('Overtime draft saved.', { title: 'Draft saved', color: 'success' })
    } finally {
      setIsDraftSaving(false)
    }
  }

  const confirmDiscardDraftChanges = async () => {
    if (!hasPersistedEditTarget || !isLinkedDraftForEditing) {
      setIsDiscardDraftChangesConfirmVisible(false)
      return
    }
    setIsFormClearing(true)
    try {
      const clearResult = await clearMyOvertimeDraftApiFirst(userId)
      if (!clearResult?.ok) {
        pushToast('Unable to discard linked overtime draft changes from backend. Please retry.', {
          title: 'Discard failed',
          color: 'danger',
        })
        return
      }
      setOvertimeDraft(null)
      const restored = resetFormToSubmittedRecord()
      setIsDiscardDraftChangesConfirmVisible(false)
      if (!restored) {
        pushToast('Submitted overtime record is unavailable for reset.', {
          title: 'Reset unavailable',
          color: 'warning',
        })
        return
      }
      pushToast('Draft changes discarded. Reverted to submitted overtime values.', {
        title: 'Draft discarded',
        color: 'info',
      })
    } finally {
      setIsFormClearing(false)
    }
  }

  const handleClearForm = async () => {
    if (isFormActionBusy) return
    if (hasPersistedEditTarget) {
      if (isLinkedDraftForEditing) {
        setIsDiscardDraftChangesConfirmVisible(true)
        return
      }
      const restored = resetFormToSubmittedRecord()
      if (!restored) {
        pushToast('Submitted overtime record is unavailable for reset.', {
          title: 'Reset unavailable',
          color: 'warning',
        })
        return
      }
      pushToast('Form reset to submitted overtime values.', {
        title: 'Reset complete',
        color: 'info',
      })
      return
    }
    setIsFormClearing(true)
    try {
      const clearResult = await clearMyOvertimeDraftApiFirst(userId)
      if (!clearResult?.ok) {
        pushToast('Unable to clear overtime draft from backend. Please retry.', {
          title: 'Clear failed',
          color: 'danger',
        })
        return
      }
      setOvertimeDraft(null)
      resetForm()
    } finally {
      setIsFormClearing(false)
    }
  }

  const cancelOvertime = (row) => {
    if (!row?.id) return
    if (row.status === 'Cancelled') {
      pushToast(`Overtime claim ${getDisplayOvertimeId(row)} is already cancelled.`, {
        title: 'No changes',
        color: 'info',
      })
      return
    }
    setCancelPreviewRecordId(String(row.id))
    setIsCancelConfirmVisible(true)
  }

  const confirmCancelOvertime = async () => {
    if (!cancelPreviewRecord?.id) return
    if (cancelPreviewRecord.status === 'Cancelled') {
      closeCancelConfirmModal()
      pushToast(
        `Overtime claim ${getDisplayOvertimeId(cancelPreviewRecord)} is already cancelled.`,
        {
          title: 'No changes',
          color: 'info',
        },
      )
      return
    }
    if (!cancelPreviewRecord?.serverId) {
      pushToast('Unable to cancel overtime. Backend record id is missing.', {
        title: 'Cancel failed',
        color: 'danger',
      })
      return
    }
    const apiResult = await cancelMyOvertimeApiFirst(cancelPreviewRecord.serverId)
    if (!apiResult?.ok || !apiResult?.data) {
      pushToast('Unable to cancel overtime. API request failed.', {
        title: 'Cancel failed',
        color: 'danger',
      })
      return
    }
    const apiRow = { ...cancelPreviewRecord, ...apiResult.data }
    setOvertimeRecords((prev) =>
      prev.map((record) =>
        record.id === cancelPreviewRecord.id ? { ...record, ...apiRow } : record,
      ),
    )
    closeCancelConfirmModal()
    pushToast(`Overtime claim ${getDisplayOvertimeId(cancelPreviewRecord)} cancelled.`, {
      title: 'Cancelled',
      color: 'warning',
    })
  }

  const deleteOvertime = (row) => {
    if (!row?.id) return
    if (row?.isDraft) {
      setDeletePreviewRecordId(String(row.id))
      setIsDeleteConfirmVisible(true)
      return
    }
    if (row.status !== 'Cancelled') {
      pushToast('Delete is only available for cancelled overtime claims.', {
        title: 'Delete unavailable',
        color: 'warning',
      })
      return
    }
    setDeletePreviewRecordId(String(row.id))
    setIsDeleteConfirmVisible(true)
  }

  const confirmDeleteOvertime = async () => {
    if (!deletePreviewRecord?.id) return
    if (deletePreviewRecord?.isDraft) {
      const clearResult = await clearMyOvertimeDraftApiFirst(userId)
      if (!clearResult?.ok) {
        pushToast('Unable to delete overtime draft from backend. Please retry.', {
          title: 'Delete failed',
          color: 'danger',
        })
        return
      }
      setOvertimeDraft(null)
      closeDeleteConfirmModal()
      pushToast('Overtime draft deleted.', { title: 'Deleted', color: 'danger' })
      return
    }
    if (deletePreviewRecord.status !== 'Cancelled') {
      closeDeleteConfirmModal()
      pushToast('This overtime claim can no longer be deleted.', {
        title: 'Delete unavailable',
        color: 'warning',
      })
      return
    }
    if (!deletePreviewRecord?.serverId) {
      pushToast('Unable to delete overtime. Backend record id is missing.', {
        title: 'Delete failed',
        color: 'danger',
      })
      return
    }
    const apiResult = await deleteMyOvertimeApiFirst(deletePreviewRecord.serverId)
    if (!apiResult?.ok) {
      pushToast('Unable to delete overtime. API request failed.', {
        title: 'Delete failed',
        color: 'danger',
      })
      return
    }
    setOvertimeRecords((prev) => prev.filter((record) => record.id !== deletePreviewRecord.id))
    if (overtimeId === deletePreviewRecord.id) {
      navigate('/overtime')
    }
    closeDeleteConfirmModal()
    pushToast(`Overtime claim ${getDisplayOvertimeId(deletePreviewRecord)} deleted.`, {
      title: 'Deleted',
      color: 'danger',
    })
  }

  return {
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
  }
}

export default useOvertimeActions
