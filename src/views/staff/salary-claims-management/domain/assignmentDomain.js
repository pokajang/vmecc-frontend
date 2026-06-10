import { ASSIGNMENT_DRAFT_STATUS } from '../constants'
import { toSortableDate } from './formatters'

export const createAssignmentId = (rows, effectiveFrom) => {
  const year = String(effectiveFrom || '').slice(0, 4) || String(new Date().getFullYear())
  const maxSeq = rows.reduce((max, row) => {
    const match = String(row?.id || '').match(/(\d+)$/)
    const parsed = match ? Number(match[1]) : 0
    return parsed > max ? parsed : max
  }, 0)
  return `SCA-${year}-${String(maxSeq + 1).padStart(3, '0')}`
}

export const currentMonthValue = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const getAssignmentEmployeeIdentityKey = (row = {}) => {
  const employeeId = String(row?.employeeId || '').trim()
  if (employeeId) return `id:${employeeId}`
  const email = String(row?.email || '')
    .trim()
    .toLowerCase()
  if (email) return `email:${email}`
  const employee = String(row?.employee || '')
    .trim()
    .toLowerCase()
  if (employee) return `name:${employee}`
  return ''
}

const assignmentMonthValue = (row = {}) => String(row?.effectiveFrom || '').trim()

const byLatestAssignment = (a, b) => {
  const aMonth = assignmentMonthValue(a)
  const bMonth = assignmentMonthValue(b)
  if (aMonth !== bMonth) return aMonth > bMonth ? -1 : 1
  const aUpdated = toSortableDate(a?.updatedAt || a?.savedAt || a?.createdAt)
  const bUpdated = toSortableDate(b?.updatedAt || b?.savedAt || b?.createdAt)
  if (aUpdated !== bUpdated) return aUpdated > bUpdated ? -1 : 1
  return String(a?.id || '').localeCompare(String(b?.id || ''))
}

export const deriveAssignmentLifecycleRows = (rows = [], { todayMonth } = {}) => {
  const normalizedTodayMonth = String(todayMonth || currentMonthValue()).trim()
  const drafts = []
  const byIdentity = new Map()

  ;(Array.isArray(rows) ? rows : []).forEach((row) => {
    if (String(row?.status || '').trim() === ASSIGNMENT_DRAFT_STATUS) {
      drafts.push({ ...row, status: ASSIGNMENT_DRAFT_STATUS })
      return
    }
    const identityKey = getAssignmentEmployeeIdentityKey(row)
    const keyed = { ...row, _identityKey: identityKey }
    if (!identityKey) {
      drafts.push({ ...keyed, status: String(row?.status || '').trim() || 'Active' })
      return
    }
    const bucket = byIdentity.get(identityKey) || []
    bucket.push(keyed)
    byIdentity.set(identityKey, bucket)
  })

  const finalized = []
  byIdentity.forEach((rowsForEmployee) => {
    const sorted = [...rowsForEmployee].sort(byLatestAssignment)
    const activeRow =
      sorted.find((entry) => {
        const month = assignmentMonthValue(entry)
        if (!month) return true
        return month <= normalizedTodayMonth
      }) || null

    sorted.forEach((entry) => {
      const month = assignmentMonthValue(entry)
      if (month && month > normalizedTodayMonth) {
        finalized.push({ ...entry, status: 'Scheduled' })
        return
      }
      if (activeRow && String(entry?.id || '') === String(activeRow?.id || '')) {
        finalized.push({ ...entry, status: 'Active' })
        return
      }
      finalized.push({ ...entry, status: 'Superseded' })
    })
  })

  return [...drafts, ...finalized].map((row) => {
    const next = { ...row }
    delete next._identityKey
    return next
  })
}

export const createAllowanceDraftItem = (overrides = {}) => ({
  id: overrides.id || `allow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: overrides.name || '',
  amount: asInputNumber(overrides.amount),
})

export const defaultSalaryAllowanceRows = () => [
  createAllowanceDraftItem({ name: 'Performance Allowance', amount: '0' }),
  createAllowanceDraftItem({ name: 'Mobile Allowance', amount: '0' }),
]

export const emptyAssignmentDraft = () => ({
  selectedStaffKey: '',
  employeeId: '',
  employee: '',
  avatarUrl: '',
  email: '',
  icNumber: '',
  phone: '',
  team: 'Unassigned',
  effectiveFrom: currentMonthValue(),
  basicSalary: '',
  allowances: defaultSalaryAllowanceRows(),
  allowanceTotal: '',
  employeeContributions: {
    epf: '',
    perkeso: '',
    sip: '',
  },
  employerContributions: {
    epf: '',
    perkeso: '',
    sip: '',
  },
  fixedAllowances: '',
  epf: '',
  perkeso: '',
  sip: '',
  notes: '',
  notesHistory: [],
  notesUpdatedAt: '',
  notesUpdatedBy: '',
})

export const asInputNumber = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return ''
  return String(value)
}
