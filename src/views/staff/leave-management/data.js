export const LEAVE_MANAGEMENT_ALLOWED_PERMISSIONS = ['staff.leave.manage']
export const SALARY_CLAIMS_ALLOWED_PERMISSIONS = ['staff.salary.manage']

export const staffLeaveRows = []

export const leaveEntitlementRows = []

export const leaveTypeCatalog = [
  'Annual Leave',
  'Medical Leave',
  'Emergency Leave',
  'Compassionate Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Unpaid Leave',
  'Other Leave',
]

export const defaultEntitlementByType = {
  'Annual Leave': 14,
  'Medical Leave': 14,
  'Emergency Leave': 3,
  'Compassionate Leave': 3,
  'Maternity Leave': 98,
  'Paternity Leave': 7,
  'Unpaid Leave': 0,
  'Other Leave': 0,
}

export const leaveSortOptions = [
  { value: 'appliedAt:desc', label: 'Latest applied' },
  { value: 'appliedAt:asc', label: 'Oldest applied' },
  { value: 'days:desc', label: 'Most days' },
  { value: 'days:asc', label: 'Least days' },
]

export const overtimeSortOptions = [
  { value: 'appliedAt:desc', label: 'Latest submitted' },
  { value: 'appliedAt:asc', label: 'Oldest submitted' },
  { value: 'durationMinutes:desc', label: 'Longest duration' },
  { value: 'durationMinutes:asc', label: 'Shortest duration' },
]

export const assignmentSortOptions = [
  { value: 'employee:asc', label: 'Employee A-Z' },
  { value: 'employee:desc', label: 'Employee Z-A' },
  { value: 'available:desc', label: 'Highest available' },
  { value: 'available:asc', label: 'Lowest available' },
]

export const holidaySortOptions = [
  { value: 'date:asc', label: 'Date (oldest first)' },
  { value: 'date:desc', label: 'Date (latest first)' },
  { value: 'name:asc', label: 'Name A-Z' },
  { value: 'name:desc', label: 'Name Z-A' },
]

const toIsoDate = (year, month, day) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(
    2,
    '0',
  )}`

export const DEFAULT_FIXED_NATIONAL_HOLIDAYS = [
  { key: 'new-years-day', name: "New Year's Day", month: 1, day: 1 },
  { key: 'labour-day', name: 'Labour Day', month: 5, day: 1 },
  { key: 'agong-birthday', name: "Yang di-Pertuan Agong's Birthday", month: 6, day: 1 },
  { key: 'national-day', name: 'National Day', month: 8, day: 31 },
  { key: 'malaysia-day', name: 'Malaysia Day', month: 9, day: 16 },
]

export const buildDefaultFixedNationalDraft = (year = new Date().getFullYear()) =>
  DEFAULT_FIXED_NATIONAL_HOLIDAYS.map((holiday) => ({
    key: holiday.key,
    name: holiday.name,
    date: toIsoDate(year, holiday.month, holiday.day),
    applicable: true,
    scope: 'National',
    state: 'All States',
  }))

export const statusColorMap = {
  Draft: 'secondary',
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'dark',
}
