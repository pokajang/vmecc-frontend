import { ROLE_OPTIONS } from 'src/constants/roles'

const SALARY_WORKFLOW_RULES_KEY = 'vmecc_salary_workflow_rules'
const SCHEMA_VERSION = 1

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

const writeEnvelope = (data) => {
  const payload = {
    version: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data: normalizeSalaryWorkflowRules(data),
  }

  try {
    localStorage.setItem(SALARY_WORKFLOW_RULES_KEY, JSON.stringify(payload))
    return { ok: true, data: payload.data }
  } catch (error) {
    return { ok: false, error, data: normalizeSalaryWorkflowRules(data) }
  }
}

export const loadSalaryWorkflowRules = () => {
  try {
    const raw = localStorage.getItem(SALARY_WORKFLOW_RULES_KEY)
    if (!raw) {
      const seeded = writeEnvelope(DEFAULT_SALARY_WORKFLOW_RULES)
      return {
        ok: seeded.ok,
        data: seeded.data,
        missing: true,
        migrated: false,
        recovered: !seeded.ok,
        error: seeded.error,
      }
    }

    const parsed = JSON.parse(raw)
    const isEnvelope =
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'version' in parsed &&
      'data' in parsed
    const sourceData = isEnvelope ? parsed.data : parsed
    const normalized = normalizeSalaryWorkflowRules(sourceData)
    const shouldRewrite =
      !isEnvelope ||
      parsed.version !== SCHEMA_VERSION ||
      JSON.stringify(normalized) !== JSON.stringify(sourceData)

    if (shouldRewrite) {
      const rewrite = writeEnvelope(normalized)
      return {
        ok: rewrite.ok,
        data: rewrite.data,
        missing: false,
        migrated: true,
        recovered: !rewrite.ok,
        error: rewrite.error,
      }
    }

    return {
      ok: true,
      data: normalized,
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

export const saveSalaryWorkflowRules = (rules) => writeEnvelope(rules)

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
