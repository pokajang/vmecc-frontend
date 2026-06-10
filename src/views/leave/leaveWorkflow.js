import { normalizeLegacyRole } from 'src/constants/roles'
import {
  loadLeaveApprovalRules,
  resolveLeaveApprovalRule,
} from 'src/views/settings/leaveApprovalRulesStorage'

const normalizeRoleValue = (role) => normalizeLegacyRole(String(role || '').trim())
const normalizeRoleList = (roles = []) =>
  Array.from(
    new Set(
      (Array.isArray(roles) ? roles : []).map((role) => normalizeRoleValue(role)).filter(Boolean),
    ),
  )

const getWorkflowTemplateFromPolicy = (applicantRoles = []) => {
  const policy = loadLeaveApprovalRules().data
  const resolvedRule = resolveLeaveApprovalRule(policy, applicantRoles)
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

const normalizeStage = (stage) => {
  if (['review', 'recommend', 'approve', 'done'].includes(stage)) return stage
  return 'review'
}

const resolveWorkflowMetadataForSubmit = (existingRecord, applicantRoles = []) => {
  const policyTemplate = getWorkflowTemplateFromPolicy(applicantRoles)
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

const NON_CANCELABLE_STATUSES = new Set(['rejected', 'cancelled'])
const normalizeStatus = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const isLeaveCancellableByApplicant = (row) => normalizeStatus(row?.status) === 'pending'

const isLeaveCancellableByAdmin = (row) => {
  const status = normalizeStatus(row?.status)
  return status === 'pending' || status === 'approved'
}

const isLeaveCancellable = (row) => {
  const status = normalizeStatus(row?.status)
  if (!status || NON_CANCELABLE_STATUSES.has(status)) return false
  if (status === 'approved') return true

  const workflowStage = String(row?.workflowStage || '')
    .trim()
    .toLowerCase()
  if (workflowStage && workflowStage !== 'done') return true

  if (status.startsWith('pending')) return true
  if (['reviewed', 'recommended'].includes(status)) return true
  return false
}

export {
  normalizeRoleList,
  normalizeRoleValue,
  getWorkflowTemplateFromPolicy,
  normalizeStage,
  resolveWorkflowMetadataForSubmit,
  isLeaveCancellableByApplicant,
  isLeaveCancellableByAdmin,
  isLeaveCancellable,
}
