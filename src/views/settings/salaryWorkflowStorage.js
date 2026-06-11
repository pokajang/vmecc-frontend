import { ROLE_OPTIONS } from 'src/constants/roles'
import { fetchSalaryWorkflowRules, saveSalaryWorkflowRulesApi } from 'src/services/api/settingsApi'

const STAGE_ALLOWED_ROLES = {
  checkRole: ['Admin', 'Finance', 'Human Resource', 'Contract Manager'],
  reviewRole: ['Finance', 'Contract Manager'],
  approveRole: ['Contract Manager'],
}

const DEFAULT_FALLBACK_RULE = {
  checkRole: 'Admin',
  reviewRole: 'Finance',
  approveRole: 'Contract Manager',
}

export const DEFAULT_SALARY_WORKFLOW_RULES = {
  rules: [],
  fallback: DEFAULT_FALLBACK_RULE,
}

const isRole = (value) => ROLE_OPTIONS.includes(value)
const isAllowedStageRole = (stageKey, role) => (STAGE_ALLOWED_ROLES[stageKey] || []).includes(role)
const clonePolicy = (policy) => JSON.parse(JSON.stringify(policy))

const pickStageRole = (stageKey, role, fallbackRole) => {
  if (isRole(role) && isAllowedStageRole(stageKey, role)) return role
  return fallbackRole
}

export const normalizeSalaryWorkflowRules = (value) => {
  const base = clonePolicy(DEFAULT_SALARY_WORKFLOW_RULES)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base

  const fallbackSource =
    value.fallback && typeof value.fallback === 'object' && !Array.isArray(value.fallback)
      ? value.fallback
      : base.fallback

  return {
    rules: [],
    fallback: {
      checkRole: pickStageRole('checkRole', fallbackSource.checkRole, base.fallback.checkRole),
      reviewRole: pickStageRole('reviewRole', fallbackSource.reviewRole, base.fallback.reviewRole),
      approveRole: pickStageRole(
        'approveRole',
        fallbackSource.approveRole,
        base.fallback.approveRole,
      ),
    },
  }
}

export const loadSalaryWorkflowRules = async () => {
  try {
    const result = await fetchSalaryWorkflowRules()
    return {
      ok: true,
      data: normalizeSalaryWorkflowRules(result?.data),
      missing: false,
      migrated: false,
      recovered: false,
    }
  } catch (error) {
    return {
      ok: false,
      data: clonePolicy(DEFAULT_SALARY_WORKFLOW_RULES),
      missing: false,
      migrated: false,
      recovered: true,
      error,
    }
  }
}

export const saveSalaryWorkflowRules = async (rules) => {
  const normalized = normalizeSalaryWorkflowRules(rules)
  try {
    const result = await saveSalaryWorkflowRulesApi(normalized)
    return { ok: true, data: normalizeSalaryWorkflowRules(result?.data || normalized) }
  } catch (error) {
    return { ok: false, error, data: normalized }
  }
}

export const resolveSalaryWorkflowRule = (policy) => {
  const normalizedPolicy = normalizeSalaryWorkflowRules(policy)

  return {
    id: 'salary-rule-fallback',
    applicantRole: 'Global',
    ...normalizedPolicy.fallback,
    active: true,
  }
}

export const SALARY_WORKFLOW_STAGE_ALLOWED_ROLES = STAGE_ALLOWED_ROLES
