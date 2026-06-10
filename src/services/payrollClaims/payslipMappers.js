const formatPayslipMonthLabel = (row = {}) => {
  const monthLabel = String(row.month || row.month_label || '').trim()
  if (monthLabel) return monthLabel

  const periodValue = String(row.period_value || row.periodValue || row.period || '').trim()
  const periodMatch = /^(\d{4})-(\d{2})$/.exec(periodValue)
  if (periodMatch) {
    const date = new Date(Number(periodMatch[1]), Number(periodMatch[2]) - 1, 1)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
    }
  }

  const issuedRaw = String(row.issued_on || row.issued_at || row.issuedAt || '').trim()
  if (issuedRaw) {
    const issuedDate = new Date(issuedRaw)
    if (!Number.isNaN(issuedDate.getTime())) {
      return issuedDate.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
    }
  }

  return '-'
}

const formatPayslipIssuedLabel = (row = {}) => {
  const issuedRaw = String(row.issued_on || row.issued_at || row.issuedAt || '').trim()
  if (!issuedRaw) return '-'
  const issuedDate = new Date(issuedRaw)
  if (Number.isNaN(issuedDate.getTime())) return issuedRaw
  return issuedDate.toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const toMoney = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeContributionMap = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.entries(value).reduce((acc, [key, amount]) => {
    const label = String(key || '').trim()
    if (!label) return acc
    const numericAmount = toMoney(amount)
    if (numericAmount === 0) return acc
    acc[label] = numericAmount
    return acc
  }, {})
}

const normalizeAmountItems = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null
      return {
        key: String(entry.key || `item-${index}`).trim() || `item-${index}`,
        label: String(entry.label || `Item ${index + 1}`).trim() || `Item ${index + 1}`,
        amount: toMoney(entry.amount),
      }
    })
    .filter(Boolean)
}

const normalizeAdjustments = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null
      const amount = toMoney(entry.amount)
      const signedAmount = toMoney(
        entry.signedAmount !== undefined && entry.signedAmount !== null
          ? entry.signedAmount
          : entry.direction === 'deduction'
            ? -amount
            : amount,
      )
      return {
        lineNo: Number(entry.lineNo || entry.line_no || index + 1) || index + 1,
        itemType: String(entry.itemType || entry.item_type || '').trim(),
        title: String(entry.title || '').trim(),
        claimDate: String(entry.claimDate || entry.claim_date || '').trim(),
        amount,
        signedAmount,
        direction:
          String(entry.direction || '')
            .trim()
            .toLowerCase() === 'deduction' || signedAmount < 0
            ? 'deduction'
            : 'addition',
        notes: String(entry.notes || '').trim(),
      }
    })
    .filter(Boolean)
}

const normalizeOvertimeRows = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      return {
        overtimeId: String(entry.overtimeId || '').trim(),
        claimDate: String(entry.claimDate || '').trim(),
        overtimeType: String(entry.overtimeType || '').trim(),
        hours: toMoney(entry.hours),
        status: String(entry.status || '').trim(),
        isApproved: entry.isApproved === true,
        multiplierUsed: toMoney(entry.multiplierUsed),
        hourlyBaseRateUsed:
          entry.hourlyBaseRateUsed === null || entry.hourlyBaseRateUsed === undefined
            ? null
            : toMoney(entry.hourlyBaseRateUsed),
        payoutUsed: toMoney(entry.payoutUsed),
      }
    })
    .filter(Boolean)
}

export const toUiPayslipRow = (row = {}) => ({
  ...(() => {
    const salaryRecordRaw =
      row.salary_record && typeof row.salary_record === 'object'
        ? row.salary_record
        : row.salaryRecord && typeof row.salaryRecord === 'object'
          ? row.salaryRecord
          : null
    const baselineRaw =
      row.baseline && typeof row.baseline === 'object'
        ? row.baseline
        : row.baselineSnapshot && typeof row.baselineSnapshot === 'object'
          ? row.baselineSnapshot
          : {}
    const overtimeRaw =
      row.overtime && typeof row.overtime === 'object'
        ? row.overtime
        : row.overtimeSummary && typeof row.overtimeSummary === 'object'
          ? row.overtimeSummary
          : {}
    const totalsRaw =
      row.totals && typeof row.totals === 'object'
        ? row.totals
        : row.amounts && typeof row.amounts === 'object'
          ? row.amounts
          : {}
    const adjustments = normalizeAdjustments(row.adjustments)
    const adjustmentsTotal = toMoney(
      row.adjustments_total ??
        row.adjustmentsTotal ??
        totalsRaw.adjustmentsTotal ??
        totalsRaw.adjustments_total ??
        0,
    )
    const overtimeRows = normalizeOvertimeRows(overtimeRaw.rows)
    const overtimePayout = toMoney(
      row.approved_overtime_payout ??
        row.approvedOvertimePayout ??
        overtimeRaw.approvedPayout ??
        overtimeRaw.approved_overtime_payout ??
        totalsRaw.approvedOvertimePayout ??
        totalsRaw.approved_overtime_payout ??
        0,
    )
    const baselineNet = toMoney(
      baselineRaw.netSalary ??
        baselineRaw.net ??
        totalsRaw.baselineNetSalary ??
        totalsRaw.baselineNet ??
        0,
    )
    const netPayable = toMoney(
      row.projected_net_payout ??
        row.projectedNetPayout ??
        totalsRaw.netPayable ??
        totalsRaw.net_payable ??
        0,
    )
    const salaryRecord = salaryRecordRaw
      ? {
          id: Number(salaryRecordRaw.id || 0) || null,
          referenceId: String(
            salaryRecordRaw.referenceId || salaryRecordRaw.reference_id || '',
          ).trim(),
          status: String(salaryRecordRaw.status || '').trim(),
          effectiveFrom: String(
            salaryRecordRaw.effectiveFrom || salaryRecordRaw.effective_from || '',
          ).trim(),
          basicSalary: toMoney(salaryRecordRaw.basicSalary ?? salaryRecordRaw.basic_salary),
          allowanceTotal: toMoney(
            salaryRecordRaw.allowanceTotal ?? salaryRecordRaw.allowance_total,
          ),
          allowanceItems: normalizeAmountItems(
            salaryRecordRaw.allowanceItems || salaryRecordRaw.allowance_items,
          ),
          employeeContributions: normalizeContributionMap(
            salaryRecordRaw.employeeContributions || salaryRecordRaw.employee_contributions,
          ),
          employerContributions: normalizeContributionMap(
            salaryRecordRaw.employerContributions || salaryRecordRaw.employer_contributions,
          ),
          updatedAt: String(salaryRecordRaw.updatedAt || salaryRecordRaw.updated_at || '').trim(),
        }
      : null
    const baseline = {
      basicSalary: toMoney(baselineRaw.basicSalary ?? baselineRaw.basic ?? 0),
      allowanceTotal: toMoney(baselineRaw.allowanceTotal ?? baselineRaw.allowance ?? 0),
      grossSalary: toMoney(baselineRaw.grossSalary ?? baselineRaw.gross ?? 0),
      employeeDeductionsTotal: toMoney(
        baselineRaw.employeeDeductionsTotal ?? baselineRaw.totalDeductions ?? 0,
      ),
      netSalary: baselineNet,
      allowanceItems: normalizeAmountItems(
        baselineRaw.allowanceItems || baselineRaw.allowance_items,
      ),
      deductionItems: normalizeAmountItems(
        baselineRaw.deductionItems || baselineRaw.deduction_items,
      ),
      employeeContributions: normalizeContributionMap(
        baselineRaw.employeeContributions || baselineRaw.employee_contributions,
      ),
      employerContributions: normalizeContributionMap(
        baselineRaw.employerContributions || baselineRaw.employer_contributions,
      ),
    }
    const overtime = {
      rows: overtimeRows,
      rowCount: Number(overtimeRaw.rowCount || overtimeRaw.row_count || overtimeRows.length) || 0,
      approvedCount:
        Number(
          overtimeRaw.approvedCount ??
            overtimeRaw.approved_count ??
            overtimeRows.filter((entry) => entry.isApproved).length,
        ) || 0,
      totalHours: toMoney(overtimeRaw.totalHours ?? overtimeRaw.total_hours ?? 0),
      approvedHours: toMoney(overtimeRaw.approvedHours ?? overtimeRaw.approved_hours ?? 0),
      approvedPayout: overtimePayout,
      calculatedApprovedPayout: toMoney(
        overtimeRaw.calculatedApprovedPayout ?? overtimeRaw.calculated_approved_payout ?? 0,
      ),
    }
    const totals = {
      baselineNetSalary: baselineNet,
      adjustmentsTotal,
      approvedOvertimePayout: overtimePayout,
      netPayable,
      claimedTotal: toMoney(totalsRaw.claimedTotal ?? totalsRaw.claimed_total ?? row.amount ?? 0),
    }

    return {
      id: String(row.id || row.payslip_id || row.reference || '').trim(),
      payslipId: Number(row.payslip_id || row.id || 0) || null,
      reference: String(row.reference || row.display_id || '').trim(),
      periodValue: String(row.period_value || row.periodValue || '').trim(),
      month: formatPayslipMonthLabel(row),
      issued: formatPayslipIssuedLabel(row),
      issuedAt: String(row.issued_at || row.issuedAt || row.issued_on || '').trim(),
      paymentDate: String(row.payment_date || row.paymentDate || '').trim(),
      paymentReference: String(row.payment_reference || row.paymentReference || '').trim(),
      paymentNote: String(row.payment_note || row.paymentNote || '').trim(),
      paidAt: String(row.paid_at || row.paidAt || '').trim(),
      paidBy: String(row.paid_by || row.paidBy || row.paid_by_name || row.paidByName || '').trim(),
      paidByUserId: String(row.paid_by_user_id || row.paidByUserId || '').trim(),
      status: String(row.status || 'Available').trim() || 'Available',
      downloadable:
        row?.downloadable === true || row?.can_download === true || row?.is_downloadable === true,
      downloadFilename: String(row.download_filename || row.downloadFilename || '').trim(),
      downloadReason: String(
        row.download_reason || row.downloadReason || row.unavailable_reason || '',
      ).trim(),
      employeeProfileComplete:
        row.employee_profile_complete === undefined || row.employee_profile_complete === null
          ? true
          : Boolean(row.employee_profile_complete),
      employeeProfileMissingFields: Array.isArray(row.employee_profile_missing_fields)
        ? row.employee_profile_missing_fields
        : Array.isArray(row.employeeProfileMissingFields)
          ? row.employeeProfileMissingFields
          : [],
      baselineSource: String(row.baseline_source || row.baselineSource || '').trim(),
      salaryRecord,
      payrollSnapshot:
        row.payroll_snapshot && typeof row.payroll_snapshot === 'object'
          ? row.payroll_snapshot
          : row.payrollSnapshot && typeof row.payrollSnapshot === 'object'
            ? row.payrollSnapshot
            : null,
      baseline,
      adjustments,
      overtime,
      totals,
      baselineNetSalary: baselineNet,
      adjustmentsTotal,
      approvedOvertimePayout: overtimePayout,
      netPayable,
    }
  })(),
})
