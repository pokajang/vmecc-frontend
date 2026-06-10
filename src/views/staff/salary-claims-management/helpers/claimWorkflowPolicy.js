import {
  WORKFLOW_ACTIONABLE_STAGES,
  WORKFLOW_PENDING_STATUSES,
  WORKFLOW_TERMINAL_STATUSES,
  buildClaimWorkflowActions,
  getApproveActionLabelForStage,
  normalizeClaimWorkflowRecord,
  normalizeRoleValue,
} from '../utils'

export const resolveClaimWorkflowState = ({
  claimRow,
  salaryWorkflowRule,
  normalizedUserRoles,
  isSystemAdmin,
}) => {
  if (!claimRow) {
    return {
      stage: 'done',
      stageLabel: 'Done',
      nextRole: null,
      canRespond: false,
      pending: false,
      approveActionLabel: 'Approve',
    }
  }

  const normalizedClaim = normalizeClaimWorkflowRecord(claimRow, salaryWorkflowRule)
  const status = String(normalizedClaim.status || '').trim()
  const stage =
    String(normalizedClaim.workflowStage || '')
      .trim()
      .toLowerCase() || 'done'
  const nextRole = normalizeRoleValue(normalizedClaim.nextActionRole)
  const roleAllowed = nextRole ? normalizedUserRoles.includes(nextRole) : false
  const pending =
    !WORKFLOW_TERMINAL_STATUSES.includes(status) &&
    (WORKFLOW_PENDING_STATUSES.includes(status) || WORKFLOW_ACTIONABLE_STAGES.includes(stage))
  const canRespond = pending && (isSystemAdmin || roleAllowed)
  const stageLabel =
    stage === 'check'
      ? 'Check'
      : stage === 'review'
        ? 'Review'
        : stage === 'approve'
          ? 'Approve'
          : status && !WORKFLOW_TERMINAL_STATUSES.includes(status)
            ? 'Unknown'
            : 'Done'

  const blockedReason = !pending
    ? stageLabel === 'Unknown'
      ? 'This claim has an unknown workflow state and requires refresh or admin review.'
      : 'This claim is no longer pending workflow action.'
    : canRespond
      ? ''
      : nextRole
        ? `This claim is awaiting response from ${nextRole}.`
        : 'This claim has no valid next action role configured.'

  return {
    stage,
    stageLabel,
    nextRole,
    canRespond,
    pending,
    blockedReason,
    approveActionLabel: getApproveActionLabelForStage(stage),
  }
}

export const buildClaimActionConfig = ({
  claimRow,
  salaryWorkflowRule,
  normalizedUserRoles,
  isSystemAdmin,
}) => {
  const workflowState = resolveClaimWorkflowState({
    claimRow,
    salaryWorkflowRule,
    normalizedUserRoles,
    isSystemAdmin,
  })

  return {
    approveLabel: workflowState.approveActionLabel,
    approveDisabled: !workflowState.canRespond,
    rejectDisabled: !workflowState.canRespond,
    requiredRole: workflowState.nextRole,
    blockedReason: workflowState.blockedReason,
    workflowState,
  }
}

export const canBulkActOnClaim = ({
  claimRow,
  salaryWorkflowRule,
  normalizedUserRoles,
  isSystemAdmin,
}) => {
  const workflowState = resolveClaimWorkflowState({
    claimRow,
    salaryWorkflowRule,
    normalizedUserRoles,
    isSystemAdmin,
  })
  return Boolean(workflowState?.pending && workflowState?.canRespond)
}

export const getClaimActionsForRow = ({
  claimRow,
  salaryWorkflowRule,
  normalizedUserRoles,
  isSystemAdmin,
}) => {
  const actionConfig = buildClaimActionConfig({
    claimRow,
    salaryWorkflowRule,
    normalizedUserRoles,
    isSystemAdmin,
  })
  return buildClaimWorkflowActions(actionConfig)
}
