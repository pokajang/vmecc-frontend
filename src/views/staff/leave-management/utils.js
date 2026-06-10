export const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const getDateRangeLabel = (row) => {
  if (!row?.startDate) return '-'
  if (row.startDate === row.endDate) return formatDate(row.startDate)
  return `${formatDate(row.startDate)} - ${formatDate(row.endDate)}`
}

export const toSortableDate = (value) => {
  const parsed = new Date(value).getTime()
  if (Number.isNaN(parsed)) return -Infinity
  return parsed
}

const toMonthValue = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

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

export const getAvailableDays = (row) =>
  Number(row.entitlement || 0) - Number(row.used || 0) - Number(row.pending || 0)

export const formatSigned = (value) => {
  const numeric = Number(value || 0)
  if (numeric > 0) return `+${numeric}`
  return `${numeric}`
}

export const filterLeaveRecords = (rows, { search, statusFilter, typeFilter, period, sort }) => {
  const term = search.trim().toLowerCase()
  const [sortField, sortDir] = sort.split(':')
  let next = [...rows]

  if (term) {
    next = next.filter((row) => {
      const haystack = `${row.id} ${row.employee} ${row.leaveType} ${row.status} ${row.team || ''}`
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
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      next = next.filter((row) => {
        const applied = new Date(row.appliedAt)
        return !Number.isNaN(applied.getTime()) && applied >= cutoff
      })
    }
  }

  next.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    const monthDir = sortField === 'appliedAt' && sortDir === 'asc' ? 1 : -1
    const periodCompare = comparePeriodValues(
      toMonthValue(a.appliedAt),
      toMonthValue(b.appliedAt),
      monthDir,
    )
    if (periodCompare !== 0) return periodCompare

    if (sortField === 'days') {
      const dayCompare = compareByDirection(Number(a.days || 0), Number(b.days || 0), dir)
      if (dayCompare !== 0) return dayCompare
      const appliedCompare = compareByDirection(
        toSortableDate(a.appliedAt),
        toSortableDate(b.appliedAt),
        -1,
      )
      if (appliedCompare !== 0) return appliedCompare
      return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true })
    }
    const appliedCompare = compareByDirection(
      toSortableDate(a.appliedAt),
      toSortableDate(b.appliedAt),
      dir,
    )
    if (appliedCompare !== 0) return appliedCompare
    return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true })
  })

  return next
}

export const filterOvertimeRecords = (rows, { search, statusFilter, period, sort }) => {
  const term = search.trim().toLowerCase()
  const [sortField, sortDir] = sort.split(':')
  let next = [...rows]

  if (term) {
    next = next.filter((row) => {
      const haystack =
        `${row.id} ${row.employee} ${row.status} ${row.team || ''} ${row.reason || ''}`
          .toLowerCase()
          .trim()
      return haystack.includes(term)
    })
  }

  if (statusFilter !== 'All') {
    next = next.filter((row) => row.status === statusFilter)
  }

  if (period !== 'all') {
    const days = Number(period)
    if (!Number.isNaN(days) && days > 0) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      next = next.filter((row) => {
        const applied = new Date(row.appliedAt)
        return !Number.isNaN(applied.getTime()) && applied >= cutoff
      })
    }
  }

  next.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    const monthDir = sortField === 'appliedAt' && sortDir === 'asc' ? 1 : -1
    const periodCompare = comparePeriodValues(
      toMonthValue(a.appliedAt),
      toMonthValue(b.appliedAt),
      monthDir,
    )
    if (periodCompare !== 0) return periodCompare
    const ownerCompare = compareByDirection(
      String(a.employee || a.ownerUserId || '').toLowerCase(),
      String(b.employee || b.ownerUserId || '').toLowerCase(),
      1,
    )
    if (ownerCompare !== 0) return ownerCompare

    if (sortField === 'durationMinutes') {
      const av = Number(a.durationMinutes || 0)
      const bv = Number(b.durationMinutes || 0)
      const durationCompare = compareByDirection(av, bv, dir)
      if (durationCompare !== 0) return durationCompare
      const appliedCompare = compareByDirection(
        toSortableDate(a.appliedAt),
        toSortableDate(b.appliedAt),
        -1,
      )
      if (appliedCompare !== 0) return appliedCompare
      return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true })
    }
    const appliedCompare = compareByDirection(
      toSortableDate(a.appliedAt),
      toSortableDate(b.appliedAt),
      dir,
    )
    if (appliedCompare !== 0) return appliedCompare
    return String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true })
  })

  return next
}

export const filterAssignments = (rows, { search, typeFilter, teamFilter, sort }) => {
  const term = search.trim().toLowerCase()
  const [sortField, sortDir] = sort.split(':')
  let next = [...rows]

  if (term) {
    next = next.filter((row) => {
      const haystack = `${row.id} ${row.employee} ${row.team} ${row.leaveType} ${row.year || ''}`
        .toLowerCase()
        .trim()
      return haystack.includes(term)
    })
  }

  if (typeFilter !== 'All') {
    next = next.filter((row) => row.leaveType === typeFilter)
  }

  if (teamFilter !== 'All') {
    next = next.filter((row) => row.team === teamFilter)
  }

  next.sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'available') {
      const av = getAvailableDays(a)
      const bv = getAvailableDays(b)
      if (av === bv) return 0
      return av > bv ? dir : -dir
    }
    const av = (a.employee || '').toLowerCase()
    const bv = (b.employee || '').toLowerCase()
    if (av === bv) return 0
    return av > bv ? dir : -dir
  })

  return next
}

export const filterHolidays = (rows, { search, scopeFilter, stateFilter, yearFilter, sort }) => {
  const term = String(search || '')
    .trim()
    .toLowerCase()
  const [sortField, sortDir] = String(sort || 'date:asc').split(':')
  let next = [...rows]

  if (term) {
    next = next.filter((row) => {
      const haystack = `${row.name} ${row.scope} ${row.state || ''} ${row.date || ''}`
        .toLowerCase()
        .trim()
      return haystack.includes(term)
    })
  }

  if (scopeFilter !== 'All') {
    next = next.filter((row) => String(row.scope || '') === String(scopeFilter))
  }

  if (stateFilter !== 'All') {
    next = next.filter((row) => String(row.state || '') === String(stateFilter))
  }

  if (yearFilter !== 'All') {
    next = next.filter((row) => {
      const date = new Date(row.date)
      const derivedYear = Number.isNaN(date.getTime()) ? '' : String(date.getFullYear())
      const rowYear = String(row.year || derivedYear || '')
      return rowYear === String(yearFilter)
    })
  }

  next.sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1

    if (sortField === 'name') {
      const av = String(a.name || '').toLowerCase()
      const bv = String(b.name || '').toLowerCase()
      if (av !== bv) return av > bv ? dir : -dir
      const ad = toSortableDate(a.date)
      const bd = toSortableDate(b.date)
      if (ad !== bd) return ad > bd ? 1 : -1
      return 0
    }

    const ad = toSortableDate(a.date)
    const bd = toSortableDate(b.date)
    if (ad !== bd) return ad > bd ? dir : -dir
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      sensitivity: 'base',
    })
  })

  return next
}

export const makeOptionsFromUnique = (rows, key, allLabel) => [
  { value: 'All', label: allLabel },
  ...Array.from(new Set(rows.map((row) => row[key]))).map((value) => ({
    value,
    label: value,
  })),
]
