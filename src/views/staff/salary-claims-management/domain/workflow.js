import {
  getReviewWorkflowApproveActionLabel,
  normalizeRoleList,
  normalizeRoleValue,
  resolveReviewWorkflowStateForRecord,
} from '../../shared/workflowDomain'
import {
  WORKFLOW_ACTIONABLE_STAGES,
  WORKFLOW_PENDING_STATUSES,
  WORKFLOW_TERMINAL_STATUSES,
  WORKFLOW_VALID_STAGES,
  OVERTIME_ROUTE_KEY_SEPARATOR,
} from './constants'

export const buildCompositeOvertimeRecordKey = (ownerUserId, overtimeId) =>
  `${String(ownerUserId || '')}${OVERTIME_ROUTE_KEY_SEPARATOR}${String(overtimeId || '')}`

export const decodeRouteValue = (routeValue) => {
  try {
    return decodeURIComponent(String(routeValue || ''))
  } catch {
    return String(routeValue || '')
  }
}

export const getStatusForWorkflowStage = (stage) => {
  if (stage === 'check') return 'Pending'
  if (stage === 'review') return 'Pending Review'
  if (stage === 'approve') return 'Pending Approval'
  return 'Pending'
}

export const getStageFromStatus = (status) => {
  if (status === 'Pending Approval') return 'approve'
  if (status === 'Pending Review') return 'review'
  if (status === 'Pending') return 'check'
  return null
}

export const getStageRoleFromRule = (stage, workflowRule) => {
  if (stage === 'check') return workflowRule?.checkRole
  if (stage === 'review') return workflowRule?.reviewRole
  if (stage === 'approve') return workflowRule?.approveRole
  return null
}

export const getApproveActionLabelForStage = (stage) => {
  if (stage === 'check') return 'Check'
  if (stage === 'review') return 'Review'
  return 'Approve'
}

export const buildClaimWorkflowActions = (actionConfig = {}) => {
  const approveLabel = String(actionConfig?.approveLabel || '').trim() || 'Approve'
  const blockedReason = String(actionConfig?.blockedReason || '').trim()
  return {
    download: {
      key: 'download',
      label: 'Download',
      disabled: false,
    },
    reject: {
      key: 'reject',
      label: 'Reject',
      disabled: Boolean(actionConfig?.rejectDisabled),
      disabledReason: blockedReason,
    },
    primaryWorkflowAction: {
      key: 'primary-workflow',
      label: approveLabel,
      disabled: Boolean(actionConfig?.approveDisabled),
      disabledReason: blockedReason,
    },
  }
}

export const resolveOvertimeWorkflowStateForRecord = (
  record,
  applicantRoles = [],
  policy,
  resolveLeaveApprovalRule,
) => resolveReviewWorkflowStateForRecord(record, applicantRoles, policy, resolveLeaveApprovalRule)

export const getOvertimeApproveActionLabelForStage = (stage) =>
  getReviewWorkflowApproveActionLabel(stage)

const normalizeApprovalHistoryOrder = (entries) => {
  const rows = Array.isArray(entries)
    ? entries.filter((entry) => entry && typeof entry === 'object')
    : []
  if (rows.length < 2) return rows

  const firstAt = new Date(rows[0]?.at || rows[0]?.updatedAt || '').getTime()
  const lastAt = new Date(
    rows[rows.length - 1]?.at || rows[rows.length - 1]?.updatedAt || '',
  ).getTime()
  if (!Number.isFinite(firstAt) || !Number.isFinite(lastAt)) return rows

  return firstAt > lastAt ? [...rows].reverse() : rows
}

export const normalizeClaimWorkflowRecord = (row, workflowRule) => {
  const base = row && typeof row === 'object' ? row : {}
  const status = String(base.status || '').trim()
  const rawStage = String(base.workflowStage || '')
    .trim()
    .toLowerCase()
  const stageFromStatus = getStageFromStatus(status)
  const stageFromRecord = WORKFLOW_VALID_STAGES.includes(rawStage) ? rawStage : stageFromStatus
  const isTerminal = WORKFLOW_TERMINAL_STATUSES.includes(status)
  const isActionableStage = WORKFLOW_ACTIONABLE_STAGES.includes(stageFromRecord)
  const pending = !isTerminal && (WORKFLOW_PENDING_STATUSES.includes(status) || isActionableStage)
  const stage = pending && stageFromRecord ? stageFromRecord : 'done'
  const configuredRole = normalizeRoleValue(getStageRoleFromRule(stage, workflowRule))
  const nextActionRole = WORKFLOW_ACTIONABLE_STAGES.includes(stage)
    ? normalizeRoleValue(base.nextActionRole) || configuredRole || null
    : null
  const approvalHistory = normalizeApprovalHistoryOrder(base.approvalHistory)
  const submittedBy =
    base.submittedByName || base.submittedBy || base.updatedByName || base.updatedBy || ''
  const ownerLabel =
    String(
      base.ownerLabel ||
        base.owner_label ||
        base.employeeName ||
        base.employee_name ||
        base.ownerName ||
        base.owner_name ||
        submittedBy ||
        '',
    ).trim() || ''

  return {
    ...base,
    ownerLabel,
    status: status || (pending ? getStatusForWorkflowStage(stage) : 'Pending'),
    workflowStage: stage,
    nextActionRole,
    approvalHistory,
    lastActionAt: base.lastActionAt || base.updatedAt || base.submittedAt || null,
    lastActionBy: base.lastActionBy || base.updatedByName || base.updatedBy || submittedBy || '',
  }
}

export { normalizeRoleList, normalizeRoleValue }
