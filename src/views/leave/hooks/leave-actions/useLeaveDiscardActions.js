import { useCallback, useState } from 'react'
import { clearLeaveDraft, loadLeaveAssignmentsForUser } from '../../leavePersistence'

export default function useLeaveDiscardActions({
  activeSection,
  isFormDirty,
  user,
  navigate,
  draftHydratedRef,
  setAssignmentRows,
  setEditingRecordId,
  setOriginalAttachmentId,
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
  setIsAttachmentProcessing,
  clearInlineErrors,
  cleanupTransientOnly,
  resetForm,
  resetSubmitPreview,
}) {
  const [isDiscardConfirmVisible, setIsDiscardConfirmVisible] = useState(false)
  const [pendingDiscardAction, setPendingDiscardAction] = useState(null)

  const handleDiscardConfirmClose = useCallback(() => {
    setIsDiscardConfirmVisible(false)
    setPendingDiscardAction(null)
  }, [])

  const confirmDiscardAndContinue = useCallback(() => {
    setIsDiscardConfirmVisible(false)
    const action = pendingDiscardAction
    setPendingDiscardAction(null)
    cleanupTransientOnly()
    clearLeaveDraft(user?.id)
    resetForm()
    setOriginalAttachmentId(null)
    setLeaveType('')
    setLeaveTypeConfirmed(false)
    clearInlineErrors()
    setAttachmentStatus(null)
    if (typeof action === 'function') action()
  }, [
    cleanupTransientOnly,
    clearInlineErrors,
    pendingDiscardAction,
    resetForm,
    setOriginalAttachmentId,
    setAttachmentStatus,
    setLeaveType,
    setLeaveTypeConfirmed,
    user?.id,
  ])

  const startNewLeave = useCallback(() => {
    draftHydratedRef.current = false
    resetSubmitPreview()
    setEditingRecordId(null)
    setOriginalAttachmentId(null)
    loadLeaveAssignmentsForUser(user?.id, []).then((result) => {
      setAssignmentRows(result?.rows || [])
    })
    setLeaveType('')
    setLeaveTypeConfirmed(false)
    setStartDate('')
    setEndDate('')
    setWorkShift('normal')
    setStartTimeSlot('shift-start')
    setEndTimeSlot('shift-end')
    setReason('')
    setCoverBy('')
    setAttachmentName('')
    setAttachmentId(null)
    setAttachmentMeta(null)
    setAttachmentStatus(null)
    setIsAttachmentProcessing(false)
    clearInlineErrors()
    navigate('/leave/new')
  }, [
    clearInlineErrors,
    draftHydratedRef,
    navigate,
    resetSubmitPreview,
    setAssignmentRows,
    setAttachmentId,
    setAttachmentMeta,
    setAttachmentName,
    setAttachmentStatus,
    setCoverBy,
    setEditingRecordId,
    setEndDate,
    setEndTimeSlot,
    setIsAttachmentProcessing,
    setLeaveType,
    setLeaveTypeConfirmed,
    setOriginalAttachmentId,
    setReason,
    setStartDate,
    setStartTimeSlot,
    setWorkShift,
    user?.id,
  ])

  const runWithDiscardGuard = useCallback(
    (action) => {
      if (activeSection === 'new-leave' && isFormDirty) {
        setPendingDiscardAction(() => action)
        setIsDiscardConfirmVisible(true)
        return
      }
      action()
    },
    [activeSection, isFormDirty],
  )

  return {
    isDiscardConfirmVisible,
    handleDiscardConfirmClose,
    confirmDiscardAndContinue,
    startNewLeave,
    runWithDiscardGuard,
  }
}
