import { BadgeDollarSign, ReceiptText, ShieldCheck } from 'lucide-react'

export const claimSortOptions = [
  { value: 'submittedAt:desc', label: 'Latest submitted' },
  { value: 'submittedAt:asc', label: 'Oldest submitted' },
  { value: 'amount:desc', label: 'Highest amount' },
  { value: 'amount:asc', label: 'Lowest amount' },
]

export const CLAIM_TYPE_ROUTES = {
  expense: '/payroll/claims/new/expense',
  salary: '/payroll/claims/new/salary',
  other: '/payroll/claims/new/expense',
}

export const CLAIM_TYPE_META = {
  salary: { label: 'Salary Claim', icon: BadgeDollarSign },
  expense: { label: 'Expense Claim', icon: ReceiptText },
  other: { label: 'Exceptional Claim', icon: ShieldCheck },
}

export const CLAIM_STATUS_COLOR = {
  Pending: 'warning',
  'Pending Review': 'warning',
  'Pending Approval': 'warning',
  Approved: 'success',
  Paid: 'info',
  Rejected: 'danger',
  Cancelled: 'dark',
}

export const TERMINAL_CLAIM_STATUSES = ['Approved', 'Paid', 'Rejected', 'Cancelled']
