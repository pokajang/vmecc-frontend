import { useCallback, useState } from 'react'
import { apiRequest } from 'src/services/apiClient'
import {
  clearLeaveDraft,
  loadLeaveAssignmentsForUser,
  saveLeaveDraft,
} from '../../leavePersistence'
import { normalizeApiLeaveRecord } from '../../leaveApiNormalizer'

export default function useLeaveSubmissionActions({
  user,
  navigate,
  leaveRecords,
  setLeaveRecords,
  setAssignmentRows,
  editingRecordId,
  setEditingRecordId,
  originalAttachmentId,
  setOriginalAttachmentId,
  leaveType,
  setLeaveTypeConfirmed,
  startDate,
  endDate,
  workShift,
  startTimeSlot,
  endTimeSlot,
  reason,
  coverBy,
  setFieldErrors,
  resetForm,
  attachmentName,
  attachmentId,
  attachmentMeta,
  isAttachmentProcessing,
  cleanupTransientOnly,
  untrackTransientAttachment,
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
}) {
  const [isSubmitConfirmVisible, setIsSubmitConfirmVisible] = useState(false)
  const [submitPreview, setSubmitPreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const closeSubmitConfirmModal = useCallback(() => {
    setIsSubmitConfirmVisible(false)
    setSubmitPreview(null)
  }, [])

  const resetSubmitPreview = closeSubmitConfirmModal

  const handleDraft = useCallback(async () => {
    const draftPayload = {
      leaveType,
      leaveTypeConfirmed: true,
      startDate,
      endDate,
      workShift,
      startTimeSlot,
      endTimeSlot,
      reason,
      coverBy,
      attachmentName,
      attachmentId,
      attachmentMeta,
      savedAt: new Date().toISOString(),
    }
    try {
      await saveLeaveDraft(user?.id, draftPayload)
      untrackTransientAttachment(attachmentId)
      pushToast('Leave draft saved.', { title: 'Draft saved', color: 'success' })
    } catch (error) {
      pushToast(error?.message || 'Unable to save draft. Please retry.', {
        title: 'Draft failed',
        color: 'danger',
      })
    }
  }, [
    attachmentId,
    attachmentMeta,
    attachmentName,
    coverBy,
    endDate,
    endTimeSlot,
    leaveType,
    pushToast,
    reason,
    startDate,
    startTimeSlot,
    untrackTransientAttachment,
    user?.id,
    workShift,
  ])

  const validateSubmission = useCallback(() => {
    const nextErrors = {}
    if (isAttachmentProcessing) {
      pushToast('Attachment is still processing. Please wait before submitting.', {
        title: 'Please wait',
        color: 'warning',
      })
      nextErrors.attachment = 'Attachment is still processing.'
      setFieldErrors(nextErrors)
      return false
    }
    if (!startDate || !endDate || !reason.trim()) {
      pushToast('Start date, end date, and reason are required before submitting.', {
        title: 'Validation error',
        color: 'danger',
      })
      if (!startDate) nextErrors.startDate = 'Start date is required.'
      if (!endDate) nextErrors.endDate = 'End date is required.'
      if (!reason.trim()) nextErrors.reason = 'Reason is required.'
      setFieldErrors(nextErrors)
      return false
    }
    if (calculateDays(startDate, endDate) <= 0) {
      pushToast('End date must be on or after start date.', {
        title: 'Validation error',
        color: 'danger',
      })
      nextErrors.endDate = 'End date must be on or after start date.'
      setFieldErrors(nextErrors)
      return false
    }
    if (startDate === endDate && startTimeSlot === 'midpoint' && endTimeSlot === 'midpoint') {
      pushToast(
        'For same-day leave, choose either first half, second half, or full shift timing.',
        { title: 'Validation error', color: 'danger' },
      )
      nextErrors.schedule = 'Choose valid start and end time for same-day leave.'
      setFieldErrors(nextErrors)
      return false
    }
    if (requestedDays <= 0) {
      pushToast('No working leave days detected for this date range. Please adjust the request.', {
        title: 'Validation error',
        color: 'danger',
      })
      nextErrors.schedule = 'No working leave days found in selected range.'
      setFieldErrors(nextErrors)
      return false
    }
    if (!balanceSummary.hasAssignment) {
      pushToast(
        `No entitlement assignment found for ${leaveType} in ${balanceSummary.year}. Please ask HR/HQ to assign it first.`,
        { title: 'Assignment required', color: 'danger' },
      )
      setFieldErrors({})
      return false
    }
    if (balanceSummary.isZeroEntitlement) {
      pushToast(
        `${leaveType} entitlement is 0 day(s). This leave type cannot be submitted until HR/HQ updates your assignment.`,
        { title: 'No entitlement', color: 'danger' },
      )
      setFieldErrors({})
      return false
    }
    if (activeFieldRule.coverageRequired && !coverBy.trim()) {
      pushToast('Coverage By is required for this leave type and duration.', {
        title: 'Validation error',
        color: 'danger',
      })
      nextErrors.coverBy = 'Coverage By is required.'
      setFieldErrors(nextErrors)
      return false
    }
    if (activeFieldRule.attachmentRequired && !attachmentName) {
      pushToast('Supporting attachment is required for this leave type.', {
        title: 'Validation error',
        color: 'danger',
      })
      nextErrors.attachment = 'Supporting attachment is required.'
      setFieldErrors(nextErrors)
      return false
    }
    if (balanceSummary.isInsufficient) {
      pushToast('Requested days exceed the current available leave balance for this leave type.', {
        title: 'Insufficient balance',
        color: 'danger',
      })
      setFieldErrors(nextErrors)
      return false
    }
    setFieldErrors({})
    return true
  }, [
    activeFieldRule.attachmentRequired,
    activeFieldRule.coverageRequired,
    attachmentName,
    balanceSummary,
    calculateDays,
    coverBy,
    endDate,
    endTimeSlot,
    isAttachmentProcessing,
    leaveType,
    pushToast,
    reason,
    requestedDays,
    setFieldErrors,
    startDate,
    startTimeSlot,
  ])

  const getShiftSlotLabel = useCallback(
    (slotType, slotValue) => {
      const options =
        slotType === 'start' ? selectedShiftConfig.startOptions : selectedShiftConfig.endOptions
      return options.find((option) => option.value === slotValue)?.label || slotValue
    },
    [selectedShiftConfig],
  )

  const buildSubmitPreview = useCallback(
    () => ({
      editingRecordId,
      leaveType,
      workShift,
      shiftLabel: selectedShiftConfig.label,
      startDate,
      endDate,
      startTimeSlot,
      endTimeSlot,
      startTimeLabel: getShiftSlotLabel('start', startTimeSlot),
      endTimeLabel: getShiftSlotLabel('end', endTimeSlot),
      requestedDays,
      reason: reason.trim(),
      coverBy: coverBy.trim(),
      attachmentName,
      attachmentId,
      attachmentMeta,
      year: balanceSummary.year,
      assignmentEmployee: selectedAssignment?.employee || '',
    }),
    [
      attachmentId,
      attachmentMeta,
      attachmentName,
      balanceSummary.year,
      coverBy,
      editingRecordId,
      endDate,
      endTimeSlot,
      getShiftSlotLabel,
      leaveType,
      reason,
      requestedDays,
      selectedAssignment?.employee,
      selectedShiftConfig.label,
      startDate,
      startTimeSlot,
      workShift,
    ],
  )

  const confirmAndSubmit = useCallback(async () => {
    if (!submitPreview || isSubmitting) return
    setIsSubmitting(true)
    const existingRecord = submitPreview.editingRecordId
      ? leaveRecords.find((record) => record.id === submitPreview.editingRecordId)
      : null
    const payload = {
      leave_type: submitPreview.leaveType,
      start_date: submitPreview.startDate,
      end_date: submitPreview.endDate,
      days: submitPreview.requestedDays,
      work_shift: submitPreview.workShift,
      start_time_slot: submitPreview.startTimeSlot,
      end_time_slot: submitPreview.endTimeSlot,
      reason: submitPreview.reason,
      cover_by: submitPreview.coverBy,
      attachment_id:
        submitPreview.attachmentId || submitPreview.attachmentMeta?.attachmentId || null,
    }
    try {
      let result
      if (existingRecord?._id) {
        result = await apiRequest(`/leave/${existingRecord._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        result = await apiRequest('/leave', { method: 'POST', body: JSON.stringify(payload) })
      }
      const returnedRecord = normalizeApiLeaveRecord(result?.data ?? result)
      const serverComputedDays = Number(returnedRecord?.days || 0)
      const dayAdjustmentMessage = result?.meta?.day_adjusted_message
      if (existingRecord) {
        setLeaveRecords((prev) =>
          prev.map((record) => (record.id === existingRecord.id ? returnedRecord : record)),
        )
      } else {
        setLeaveRecords((prev) => [returnedRecord, ...prev])
      }
      const assignmentsResult = await loadLeaveAssignmentsForUser(user?.id)
      if (Array.isArray(assignmentsResult?.rows)) setAssignmentRows(assignmentsResult.rows)
      await clearLeaveDraft(user?.id)
      const prevAttachmentId = existingRecord?.attachmentId || originalAttachmentId
      const nextAttachmentId =
        submitPreview.attachmentId || submitPreview.attachmentMeta?.attachmentId || null
      if (nextAttachmentId) untrackTransientAttachment(nextAttachmentId)
      await commitAttachmentReplacement({
        previousAttachmentId: prevAttachmentId,
        nextAttachmentId,
      })
      cleanupTransientOnly()
      if (dayAdjustmentMessage) {
        pushToast(dayAdjustmentMessage, { title: 'Recommended leave days', color: 'info' })
      }
      pushToast(
        `Leave request ${getDisplayLeaveId(returnedRecord)} submitted for ${submitPreview.leaveType} (${formatDayCount(serverComputedDays || submitPreview.requestedDays)} day(s)).`,
        { title: existingRecord ? 'Updated' : 'Submitted', color: 'success' },
      )
      closeSubmitConfirmModal()
      resetForm()
      setOriginalAttachmentId(null)
      setLeaveTypeConfirmed(false)
      setEditingRecordId(null)
      navigate('/leave')
    } catch (error) {
      pushToast(error?.message || 'Unable to submit leave request. Please retry.', {
        title: 'Submit failed',
        color: 'danger',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    cleanupTransientOnly,
    closeSubmitConfirmModal,
    commitAttachmentReplacement,
    formatDayCount,
    getDisplayLeaveId,
    isSubmitting,
    leaveRecords,
    navigate,
    originalAttachmentId,
    pushToast,
    resetForm,
    setAssignmentRows,
    setEditingRecordId,
    setLeaveRecords,
    setLeaveTypeConfirmed,
    setOriginalAttachmentId,
    submitPreview,
    untrackTransientAttachment,
    user?.id,
  ])

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault()
      if (!validateSubmission()) return
      setSubmitPreview(buildSubmitPreview())
      setIsSubmitConfirmVisible(true)
    },
    [buildSubmitPreview, validateSubmission],
  )

  const handleClearForm = useCallback(() => {
    cleanupTransientOnly()
    clearLeaveDraft(user?.id)
    resetForm()
    setOriginalAttachmentId(null)
    setEditingRecordId(null)
  }, [cleanupTransientOnly, resetForm, setEditingRecordId, setOriginalAttachmentId, user?.id])

  return {
    isSubmitConfirmVisible,
    submitPreview,
    closeSubmitConfirmModal,
    resetSubmitPreview,
    handleDraft,
    confirmAndSubmit,
    handleSubmit,
    handleClearForm,
  }
}
