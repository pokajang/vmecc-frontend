import { useCallback, useState } from 'react'
import { approveReportRecord, rejectReportRecord, reviewReportRecord } from '../reportApi'

const useReportWorkflowActions = ({ navigate, pushToast, reloadRecords, reportBasePath }) => {
  const [isActionBusy, setIsActionBusy] = useState(false)
  const [workflowActionState, setWorkflowActionState] = useState({
    visible: false,
    actionType: '',
    record: null,
  })
  const [workflowRemarks, setWorkflowRemarks] = useState('')
  const [workflowDeclarationChecked, setWorkflowDeclarationChecked] = useState(false)
  const [workflowDeclarationError, setWorkflowDeclarationError] = useState('')
  const [workflowRejectError, setWorkflowRejectError] = useState('')

  const canReviewRecord = useCallback((row) => {
    if (!row || row.recordKind === 'draft') return false
    return String(row.status || '').trim() === 'Submitted'
  }, [])

  const canApproveRecord = useCallback((row) => {
    if (!row || row.recordKind === 'draft') return false
    return String(row.status || '').trim() === 'Reviewed'
  }, [])

  const canRejectRecord = useCallback((row) => canApproveRecord(row), [canApproveRecord])

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

  const transitionReview = useCallback(
    (row) => openWorkflowActionModal(row, 'review'),
    [openWorkflowActionModal],
  )
  const transitionApprove = useCallback(
    (row) => openWorkflowActionModal(row, 'approve'),
    [openWorkflowActionModal],
  )
  const transitionReject = useCallback(
    (row) => openWorkflowActionModal(row, 'reject'),
    [openWorkflowActionModal],
  )

  const submitWorkflowAction = useCallback(async () => {
    const row = workflowActionState.record
    const actionType = workflowActionState.actionType
    if (!row || !actionType || isActionBusy) return

    if (!workflowDeclarationChecked) {
      setWorkflowDeclarationError('Please confirm responsibility declaration before continuing.')
      return
    }
    if (actionType === 'reject' && !String(workflowRemarks || '').trim()) {
      setWorkflowRejectError('Rejection remarks are required.')
      return
    }

    setIsActionBusy(true)
    try {
      if (actionType === 'review') {
        await reviewReportRecord({
          reportUid: row.id,
          version: row.version,
          remarks: String(workflowRemarks || '').trim(),
        })
        await reloadRecords()
        pushToast(`${row.displayId || 'Report'} moved to Reviewed.`, {
          title: 'Review complete',
          color: 'success',
        })
        closeWorkflowActionModal()
        navigate(`${reportBasePath}/${encodeURIComponent(row.id)}`)
        return
      }

      if (actionType === 'approve') {
        await approveReportRecord({
          reportUid: row.id,
          version: row.version,
          remarks: String(workflowRemarks || '').trim(),
        })
        await reloadRecords()
        pushToast(`${row.displayId || 'Report'} approved.`, {
          title: 'Approved',
          color: 'success',
        })
        closeWorkflowActionModal()
        return
      }

      await rejectReportRecord({
        reportUid: row.id,
        version: row.version,
        remarks: String(workflowRemarks || '').trim(),
      })
      await reloadRecords()
      pushToast(`${row.displayId || 'Report'} rejected.`, {
        title: 'Rejected',
        color: 'warning',
      })
      closeWorkflowActionModal()
    } catch (error) {
      pushToast(
        error?.message ||
          (actionType === 'review'
            ? 'Unable to review this report. Please try again.'
            : actionType === 'approve'
              ? 'Unable to approve this report. Please try again.'
              : 'Unable to reject this report. Please try again.'),
        {
          title:
            actionType === 'review'
              ? 'Review failed'
              : actionType === 'approve'
                ? 'Approve failed'
                : 'Reject failed',
          color: 'danger',
        },
      )
    } finally {
      setIsActionBusy(false)
    }
  }, [
    closeWorkflowActionModal,
    isActionBusy,
    navigate,
    pushToast,
    reloadRecords,
    reportBasePath,
    workflowActionState.actionType,
    workflowActionState.record,
    workflowDeclarationChecked,
    workflowRemarks,
  ])

  return {
    canApproveRecord,
    canRejectRecord,
    canReviewRecord,
    closeWorkflowActionModal,
    isActionBusy,
    setWorkflowDeclarationChecked,
    setWorkflowRemarks,
    submitWorkflowAction,
    transitionApprove,
    transitionReject,
    transitionReview,
    workflowActionState,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    workflowRemarks,
  }
}

export default useReportWorkflowActions
