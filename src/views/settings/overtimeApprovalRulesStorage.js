import {
  DEFAULT_OVERTIME_APPROVAL_RULES,
  OVERTIME_TYPE_OPTIONS,
  hasVisibleOvertimeType,
  normalizeOvertimeApprovalRules,
  resolveOvertimeApprovalRule,
} from 'src/views/overtime/overtimePolicy'

const OVERTIME_APPROVAL_RULES_KEY = 'vmecc_overtime_approval_rules'

export {
  DEFAULT_OVERTIME_APPROVAL_RULES,
  OVERTIME_TYPE_OPTIONS,
  hasVisibleOvertimeType,
  normalizeOvertimeApprovalRules,
  resolveOvertimeApprovalRule,
}

export const loadOvertimeApprovalRules = () => {
  try {
    const raw = localStorage.getItem(OVERTIME_APPROVAL_RULES_KEY)
    if (!raw) return normalizeOvertimeApprovalRules(DEFAULT_OVERTIME_APPROVAL_RULES)
    const parsed = JSON.parse(raw)
    return normalizeOvertimeApprovalRules(parsed)
  } catch {
    return normalizeOvertimeApprovalRules(DEFAULT_OVERTIME_APPROVAL_RULES)
  }
}

export const saveOvertimeApprovalRules = (next) => {
  try {
    const normalized = normalizeOvertimeApprovalRules(next)
    localStorage.setItem(OVERTIME_APPROVAL_RULES_KEY, JSON.stringify(normalized))
    return true
  } catch {
    return false
  }
}
