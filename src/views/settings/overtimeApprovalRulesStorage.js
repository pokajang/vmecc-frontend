import {
  DEFAULT_OVERTIME_APPROVAL_RULES,
  OVERTIME_TYPE_OPTIONS,
  hasVisibleOvertimeType,
  normalizeOvertimeApprovalRules,
  resolveOvertimeApprovalRule,
} from 'src/views/overtime/overtimePolicy'
import {
  fetchOvertimeApprovalRules,
  saveOvertimeApprovalRules as saveOvertimeApprovalRulesApi,
} from 'src/services/api/settingsApi'

export {
  DEFAULT_OVERTIME_APPROVAL_RULES,
  OVERTIME_TYPE_OPTIONS,
  hasVisibleOvertimeType,
  normalizeOvertimeApprovalRules,
  resolveOvertimeApprovalRule,
}

export const loadOvertimeApprovalRules = async () => {
  try {
    const result = await fetchOvertimeApprovalRules()
    return {
      ok: true,
      data: normalizeOvertimeApprovalRules(result?.data),
    }
  } catch (error) {
    return {
      ok: false,
      error,
      data: normalizeOvertimeApprovalRules(DEFAULT_OVERTIME_APPROVAL_RULES),
    }
  }
}

export const saveOvertimeApprovalRules = async (next) => {
  const normalized = normalizeOvertimeApprovalRules(next)
  try {
    const result = await saveOvertimeApprovalRulesApi(normalized)
    return {
      ok: true,
      data: normalizeOvertimeApprovalRules(result?.data || normalized),
    }
  } catch (error) {
    return { ok: false, error, data: normalized }
  }
}
