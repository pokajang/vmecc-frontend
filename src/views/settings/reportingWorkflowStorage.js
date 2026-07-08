import { ROLE_OPTIONS } from 'src/constants/roles'
import {
  fetchReportingWorkflowRules,
  saveReportingWorkflowRules as saveReportingWorkflowRulesApi,
} from 'src/services/api/settingsApi'

export const REPORTING_WORKFLOW_MODULE_DEFS = [
  {
    key: 'inspection',
    label: 'Inspection',
    description: 'Configure submitter review and approval routing for Inspection records.',
    editable: true,
    path: '/reporting-settings/inspection',
    to: '/reporting-settings/inspection',
  },
  {
    key: 'erco',
    label: 'ERCO',
    description: 'Configure submitter review and approval routing for ERCO records.',
    editable: true,
    path: '/reporting-settings/erco',
    to: '/reporting-settings/erco',
  },
  {
    key: 'drill',
    label: 'Drill',
    description: 'Configure submitter review and approval routing for Drill records.',
    editable: true,
    path: '/reporting-settings/drill',
    to: '/reporting-settings/drill',
  },
  {
    key: 'fitness-test',
    label: 'Fitness Test',
    description: 'Configure submitter review and approval routing for Fitness Test records.',
    editable: true,
    path: '/reporting-settings/fitness-test',
    to: '/reporting-settings/fitness-test',
  },
]

const DEFAULT_INSPECTION_FALLBACK = {
  reviewRole: 'Assistant Incident Commander',
  fallbackReviewRole: 'Incident Commander',
  approveRole: 'Incident Commander',
}

const DEFAULT_OTHER_FALLBACK = {
  reviewRole: 'Incident Commander',
  fallbackReviewRole: 'Incident Commander',
  approveRole: 'Incident Commander',
}

const DEFAULT_OPTIONS = {
  useTeamScopedAic: true,
  allowSubmitWithoutTeam: true,
  allowIcFallbackReview: true,
  preventSelfReview: true,
  preventSelfApprove: true,
}

const isKnownRole = (value) => ROLE_OPTIONS.includes(String(value || ''))

const normalizeRole = (value, fallbackRole) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return fallbackRole
  return isKnownRole(trimmed) ? trimmed : fallbackRole
}

const normalizeOptions = (options) => {
  const source = options && typeof options === 'object' ? options : {}
  return {
    useTeamScopedAic: source.useTeamScopedAic !== false,
    allowSubmitWithoutTeam: source.allowSubmitWithoutTeam !== false,
    allowIcFallbackReview: source.allowIcFallbackReview !== false,
    preventSelfReview: source.preventSelfReview !== false,
    preventSelfApprove: source.preventSelfApprove !== false,
  }
}

const normalizeFallback = (fallback, defaults) => {
  const source = fallback && typeof fallback === 'object' ? fallback : {}
  return {
    reviewRole: normalizeRole(source.reviewRole, defaults.reviewRole),
    fallbackReviewRole: normalizeRole(source.fallbackReviewRole, defaults.fallbackReviewRole),
    approveRole: normalizeRole(source.approveRole, defaults.approveRole),
  }
}

const normalizeModuleRule = (moduleKey, source) => {
  const defaults = moduleKey === 'inspection' ? DEFAULT_INSPECTION_FALLBACK : DEFAULT_OTHER_FALLBACK
  const sourceRules = source && typeof source === 'object' ? source : {}
  return {
    fallback: normalizeFallback(sourceRules.fallback || sourceRules, defaults),
    options: normalizeOptions(sourceRules.options || {}),
  }
}

export const normalizeReportingWorkflowRules = (value) => {
  const source = value && typeof value === 'object' ? value : {}
  const sourceModules = source.modules && typeof source.modules === 'object' ? source.modules : {}
  const modules = REPORTING_WORKFLOW_MODULE_DEFS.reduce((acc, module) => {
    const key = module.key
    acc[key] = normalizeModuleRule(key, sourceModules[key] || {})
    return acc
  }, {})
  return { modules }
}

const DEFAULT_RULES = normalizeReportingWorkflowRules({
  modules: {
    inspection: { fallback: DEFAULT_INSPECTION_FALLBACK, options: DEFAULT_OPTIONS },
    erco: { fallback: DEFAULT_OTHER_FALLBACK, options: DEFAULT_OPTIONS },
    drill: { fallback: DEFAULT_OTHER_FALLBACK, options: DEFAULT_OPTIONS },
    'fitness-test': { fallback: DEFAULT_OTHER_FALLBACK, options: DEFAULT_OPTIONS },
  },
})

export const loadReportingWorkflowRules = async () => {
  try {
    const result = await fetchReportingWorkflowRules()
    return {
      ok: true,
      data: normalizeReportingWorkflowRules(result?.data || DEFAULT_RULES),
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      data: DEFAULT_RULES,
      error,
    }
  }
}

export const saveReportingWorkflowRules = async (payload) => {
  try {
    const normalized = normalizeReportingWorkflowRules(payload || {})
    const result = await saveReportingWorkflowRulesApi(normalized)
    return {
      ok: true,
      data: normalizeReportingWorkflowRules(result?.data || normalized),
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      data: normalizeReportingWorkflowRules(payload || {}),
      error,
    }
  }
}

export const resolveReportingModuleKey = (value) => {
  const candidate = String(value || '').trim()
  if (!candidate) return 'inspection'
  if (!REPORTING_WORKFLOW_MODULE_DEFS.some((module) => module.key === candidate))
    return 'inspection'
  return candidate
}
