import { useCallback, useMemo, useState } from 'react'
import { runStaffPayrollClaimWorkflowApi } from 'src/services/payrollClaimsApi'
import { parseWorkflowTransitionError } from 'src/services/workflowTransitionErrors'
import { WORKFLOW_DECLARATION_LABEL, normalizeRoleValue } from '../utils'

const useClaimsWorkflow = ({
  selectedClaim,
  getClaimWorkflowState,
  getClaimActionConfig,
  applyClaimApiUpdate,
  pushToast,
}) => {
  const [workflowModalState, setWorkflowModalState] = useState({
    visible: false,
    record: null,
    sourceAction: 'approve',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [workflowRemarks, setWorkflowRemarks] = useState('')
  const [workflowDeclarationChecked, setWorkflowDeclarationChecked] = useState(false)
  const [workflowDeclarationError, setWorkflowDeclarationError] = useState('')
  const [workflowRejectError, setWorkflowRejectError] = useState('')

  const closeWorkflowModal = useCallback(() => {
    setWorkflowModalState({ visible: false, record: null, sourceAction: 'approve' })
    setWorkflowRemarks('')
    setWorkflowDeclarationChecked(false)
    setWorkflowDeclarationError('')
    setWorkflowRejectError('')
  }, [])

  const openActionModal = useCallback(
    (claimRow, sourceAction = 'approve') => {
      if (!claimRow?.id) return
      const actionConfig = getClaimActionConfig(claimRow)
      const isRejectAttempt = sourceAction === 'reject'
      const isDisabled = isRejectAttempt
        ? actionConfig?.rejectDisabled
        : actionConfig?.approveDisabled
      if (isDisabled) {
        pushToast(actionConfig?.blockedReason || 'This claim action is currently unavailable.', {
          title: 'Action restricted',
          color: 'warning',
        })
        return
      }

      setWorkflowModalState({ visible: true, record: claimRow, sourceAction })
      setWorkflowRemarks('')
      setWorkflowDeclarationChecked(false)
      setWorkflowDeclarationError('')
      setWorkflowRejectError('')
    },
    [getClaimActionConfig, pushToast],
  )

  const runClaimWorkflowAction = useCallback(
    async (
      claimRow,
      { decision, remarks = '', declarationChecked = false, silent = false } = {},
    ) => {
      if (!claimRow?.id) return false
      const normalizedDecision = decision === 'reject' ? 'reject' : 'approve'
      const normalizedRemarks = String(remarks || '').trim()
      if (normalizedDecision === 'reject' && !normalizedRemarks) {
        if (!silent) {
          pushToast('Please provide remarks when rejecting.', {
            title: 'Remarks required',
            color: 'warning',
          })
        }
        return false
      }

      const workflowState = getClaimWorkflowState(claimRow)
      if (!workflowState.pending) {
        if (!silent) {
          pushToast('This claim is no longer pending workflow action.', {
            title: 'No action needed',
            color: 'warning',
          })
        }
        return false
      }
      if (!workflowState.canRespond) {
        if (!silent) {
          pushToast(workflowState?.blockedReason || 'This claim action is currently unavailable.', {
            title: 'Action restricted',
            color: 'warning',
          })
        }
        return false
      }

      let defaultHistoryRemarks = ''

      if (normalizedDecision === 'reject') {
        defaultHistoryRemarks = 'Claim rejected.'
      } else if (workflowState.stage === 'check') {
        defaultHistoryRemarks = 'Claim checked and routed for review.'
      } else if (workflowState.stage === 'review') {
        defaultHistoryRemarks = 'Claim reviewed and routed for approval.'
      } else {
        defaultHistoryRemarks = 'Final approval granted.'
      }

      const declarationNote = declarationChecked
        ? `Declaration confirmed: ${WORKFLOW_DECLARATION_LABEL}`
        : ''
      let historyRemarks = normalizedRemarks || defaultHistoryRemarks
      if (declarationNote) {
        historyRemarks = historyRemarks
          ? `${historyRemarks}\n\n${declarationNote}`
          : declarationNote
      }

      const ownerUserId = String(claimRow?.ownerId || '').trim()

      const apiDecision =
        normalizedDecision === 'reject'
          ? 'reject'
          : workflowState.stage === 'check'
            ? 'check'
            : workflowState.stage === 'review'
              ? 'review'
              : 'approve'
      if (!claimRow?.serverId || !ownerUserId) {
        if (!silent) {
          pushToast('This claim is not linked to a backend record yet.', {
            title: 'Action unavailable',
            color: 'warning',
          })
        }
        return false
      }

      const apiResult = await runStaffPayrollClaimWorkflowApi(claimRow, apiDecision, historyRemarks)
      if (!apiResult?.ok || !apiResult?.data) {
        if (!silent) {
          const parsed = parseWorkflowTransitionError(
            apiResult?.error,
            'Unable to process claim workflow action.',
          )
          if (normalizedDecision === 'reject' && parsed.fieldErrors?.remarks) {
            setWorkflowRejectError(parsed.fieldErrors.remarks)
          }
          pushToast(parsed.message, {
            title: 'Update failed',
            color: 'danger',
          })
        }
        return false
      }
      const updated = applyClaimApiUpdate(claimRow, apiResult.data)
      if (!updated) return false
      const updatedId = updated?.id || claimRow.id
      const updatedStatus = String(updated?.status || '').trim()
      const updatedWorkflowState = getClaimWorkflowState(updated)
      const nextRoleLabel = updatedWorkflowState?.nextRole || 'next approver'

      if (updatedStatus === 'Approved') {
        if (!silent) {
          pushToast(`Claim ${updatedId} approved.`, {
            title: 'Claim updated',
            color: 'success',
          })
        }
        return true
      }
      if (updatedStatus === 'Rejected') {
        if (!silent) {
          pushToast(`Claim ${updatedId} rejected.`, {
            title: 'Claim updated',
            color: 'danger',
          })
        }
        return true
      }

      if (updatedWorkflowState?.pending) {
        if (!silent) {
          pushToast(
            `Claim ${updatedId} moved to ${updatedStatus || 'next stage'} and routed to ${nextRoleLabel}.`,
            {
              title: 'Claim updated',
              color: 'info',
            },
          )
        }
        return true
      }

      if (!silent) {
        pushToast(`Claim ${updatedId} updated.`, {
          title: 'Claim updated',
          color: 'info',
        })
      }
      return true
    },
    [getClaimWorkflowState, applyClaimApiUpdate, pushToast, setWorkflowRejectError],
  )

  const respondToClaim = useCallback(
    (action) => {
      if (!selectedClaim?.id) return
      openActionModal(selectedClaim, action === 'reject' ? 'reject' : 'approve')
    },
    [openActionModal, selectedClaim],
  )

  const workflowModalActionConfig = useMemo(() => {
    if (!workflowModalState.record) return null
    return getClaimActionConfig(workflowModalState.record)
  }, [getClaimActionConfig, workflowModalState.record])
  const isRejectWorkflowModal = workflowModalState.sourceAction === 'reject'
  const workflowModalActionLabel = isRejectWorkflowModal
    ? 'Reject'
    : workflowModalActionConfig?.approveLabel || 'Approve'
  const workflowModalActionDisabled = isRejectWorkflowModal
    ? Boolean(workflowModalActionConfig?.rejectDisabled)
    : Boolean(workflowModalActionConfig?.approveDisabled) || !workflowDeclarationChecked

  const handleWorkflowRemarksChange = useCallback(
    (value) => {
      setWorkflowRemarks(value)
      if (workflowRejectError && String(value || '').trim()) {
        setWorkflowRejectError('')
      }
    },
    [workflowRejectError],
  )

  const handleWorkflowDeclarationChange = useCallback(
    (checked) => {
      setWorkflowDeclarationChecked(checked)
      if (checked && workflowDeclarationError) {
        setWorkflowDeclarationError('')
      }
    },
    [workflowDeclarationError],
  )

  const submitWorkflowApprove = useCallback(async () => {
    if (isSubmitting) return
    const targetClaim = workflowModalState.record
    if (!targetClaim) return
    if (!workflowDeclarationChecked) {
      setWorkflowDeclarationError('Please confirm responsibility before proceeding.')
      return
    }
    setIsSubmitting(true)
    try {
      const succeeded = await runClaimWorkflowAction(targetClaim, {
        decision: 'approve',
        remarks: workflowRemarks,
        declarationChecked: workflowDeclarationChecked,
      })
      if (succeeded) {
        closeWorkflowModal()
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    closeWorkflowModal,
    isSubmitting,
    runClaimWorkflowAction,
    workflowDeclarationChecked,
    workflowModalState.record,
    workflowRemarks,
  ])

  const submitWorkflowReject = useCallback(async () => {
    if (isSubmitting) return
    if (!String(workflowRemarks || '').trim()) {
      setWorkflowRejectError('Please provide remarks when rejecting.')
      return
    }
    const targetClaim = workflowModalState.record
    if (!targetClaim) return
    setIsSubmitting(true)
    try {
      const succeeded = await runClaimWorkflowAction(targetClaim, {
        decision: 'reject',
        remarks: workflowRemarks,
        declarationChecked: workflowDeclarationChecked,
      })
      if (succeeded) {
        closeWorkflowModal()
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    closeWorkflowModal,
    isSubmitting,
    runClaimWorkflowAction,
    workflowDeclarationChecked,
    workflowModalState.record,
    workflowRemarks,
  ])

  return {
    isSubmitting,
    workflowModalState,
    workflowModalActionLabel,
    isRejectWorkflowModal,
    workflowModalActionDisabled,
    workflowRemarks,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    handleWorkflowRemarksChange,
    handleWorkflowDeclarationChange,
    closeWorkflowModal,
    submitWorkflowApprove,
    submitWorkflowReject,
    respondToClaim,
    openActionModal,
    runClaimWorkflowAction,
  }
}

export default useClaimsWorkflow
