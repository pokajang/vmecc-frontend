import { normalizeLegacyRole } from 'src/constants/roles'
import {
  DEFAULT_OVERTIME_APPROVAL_RULES,
  normalizeOvertimeApprovalRules,
  resolveOvertimeApprovalRule,
} from '../overtimePolicy'

const normalizeRoleValue = (role) => normalizeLegacyRole(String(role || '').trim())

export const normalizeRoleList = (roles = []) =>
  Array.from(
    new Set(
      (Array.isArray(roles) ? roles : []).map((role) => normalizeRoleValue(role)).filter(Boolean),
    ),
  )

const getWorkflowTemplateFromPolicy = (policy, applicantRoles = []) => {
  const normalizedPolicy = normalizeOvertimeApprovalRules(policy || DEFAULT_OVERTIME_APPROVAL_RULES)
  const workflowPolicy = normalizedPolicy?.workflow || {}
  const resolvedRule = resolveOvertimeApprovalRule(workflowPolicy, applicantRoles)
  const requireRecommendation = workflowPolicy?.options?.requireRecommendation !== false
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

const normalizeStage = (stage) => {
  if (['review', 'recommend', 'approve', 'done'].includes(stage)) return stage
  return 'review'
}

export const OT_INELIGIBLE_MESSAGE =
  'Your current role is not eligible to submit overtime claims. Contact HR/Admin if this is incorrect.'

export const resolveWorkflowMetadataForSubmit = (
  existingRecord,
  applicantRoles = [],
  policy = null,
) => {
  const policyTemplate = getWorkflowTemplateFromPolicy(policy, applicantRoles)
  const existingSnapshot =
    existingRecord?.workflowSnapshot &&
    typeof existingRecord.workflowSnapshot === 'object' &&
    !Array.isArray(existingRecord.workflowSnapshot)
      ? existingRecord.workflowSnapshot
      : null

  if (!existingSnapshot) {
    return {
      ...policyTemplate,
      applicantRoles,
    }
  }

  const requireRecommendation = existingSnapshot.requireRecommendation !== false
  const workflowSnapshot = {
    reviewRole:
      normalizeRoleValue(existingSnapshot.reviewRole) || policyTemplate.workflowSnapshot.reviewRole,
    recommendRole:
      normalizeRoleValue(existingSnapshot.recommendRole) ||
      policyTemplate.workflowSnapshot.recommendRole,
    approveRole:
      normalizeRoleValue(existingSnapshot.approveRole) ||
      policyTemplate.workflowSnapshot.approveRole,
    requireRecommendation,
  }

  let workflowStage = normalizeStage(existingRecord?.workflowStage)
  if (workflowStage === 'done') workflowStage = 'review'
  if (workflowStage === 'recommend' && !workflowSnapshot.requireRecommendation) {
    workflowStage = 'approve'
  }

  let nextActionRole = normalizeRoleValue(existingRecord?.nextActionRole)
  if (!nextActionRole) {
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
    nextActionRole: nextActionRole || null,
    applicantRoles,
  }
}
