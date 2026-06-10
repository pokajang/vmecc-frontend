import { useCallback } from 'react'
import useLeaveDiscardActions from './leave-actions/useLeaveDiscardActions'
import useLeaveRecordActions from './leave-actions/useLeaveRecordActions'
import useLeaveSubmissionActions from './leave-actions/useLeaveSubmissionActions'

export default function useLeaveActions(props) {
  const { editingRecordId, setLeaveTypeConfirmed } = props
  const submission = useLeaveSubmissionActions(props)

  const discard = useLeaveDiscardActions({
    ...props,
    resetSubmitPreview: submission.resetSubmitPreview,
  })

  const records = useLeaveRecordActions({
    ...props,
    resetSubmitPreview: submission.resetSubmitPreview,
  })

  const handleBackToLeaveType = useCallback(
    () => discard.runWithDiscardGuard(() => setLeaveTypeConfirmed(false)),
    [discard, setLeaveTypeConfirmed],
  )

  return {
    editingRecordId,
    isSubmitConfirmVisible: submission.isSubmitConfirmVisible,
    submitPreview: submission.submitPreview,
    isCancelConfirmVisible: records.isCancelConfirmVisible,
    cancelPreviewRecord: records.cancelPreviewRecord,
    isDeleteConfirmVisible: records.isDeleteConfirmVisible,
    deletePreviewRecord: records.deletePreviewRecord,
    isDiscardConfirmVisible: discard.isDiscardConfirmVisible,
    closeSubmitConfirmModal: submission.closeSubmitConfirmModal,
    closeCancelConfirmModal: records.closeCancelConfirmModal,
    closeDeleteConfirmModal: records.closeDeleteConfirmModal,
    handleDiscardConfirmClose: discard.handleDiscardConfirmClose,
    confirmDiscardAndContinue: discard.confirmDiscardAndContinue,
    startNewLeave: discard.startNewLeave,
    runWithDiscardGuard: discard.runWithDiscardGuard,
    openLeaveForEdit: records.openLeaveForEdit,
    canCancelLeave: records.canCancelLeave,
    cancelLeave: records.cancelLeave,
    confirmCancelLeave: records.confirmCancelLeave,
    deleteLeave: records.deleteLeave,
    confirmDeleteLeave: records.confirmDeleteLeave,
    handleDraft: submission.handleDraft,
    confirmAndSubmit: submission.confirmAndSubmit,
    handleSubmit: submission.handleSubmit,
    handleBackToLeaveType,
    handleClearForm: submission.handleClearForm,
  }
}
