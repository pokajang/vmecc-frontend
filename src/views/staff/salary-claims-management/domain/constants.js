import {
  CLAIM_WORKFLOW_DECLARATION_LABEL,
  OVERTIME_WORKFLOW_DECLARATION_LABEL,
} from '../../shared/workflowDeclarations'

export const CLAIM_RECORDS_KEY = 'vmecc_claim_records'
export const OVERTIME_RATE_SETTINGS_KEY = 'vmecc_overtime_rate_settings'
export const SALARY_STATUTORY_RATES_KEY = 'vmecc_salary_statutory_rates'
export const OVERTIME_ROUTE_KEY_SEPARATOR = '::'
export const OVERTIME_BASE_HOUR_MODES = Object.freeze({
  AUTO_STATUTORY: 'auto_statutory',
  MONTH_DAYS_DIVISION: 'month_days_division',
})
export const OVERTIME_NORMAL_HOURS_STRATEGIES = Object.freeze({
  STATUTORY_8H: 'statutory_8h',
  GLOBAL: 'global',
  ROLE_BASED: 'role_based',
})

export const EPF_CATEGORY = Object.freeze({
  PART_A_UNDER_60: 'PART_A_UNDER_60',
  PART_C_60_AND_ABOVE: 'PART_C_60_AND_ABOVE',
  PART_E_MALAYSIAN_60_AND_ABOVE: 'PART_E_MALAYSIAN_60_AND_ABOVE',
  PART_F_NON_MALAYSIAN: 'PART_F_NON_MALAYSIAN',
})

export const SOCSO_CATEGORY = Object.freeze({
  FIRST: 'FIRST',
  SECOND: 'SECOND',
})

export const WORKFLOW_PENDING_STATUSES = ['Pending', 'Pending Review', 'Pending Approval']
export const WORKFLOW_TERMINAL_STATUSES = ['Approved', 'Paid', 'Rejected', 'Cancelled']
export const WORKFLOW_ACTIONABLE_STAGES = ['check', 'review', 'approve']
export const WORKFLOW_VALID_STAGES = [...WORKFLOW_ACTIONABLE_STAGES, 'done']
export const WORKFLOW_DECLARATION_LABEL = CLAIM_WORKFLOW_DECLARATION_LABEL
export { OVERTIME_WORKFLOW_DECLARATION_LABEL }

export const claimSortOptions = [
  { value: 'submittedAt:desc', label: 'Latest submitted' },
  { value: 'submittedAt:asc', label: 'Oldest submitted' },
  { value: 'amount:desc', label: 'Highest amount' },
  { value: 'amount:asc', label: 'Lowest amount' },
]

export const salarySortOptions = [
  { value: 'submittedAt:desc', label: 'Latest submitted' },
  { value: 'submittedAt:asc', label: 'Oldest submitted' },
  { value: 'period:desc', label: 'Latest period' },
  { value: 'period:asc', label: 'Oldest period' },
]

export const assignmentSortOptions = [
  { value: 'updatedAt:desc', label: 'Latest updated' },
  { value: 'updatedAt:asc', label: 'Oldest updated' },
  { value: 'employee:asc', label: 'Employee A-Z' },
  { value: 'employee:desc', label: 'Employee Z-A' },
  { value: 'effectiveFrom:desc', label: 'Latest effective' },
  { value: 'effectiveFrom:asc', label: 'Oldest effective' },
]

export const statusColorMap = {
  Draft: 'secondary',
  Active: 'success',
  Scheduled: 'info',
  Superseded: 'dark',
  Pending: 'warning',
  'Pending Review': 'warning',
  'Pending Approval': 'warning',
  Approved: 'success',
  Paid: 'info',
  Rejected: 'danger',
  Cancelled: 'dark',
}
