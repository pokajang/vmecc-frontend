import { useMemo } from 'react'
import { toSortableDate } from '../utils'

export default function useLeaveFilters({
  leaveRecords,
  search,
  sort,
  statusFilter,
  typeFilter,
  period,
  moduleLoadedAtMs,
  getWorkflowStatusLabel,
  getWorkflowPendingActionHint,
  getDisplayLeaveId,
}) {
  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase()
    const [sortField, sortDir] = sort.split(':')
    let next = [...leaveRecords]

    if (term) {
      next = next.filter((row) => {
        const statusLabel = getWorkflowStatusLabel(row)
        const pendingActionHint = getWorkflowPendingActionHint(row)
        const haystack =
          `${row.id} ${getDisplayLeaveId(row)} ${row.leaveType} ${row.status} ${statusLabel} ${pendingActionHint}`
            .toLowerCase()
            .trim()
        return haystack.includes(term)
      })
    }

    if (statusFilter !== 'All') {
      next = next.filter((row) => row.status === statusFilter)
    }

    if (typeFilter !== 'All') {
      next = next.filter((row) => row.leaveType === typeFilter)
    }

    if (period !== 'all') {
      const days = Number(period)
      if (!Number.isNaN(days) && days > 0) {
        const cutoff = new Date(moduleLoadedAtMs - days * 24 * 60 * 60 * 1000)
        next = next.filter((row) => {
          const applied = new Date(row.appliedAt)
          return !Number.isNaN(applied.getTime()) && applied >= cutoff
        })
      }
    }

    const monthDirection = sortField === 'appliedAt' && sortDir === 'asc' ? 1 : -1
    const resolveMonthOrder = (row) => {
      const sortableDate = toSortableDate(row?.appliedAt)
      if (!Number.isFinite(sortableDate)) return null
      const parsed = new Date(sortableDate)
      if (Number.isNaN(parsed.getTime())) return null
      return parsed.getFullYear() * 100 + (parsed.getMonth() + 1)
    }

    const compareWithinMonth = (a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortField === 'days') {
        const av = Number(a.days || 0)
        const bv = Number(b.days || 0)
        if (av !== bv) return av > bv ? dir : -dir
      } else {
        const av = toSortableDate(a.appliedAt)
        const bv = toSortableDate(b.appliedAt)
        if (av !== bv) return av > bv ? dir : -dir
      }

      const fallbackAv = toSortableDate(a.appliedAt)
      const fallbackBv = toSortableDate(b.appliedAt)
      if (fallbackAv === fallbackBv) return 0
      return fallbackAv > fallbackBv ? -1 : 1
    }

    next.sort((a, b) => {
      const monthA = resolveMonthOrder(a)
      const monthB = resolveMonthOrder(b)
      if (monthA !== monthB) {
        if (monthA === null) return 1
        if (monthB === null) return -1
        return monthA > monthB ? monthDirection : -monthDirection
      }
      return compareWithinMonth(a, b)
    })

    return next
  }, [
    getDisplayLeaveId,
    getWorkflowPendingActionHint,
    getWorkflowStatusLabel,
    leaveRecords,
    moduleLoadedAtMs,
    period,
    search,
    sort,
    statusFilter,
    typeFilter,
  ])

  const typeOptions = useMemo(
    () => [
      { value: 'All', label: 'All leave types' },
      ...Array.from(new Set(leaveRecords.map((row) => row.leaveType))).map((type) => ({
        value: type,
        label: type,
      })),
    ],
    [leaveRecords],
  )

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: 'All status' },
      ...Array.from(new Set(leaveRecords.map((row) => row.status))).map((status) => ({
        value: status,
        label: status,
      })),
    ],
    [leaveRecords],
  )

  return { filteredRecords, typeOptions, statusOptions }
}
