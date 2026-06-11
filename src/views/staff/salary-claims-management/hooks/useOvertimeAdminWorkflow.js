import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_OVERTIME_APPROVAL_RULES,
  loadOvertimeApprovalRules,
  normalizeOvertimeApprovalRules,
  resolveOvertimeApprovalRule,
} from 'src/views/settings/overtimeApprovalRulesStorage'
import { getDisplayOvertimeId } from 'src/views/overtime/utils'
import {
  canActorPerformWorkflowAction,
  getWorkflowActionBlockedReason,
} from 'src/views/staff/shared/workflowDomain'
import { runStaffOvertimeWorkflowApi } from 'src/services/overtimeApi'
import { parseWorkflowTransitionError } from 'src/services/workflowTransitionErrors'
import {
  OVERTIME_WORKFLOW_DECLARATION_LABEL,
  getOvertimeApproveActionLabelForStage,
  normalizeRoleValue,
  resolveOvertimeWorkflowStateForRecord,
} from '../utils'

const useOvertimeAdminWorkflow = ({
  normalizedUserRoles = [],
  isSystemAdmin = false,
  getOvertimeApplicantRolesForRecord,
  hydrateOvertime,
  pushToast,
}) => {
  const [overtimeWorkflowModalState, setOvertimeWorkflowModalState] = useState({
    visible: false,
    record: null,
    sourceAction: 'approve',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const getOvertimeReviewActionConfig = useCallback(
    (row) => {
      const workflowPolicy = overtimePolicy.workflow
      const applicantRoles = getOvertimeApplicantRolesForRecord(row)
      const workflowState = resolveOvertimeWorkflowStateForRecord(
        row,
        applicantRoles,
        workflowPolicy,
        resolveOvertimeApprovalRule,
      )
      const requiredRole = normalizeRoleValue(workflowState.nextActionRole)
      const canAct = canActorPerformWorkflowAction({
        status: row?.status,
        nextActionRole: requiredRole,
        actorRoles: normalizedUserRoles,
        isSystemAdmin: isSystemAdmin,
      })
      return {
        approveLabel: getOvertimeApproveActionLabelForStage(workflowState.workflowStage),
        approveDisabled: !canAct,
        rejectDisabled: !canAct,
        requiredRole,
        workflowState,
        applicantRoles,
      }
    },
    [getOvertimeApplicantRolesForRecord, isSystemAdmin, normalizedUserRoles, overtimePolicy],
  )

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
          actorRoles: normalizedUserRoles,
          isSystemAdmin,
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
    [getOvertimeReviewActionConfig, isSystemAdmin, normalizedUserRoles, pushToast],
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
      const policy = overtimePolicy.workflow
      const applicantRoles = getOvertimeApplicantRolesForRecord({
        ...row,
        ownerUserId,
      })
      const workflowState = resolveOvertimeWorkflowStateForRecord(
        { ...row, ownerUserId, applicantRoles },
        applicantRoles,
        policy,
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
        actorRoles: normalizedUserRoles,
        isSystemAdmin: isSystemAdmin,
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
      let nextWorkflowStage = workflowState.workflowStage
      let nextActionRole = workflowState.nextActionRole
      let historyAction = ''
      let defaultHistoryRemarks = ''

      if (normalizedDecision === 'reject') {
        nextStatus = 'Rejected'
        nextWorkflowStage = 'done'
        nextActionRole = null
        historyAction = 'Rejected'
        defaultHistoryRemarks = 'Overtime claim rejected.'
      } else if (workflowState.workflowStage === 'review') {
        nextWorkflowStage = workflowState.workflowSnapshot.requireRecommendation
          ? 'recommend'
          : 'approve'
        nextActionRole =
          nextWorkflowStage === 'recommend'
            ? workflowState.workflowSnapshot.recommendRole
            : workflowState.workflowSnapshot.approveRole
        historyAction = 'Reviewed'
        defaultHistoryRemarks = 'Overtime claim reviewed.'
      } else if (workflowState.workflowStage === 'recommend') {
        nextWorkflowStage = 'approve'
        nextActionRole = workflowState.workflowSnapshot.approveRole
        historyAction = 'Recommended'
        defaultHistoryRemarks = 'Overtime claim recommended for final approval.'
      } else {
        nextStatus = 'Approved'
        nextWorkflowStage = 'done'
        nextActionRole = null
        historyAction = 'Approved'
        defaultHistoryRemarks = 'Final overtime approval granted.'
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
          'Unable to process overtime workflow action.',
        )
        if (showFailureToast) {
          pushToast(parsed.message, {
            title: 'Action failed',
            color: 'danger',
          })
        }
        if (normalizedDecision === 'reject' && parsed.fieldErrors?.remarks) {
          setOvertimeWorkflowRejectError(parsed.fieldErrors.remarks)
        }
        return false
      }
      if (refreshAfter) {
        await hydrateOvertime()
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
      getOvertimeApplicantRolesForRecord,
      hydrateOvertime,
      isSystemAdmin,
      normalizedUserRoles,
      overtimePolicy,
      pushToast,
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
    if (isSubmitting) return
    const targetRecord = overtimeWorkflowModalState.record
    if (!targetRecord) return
    if (!overtimeWorkflowDeclarationChecked) {
      setOvertimeWorkflowDeclarationError('Please confirm responsibility before proceeding.')
      return
    }
    setIsSubmitting(true)
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
      setIsSubmitting(false)
    }
  }, [
    closeOvertimeWorkflowModal,
    isSubmitting,
    overtimeWorkflowDeclarationChecked,
    overtimeWorkflowModalState.record,
    overtimeWorkflowRemarks,
    runOvertimeWorkflowAction,
  ])

  const submitOvertimeWorkflowReject = useCallback(async () => {
    if (isSubmitting) return
    if (!String(overtimeWorkflowRemarks || '').trim()) {
      setOvertimeWorkflowRejectError('Please provide remarks when rejecting.')
      return
    }
    const targetRecord = overtimeWorkflowModalState.record
    if (!targetRecord) return
    setIsSubmitting(true)
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
      setIsSubmitting(false)
    }
  }, [
    closeOvertimeWorkflowModal,
    isSubmitting,
    overtimeWorkflowDeclarationChecked,
    overtimeWorkflowModalState.record,
    overtimeWorkflowRemarks,
    runOvertimeWorkflowAction,
  ])

  const overtimeWorkflowModalActionLabel = isRejectOvertimeWorkflowModal
    ? 'Reject'
    : overtimeWorkflowModalActionConfig?.approveLabel || 'Approve'
  const overtimeWorkflowModalActionDisabled = isRejectOvertimeWorkflowModal
    ? Boolean(overtimeWorkflowModalActionConfig?.rejectDisabled)
    : Boolean(overtimeWorkflowModalActionConfig?.approveDisabled) ||
      !overtimeWorkflowDeclarationChecked

  return {
    isSubmitting,
    getOvertimeReviewActionConfig,
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
    approveOvertime,
    rejectOvertime,
    runOvertimeWorkflowAction,
  }
}

export default useOvertimeAdminWorkflow
