export const WORKFLOW_STATUS_COLOR = Object.freeze({
  Draft: 'secondary',
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'dark',
})

export const PAYROLL_STATUS_COLOR = Object.freeze({
  ...WORKFLOW_STATUS_COLOR,
  Active: 'success',
  Scheduled: 'info',
  Superseded: 'dark',
  Checked: 'info',
  Reviewed: 'info',
  'Draft (Syncing)': 'secondary',
  'Pending Review': 'warning',
  'Pending Approval': 'warning',
  Paid: 'info',
})

export const getStatusColor = (status, map = WORKFLOW_STATUS_COLOR) =>
  map[String(status || '').trim()] || 'secondary'
