/**
 * Leave approval rules storage — API-backed.
 *
 * loadLeaveApprovalRules / saveLeaveApprovalRules now call the REST API.
 * normalizeLeaveApprovalRules and resolveLeaveApprovalRule remain pure functions
 * and are still used for preview/display purposes.
 */
import { apiRequest } from 'src/services/apiClient'
import { ROLE_OPTIONS } from 'src/constants/roles'

const DEFAULT_FALLBACK_RULE = {
  reviewRole: 'Contract Manager',
  recommendRole: 'Human Resource',
  approveRole: 'Client Contract Manager',
}

const DEFAULT_OPTIONS = {
  requireRecommendation: true,
  enforceDistinctApprovers: false,
}

const createDefaultRule = (
  id,
  applicantRole,
  reviewRole,
  recommendRole,
  approveRole,
  active = true,
) => ({
  id,
  applicantRole,
  reviewRole,
  recommendRole,
  approveRole,
  active,
})

export const DEFAULT_LEAVE_APPROVAL_RULES = {
  rules: [
    createDefaultRule(
      'leave-rule-trt',
      'Tactical Response Team',
      'Assistant Incident Commander',
      'Incident Commander',
      'Client Contract Manager',
    ),
    createDefaultRule(
      'leave-rule-aic',
      'Assistant Incident Commander',
      'Incident Commander',
      'Contract Manager',
      'Client Contract Manager',
    ),
    createDefaultRule(
      'leave-rule-ic',
      'Incident Commander',
      'Contract Manager',
      'Human Resource',
      'Client Contract Manager',
    ),
  ],
  fallback: DEFAULT_FALLBACK_RULE,
  options: DEFAULT_OPTIONS,
}

const isRole = (value) => ROLE_OPTIONS.includes(value)
const clonePolicy = (policy) => JSON.parse(JSON.stringify(policy))
const pickRole = (role, fallbackRole) => (isRole(role) ? role : fallbackRole)

const normalizeRule = (rule, index) => {
  const fallback = DEFAULT_FALLBACK_RULE
  return {
    id: String(rule?.id || `leave-rule-${index + 1}`),
    applicantRole: pickRole(rule?.applicantRole, ''),
    reviewRole: pickRole(rule?.reviewRole, fallback.reviewRole),
    recommendRole: pickRole(rule?.recommendRole, fallback.recommendRole),
    approveRole: pickRole(rule?.approveRole, fallback.approveRole),
    active: rule?.active !== false,
  }
}

export const normalizeLeaveApprovalRules = (value) => {
  const base = clonePolicy(DEFAULT_LEAVE_APPROVAL_RULES)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base

  const sourceRules = Array.isArray(value.rules) ? value.rules : base.rules
  const normalizedRules = sourceRules.map(normalizeRule).filter((rule) => rule.applicantRole)

  const fallbackSource =
    value.fallback && typeof value.fallback === 'object' && !Array.isArray(value.fallback)
      ? value.fallback
      : base.fallback

  const optionsSource =
    value.options && typeof value.options === 'object' && !Array.isArray(value.options)
      ? value.options
      : base.options

  return {
    rules: normalizedRules.length > 0 ? normalizedRules : base.rules,
    fallback: {
      reviewRole: pickRole(fallbackSource.reviewRole, base.fallback.reviewRole),
      recommendRole: pickRole(fallbackSource.recommendRole, base.fallback.recommendRole),
      approveRole: pickRole(fallbackSource.approveRole, base.fallback.approveRole),
    },
    options: {
      requireRecommendation: optionsSource.requireRecommendation !== false,
      enforceDistinctApprovers: Boolean(optionsSource.enforceDistinctApprovers),
    },
  }
}

/**
 * Load leave approval rules from API (GET /settings/leave-approval-rules).
 * Returns { ok, data: policy }
 */
export const loadLeaveApprovalRules = async () => {
  try {
    const result = await apiRequest('/settings/leave-approval-rules')
    const normalized = normalizeLeaveApprovalRules(result?.data ?? {})
    return { ok: true, data: normalized, missing: false, migrated: false, recovered: false }
  } catch (error) {
    return {
      ok: false,
      data: clonePolicy(DEFAULT_LEAVE_APPROVAL_RULES),
      missing: false,
      migrated: false,
      recovered: true,
      error,
    }
  }
}

/**
 * Save leave approval rules to API (POST /settings/leave-approval-rules).
 * Returns { ok, data: policy }
 */
export const saveLeaveApprovalRules = async (rules) => {
  try {
    const result = await apiRequest('/settings/leave-approval-rules', {
      method: 'POST',
      body: JSON.stringify(normalizeLeaveApprovalRules(rules)),
    })
    const normalized = normalizeLeaveApprovalRules(result?.data ?? {})
    return { ok: true, data: normalized }
  } catch (error) {
    return { ok: false, error, data: normalizeLeaveApprovalRules(rules) }
  }
}

/**
 * Pure function — resolve the matching approval rule for given applicant roles.
 * Still used for client-side preview before submission.
 */
export const resolveLeaveApprovalRule = (policy, applicantRoles = []) => {
  const normalizedPolicy = normalizeLeaveApprovalRules(policy)
  const roles = Array.isArray(applicantRoles) ? applicantRoles : []

  const match = normalizedPolicy.rules.find(
    (rule) => rule.active && roles.includes(rule.applicantRole),
  )
  if (match) return match

  return {
    id: 'leave-rule-fallback',
    applicantRole: 'Fallback',
    ...normalizedPolicy.fallback,
    active: true,
  }
}
