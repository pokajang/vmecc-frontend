export const MODULE_LABELS = {
  leave: 'Leave',
  overtime: 'Overtime',
  salary: 'Salary',
  expense: 'Expense',
  exceptional: 'Exceptional',
  team: 'Team',
}

export const EVENT_LABELS = {
  submitted: 'Submitted',
  edited: 'Edited',
  checked: 'Checked',
  reviewed: 'Reviewed',
  recommended: 'Recommended',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  allocation_updated: 'Allocation Updated',
  set_salary: 'Salary Assigned',
  updated_salary: 'Salary Assignment Updated',
  deleted_salary: 'Salary Assignment Deleted',
  allocation_deleted: 'Allocation Deleted',
}

export const getModuleLabel = (item) => {
  const key = String(item?.module || item?.metadata?.module || '').trim().toLowerCase()
  return MODULE_LABELS[key] || key || 'Workflow'
}

export const getEventLabel = (item) => {
  const key = String(item?.eventType || '').trim().toLowerCase()
  return EVENT_LABELS[key] || null
}
