import { useCallback, useMemo } from 'react'
import { OVERTIME_BASE_HOUR_MODES } from 'src/views/staff/salary-claims-management/utils'
import {
  formatDuration as formatOvertimeDuration,
  getOvertimeTypeLabel,
  getWorkflowStatusLabel as getOvertimeWorkflowStatusLabel,
  normalizeOvertimeType,
} from 'src/views/overtime/utils'
import { parseOptionalAmount, roundMoney } from '../utils/salaryClaimUtils'

const numberOr = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const useOvertimeCalc = ({
  period,
  assignedSalaryNet,
  totalAmount,
  isSysAdmin,
  isOvertimeEligible,
  overtimeEligibilityResolved,
  overtimePreview,
  isOvertimePreviewLoading = false,
}) => {
  const hasAuthoritativeOvertimePreview = Boolean(
    overtimePreview &&
      typeof overtimePreview === 'object' &&
      Array.isArray(overtimePreview.rows) &&
      overtimePreview.totals &&
      typeof overtimePreview.totals === 'object' &&
      overtimePreview.rateSnapshot &&
      typeof overtimePreview.rateSnapshot === 'object',
  )
  const rateSnapshot = hasAuthoritativeOvertimePreview ? overtimePreview.rateSnapshot : {}
  const overtimeBaseMode =
    rateSnapshot.hourlyBaseMode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
      ? OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
      : OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY
  const overtimeNormalHoursStrategy =
    String(rateSnapshot.normalHoursStrategyUsed || '').trim() || 'statutory_8h'
  const overtimeRateMultipliers = useMemo(
    () => ({
      weekday: numberOr(rateSnapshot.weekdayMultiplier, 1.5),
      weekend: numberOr(rateSnapshot.weekendMultiplier, 2),
      publicHoliday: numberOr(rateSnapshot.publicHolidayMultiplier, 3),
    }),
    [
      rateSnapshot.publicHolidayMultiplier,
      rateSnapshot.weekdayMultiplier,
      rateSnapshot.weekendMultiplier,
    ],
  )
  const overtimeMonthlyDivisor = parseOptionalAmount(rateSnapshot.monthlyDivisorUsed) ?? 26
  const overtimeGlobalNormalHoursPerDay =
    parseOptionalAmount(rateSnapshot.globalNormalHoursPerDayUsed) ?? 8
  const overtimeAutoHourlyBaseRate = parseOptionalAmount(rateSnapshot.hourlyBaseRateUsed)
  const overtimePreviewHoursPerDay = overtimeGlobalNormalHoursPerDay
  const resolveNormalHoursPerDayForRoles = useCallback(
    () => overtimePreviewHoursPerDay,
    [overtimePreviewHoursPerDay],
  )

  const overtimeRowsForPeriod = useMemo(() => {
    if (!period || !hasAuthoritativeOvertimePreview) return []
    if (!isSysAdmin && (!overtimeEligibilityResolved || !isOvertimeEligible)) return []

    return overtimePreview.rows.map((row, index) => {
      const overtimeType = normalizeOvertimeType(row?.overtimeType)
      const durationMinutes = numberOr(row?.durationMinutes)
      const durationHours = numberOr(row?.hours, roundMoney(durationMinutes / 60))
      const isApproved = row?.isApproved === true
      const hourlyBaseRate = numberOr(row?.hourlyBaseRateUsed)
      const calculatedPayout = numberOr(row?.payoutUsed)

      return {
        id: String(
          row?.overtimePublicId ||
            row?.overtimeRecordId ||
            row?.overtimeId ||
            `overtime-preview-${index + 1}`,
        ),
        overtimeId: String(row?.overtimeId || '-'),
        overtimeType,
        overtimeTypeLabel: getOvertimeTypeLabel(overtimeType, { short: true }),
        claimDate: row?.claimDate || '',
        status: row?.status || '',
        statusLabel: getOvertimeWorkflowStatusLabel(row),
        durationMinutes,
        durationHours,
        durationLabel: formatOvertimeDuration(durationMinutes),
        applicantRoles: Array.isArray(row?.applicantRoles) ? row.applicantRoles : [],
        normalHoursPerDay: numberOr(row?.globalNormalHoursPerDayUsed, overtimePreviewHoursPerDay),
        hourlyBaseRate,
        hourlyBaseSource: row?.hourlyBaseSource || 'missing',
        monthlyDivisorUsed: row?.monthlyDivisorUsed || overtimeMonthlyDivisor,
        multiplier: numberOr(
          row?.multiplierUsed,
          overtimeRateMultipliers[overtimeType] || overtimeRateMultipliers.weekday,
        ),
        calculatedPayout,
        payablePayout: isApproved ? calculatedPayout : 0,
        isApproved,
      }
    })
  }, [
    hasAuthoritativeOvertimePreview,
    isOvertimeEligible,
    isSysAdmin,
    overtimeEligibilityResolved,
    overtimeMonthlyDivisor,
    overtimePreview,
    overtimePreviewHoursPerDay,
    overtimeRateMultipliers,
    period,
  ])

  const overtimeHourlySourceSummary = useMemo(
    () =>
      overtimeRowsForPeriod.reduce(
        (acc, row) => {
          acc[row.hourlyBaseSource] = (acc[row.hourlyBaseSource] || 0) + 1
          return acc
        },
        { auto_statutory: 0, month_days_division: 0, missing: 0 },
      ),
    [overtimeRowsForPeriod],
  )
  const overtimeTotals = useMemo(() => {
    if (!hasAuthoritativeOvertimePreview || overtimeRowsForPeriod.length === 0) {
      return {
        totalHoursAll: 0,
        totalHoursApproved: 0,
        totalPayoutApproved: 0,
        approvedCount: 0,
      }
    }
    const totals = overtimePreview.totals
    return {
      totalHoursAll: numberOr(totals.allHours),
      totalHoursApproved: numberOr(totals.approvedHours),
      totalPayoutApproved: numberOr(totals.approvedPayout),
      approvedCount: numberOr(totals.approvedCount),
    }
  }, [hasAuthoritativeOvertimePreview, overtimePreview, overtimeRowsForPeriod.length])
  const totalClaimImpact = useMemo(
    () => roundMoney(totalAmount + overtimeTotals.totalPayoutApproved),
    [overtimeTotals.totalPayoutApproved, totalAmount],
  )
  const projectedNetPayout = useMemo(
    () => roundMoney(assignedSalaryNet + totalClaimImpact),
    [assignedSalaryNet, totalClaimImpact],
  )

  return {
    hasAuthoritativeOvertimePreview,
    overtimeBaseMode,
    overtimeNormalHoursStrategy,
    overtimeRateMultipliers,
    overtimeRoleNormalHoursPerDay: {},
    overtimeDefaultRoleHoursPerDay: overtimePreviewHoursPerDay,
    overtimeMonthlyDivisor,
    overtimeGlobalNormalHoursPerDay,
    overtimeAutoHourlyBaseRate,
    overtimePreviewHoursPerDay,
    resolveNormalHoursPerDayForRoles,
    isOvertimeRowsLoading: isOvertimePreviewLoading,
    overtimeRowsForPeriod,
    overtimeHourlySourceSummary,
    overtimeTotals,
    totalClaimImpact,
    projectedNetPayout,
  }
}

export default useOvertimeCalc
