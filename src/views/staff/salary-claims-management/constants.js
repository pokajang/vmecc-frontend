import { BadgeDollarSign, ReceiptText, ShieldCheck } from 'lucide-react'

export const CLAIM_TYPE_META = {
  salary: { label: 'Salary Claim', icon: BadgeDollarSign },
  expense: { label: 'Expense Claim', icon: ReceiptText },
  other: { label: 'Exceptional Claim', icon: ShieldCheck },
}

export const TAB_KEYS = [
  'salaryRecords',
  'claimRecords',
  'assignment',
  'otRates',
  'workflowRules',
  'companyLegal',
]

export const DEFAULT_TAB_KEY = 'salaryRecords'

export const SALARY_CLAIMS_BASE = '/staff/salary-claims'
export const SET_SALARY_BASE = '/staff/set-salary'

export const TAB_PATH_BY_KEY = {
  claimRecords: 'claims',
  salaryRecords: 'salary',
  assignment: 'set-salary',
  otRates: 'set-ot-rate',
  workflowRules: 'workflow-rules',
  companyLegal: 'company-legal',
}

export const TAB_BASE_BY_KEY = {
  claimRecords: SALARY_CLAIMS_BASE,
  salaryRecords: SALARY_CLAIMS_BASE,
  assignment: SET_SALARY_BASE,
  otRates: SET_SALARY_BASE,
  workflowRules: SET_SALARY_BASE,
  companyLegal: SET_SALARY_BASE,
}

// Which nav entry point each tab belongs to
export const TAB_GROUP_BY_KEY = {
  claimRecords: 'records',
  salaryRecords: 'records',
  assignment: 'settings',
  otRates: 'settings',
  workflowRules: 'settings',
  companyLegal: 'settings',
}

export const DEFAULT_TAB_BY_GROUP = {
  records: 'salaryRecords',
  settings: 'assignment',
}

export const TAB_KEY_BY_PATH = Object.entries(TAB_PATH_BY_KEY).reduce((acc, [key, path]) => {
  acc[path] = key
  return acc
}, {})

export const ASSIGNMENT_DRAFT_STATUS = 'Draft'
