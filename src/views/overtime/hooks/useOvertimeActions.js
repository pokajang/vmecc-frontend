import { useCallback, useMemo, useState } from 'react'
import {
  cancelMyOvertimeApiFirst,
  clearMyOvertimeDraftApiFirst,
  deleteMyOvertimeAttachmentApiFirst,
  deleteMyOvertimeApiFirst,
  saveMyOvertimeDraftApiFirst,
  submitMyOvertimeApiFirst,
  uploadMyOvertimeAttachmentApiFirst,
} from 'src/services/overtimeApi'
import { formatDuration, getDisplayOvertimeId, normalizeOvertimeType } from '../utils'
import { normalizeOvertimeDraftPayload, buildFormSnapshot } from '../domain/overtimeFormDomain'
import { OT_INELIGIBLE_MESSAGE } from '../domain/overtimeWorkflowDomain'
import { validateOvertimeSubmission } from '../domain/overtimeValidation'
import useWorkflowDraftAutosave from 'src/hooks/useWorkflowDraftAutosave'

const isSameOvertimeRecordId = (lhs, rhs) => String(lhs ?? '') === String(rhs ?? '')
const createSubmissionKey = () =>
  globalThis.crypto?.randomUUID?.() || `ot-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`

const useOvertimeActions = ({
  userId,
  overtimeRecords,
  setOvertimeRecords,
  setOvertimeDraft,
  overtimeDraft,
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
  autosaveEnabled = false,
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
  const [isAttachmentUploading, setIsAttachmentUploading] = useState(false)
  const isFormActionBusy =
    isDraftSaving ||
    isFormClearing ||
    isSubmittingClaim ||
    isAttachmentUploading ||
    isOvertimeTypeDeriving
  const formActionStatus = isSubmittingClaim
    ? isResubmittingClaim
      ? 'Resubmitting overtime claim...'
      : 'Submitting overtime claim...'
    : isDraftSaving
      ? 'Saving overtime draft...'
      : isFormClearing
        ? 'Clearing overtime form...'
        : isAttachmentUploading
          ? 'Uploading evidence attachment...'
          : isOvertimeTypeDeriving
            ? 'Checking overtime type...'
            : ''
  const persistedAttachmentId = useMemo(() => {
    if (!hasPersistedEditTarget) return null
    const record = overtimeRecords.find((row) => isSameOvertimeRecordId(row?.id, editingRecordId))
    return record?.attachmentId || record?.attachment?.id || null
  }, [editingRecordId, hasPersistedEditTarget, overtimeRecords])

  const explainBusyAction = () => {
    pushToast(formActionStatus || 'Please wait for the current overtime action to finish.', {
      title: 'Please wait',
      color: 'info',
    })
  }

  const handleAttachmentUpload = async (file) => {
    if (!file) return
    if (isFormActionBusy) {
      explainBusyAction()
      return
    }
    const allowed =
      /^(application\/pdf|image\/(jpeg|png)|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/msword)$/.test(
        file.type,
      )
    if (!allowed || file.size > 10 * 1024 * 1024) {
      form.setFieldErrors((prev) => ({
        ...prev,
        attachment: 'Attach a PDF, JPG, PNG, DOC, or DOCX file up to 10 MB.',
      }))
      return
    }
    setIsAttachmentUploading(true)
    try {
      const previousAttachmentId = form.attachmentId || null
      const result = await uploadMyOvertimeAttachmentApiFirst(file)
      if (!result?.ok || !result?.data) {
        pushToast('Unable to upload overtime evidence. Please retry.', {
          title: 'Upload failed',
          color: 'danger',
        })
        return
      }
      const nextAttachment = {
        id: result.data.id,
        originalName: result.data.original_name || result.data.originalName || file.name,
        mimeType: result.data.mime_type || result.data.mimeType || file.type,
        size: result.data.size || file.size,
      }
      const shouldReleasePrevious =
        previousAttachmentId &&
        String(previousAttachmentId) !== String(nextAttachment.id) &&
        String(previousAttachmentId) !== String(persistedAttachmentId || '')
      if (shouldReleasePrevious) {
        const cleanup = await deleteMyOvertimeAttachmentApiFirst(previousAttachmentId)
        if (!cleanup.ok) {
          await deleteMyOvertimeAttachmentApiFirst(nextAttachment.id)
          form.setFieldErrors((prev) => ({
            ...prev,
            attachment: 'Unable to replace the current attachment. Please retry.',
          }))
          pushToast('The current attachment was kept. Please retry the replacement.', {
            title: 'Replacement failed',
            color: 'danger',
          })
          return
        }
      }
      form.setAttachment(nextAttachment)
      form.setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.attachment
        return next
      })
    } finally {
      setIsAttachmentUploading(false)
    }
  }

  const handleAttachmentRemove = async () => {
    if (!form.attachmentId) return
    if (isFormActionBusy) {
      explainBusyAction()
      return
    }
    setIsAttachmentUploading(true)
    try {
      const isPersistedAttachment =
        String(form.attachmentId) === String(persistedAttachmentId || '')
      if (!isPersistedAttachment) {
        const result = await deleteMyOvertimeAttachmentApiFirst(form.attachmentId)
        if (!result.ok) {
          pushToast('Unable to remove the overtime attachment. Please retry.', {
            title: 'Remove failed',
            color: 'danger',
          })
          return
        }
      }
      form.setAttachment(null)
      form.setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.attachment
        return next
      })
    } finally {
      setIsAttachmentUploading(false)
    }
  }

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
    const existing = hasPersistedEditTarget
      ? overtimeRecords.find((record) => String(record.id) === String(editingRecordId))
      : null
    const { errors } = validateOvertimeSubmission({
      form,
      records: overtimeRecords,
      excludeServerId: existing?.serverId,
      requireTypeConfirmation: !isResumeEditMode && !overtimeTypeDerivedMode,
    })
    form.setFieldErrors(errors)
    if (Object.keys(errors).length === 0) return true
    pushToast('Review the highlighted overtime fields.', {
      title: 'Check your entries',
      color: 'danger',
    })
    return false
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
    submissionKey: hasPersistedEditTarget ? null : createSubmissionKey(),
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    if (isFormActionBusy) {
      explainBusyAction()
      return
    }
    if (!validateSubmission()) return
    setSubmitPreview(buildSubmitPreview())
    setIsSubmitConfirmVisible(true)
  }

  const confirmAndSubmit = async () => {
    if (!submitPreview || isSubmittingClaim) return

    setIsSubmittingClaim(true)
    try {
      const existingRecord = submitPreview.editingRecordId
        ? overtimeRecords.find((record) =>
            isSameOvertimeRecordId(record.id, submitPreview.editingRecordId),
          )
        : null
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
        attachmentId: form.attachmentId || null,
        version: existingRecord?.version || null,
        submissionKey: submitPreview.submissionKey,
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
        } else if (submitResult?.code === 'OT_VERSION_CONFLICT') {
          pushToast('This overtime claim changed. Return to records and open the latest version.', {
            title: 'Claim changed',
            color: 'warning',
          })
        } else if (submitResult?.code === 'OT_WINDOW_CONFLICT') {
          pushToast(submitResult.message || 'This overtime window overlaps an active claim.', {
            title: 'Time conflict',
            color: 'warning',
          })
        } else {
          pushToast('Unable to submit overtime. Please retry.', {
            title: 'Submit failed',
            color: 'danger',
          })
        }
        return
      }
      const nextRecords = existingRecord
        ? overtimeRecords.map((record) =>
            isSameOvertimeRecordId(record.id, existingRecord.id) ||
            isSameOvertimeRecordId(record.id, persistedRecord.id)
              ? persistedRecord
              : record,
          )
        : [persistedRecord, ...overtimeRecords]

      setOvertimeRecords(nextRecords)
      const clearResult = await clearMyOvertimeDraftApiFirst(userId, overtimeDraft?.draftVersion)
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

  const persistDraft = useCallback(
    async ({ navigateAfter = false, showNotice = false } = {}) => {
      if (isFormActionBusy) {
        return false
      }
      setIsDraftSaving(true)
      try {
        const draftPayload = {
          overtimeType: normalizeOvertimeType(form.overtimeType),
          overtimeTypeConfirmed:
            overtimeTypeDerivedMode || isResumeEditMode
              ? true
              : Boolean(form.overtimeTypeConfirmed),
          claimDate: form.claimDate,
          startTime: form.startTime,
          endTime: form.endTime,
          reason: form.reason,
          sourceRecordId: hasPersistedEditTarget ? String(editingRecordId || '').trim() : '',
          sourceRecordServerId: hasPersistedEditTarget
            ? String(
                overtimeRecords.find((record) => String(record.id) === String(editingRecordId))
                  ?.serverId || '',
              ).trim()
            : '',
          attachmentId: form.attachmentId || null,
          attachment: form.attachment || null,
          savedAt: new Date().toISOString(),
        }
        const result = await saveMyOvertimeDraftApiFirst(
          userId,
          draftPayload,
          overtimeDraft?.draftVersion,
        )
        if (!result.ok) {
          if (result?.isIneligible) {
            if (showNotice) {
              pushToast(OT_INELIGIBLE_MESSAGE, {
                title: 'Overtime not applicable',
                color: 'warning',
              })
            }
          } else if (showNotice) {
            pushToast('Unable to save overtime draft to backend. Please retry.', {
              title: 'Draft failed',
              color: 'danger',
            })
          }
          return false
        }
        setOvertimeDraft(normalizeOvertimeDraftPayload(result?.data || draftPayload))
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
            attachmentId: form.attachmentId,
          }),
        )
        if (navigateAfter) navigate('/overtime')
        if (showNotice) {
          pushToast('Overtime draft saved.', { title: 'Draft saved', color: 'success' })
        }
        return true
      } catch (error) {
        if (showNotice) {
          pushToast(error?.message || 'Unable to save overtime draft to backend. Please retry.', {
            title: 'Draft failed',
            color: 'danger',
          })
        }
        return false
      } finally {
        setIsDraftSaving(false)
      }
    },
    [
      editingRecordId,
      form,
      hasPersistedEditTarget,
      isFormActionBusy,
      isResumeEditMode,
      navigate,
      overtimeDraft?.draftVersion,
      overtimeRecords,
      overtimeTypeDerivedMode,
      pushToast,
      setOvertimeDraft,
      userId,
    ],
  )

  const autosaveSnapshot = useMemo(
    () =>
      buildFormSnapshot({
        editingRecordId,
        overtimeType: normalizeOvertimeType(form.overtimeType),
        overtimeTypeConfirmed:
          overtimeTypeDerivedMode || isResumeEditMode ? true : Boolean(form.overtimeTypeConfirmed),
        claimDate: form.claimDate,
        startTime: form.startTime,
        endTime: form.endTime,
        reason: form.reason,
        attachmentId: form.attachmentId,
      }),
    [
      editingRecordId,
      form.attachmentId,
      form.claimDate,
      form.endTime,
      form.overtimeType,
      form.overtimeTypeConfirmed,
      form.reason,
      form.startTime,
      isResumeEditMode,
      overtimeTypeDerivedMode,
    ],
  )
  const overtimeDraftAutosave = useWorkflowDraftAutosave({
    enabled: autosaveEnabled && !isSubmittingClaim && !isFormClearing && !isAttachmentUploading,
    snapshot: autosaveSnapshot,
    saveDraft: persistDraft,
    errorMessage: 'Your overtime draft could not be saved. Your entries are still on this screen.',
  })
  const handleDraft = useCallback(() => {
    if (isFormActionBusy) {
      pushToast(formActionStatus || 'Please wait for the current overtime action to finish.', {
        title: 'Please wait',
        color: 'info',
      })
      return false
    }
    return persistDraft({ navigateAfter: true, showNotice: true, source: 'manual' })
  }, [formActionStatus, isFormActionBusy, persistDraft, pushToast])

  const confirmDiscardDraftChanges = async () => {
    if (!hasPersistedEditTarget || !isLinkedDraftForEditing) {
      setIsDiscardDraftChangesConfirmVisible(false)
      return
    }
    setIsFormClearing(true)
    try {
      const clearResult = await clearMyOvertimeDraftApiFirst(userId, overtimeDraft?.draftVersion)
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
    if (isFormActionBusy) {
      explainBusyAction()
      return
    }
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
      const clearResult = await clearMyOvertimeDraftApiFirst(userId, overtimeDraft?.draftVersion)
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
      pushToast('This overtime claim is unavailable for cancellation. Refresh and retry.', {
        title: 'Cancel failed',
        color: 'danger',
      })
      return
    }
    const apiResult = await cancelMyOvertimeApiFirst(
      cancelPreviewRecord.serverId,
      cancelPreviewRecord.version,
    )
    if (!apiResult?.ok || !apiResult?.data) {
      pushToast(
        apiResult?.code === 'OT_VERSION_CONFLICT'
          ? 'This overtime claim changed. Refresh records before cancelling it.'
          : 'Unable to cancel overtime. Please retry.',
        {
          title: 'Cancel failed',
          color: 'danger',
        },
      )
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
      const clearResult = await clearMyOvertimeDraftApiFirst(userId, overtimeDraft?.draftVersion)
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
      pushToast('This overtime claim is unavailable for deletion. Refresh and retry.', {
        title: 'Delete failed',
        color: 'danger',
      })
      return
    }
    const apiResult = await deleteMyOvertimeApiFirst(
      deletePreviewRecord.serverId,
      deletePreviewRecord.version,
    )
    if (!apiResult?.ok) {
      pushToast(
        apiResult?.code === 'OT_VERSION_CONFLICT'
          ? 'This overtime claim changed. Refresh records before deleting it.'
          : 'Unable to delete overtime. Please retry.',
        {
          title: 'Delete failed',
          color: 'danger',
        },
      )
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
    isAttachmentUploading,
    isFormActionBusy,
    formActionStatus,
    draftFeedback: overtimeDraftAutosave.feedback,
    handleAttachmentUpload,
    handleAttachmentRemove,
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
