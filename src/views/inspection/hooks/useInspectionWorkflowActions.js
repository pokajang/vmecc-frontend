import { useCallback, useState } from 'react'
import {
  approveInspectionRecord,
  rejectInspectionRecord,
  reviewInspectionRecord,
} from '../inspectionApi'

const useInspectionWorkflowActions = ({ reloadRecords, pushToast }) => {
  const [workflowActionState, setWorkflowActionState] = useState({
    visible: false,
    actionType: '',
    record: null,
  })
  const [workflowRemarks, setWorkflowRemarks] = useState('')
  const [workflowDeclarationChecked, setWorkflowDeclarationChecked] = useState(false)
  const [workflowDeclarationError, setWorkflowDeclarationError] = useState('')
  const [workflowRejectError, setWorkflowRejectError] = useState('')
  const [isActionBusy, setIsActionBusy] = useState(false)

  const canReviewRecord = useCallback((row) => {
    if (!row || row.recordKind === 'draft') return false
    return String(row.status || '').trim() === 'Submitted'
  }, [])

  const canApproveRecord = useCallback((row) => {
    if (!row || row.recordKind === 'draft') return false
    return String(row.status || '').trim() === 'Reviewed'
  }, [])

  const canRejectRecord = canApproveRecord

  const closeWorkflowActionModal = useCallback(() => {
    setWorkflowActionState({ visible: false, actionType: '', record: null })
    setWorkflowRemarks('')
    setWorkflowDeclarationChecked(false)
    setWorkflowDeclarationError('')
    setWorkflowRejectError('')
  }, [])

  const openWorkflowActionModal = useCallback(
    (row, actionType) => {
      if (!row || isActionBusy) return
      const blocked =
        (actionType === 'review' && !canReviewRecord(row)) ||
        (actionType === 'approve' && !canApproveRecord(row)) ||
        (actionType === 'reject' && !canRejectRecord(row))
      if (blocked) return
      setWorkflowActionState({ visible: true, actionType, record: row })
      setWorkflowRemarks('')
      setWorkflowDeclarationChecked(false)
      setWorkflowDeclarationError('')
      setWorkflowRejectError('')
    },
    [canApproveRecord, canRejectRecord, canReviewRecord, isActionBusy],
  )

  const handleWorkflowRemarksChange = useCallback(
    (value) => {
      setWorkflowRemarks(value)
      if (workflowRejectError && String(value || '').trim()) setWorkflowRejectError('')
    },
    [workflowRejectError],
  )

  const handleWorkflowDeclarationChange = useCallback(
    (checked) => {
      setWorkflowDeclarationChecked(Boolean(checked))
      if (checked && workflowDeclarationError) setWorkflowDeclarationError('')
    },
    [workflowDeclarationError],
  )

  const submitWorkflowAction = useCallback(async () => {
    if (isActionBusy) return
    const row = workflowActionState.record
    const actionType = workflowActionState.actionType
    if (!row || !actionType) return
    if (!workflowDeclarationChecked) {
      setWorkflowDeclarationError('Please acknowledge the declaration before continuing.')
      return
    }
    if (actionType === 'reject' && !String(workflowRemarks || '').trim()) {
      setWorkflowRejectError('Remarks are required when rejecting.')
      return
    }
    setIsActionBusy(true)
    try {
      if (actionType === 'review') {
        await reviewInspectionRecord({
          reportUid: row.id,
          version: row.version,
          remarks: String(workflowRemarks || '').trim(),
        })
      }
      if (actionType === 'approve') {
        await approveInspectionRecord({
          reportUid: row.id,
          version: row.version,
          remarks: String(workflowRemarks || '').trim(),
        })
      }
      if (actionType === 'reject') {
        await rejectInspectionRecord({
          reportUid: row.id,
          version: row.version,
          remarks: String(workflowRemarks || '').trim(),
        })
      }
      await reloadRecords()
      pushToast(`${row.displayId || 'Report'} ${actionType}ed.`, {
        title: 'Workflow updated',
        color: 'success',
      })
      closeWorkflowActionModal()
    } catch (error) {
      pushToast(error?.message || 'Unable to run this action. Please try again.', {
        title: 'Action failed',
        color: 'danger',
      })
    } finally {
      setIsActionBusy(false)
    }
  }, [
    closeWorkflowActionModal,
    isActionBusy,
    pushToast,
    reloadRecords,
    workflowActionState.actionType,
    workflowActionState.record,
    workflowDeclarationChecked,
    workflowRemarks,
  ])

  return {
    workflowActionState,
    workflowRemarks,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    isActionBusy,
    canReviewRecord,
    canApproveRecord,
    canRejectRecord,
    closeWorkflowActionModal,
    openWorkflowActionModal,
    handleWorkflowRemarksChange,
    handleWorkflowDeclarationChange,
    submitWorkflowAction,
  }
}

export default useInspectionWorkflowActions
