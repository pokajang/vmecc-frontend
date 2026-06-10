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

export const OVERTIME_TYPE_OPTIONS = [
  {
    value: 'weekday',
    title: 'Weekday Overtime',
    description: 'Overtime worked on regular weekdays.',
  },
  {
    value: 'weekend',
    title: 'Weekend Overtime',
    description: 'Overtime worked on weekends.',
  },
  {
    value: 'publicHoliday',
    title: 'Public Holiday Overtime',
    description: 'Overtime worked on public holidays.',
  },
]

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

export const DEFAULT_OVERTIME_APPROVAL_RULES = {
  workflow: {
    rules: [
      createDefaultRule(
        'ot-rule-trt',
        'Tactical Response Team',
        'Assistant Incident Commander',
        'Incident Commander',
        'Client Contract Manager',
      ),
      createDefaultRule(
        'ot-rule-aic',
        'Assistant Incident Commander',
        'Incident Commander',
        'Contract Manager',
        'Client Contract Manager',
      ),
      createDefaultRule(
        'ot-rule-ic',
        'Incident Commander',
        'Contract Manager',
        'Human Resource',
        'Client Contract Manager',
      ),
    ],
    fallback: DEFAULT_FALLBACK_RULE,
    options: DEFAULT_OPTIONS,
  },
  typeVisibility: {
    weekday: true,
    weekend: true,
    publicHoliday: true,
  },
}

const isRole = (value) => ROLE_OPTIONS.includes(value)
const cloneValue = (value) => JSON.parse(JSON.stringify(value))
const pickRole = (role, fallbackRole) => (isRole(role) ? role : fallbackRole)

const normalizeWorkflowRule = (rule, index) => {
  const fallback = DEFAULT_FALLBACK_RULE
  return {
    id: String(rule?.id || `ot-rule-${index + 1}`),
    applicantRole: pickRole(rule?.applicantRole, ''),
    reviewRole: pickRole(rule?.reviewRole, fallback.reviewRole),
    recommendRole: pickRole(rule?.recommendRole, fallback.recommendRole),
    approveRole: pickRole(rule?.approveRole, fallback.approveRole),
    active: rule?.active !== false,
  }
}

const normalizeWorkflowPolicy = (value) => {
  const base = cloneValue(DEFAULT_OVERTIME_APPROVAL_RULES.workflow)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base

  const sourceRules = Array.isArray(value.rules) ? value.rules : base.rules
  const normalizedRules = sourceRules
    .map((rule, index) => normalizeWorkflowRule(rule, index))
    .filter((rule) => rule.applicantRole)

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

const normalizeTypeVisibility = (value) => {
  const base = cloneValue(DEFAULT_OVERTIME_APPROVAL_RULES.typeVisibility)
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const normalized = {
    weekday: source.weekday !== false,
    weekend: source.weekend !== false,
    publicHoliday: source.publicHoliday !== false,
  }
  const hasAtLeastOne = Object.values(normalized).some(Boolean)
  return hasAtLeastOne ? normalized : base
}

export const normalizeOvertimeApprovalRules = (value) => {
  const base = cloneValue(DEFAULT_OVERTIME_APPROVAL_RULES)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base

  const sourceWorkflow =
    value.workflow && typeof value.workflow === 'object' && !Array.isArray(value.workflow)
      ? value.workflow
      : value

  return {
    workflow: normalizeWorkflowPolicy(sourceWorkflow),
    typeVisibility: normalizeTypeVisibility(value.typeVisibility),
  }
}

export const hasVisibleOvertimeType = (typeVisibility) =>
  Boolean(typeVisibility && Object.values(typeVisibility).some(Boolean))

export const resolveOvertimeApprovalRule = (policy, applicantRoles = []) => {
  const normalizedWorkflow = normalizeWorkflowPolicy(policy)
  const roles = Array.isArray(applicantRoles) ? applicantRoles : []

  const match = normalizedWorkflow.rules.find(
    (rule) => rule.active && roles.includes(rule.applicantRole),
  )
  if (match) return match

  return {
    id: 'ot-rule-fallback',
    applicantRole: 'Fallback',
    ...normalizedWorkflow.fallback,
    active: true,
  }
}
