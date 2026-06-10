import { resolvePeriodValue } from '../helpers/grouping'
import { CLAIM_RECORDS_KEY } from './constants'
import { parseStoredArray } from './storage'
import { parseAmount } from './money'
import { toSortableDate } from './formatters'

const compareByDirection = (a, b, dir) => {
  if (a === b) return 0
  return a > b ? dir : -dir
}

const comparePeriodValues = (aPeriodValue, bPeriodValue, monthDir) => {
  const aHasPeriod = Boolean(aPeriodValue)
  const bHasPeriod = Boolean(bPeriodValue)
  if (!aHasPeriod && !bHasPeriod) return 0
  if (!aHasPeriod) return 1
  if (!bHasPeriod) return -1
  return compareByDirection(aPeriodValue, bPeriodValue, monthDir)
}

const resolveClaimPeriodValue = (row) =>
  resolvePeriodValue(row?.periodValue) ||
  resolvePeriodValue(row?.period) ||
  resolvePeriodValue(row?.submittedAt)

const resolveClaimDisplayAmount = (row = {}) => {
  if (String(row?.type || '').trim() === 'salary') {
    if (row?.projectedNetPayout !== null && typeof row?.projectedNetPayout !== 'undefined') {
      return parseAmount(row.projectedNetPayout)
    }
    return 0
  }
  return parseAmount(row?.amount)
}

export const toTypeLabel = (value) => {
  if (value === 'salary') return 'Salary'
  if (value === 'expense') return 'Expense'
  if (value === 'other') return 'Exceptional'
  return value || '-'
}

export const buildOptionsFromUnique = (rows, key, allLabel, formatter = (value) => value) => [
  { value: 'All', label: allLabel },
  ...Array.from(new Set(rows.map((row) => row?.[key]).filter(Boolean))).map((value) => ({
    value,
    label: formatter(value),
  })),
]

export const loadSharedClaimRows = () => {
  try {
    const keys = Object.keys(localStorage).filter(
      (key) => key === CLAIM_RECORDS_KEY || key.startsWith(`${CLAIM_RECORDS_KEY}_`),
    )
    const merged = []
    keys.forEach((key) => {
      const ownerId = key.startsWith(`${CLAIM_RECORDS_KEY}_`)
        ? key.slice(`${CLAIM_RECORDS_KEY}_`.length)
        : ''
      const rows = parseStoredArray(localStorage.getItem(key))
      rows.forEach((row) => {
        merged.push({
          ...row,
          ownerId,
          ownerLabel:
            row?.submittedBy || row?.updatedBy || (ownerId ? `User ${ownerId}` : 'Unknown'),
        })
      })
    })
    return merged
  } catch {
    return []
  }
}

export const filterClaimRows = (rows, { search, statusFilter, typeFilter, period, sort }) => {
  const term = search.trim().toLowerCase()
  const [sortField, sortDir] = sort.split(':')
  let next = [...rows]

  if (term) {
    next = next.filter((row) =>
      `${row.id} ${row.ownerLabel} ${row.type} ${row.category} ${row.period} ${row.status}`
        .toLowerCase()
        .includes(term),
    )
  }
  if (statusFilter !== 'All') next = next.filter((row) => row.status === statusFilter)
  if (typeFilter !== 'All') next = next.filter((row) => row.type === typeFilter)

  if (period !== 'all') {
    const days = Number(period)
    if (!Number.isNaN(days) && days > 0) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      next = next.filter((row) => {
        const submitted = new Date(row.submittedAt)
        return !Number.isNaN(submitted.getTime()) && submitted >= cutoff
      })
    }
  }

  next.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    const monthDir = sortField === 'submittedAt' && sortDir === 'asc' ? 1 : -1
    const periodCompare = comparePeriodValues(
      resolveClaimPeriodValue(a),
      resolveClaimPeriodValue(b),
      monthDir,
    )
    if (periodCompare !== 0) return periodCompare
    const ownerCompare = compareByDirection(
      String(a.ownerLabel || a.ownerId || '').toLowerCase(),
      String(b.ownerLabel || b.ownerId || '').toLowerCase(),
      1,
    )
    if (ownerCompare !== 0) return ownerCompare

    if (sortField === 'amount') {
      const av = resolveClaimDisplayAmount(a)
      const bv = resolveClaimDisplayAmount(b)
      const amountCompare = compareByDirection(av, bv, dir)
      if (amountCompare !== 0) return amountCompare
      const submittedCompare = compareByDirection(
        toSortableDate(a.submittedAt),
        toSortableDate(b.submittedAt),
        -1,
      )
      if (submittedCompare !== 0) return submittedCompare
      return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true })
    }

    const submittedCompare = compareByDirection(
      toSortableDate(a.submittedAt),
      toSortableDate(b.submittedAt),
      dir,
    )
    if (submittedCompare !== 0) return submittedCompare
    return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true })
  })

  return next
}

export const filterSalaryRows = (rows, { search, statusFilter, period, sort }) => {
  const term = search.trim().toLowerCase()
  const [sortField, sortDir] = sort.split(':')
  let next = rows.filter((row) => row.type === 'salary')

  if (term) {
    next = next.filter((row) =>
      `${row.id} ${row.ownerLabel} ${row.period} ${row.status}`.toLowerCase().includes(term),
    )
  }
  if (statusFilter !== 'All') next = next.filter((row) => row.status === statusFilter)

  if (period !== 'all') {
    const days = Number(period)
    if (!Number.isNaN(days) && days > 0) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      next = next.filter((row) => {
        const submitted = new Date(row.submittedAt)
        return !Number.isNaN(submitted.getTime()) && submitted >= cutoff
      })
    }
  }

  next.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    const monthDir = sortField === 'submittedAt' && sortDir === 'asc' ? 1 : -1
    const periodCompare = comparePeriodValues(
      resolveClaimPeriodValue(a),
      resolveClaimPeriodValue(b),
      monthDir,
    )
    if (periodCompare !== 0) return periodCompare
    const ownerCompare = compareByDirection(
      String(a.ownerLabel || a.ownerId || '').toLowerCase(),
      String(b.ownerLabel || b.ownerId || '').toLowerCase(),
      1,
    )
    if (ownerCompare !== 0) return ownerCompare

    if (sortField === 'period') {
      const periodSortCompare = compareByDirection(
        String(a.periodValue || a.period || ''),
        String(b.periodValue || b.period || ''),
        dir,
      )
      if (periodSortCompare !== 0) return periodSortCompare
    }
    const submittedCompare = compareByDirection(
      toSortableDate(a.submittedAt),
      toSortableDate(b.submittedAt),
      sortField === 'period' ? -1 : dir,
    )
    if (submittedCompare !== 0) return submittedCompare
    return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true })
  })

  return next
}

export const filterAssignmentRows = (rows, { search, teamFilter, statusFilter = 'All', sort }) => {
  const term = search.trim().toLowerCase()
  const [sortField, sortDir] = sort.split(':')
  let next = [...rows]

  if (term) {
    next = next.filter((row) =>
      `${row.id} ${row.employee} ${row.email || ''} ${row.team || ''} ${row.effectiveFrom || ''}`
        .toLowerCase()
        .includes(term),
    )
  }

  if (teamFilter !== 'All') next = next.filter((row) => row.team === teamFilter)
  if (statusFilter !== 'All')
    next = next.filter((row) => String(row?.status || 'Active') === statusFilter)

  next.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'updatedAt') {
      const av = toSortableDate(a.updatedAt || a.savedAt || a.createdAt)
      const bv = toSortableDate(b.updatedAt || b.savedAt || b.createdAt)
      if (av === bv) return 0
      return av > bv ? dir : -dir
    }
    if (sortField === 'effectiveFrom') {
      const av = String(a.effectiveFrom || '')
      const bv = String(b.effectiveFrom || '')
      if (av === bv) return 0
      return av > bv ? dir : -dir
    }
    const av = String(a.employee || '').toLowerCase()
    const bv = String(b.employee || '').toLowerCase()
    if (av === bv) return 0
    return av > bv ? dir : -dir
  })

  return next
}
