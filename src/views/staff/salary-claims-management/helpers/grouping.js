const MONTH_INDEX_BY_NAME = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

export const resolvePeriodValueFromLabel = (periodLabel) => {
  const label = String(periodLabel || '').trim()
  if (!label) return ''
  const matched = /^([A-Za-z]+)\s+(\d{4})$/.exec(label)
  if (!matched) return ''
  const month = MONTH_INDEX_BY_NAME[matched[1].toLowerCase()]
  const year = Number.parseInt(matched[2], 10)
  if (!month || !Number.isFinite(year)) return ''
  return `${year}-${String(month).padStart(2, '0')}`
}

export const resolvePeriodValue = (value) => {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  if (/^\d{4}-\d{2}$/.test(normalized)) return normalized

  const resolvedFromLabel = resolvePeriodValueFromLabel(normalized)
  if (resolvedFromLabel) return resolvedFromLabel

  const parsedDate = new Date(normalized)
  if (Number.isNaN(parsedDate.getTime())) return ''
  return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`
}

export const getPeriodMeta = (row, formatMonth) => {
  const periodValue = resolvePeriodValue(row?.periodValue)
  if (periodValue) {
    return {
      value: periodValue,
      label: formatMonth(periodValue),
    }
  }
  const periodLabel = String(row?.period || '').trim()
  if (periodLabel) {
    const resolved = resolvePeriodValue(periodLabel)
    if (resolved) {
      return {
        value: resolved,
        label: formatMonth(resolved),
      }
    }
    return {
      value: periodLabel,
      label: periodLabel,
    }
  }
  return { value: 'unknown', label: 'Unknown period' }
}

export const getAssignmentPeriodMeta = (row, formatMonth) => {
  const resolved = resolvePeriodValue(row?.effectiveFrom)
  if (resolved) return { value: resolved, label: formatMonth(resolved) }
  return { value: 'unknown', label: 'Unknown period' }
}

export const getOvertimePeriodMeta = (row, formatMonth) => {
  const resolved =
    resolvePeriodValue(row?.claimDate) ||
    resolvePeriodValue(row?.startDate) ||
    resolvePeriodValue(row?.appliedAt)
  if (resolved) return { value: resolved, label: formatMonth(resolved) }
  return { value: 'unknown', label: 'Unknown period' }
}

export const getSalaryAdjustmentsTotal = (row, parseAmount) => {
  if (row?.adjustmentsTotal !== null && typeof row?.adjustmentsTotal !== 'undefined') {
    return parseAmount(row.adjustmentsTotal)
  }
  return null
}

export const getSalaryProjectedNet = (row, parseAmount) => {
  if (row?.projectedNetPayout !== null && typeof row?.projectedNetPayout !== 'undefined') {
    return parseAmount(row.projectedNetPayout)
  }
  return null
}

export const getAssignmentNetAssigned = (row, parseAmount) =>
  parseAmount(row?.basicSalary) +
  parseAmount(row?.allowanceTotal ?? row?.fixedAllowances) -
  (parseAmount(row?.employeeContributions?.epf ?? row?.epf) +
    parseAmount(row?.employeeContributions?.perkeso ?? row?.perkeso) +
    parseAmount(row?.employeeContributions?.sip ?? row?.sip))

export const buildGroupedRows = (rows, config, parseAmount) => {
  const { getOwnerKey, getOwnerLabel, getPeriod, getTotalValue } = config
  const groups = []
  const map = new Map()

  rows.forEach((row) => {
    const periodMeta = getPeriod(row)
    const ownerKey = String(getOwnerKey(row) || '').trim() || 'unknown'
    const groupKey = `${ownerKey}::${String(periodMeta?.value || 'unknown')}`

    if (!map.has(groupKey)) {
      const next = {
        key: groupKey,
        ownerKey,
        ownerLabel: getOwnerLabel(row) || 'Unknown',
        periodValue: String(periodMeta?.value || 'unknown'),
        periodLabel: String(periodMeta?.label || 'Unknown period'),
        rows: [],
        totalAmount: 0,
      }
      map.set(groupKey, next)
      groups.push(next)
    }

    const group = map.get(groupKey)
    group.rows.push(row)
    group.totalAmount += parseAmount(getTotalValue(row))
  })

  return groups
}

export const buildPeriodOwnerGroupedRows = (rows, config, parseAmount) => {
  const { getOwnerKey, getOwnerLabel, getPeriod, getTotalValue } = config
  const periodGroups = []
  const periodMap = new Map()

  rows.forEach((row) => {
    const periodMeta = getPeriod(row)
    const periodValue = String(periodMeta?.value || 'unknown')
    const periodKey = `period:${periodValue}`

    if (!periodMap.has(periodKey)) {
      const nextPeriod = {
        key: periodKey,
        periodValue,
        periodLabel: String(periodMeta?.label || 'Unknown period'),
        rows: [],
        totalAmount: 0,
        ownerGroups: [],
        ownerMap: new Map(),
      }
      periodMap.set(periodKey, nextPeriod)
      periodGroups.push(nextPeriod)
    }

    const periodGroup = periodMap.get(periodKey)
    periodGroup.rows.push(row)
    periodGroup.totalAmount += parseAmount(getTotalValue(row))

    const ownerKey = String(getOwnerKey(row) || '').trim() || 'unknown'
    const ownerGroupKey = `${periodKey}::${ownerKey}`

    if (!periodGroup.ownerMap.has(ownerGroupKey)) {
      const nextOwner = {
        key: ownerGroupKey,
        ownerKey,
        ownerLabel: getOwnerLabel(row) || 'Unknown',
        rows: [],
        totalAmount: 0,
      }
      periodGroup.ownerMap.set(ownerGroupKey, nextOwner)
      periodGroup.ownerGroups.push(nextOwner)
    }

    const ownerGroup = periodGroup.ownerMap.get(ownerGroupKey)
    ownerGroup.rows.push(row)
    ownerGroup.totalAmount += parseAmount(getTotalValue(row))
  })

  return periodGroups.map((periodGroup) => {
    const { ownerMap, ...rest } = periodGroup
    void ownerMap
    return rest
  })
}
