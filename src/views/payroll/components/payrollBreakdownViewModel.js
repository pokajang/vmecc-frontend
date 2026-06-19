import { parseAmount } from '../payrollUtils'

const asArray = (value) => (Array.isArray(value) ? value : [])
const asObject = (value) => (value && typeof value === 'object' ? value : {})
const hasValue = (value) => value !== null && typeof value !== 'undefined'

export const formatBaselineSource = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  if (normalized === 'hybrid') return 'Claim Snapshot + Salary Record'
  if (normalized === 'claim_snapshot') return 'Claim Snapshot'
  if (normalized === 'salary_record') return 'Salary Record'
  return 'Unavailable'
}

export const formatContributionList = (contributions = {}, formatCurrency) => {
  const entries = Object.entries(contributions || {}).filter(([, amount]) => Number(amount) !== 0)
  if (!entries.length) return '-'
  return entries
    .map(([key, amount]) => `${key}: ${formatCurrency(Number(amount) || 0)}`)
    .join(' | ')
}

export const formatAllowanceList = (allowanceItems = [], formatCurrency) => {
  if (!Array.isArray(allowanceItems) || allowanceItems.length === 0) return '-'
  return allowanceItems
    .map((entry) => `${entry.label || entry.key}: ${formatCurrency(parseAmount(entry.amount))}`)
    .join(' | ')
}

export const formatAdjustmentItems = (rows = [], formatCurrency) =>
  rows.length > 0
    ? rows
        .map((entry) => {
          const amountLabel = formatCurrency(Number(entry?.signedAmount || entry?.amount || 0))
          const label = String(
            entry?.title ||
              entry?.itemType ||
              entry?.claimType ||
              entry?.lineNotes ||
              entry?.notes ||
              `Line ${entry?.lineNo || '-'}`,
          ).trim()
          return `${label}: ${amountLabel}`
        })
        .join(' | ')
    : '-'

export const toContributionPairs = (employee = {}, employer = {}) => {
  const keys = Array.from(
    new Set([
      ...Object.keys(employee || {}).map((key) =>
        String(key || '')
          .trim()
          .toLowerCase(),
      ),
      ...Object.keys(employer || {}).map((key) =>
        String(key || '')
          .trim()
          .toLowerCase(),
      ),
    ]),
  ).filter(Boolean)
  return keys.map((key) => {
    const employeeAmount = Number(employee?.[key] || 0) || 0
    const employerAmount = Number(employer?.[key] || 0) || 0
    return {
      key,
      label: key.toUpperCase(),
      employeeAmount,
      employerAmount,
    }
  })
}

export const resolvePaymentDateLabel = (row = {}) => {
  const status = String(row?.status || '').trim()
  const paymentDate = String(row?.paymentDate || '').trim()
  if (status === 'Paid') return paymentDate || '-'
  if (status === 'Approved' && !paymentDate) return 'Pending payment'
  return paymentDate || '-'
}

const normalizeHourlyBaseSource = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const normalizeOvertimeTypeKey = (value) => {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
  if (!raw) return ''
  if (raw === 'publicholiday' || raw === 'public_holiday' || raw === 'public-holiday') {
    return 'publicHoliday'
  }
  if (raw === 'weekend') return 'weekend'
  if (raw === 'weekday') return 'weekday'
  return raw
}

const resolveOvertimeTypeLabel = (row = {}) => {
  if (String(row?.overtimeTypeLabel || '').trim()) return row.overtimeTypeLabel
  if (String(row?.typeLabel || '').trim()) return row.typeLabel
  const normalizedType = normalizeOvertimeTypeKey(row?.overtimeType || row?.type)
  if (normalizedType === 'publicHoliday') return 'Public Holiday'
  if (normalizedType === 'weekend') return 'Weekend'
  if (normalizedType === 'weekday') return 'Weekday'
  return String(row?.overtimeType || row?.type || '-')
}

const resolveOvertimeDurationHours = (row = {}) => {
  if (hasValue(row?.durationHours)) {
    return parseAmount(row.durationHours)
  }
  const fromMinutes = parseAmount(row?.durationMinutes)
  if (fromMinutes > 0) return fromMinutes / 60
  return parseAmount(row?.hours)
}

const resolveOvertimePayout = (row = {}) => {
  if (hasValue(row?.payablePayout)) {
    return parseAmount(row.payablePayout)
  }
  if (hasValue(row?.payoutUsed)) {
    return parseAmount(row.payoutUsed)
  }
  return parseAmount(row?.calculatedPayout)
}

const resolveOvertimeMultiplier = ({
  row = {},
  snapshot = {},
  durationHours = 0,
  hourlyBaseRate = 0,
  payoutUsed = 0,
}) => {
  const direct = parseAmount(row?.multiplier)
  if (direct > 0) return { value: direct, source: 'row' }

  const normalizedType = normalizeOvertimeTypeKey(row?.overtimeType || row?.type)
  if (normalizedType === 'weekday') {
    const fallback = parseAmount(snapshot?.weekdayMultiplier)
    if (fallback > 0) return { value: fallback, source: 'snapshot' }
  }
  if (normalizedType === 'weekend') {
    const fallback = parseAmount(snapshot?.weekendMultiplier)
    if (fallback > 0) return { value: fallback, source: 'snapshot' }
  }
  if (normalizedType === 'publicHoliday') {
    const fallback = parseAmount(snapshot?.publicHolidayMultiplier)
    if (fallback > 0) return { value: fallback, source: 'snapshot' }
  }

  if (durationHours > 0 && hourlyBaseRate > 0 && payoutUsed > 0) {
    return {
      value: Math.round((payoutUsed / (durationHours * hourlyBaseRate)) * 100) / 100,
      source: 'derived',
    }
  }

  return { value: 0, source: 'missing' }
}

const normalizeOvertimeRows = (rows = [], snapshot = {}) =>
  asArray(rows).map((row, index) => {
    const durationHours = resolveOvertimeDurationHours(row)
    const hourlyBaseRate = parseAmount(row?.hourlyBaseRateUsed || row?.hourlyBaseRate)
    const payoutUsed = resolveOvertimePayout(row)
    const multiplierResolved = resolveOvertimeMultiplier({
      row,
      snapshot,
      durationHours,
      hourlyBaseRate,
      payoutUsed,
    })
    const multiplier = multiplierResolved.value
    const multiplierSource = multiplierResolved.source
    const calculatedPayoutRaw = parseAmount(row?.calculatedPayout)
    const calculatedPayout =
      calculatedPayoutRaw > 0
        ? calculatedPayoutRaw
        : Math.round(durationHours * hourlyBaseRate * multiplier * 100) / 100
    const hourlyBaseSource = normalizeHourlyBaseSource(
      row?.hourlyBaseSource || snapshot?.hourlyBaseSource,
    )
    const monthlyDivisorUsed = hasValue(row?.monthlyDivisorUsed)
      ? row.monthlyDivisorUsed
      : snapshot?.monthlyDivisorUsed
    const overtimeId = row?.overtimeId || row?.id || `OT-${index + 1}`

    return {
      ...row,
      key: `${overtimeId}-${index}`,
      overtimeId,
      overtimeTypeLabel: resolveOvertimeTypeLabel(row),
      claimDate: row?.claimDate || row?.date || '',
      statusLabel: row?.statusLabel || row?.status || '-',
      durationHours,
      hourlyBaseRate,
      multiplier,
      multiplierSource,
      calculatedPayout,
      payoutUsed,
      hourlyBaseSource,
      monthlyDivisorUsed,
      isApproved: row?.isApproved !== false,
    }
  })

export const buildOvertimeDetailText = (row = {}, formatCurrency) =>
  `Detail: Hourly base = ${formatCurrency(row.hourlyBaseRate)}/h${
    row.monthlyDivisorUsed ? ` (monthly divisor used: ${row.monthlyDivisorUsed})` : ''
  }. Rate source: ${row.multiplierSource}. Payout = ${row.durationHours} h x ${formatCurrency(
    row.hourlyBaseRate,
  )}/h x ${row.multiplier > 0 ? `${row.multiplier}x` : '-'} = ${formatCurrency(
    row.calculatedPayout,
  )}${row.isApproved ? '' : ' (not approved, payout used may be RM 0.00).'}${
    row.hourlyBaseSource === 'missing' ? ' Hourly base source was missing for this row.' : ''
  }`

const getAdjustmentLabel = (item = {}) =>
  String(item?.lineNotes?.trim() || item?.notes?.trim() || 'No description')

const normalizeAmountRows = (rows = []) =>
  asArray(rows).map((item) => ({
    ...item,
    amount: parseAmount(item?.amount),
  }))

const buildAdjustmentDisplayRows = (rows = [], direction = 'addition') =>
  asArray(rows).map((item, index) => {
    const amount = Math.abs(parseAmount(item?.amount ?? item?.signedAmount))
    return {
      ...item,
      key: `${direction}-${item?.id || item?.lineNo || index}`,
      label: getAdjustmentLabel(item),
      amount,
      signedAmount: direction === 'deduction' ? -amount : amount,
      attachmentName: String(item?.attachmentName || '').trim(),
    }
  })

const buildPayslipBreakdown = (source = {}) => {
  const salaryRecord = source?.salaryRecord || null
  const baseline = asObject(source?.baseline)
  const adjustmentRows = asArray(source?.adjustments)
  const overtimeRows = asArray(source?.overtime?.rows)
  const employeeContributions =
    baseline?.employeeContributions || salaryRecord?.employeeContributions || {}
  const employerContributions =
    baseline?.employerContributions || salaryRecord?.employerContributions || {}
  const contributionPairs = toContributionPairs(employeeContributions, employerContributions)
  const employerContributionTotal = contributionPairs.reduce(
    (sum, entry) => sum + (Number(entry?.employerAmount || 0) || 0),
    0,
  )
  const deductionItems = normalizeAmountRows(baseline?.deductionItems)
  const allowanceItems = normalizeAmountRows(
    baseline?.allowanceItems || salaryRecord?.allowanceItems,
  )
  const approvalHistory = asArray(source?.approvalHistory)
  const baselineNet = parseAmount(source?.baselineNetSalary)
  const adjustmentsTotal = parseAmount(source?.adjustmentsTotal)
  const approvedOvertimePayout = parseAmount(source?.approvedOvertimePayout)
  const finalPayable = parseAmount(source?.netPayable)

  return {
    summary: {
      basicSalary: parseAmount(baseline?.basicSalary ?? salaryRecord?.basicSalary),
      grossSalary: parseAmount(baseline?.grossSalary ?? salaryRecord?.grossSalary),
      baselineNet,
      baselineTotalDeductions: parseAmount(baseline?.employeeDeductionsTotal),
      adjustedGrossSalary: parseAmount(baseline?.grossSalary ?? salaryRecord?.grossSalary),
      adjustedTotalDeductions: parseAmount(baseline?.employeeDeductionsTotal),
      adjustedNetBeforeOvertime: baselineNet + adjustmentsTotal,
      adjustmentsTotal,
      approvedOvertimePayout,
      finalPayable,
    },
    baseline: {
      source: source?.baselineSource,
      sourceLabel: formatBaselineSource(source?.baselineSource),
      salaryRecord,
      allowanceItems,
      allowanceTotal: parseAmount(baseline?.allowanceTotal ?? salaryRecord?.allowanceTotal),
      deductionItems,
    },
    contributions: {
      employeeContributions,
      employerContributions,
      contributionPairs,
      employerContributionTotal,
    },
    adjustments: {
      rows: adjustmentRows,
      additionRows: buildAdjustmentDisplayRows(adjustmentRows, 'addition'),
      deductionRows: [],
      additionTotal: Math.max(adjustmentsTotal, 0),
      deductionTotal: adjustmentsTotal < 0 ? Math.abs(adjustmentsTotal) : 0,
      displayRows: adjustmentRows,
    },
    overtime: {
      rows: overtimeRows,
      approvedHours: Number(source?.overtime?.approvedHours ?? 0) || 0,
      approvedPayout: parseAmount(source?.overtime?.approvedPayout ?? approvedOvertimePayout),
      hourlyBaseMode: '',
      hourlyBaseModeNote: '',
    },
    status: {
      approvalHistory,
      statusLabel: source?.status || '-',
      paymentDateLabel: resolvePaymentDateLabel(source),
    },
    hasDetails: Boolean(
      salaryRecord ||
        adjustmentRows.length > 0 ||
        overtimeRows.length > 0 ||
        source?.baselineSource,
    ),
  }
}

const buildSalaryClaimBreakdown = (source = {}) => {
  const payrollSnapshot = asObject(source?.payrollSnapshot)
  const allowanceItems = normalizeAmountRows(payrollSnapshot?.allowanceItems)
  const deductionItems = normalizeAmountRows(payrollSnapshot?.deductionItems)
  const adjustmentItems = asArray(source?.items)
  const additionRows = adjustmentItems.filter(
    (item) => String(item?.claimType || item?.itemType || '').trim() !== 'Deduction',
  )
  const deductionRows = adjustmentItems.filter(
    (item) => String(item?.claimType || item?.itemType || '').trim() === 'Deduction',
  )
  const basicSalary = parseAmount(payrollSnapshot?.basic)
  const grossSalary = parseAmount(payrollSnapshot?.gross)
  const baselineNet = parseAmount(payrollSnapshot?.net)
  const baselineTotalDeductions = parseAmount(payrollSnapshot?.totalDeductions)
  const additionTotal = additionRows.reduce(
    (sum, item) => sum + Math.abs(parseAmount(item?.amount)),
    0,
  )
  const deductionTotal = deductionRows.reduce(
    (sum, item) => sum + Math.abs(parseAmount(item?.amount)),
    0,
  )
  const adjustedGrossSalary = grossSalary + additionTotal
  const adjustedTotalDeductions = baselineTotalDeductions + deductionTotal
  const adjustedNetBeforeOvertime = adjustedGrossSalary - adjustedTotalDeductions
  const adjustmentsTotal = hasValue(source?.adjustmentsTotal)
    ? parseAmount(source?.adjustmentsTotal)
    : additionTotal - deductionTotal
  const approvedOvertimePayout = parseAmount(source?.approvedOvertimePayout)
  const finalPayable = hasValue(source?.projectedNetPayout)
    ? parseAmount(source?.projectedNetPayout)
    : adjustedNetBeforeOvertime + approvedOvertimePayout
  const overtimeRateSnapshot = asObject(source?.overtimeRateSnapshot)
  const normalizedOvertimeRows = normalizeOvertimeRows(source?.overtimeRows, overtimeRateSnapshot)
  const hourlyBaseMode = String(overtimeRateSnapshot?.hourlyBaseMode || '').trim()
  const normalHours = parseAmount(overtimeRateSnapshot?.globalNormalHoursPerDayUsed)
  const hourlyBaseModeNote = hourlyBaseMode
    ? hourlyBaseMode === 'month_days_division'
      ? 'Month days division mode was used for this claim: hourly base = (basic salary / days in month) / normal hours/day.'
      : `Statutory divisor mode was used for this claim${
          overtimeRateSnapshot?.monthlyDivisorUsed
            ? `: monthly divisor ${overtimeRateSnapshot.monthlyDivisorUsed}`
            : ''
        }${normalHours > 0 ? `, normal hours/day ${normalHours}` : ''}.`
    : ''
  const employeeContributions = payrollSnapshot?.employeeContributions || {}
  const employerContributions = payrollSnapshot?.employerContributions || {}
  const contributionPairs = toContributionPairs(employeeContributions, employerContributions)
  const employerContributionTotal = contributionPairs.reduce(
    (sum, entry) => sum + (Number(entry?.employerAmount || 0) || 0),
    0,
  )

  return {
    summary: {
      basicSalary,
      grossSalary,
      baselineNet,
      baselineTotalDeductions,
      adjustedGrossSalary,
      adjustedTotalDeductions,
      adjustedNetBeforeOvertime,
      adjustmentsTotal,
      approvedOvertimePayout,
      finalPayable,
    },
    baseline: {
      source: source?.baselineSource || payrollSnapshot?.baselineSource,
      sourceLabel: formatBaselineSource(source?.baselineSource || payrollSnapshot?.baselineSource),
      salaryRecord: source?.salaryRecord || null,
      allowanceItems,
      allowanceTotal: parseAmount(payrollSnapshot?.allowanceTotal),
      deductionItems,
    },
    contributions: {
      employeeContributions,
      employerContributions,
      contributionPairs,
      employerContributionTotal,
    },
    adjustments: {
      rows: adjustmentItems,
      additionRows: buildAdjustmentDisplayRows(additionRows, 'addition'),
      deductionRows: buildAdjustmentDisplayRows(deductionRows, 'deduction'),
      additionTotal,
      deductionTotal,
      displayRows: [
        ...buildAdjustmentDisplayRows(additionRows, 'addition'),
        ...buildAdjustmentDisplayRows(deductionRows, 'deduction'),
      ],
    },
    overtime: {
      rows: normalizedOvertimeRows,
      approvedHours: normalizedOvertimeRows.reduce(
        (sum, row) => sum + (Number(row?.durationHours || 0) || 0),
        0,
      ),
      approvedPayout: approvedOvertimePayout,
      hourlyBaseMode,
      hourlyBaseModeNote,
    },
    status: {
      approvalHistory: asArray(source?.approvalHistory),
      statusLabel: source?.status || '-',
      paymentDateLabel: resolvePaymentDateLabel(source),
    },
    hasDetails: true,
  }
}

export const buildPayrollBreakdown = (source = {}, { sourceType = 'payslip' } = {}) =>
  sourceType === 'salaryClaim' ? buildSalaryClaimBreakdown(source) : buildPayslipBreakdown(source)
