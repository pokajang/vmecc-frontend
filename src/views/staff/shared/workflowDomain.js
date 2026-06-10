import { normalizeLegacyRole } from 'src/constants/roles'

export const normalizeRoleValue = (role) => normalizeLegacyRole(String(role || '').trim())

export const normalizeRoleList = (roles = []) =>
  Array.from(
    new Set(
      (Array.isArray(roles) ? roles : []).map((role) => normalizeRoleValue(role)).filter(Boolean),
    ),
  )

export const normalizeReviewWorkflowStage = (stage) =>
  ['review', 'recommend', 'approve', 'done'].includes(stage) ? stage : 'review'

export const getReviewWorkflowApproveActionLabel = (stage) => {
  if (stage === 'review') return 'Review'
  if (stage === 'recommend') return 'Recommend'
  return 'Approve'
}

export const canActorPerformWorkflowAction = ({
  status,
  nextActionRole,
  actorRoles,
  isSystemAdmin,
}) => {
  if (status !== 'Pending') return false
  if (isSystemAdmin) return true
  const requiredRole = normalizeRoleValue(nextActionRole)
  return Boolean(requiredRole) && normalizeRoleList(actorRoles).includes(requiredRole)
}

export const getWorkflowActionBlockedReason = ({
  status,
  nextActionRole,
  actorRoles,
  isSystemAdmin,
  missingRoleLabel = 'assigned approver',
} = {}) => {
  const normalizedStatus = String(status || '').trim()
  if (normalizedStatus !== 'Pending') {
    return 'This record is no longer pending workflow action.'
  }
  if (isSystemAdmin) return ''
  const requiredRole = normalizeRoleValue(nextActionRole)
  if (!requiredRole) {
    return 'This record has no valid next action role configured.'
  }
  const normalizedActorRoles = normalizeRoleList(actorRoles)
  if (!normalizedActorRoles.includes(requiredRole)) {
    return `This stage requires ${requiredRole || missingRoleLabel} role.`
  }
  return ''
}

export const buildReviewWorkflowTemplateForApplicantRoles = (
  policy,
  applicantRoles = [],
  resolveApprovalRule,
) => {
  const resolver = typeof resolveApprovalRule === 'function' ? resolveApprovalRule : () => ({})
  const resolvedRule = resolver(policy, applicantRoles)
  const requireRecommendation = policy?.options?.requireRecommendation !== false
  const reviewRole = normalizeRoleValue(resolvedRule?.reviewRole)
  const recommendRole = normalizeRoleValue(resolvedRule?.recommendRole)
  const approveRole = normalizeRoleValue(resolvedRule?.approveRole)

  return {
    workflowSnapshot: {
      reviewRole,
      recommendRole,
      approveRole,
      requireRecommendation,
    },
    workflowStage: 'review',
    nextActionRole: reviewRole || null,
  }
}

export const resolveReviewWorkflowStateForRecord = (
  record,
  applicantRoles = [],
  policy,
  resolveApprovalRule,
) => {
  const template = buildReviewWorkflowTemplateForApplicantRoles(
    policy,
    applicantRoles,
    resolveApprovalRule,
  )
  const snapshotCandidate =
    record?.workflowSnapshot &&
    typeof record.workflowSnapshot === 'object' &&
    !Array.isArray(record.workflowSnapshot)
      ? record.workflowSnapshot
      : null

  if (!snapshotCandidate) {
    if (record?.status !== 'Pending') {
      return {
        ...template,
        workflowStage: 'done',
        nextActionRole: null,
        applicantRoles,
      }
    }
    return {
      ...template,
      applicantRoles,
    }
  }

  const requireRecommendation = snapshotCandidate.requireRecommendation !== false
  const workflowSnapshot = {
    reviewRole:
      normalizeRoleValue(snapshotCandidate.reviewRole) || template.workflowSnapshot.reviewRole,
    recommendRole:
      normalizeRoleValue(snapshotCandidate.recommendRole) ||
      template.workflowSnapshot.recommendRole,
    approveRole:
      normalizeRoleValue(snapshotCandidate.approveRole) || template.workflowSnapshot.approveRole,
    requireRecommendation,
  }

  let workflowStage = normalizeReviewWorkflowStage(record?.workflowStage)
  if (record?.status !== 'Pending') workflowStage = 'done'
  if (workflowStage === 'done' && record?.status === 'Pending') workflowStage = 'review'
  if (workflowStage === 'recommend' && !workflowSnapshot.requireRecommendation) {
    workflowStage = 'approve'
  }

  let nextActionRole = normalizeRoleValue(record?.nextActionRole)
  if (!nextActionRole && workflowStage !== 'done') {
    nextActionRole =
      workflowStage === 'review'
        ? workflowSnapshot.reviewRole
        : workflowStage === 'recommend'
          ? workflowSnapshot.recommendRole
          : workflowSnapshot.approveRole
  }

  return {
    workflowSnapshot,
    workflowStage,
    nextActionRole: workflowStage === 'done' ? null : nextActionRole || null,
    applicantRoles,
  }
}
