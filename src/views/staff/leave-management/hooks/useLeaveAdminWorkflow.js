import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from 'src/services/apiClient'
import { runStaffOvertimeWorkflowApi } from 'src/services/overtimeApi'
import { parseWorkflowTransitionError } from 'src/services/workflowTransitionErrors'
import { getDisplayLeaveId } from 'src/views/staff/leave-management/leaveRecordUtils'
import { getDisplayOvertimeId } from 'src/views/overtime/utils'
import {
  DEFAULT_OVERTIME_APPROVAL_RULES,
  loadOvertimeApprovalRules,
  normalizeOvertimeApprovalRules,
  resolveOvertimeApprovalRule,
} from 'src/views/settings/overtimeApprovalRulesStorage'
import {
  canActorPerformWorkflowAction,
  getReviewWorkflowApproveActionLabel,
  getWorkflowActionBlockedReason,
  normalizeRoleList,
  normalizeRoleValue,
  resolveReviewWorkflowStateForRecord,
} from 'src/views/staff/shared/workflowDomain'
import { OVERTIME_WORKFLOW_DECLARATION_LABEL } from 'src/views/staff/shared/workflowDeclarations'

const useLeaveAdminWorkflow = ({
  actorRoles = [],
  isSystemAdministrator = false,
  pushToast,
  refreshAllLeaveRecords,
  refreshAllOvertimeRecords = () => Promise.resolve(),
  getApplicantRolesForRecord,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOvertimeSubmitting, setIsOvertimeSubmitting] = useState(false)
  const [workflowModalState, setWorkflowModalState] = useState({
    visible: false,
    record: null,
    sourceAction: 'approve',
  })
  const [workflowRemarks, setWorkflowRemarks] = useState('')
  const [workflowDeclarationChecked, setWorkflowDeclarationChecked] = useState(false)
  const [workflowDeclarationError, setWorkflowDeclarationError] = useState('')
  const [workflowRejectError, setWorkflowRejectError] = useState('')
  const [overtimeWorkflowModalState, setOvertimeWorkflowModalState] = useState({
    visible: false,
    record: null,
    sourceAction: 'approve',
  })
  const [overtimeWorkflowRemarks, setOvertimeWorkflowRemarks] = useState('')
  const [overtimeWorkflowDeclarationChecked, setOvertimeWorkflowDeclarationChecked] =
    useState(false)
  const [overtimeWorkflowDeclarationError, setOvertimeWorkflowDeclarationError] = useState('')
  const [overtimeWorkflowRejectError, setOvertimeWorkflowRejectError] = useState('')
  const [overtimePolicy, setOvertimePolicy] = useState(() =>
    normalizeOvertimeApprovalRules(DEFAULT_OVERTIME_APPROVAL_RULES),
  )

  useEffect(() => {
    let alive = true

    const hydratePolicy = async () => {
      const result = await loadOvertimeApprovalRules()
      if (!alive || !result?.ok) return
      setOvertimePolicy(normalizeOvertimeApprovalRules(result.data))
    }

    hydratePolicy()

    return () => {
      alive = false
    }
  }, [])

  const getReviewActionConfig = useCallback(
    (row) => {
      const requiredRole = normalizeRoleValue(row?.nextActionRole)
      const canAct = canActorPerformWorkflowAction({
        status: row?.status,
        nextActionRole: requiredRole,
        actorRoles,
        isSystemAdmin: isSystemAdministrator,
      })
      return {
        approveLabel: getReviewWorkflowApproveActionLabel(row?.workflowStage || 'approve'),
        approveDisabled: !canAct,
        rejectDisabled: !canAct,
        requiredRole,
        workflowState: {
          workflowStage: row?.workflowStage,
          nextActionRole: row?.nextActionRole,
          workflowSnapshot: row?.workflowSnapshot || {},
        },
        applicantRoles: normalizeRoleList(row?.applicantRoles || []),
      }
    },
    [actorRoles, isSystemAdministrator],
  )

  const getOvertimeReviewActionConfig = useCallback(
    (row) => {
      const applicantRoles = getApplicantRolesForRecord(row)
      const workflowState = resolveReviewWorkflowStateForRecord(
        row,
        applicantRoles,
        overtimePolicy.workflow,
        resolveOvertimeApprovalRule,
      )
      const requiredRole = normalizeRoleValue(workflowState.nextActionRole)
      const canAct = canActorPerformWorkflowAction({
        status: row?.status,
        nextActionRole: requiredRole,
        actorRoles,
        isSystemAdmin: isSystemAdministrator,
      })
      return {
        approveLabel: getReviewWorkflowApproveActionLabel(workflowState.workflowStage),
        approveDisabled: !canAct,
        rejectDisabled: !canAct,
        requiredRole,
        workflowState,
        applicantRoles,
      }
    },
    [actorRoles, getApplicantRolesForRecord, isSystemAdministrator, overtimePolicy],
  )

  const closeWorkflowModal = useCallback(() => {
    setWorkflowModalState({ visible: false, record: null, sourceAction: 'approve' })
    setWorkflowRemarks('')
    setWorkflowDeclarationChecked(false)
    setWorkflowDeclarationError('')
    setWorkflowRejectError('')
  }, [])

  const openActionModal = useCallback(
    (row, sourceAction = 'approve') => {
      if (!row?.id) return
      const actionConfig = getReviewActionConfig(row)
      const isRejectAttempt = sourceAction === 'reject'
      const isDisabled = isRejectAttempt
        ? actionConfig?.rejectDisabled
        : actionConfig?.approveDisabled
      if (isDisabled) {
        const blockedReason = getWorkflowActionBlockedReason({
          status: row?.status,
          nextActionRole: actionConfig?.requiredRole,
          actorRoles,
          isSystemAdmin: isSystemAdministrator,
        })
        pushToast(blockedReason || 'You are not eligible to perform this action.', {
          title: 'Action blocked',
          color: 'warning',
        })
        return
      }

      setWorkflowModalState({ visible: true, record: row, sourceAction })
      setWorkflowRemarks('')
      setWorkflowDeclarationChecked(false)
      setWorkflowDeclarationError('')
      setWorkflowRejectError('')
    },
    [actorRoles, getReviewActionConfig, isSystemAdministrator, pushToast],
  )

  const workflowModalActionConfig = useMemo(() => {
    if (!workflowModalState.record) return null
    return getReviewActionConfig(workflowModalState.record)
  }, [getReviewActionConfig, workflowModalState.record])
  const isRejectWorkflowModal = workflowModalState.sourceAction === 'reject'

  const runLeaveWorkflowAction = useCallback(
    async (
      row,
      { decision, remarks = '', declarationChecked = false } = {},
      { refreshAfter = true, showSuccessToast = true, showFailureToast = true } = {},
    ) => {
      if (!row?.id) return false
      const normalizedDecision = decision === 'reject' ? 'reject' : 'approve'
      const normalizedRemarks = String(remarks || '').trim()
      if (normalizedDecision === 'reject' && !normalizedRemarks) {
        pushToast('Please provide remarks when rejecting.', {
          title: 'Remarks required',
          color: 'warning',
        })
        return false
      }

      const ownerUserId = String(row?.ownerUserId || '')
      const targetId = row._id || row.id
      const workflowStage = String(row?.workflowStage || 'approve')
      const actionVerb =
        normalizedDecision === 'reject'
          ? 'reject'
          : workflowStage === 'review'
            ? 'review'
            : workflowStage === 'recommend'
              ? 'recommend'
              : 'approve'

      const requiredRole = normalizeRoleValue(row?.nextActionRole)
      const canAct = canActorPerformWorkflowAction({
        status: row?.status,
        nextActionRole: requiredRole,
        actorRoles,
        isSystemAdmin: isSystemAdministrator,
      })
      if (!canAct) {
        pushToast(
          requiredRole
            ? `This stage requires ${requiredRole} role.`
            : 'This record has no valid next action role configured.',
          { title: 'Role mismatch', color: 'warning' },
        )
        return false
      }

      try {
        await apiRequest(`/staff/leave/records/${ownerUserId}/${targetId}/${actionVerb}`, {
          method: 'POST',
          body: JSON.stringify({
            remarks: normalizedRemarks,
            declaration_checked: declarationChecked,
          }),
        })

        if (refreshAfter) {
          await refreshAllLeaveRecords({ showWarningToast: false })
        }

        const historyActionLabel =
          actionVerb === 'review'
            ? 'Reviewed'
            : actionVerb === 'recommend'
              ? 'Recommended'
              : actionVerb === 'approve'
                ? 'Approved'
                : 'Rejected'
        const finalized = actionVerb === 'approve' || actionVerb === 'reject'
        const displayLeaveId = getDisplayLeaveId(row)
        const toastTitle =
          normalizedDecision === 'reject'
            ? 'Leave rejected'
            : finalized
              ? 'Leave approved'
              : historyActionLabel
        const toastColor =
          normalizedDecision === 'reject' ? 'warning' : finalized ? 'success' : 'info'
        if (showSuccessToast) {
          pushToast(`${historyActionLabel} for ${displayLeaveId}.`, {
            title: toastTitle,
            color: toastColor,
          })
        }
        return true
      } catch (error) {
        const parsed = parseWorkflowTransitionError(error, 'Unable to process leave action.')
        if (normalizedDecision === 'reject' && parsed.fieldErrors?.remarks) {
          setWorkflowRejectError(parsed.fieldErrors.remarks)
        }
        if (showFailureToast) {
          pushToast(parsed.message, {
            title: 'Action failed',
            color: 'danger',
          })
        }
        return false
      }
    },
    [actorRoles, isSystemAdministrator, pushToast, refreshAllLeaveRecords],
  )

  const approveLeave = useCallback(
    (row) => {
      openActionModal(row, 'approve')
    },
    [openActionModal],
  )

  const rejectLeave = useCallback(
    (row) => {
      openActionModal(row, 'reject')
    },
    [openActionModal],
  )

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
    const targetRecord = workflowModalState.record
    if (!targetRecord) return
    if (!workflowDeclarationChecked) {
      setWorkflowDeclarationError('Please confirm responsibility before proceeding.')
      return
    }
    setIsSubmitting(true)
    try {
      const succeeded = await runLeaveWorkflowAction(targetRecord, {
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
    runLeaveWorkflowAction,
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
    const targetRecord = workflowModalState.record
    if (!targetRecord) return
    setIsSubmitting(true)
    try {
      const succeeded = await runLeaveWorkflowAction(targetRecord, {
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
    runLeaveWorkflowAction,
    workflowDeclarationChecked,
    workflowModalState.record,
    workflowRemarks,
  ])

  const closeOvertimeWorkflowModal = useCallback(() => {
    setOvertimeWorkflowModalState({ visible: false, record: null, sourceAction: 'approve' })
    setOvertimeWorkflowRemarks('')
    setOvertimeWorkflowDeclarationChecked(false)
    setOvertimeWorkflowDeclarationError('')
    setOvertimeWorkflowRejectError('')
  }, [])

  const openOvertimeActionModal = useCallback(
    (row, sourceAction = 'approve') => {
      if (!row?.id) return
      const actionConfig = getOvertimeReviewActionConfig(row)
      const isRejectAttempt = sourceAction === 'reject'
      const isDisabled = isRejectAttempt
        ? actionConfig?.rejectDisabled
        : actionConfig?.approveDisabled
      if (isDisabled) {
        const blockedReason = getWorkflowActionBlockedReason({
          status: row?.status,
          nextActionRole: actionConfig?.requiredRole,
          actorRoles,
          isSystemAdmin: isSystemAdministrator,
        })
        pushToast(blockedReason || 'You are not eligible to perform this action.', {
          title: 'Action blocked',
          color: 'warning',
        })
        return
      }

      setOvertimeWorkflowModalState({ visible: true, record: row, sourceAction })
      setOvertimeWorkflowRemarks('')
      setOvertimeWorkflowDeclarationChecked(false)
      setOvertimeWorkflowDeclarationError('')
      setOvertimeWorkflowRejectError('')
    },
    [actorRoles, getOvertimeReviewActionConfig, isSystemAdministrator, pushToast],
  )

  const overtimeWorkflowModalActionConfig = useMemo(() => {
    if (!overtimeWorkflowModalState.record) return null
    return getOvertimeReviewActionConfig(overtimeWorkflowModalState.record)
  }, [getOvertimeReviewActionConfig, overtimeWorkflowModalState.record])
  const isRejectOvertimeWorkflowModal = overtimeWorkflowModalState.sourceAction === 'reject'

  const runOvertimeWorkflowAction = useCallback(
    async (
      row,
      { decision, remarks = '', declarationChecked = false } = {},
      { refreshAfter = true, showSuccessToast = true, showFailureToast = true } = {},
    ) => {
      if (!row?.id) return false
      const normalizedDecision = decision === 'reject' ? 'reject' : 'approve'
      const normalizedRemarks = String(remarks || '').trim()
      if (normalizedDecision === 'reject' && !normalizedRemarks) {
        pushToast('Please provide remarks when rejecting.', {
          title: 'Remarks required',
          color: 'warning',
        })
        return false
      }
      const ownerUserId = String(row?.ownerUserId || '')
      const applicantRoles = getApplicantRolesForRecord({ ...row, ownerUserId })
      const workflowState = resolveReviewWorkflowStateForRecord(
        { ...row, ownerUserId, applicantRoles },
        applicantRoles,
        overtimePolicy.workflow,
        resolveOvertimeApprovalRule,
      )

      if (row.status !== 'Pending') {
        pushToast('Only pending overtime claims can be processed.', {
          title: 'Action blocked',
          color: 'warning',
        })
        return false
      }

      const requiredRole = normalizeRoleValue(workflowState.nextActionRole)
      const canAct = canActorPerformWorkflowAction({
        status: row?.status,
        nextActionRole: requiredRole,
        actorRoles,
        isSystemAdmin: isSystemAdministrator,
      })
      if (!canAct) {
        pushToast(
          requiredRole
            ? `This stage requires ${requiredRole} role.`
            : 'This overtime record has no valid next action role configured.',
          {
            title: 'Role mismatch',
            color: 'warning',
          },
        )
        return false
      }
      let nextStatus = 'Pending'
      let historyAction = ''
      let defaultHistoryRemarks = ''

      if (normalizedDecision === 'reject') {
        nextStatus = 'Rejected'
        historyAction = 'Rejected'
        defaultHistoryRemarks = 'Overtime claim rejected.'
      } else {
        if (workflowState.workflowStage === 'review') {
          historyAction = 'Reviewed'
          defaultHistoryRemarks = 'Overtime claim reviewed.'
        } else if (workflowState.workflowStage === 'recommend') {
          historyAction = 'Recommended'
          defaultHistoryRemarks = 'Overtime claim recommended for final approval.'
        } else {
          nextStatus = 'Approved'
          historyAction = 'Approved'
          defaultHistoryRemarks = 'Final overtime approval granted.'
        }
      }

      const declarationNote = declarationChecked
        ? `Declaration confirmed: ${OVERTIME_WORKFLOW_DECLARATION_LABEL}`
        : ''
      let historyRemarks = normalizedRemarks || defaultHistoryRemarks
      if (declarationNote) {
        historyRemarks = historyRemarks
          ? `${historyRemarks}\n\n${declarationNote}`
          : declarationNote
      }
      const apiDecision =
        normalizedDecision === 'reject'
          ? 'reject'
          : workflowState.workflowStage === 'review'
            ? 'review'
            : workflowState.workflowStage === 'recommend'
              ? 'recommend'
              : 'approve'
      if (!row?.serverId || !ownerUserId) {
        pushToast('This overtime record is not linked to a backend entry.', {
          title: 'Action unavailable',
          color: 'warning',
        })
        return false
      }
      const apiResult = await runStaffOvertimeWorkflowApi(
        { ...row, ownerUserId, serverId: row.serverId },
        apiDecision,
        historyRemarks,
      )
      if (!apiResult?.ok || !apiResult?.data) {
        const parsed = parseWorkflowTransitionError(
          apiResult?.error,
          'Unable to process overtime action.',
        )
        if (normalizedDecision === 'reject' && parsed.fieldErrors?.remarks) {
          setOvertimeWorkflowRejectError(parsed.fieldErrors.remarks)
        }
        if (showFailureToast) {
          pushToast(parsed.message, {
            title: 'Action failed',
            color: 'danger',
          })
        }
        return false
      }

      if (refreshAfter) {
        await refreshAllOvertimeRecords({ showWarningToast: false })
      }
      const displayOvertimeId = getDisplayOvertimeId(apiResult.data)
      const toastTitle =
        normalizedDecision === 'reject'
          ? 'Overtime rejected'
          : apiDecision === 'approve'
            ? 'Overtime approved'
            : apiDecision === 'recommend'
              ? 'Overtime recommended'
              : 'Overtime reviewed'
      const toastColor =
        normalizedDecision === 'reject' ? 'warning' : apiDecision === 'approve' ? 'success' : 'info'
      if (showSuccessToast) {
        pushToast(`${historyAction} for ${displayOvertimeId}.`, {
          title: toastTitle,
          color: toastColor,
        })
      }
      return true
    },
    [
      actorRoles,
      getApplicantRolesForRecord,
      isSystemAdministrator,
      overtimePolicy,
      pushToast,
      refreshAllOvertimeRecords,
    ],
  )

  const approveOvertime = useCallback(
    (row) => {
      openOvertimeActionModal(row, 'approve')
    },
    [openOvertimeActionModal],
  )

  const rejectOvertime = useCallback(
    (row) => {
      openOvertimeActionModal(row, 'reject')
    },
    [openOvertimeActionModal],
  )

  const handleOvertimeWorkflowRemarksChange = useCallback(
    (value) => {
      setOvertimeWorkflowRemarks(value)
      if (overtimeWorkflowRejectError && String(value || '').trim()) {
        setOvertimeWorkflowRejectError('')
      }
    },
    [overtimeWorkflowRejectError],
  )

  const handleOvertimeWorkflowDeclarationChange = useCallback(
    (checked) => {
      setOvertimeWorkflowDeclarationChecked(checked)
      if (checked && overtimeWorkflowDeclarationError) {
        setOvertimeWorkflowDeclarationError('')
      }
    },
    [overtimeWorkflowDeclarationError],
  )

  const submitOvertimeWorkflowApprove = useCallback(async () => {
    if (isOvertimeSubmitting) return
    const targetRecord = overtimeWorkflowModalState.record
    if (!targetRecord) return
    if (!overtimeWorkflowDeclarationChecked) {
      setOvertimeWorkflowDeclarationError('Please confirm responsibility before proceeding.')
      return
    }
    setIsOvertimeSubmitting(true)
    try {
      const succeeded = await runOvertimeWorkflowAction(targetRecord, {
        decision: 'approve',
        remarks: overtimeWorkflowRemarks,
        declarationChecked: overtimeWorkflowDeclarationChecked,
      })
      if (succeeded) {
        closeOvertimeWorkflowModal()
      }
    } finally {
      setIsOvertimeSubmitting(false)
    }
  }, [
    closeOvertimeWorkflowModal,
    isOvertimeSubmitting,
    overtimeWorkflowDeclarationChecked,
    overtimeWorkflowModalState.record,
    overtimeWorkflowRemarks,
    runOvertimeWorkflowAction,
  ])

  const submitOvertimeWorkflowReject = useCallback(async () => {
    if (isOvertimeSubmitting) return
    if (!String(overtimeWorkflowRemarks || '').trim()) {
      setOvertimeWorkflowRejectError('Please provide remarks when rejecting.')
      return
    }
    const targetRecord = overtimeWorkflowModalState.record
    if (!targetRecord) return
    setIsOvertimeSubmitting(true)
    try {
      const succeeded = await runOvertimeWorkflowAction(targetRecord, {
        decision: 'reject',
        remarks: overtimeWorkflowRemarks,
        declarationChecked: overtimeWorkflowDeclarationChecked,
      })
      if (succeeded) {
        closeOvertimeWorkflowModal()
      }
    } finally {
      setIsOvertimeSubmitting(false)
    }
  }, [
    closeOvertimeWorkflowModal,
    isOvertimeSubmitting,
    overtimeWorkflowDeclarationChecked,
    overtimeWorkflowModalState.record,
    overtimeWorkflowRemarks,
    runOvertimeWorkflowAction,
  ])

  const workflowModalActionLabel = isRejectWorkflowModal
    ? 'Reject'
    : workflowModalActionConfig?.approveLabel || 'Approve'
  const workflowModalActionDisabled = isRejectWorkflowModal
    ? Boolean(workflowModalActionConfig?.rejectDisabled)
    : Boolean(workflowModalActionConfig?.approveDisabled) || !workflowDeclarationChecked

  const overtimeWorkflowModalActionLabel = isRejectOvertimeWorkflowModal
    ? 'Reject'
    : overtimeWorkflowModalActionConfig?.approveLabel || 'Approve'
  const overtimeWorkflowModalActionDisabled = isRejectOvertimeWorkflowModal
    ? Boolean(overtimeWorkflowModalActionConfig?.rejectDisabled)
    : Boolean(overtimeWorkflowModalActionConfig?.approveDisabled) ||
      !overtimeWorkflowDeclarationChecked

  return {
    isSubmitting,
    isOvertimeSubmitting,
    getReviewActionConfig,
    getOvertimeReviewActionConfig,
    approveLeave,
    rejectLeave,
    runLeaveWorkflowAction,
    approveOvertime,
    rejectOvertime,
    runOvertimeWorkflowAction,
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
    overtimeWorkflowModalState,
    overtimeWorkflowModalActionLabel,
    isRejectOvertimeWorkflowModal,
    overtimeWorkflowModalActionDisabled,
    overtimeWorkflowRemarks,
    overtimeWorkflowDeclarationChecked,
    overtimeWorkflowDeclarationError,
    overtimeWorkflowRejectError,
    handleOvertimeWorkflowRemarksChange,
    handleOvertimeWorkflowDeclarationChange,
    closeOvertimeWorkflowModal,
    submitOvertimeWorkflowApprove,
    submitOvertimeWorkflowReject,
  }
}

export default useLeaveAdminWorkflow
