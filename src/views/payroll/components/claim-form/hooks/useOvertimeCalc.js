import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchOvertimeRateSettings } from 'src/services/apiClient'
import { loadMyOvertimeRecordsApiFirst } from 'src/services/overtimeApi'
import { ROLE_OPTIONS } from 'src/constants/roles'
import {
  OVERTIME_BASE_HOUR_MODES,
  OVERTIME_NORMAL_HOURS_STRATEGIES,
  loadOvertimeRateSettings,
} from 'src/views/staff/salary-claims-management/utils'
import {
  formatDuration as formatOvertimeDuration,
  getDisplayOvertimeId,
  getOvertimeTypeLabel,
  getWorkflowStatusLabel as getOvertimeWorkflowStatusLabel,
  normalizeOvertimeType,
} from 'src/views/overtime/utils'
import {
  isApprovedOvertimeStatus,
  normalizeOvertimeRateSettingsPayload,
  normalizeRoleList,
  normalizeRoleValue,
  parseOptionalAmount,
  resolveDaysInMonth,
  roundMoney,
} from '../utils/salaryClaimUtils'

const useOvertimeCalc = ({
  user,
  period,
  assignedSalaryBasic,
  assignedSalaryNet,
  totalAmount,
  isSysAdmin,
  isOvertimeEligible,
  overtimeEligibilityResolved,
  hasOvertimeEligibilityError,
  pushToast,
}) => {
  const [overtimeRateSettings, setOvertimeRateSettings] = useState(() =>
    normalizeOvertimeRateSettingsPayload(loadOvertimeRateSettings()),
  )
  const [overtimeRows, setOvertimeRows] = useState([])
  const [isOvertimeRowsLoading, setIsOvertimeRowsLoading] = useState(false)

  useEffect(() => {
    let active = true
    const hydrateOvertimeRateSettings = async () => {
      try {
        const result = await fetchOvertimeRateSettings()
        if (!active) return
        const source =
          result?.data && typeof result.data === 'object' ? result.data : loadOvertimeRateSettings()
        setOvertimeRateSettings(normalizeOvertimeRateSettingsPayload(source))
      } catch {
        if (!active) return
        setOvertimeRateSettings((prev) => normalizeOvertimeRateSettingsPayload(prev))
      }
    }
    hydrateOvertimeRateSettings()
    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    let active = true
    const hydrateOvertimeRows = async () => {
      if (!user?.id) {
        setOvertimeRows([])
        setIsOvertimeRowsLoading(false)
        return
      }
      if (!isSysAdmin && hasOvertimeEligibilityError) {
        setOvertimeRows([])
        setIsOvertimeRowsLoading(false)
        return
      }
      if (!isSysAdmin && !overtimeEligibilityResolved) {
        setOvertimeRows([])
        setIsOvertimeRowsLoading(false)
        return
      }
      if (!isOvertimeEligible || !period) {
        setOvertimeRows([])
        setIsOvertimeRowsLoading(false)
        return
      }
      setIsOvertimeRowsLoading(true)
      const result = await loadMyOvertimeRecordsApiFirst(user.id, {
        month: period,
        status: 'Approved',
      })
      if (!active) return
      if (!result?.ok) {
        pushToast('Unable to load overtime records from API. Please retry.', {
          title: 'Overtime load failed',
          color: 'danger',
        })
        setOvertimeRows([])
        setIsOvertimeRowsLoading(false)
        return
      }
      setOvertimeRows(Array.isArray(result?.data) ? result.data : [])
      setIsOvertimeRowsLoading(false)
    }
    hydrateOvertimeRows()
    return () => {
      active = false
    }
  }, [
    hasOvertimeEligibilityError,
    isOvertimeEligible,
    isSysAdmin,
    overtimeEligibilityResolved,
    period,
    pushToast,
    user?.id,
  ])

  const overtimeBaseHourCalculation = useMemo(
    () => overtimeRateSettings?.baseHourCalculation || {},
    [overtimeRateSettings?.baseHourCalculation],
  )
  const overtimeRateMultipliers = useMemo(
    () => ({
      weekday: parseOptionalAmount(overtimeRateSettings?.weekdayMultiplier) ?? 1.5,
      weekend: parseOptionalAmount(overtimeRateSettings?.weekendMultiplier) ?? 2.0,
      publicHoliday: parseOptionalAmount(overtimeRateSettings?.publicHolidayMultiplier) ?? 3.0,
    }),
    [
      overtimeRateSettings?.publicHolidayMultiplier,
      overtimeRateSettings?.weekdayMultiplier,
      overtimeRateSettings?.weekendMultiplier,
    ],
  )
  const overtimeBaseMode =
    overtimeBaseHourCalculation?.mode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
      ? OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
      : OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY
  const overtimeNormalHoursStrategy = [
    OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H,
    OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL,
    OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED,
  ].includes(overtimeBaseHourCalculation?.normalHoursStrategy)
    ? overtimeBaseHourCalculation.normalHoursStrategy
    : OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H
  const overtimeRoleNormalHoursPerDay = useMemo(() => {
    const roleMap =
      overtimeBaseHourCalculation?.roleNormalHoursPerDay &&
      typeof overtimeBaseHourCalculation.roleNormalHoursPerDay === 'object' &&
      !Array.isArray(overtimeBaseHourCalculation.roleNormalHoursPerDay)
        ? overtimeBaseHourCalculation.roleNormalHoursPerDay
        : {}
    return Object.entries(roleMap).reduce((acc, [role, value]) => {
      const normalizedRole = normalizeRoleValue(role)
      if (!normalizedRole || !ROLE_OPTIONS.includes(normalizedRole)) return acc
      const normalizedValue = String(value ?? '').trim()
      if (!normalizedValue) return acc
      acc[normalizedRole] = normalizedValue
      return acc
    }, {})
  }, [overtimeBaseHourCalculation])
  const overtimeDefaultRoleHoursPerDay = useMemo(() => {
    const parsed = parseOptionalAmount(overtimeBaseHourCalculation?.defaultRoleHoursPerDay)
    return parsed !== null && parsed > 0 ? parsed : 8
  }, [overtimeBaseHourCalculation?.defaultRoleHoursPerDay])
  const overtimeMonthlyDivisor = useMemo(() => {
    const parsed = parseOptionalAmount(overtimeBaseHourCalculation?.monthlyDivisor)
    return parsed !== null && parsed > 0 ? parsed : 26
  }, [overtimeBaseHourCalculation?.monthlyDivisor])
  const overtimeGlobalNormalHoursPerDay = useMemo(() => {
    const parsed = parseOptionalAmount(overtimeBaseHourCalculation?.globalNormalHoursPerDay)
    return parsed !== null && parsed > 0 ? parsed : 8
  }, [overtimeBaseHourCalculation?.globalNormalHoursPerDay])
  const resolveNormalHoursPerDayForRoles = useCallback(
    (roles = []) => {
      if (overtimeNormalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H) {
        return 8
      }
      if (overtimeNormalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL) {
        return overtimeGlobalNormalHoursPerDay
      }
      const normalizedRoles = normalizeRoleList(roles)
      for (const role of normalizedRoles) {
        const parsedRoleHours = parseOptionalAmount(overtimeRoleNormalHoursPerDay?.[role])
        if (parsedRoleHours !== null && parsedRoleHours > 0) {
          return parsedRoleHours
        }
      }
      return overtimeDefaultRoleHoursPerDay
    },
    [
      overtimeDefaultRoleHoursPerDay,
      overtimeGlobalNormalHoursPerDay,
      overtimeNormalHoursStrategy,
      overtimeRoleNormalHoursPerDay,
    ],
  )
  const overtimeAutoHourlyBaseRate = useMemo(() => {
    const basic = parseOptionalAmount(assignedSalaryBasic)
    if (basic === null || basic <= 0) return null
    const previewHoursPerDay = resolveNormalHoursPerDayForRoles(user?.roles || [])
    if (overtimeMonthlyDivisor <= 0 || previewHoursPerDay <= 0) return null
    return roundMoney(basic / overtimeMonthlyDivisor / previewHoursPerDay)
  }, [assignedSalaryBasic, overtimeMonthlyDivisor, resolveNormalHoursPerDayForRoles, user?.roles])
  const overtimePreviewHoursPerDay = useMemo(
    () => resolveNormalHoursPerDayForRoles(user?.roles || []),
    [resolveNormalHoursPerDayForRoles, user?.roles],
  )
  const overtimeRowsForPeriod = useMemo(() => {
    if (overtimeEligibilityResolved && !isOvertimeEligible) return []
    if (!period) return []
    return overtimeRows
      .filter((row) => String(row?.claimDate || '').startsWith(`${period}-`))
      .map((row, index) => {
        const overtimeType = normalizeOvertimeType(row?.overtimeType)
        const durationMinutes = Number(row?.durationMinutes || 0) || 0
        const durationHours = roundMoney(durationMinutes / 60)
        const multiplier = overtimeRateMultipliers[overtimeType] || overtimeRateMultipliers.weekday
        const applicantRoles = normalizeRoleList(
          Array.isArray(row?.applicantRoles) && row.applicantRoles.length > 0
            ? row.applicantRoles
            : user?.roles || [],
        )
        const normalHoursPerDay = resolveNormalHoursPerDayForRoles(applicantRoles)
        const monthDaysDivisor =
          overtimeBaseMode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
            ? resolveDaysInMonth(row?.claimDate, period)
            : null
        const monthDaysHourlyBaseRate =
          overtimeBaseMode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION &&
          monthDaysDivisor !== null &&
          monthDaysDivisor > 0 &&
          normalHoursPerDay > 0
            ? roundMoney(assignedSalaryBasic / monthDaysDivisor / normalHoursPerDay)
            : null
        const autoHourlyBaseRateForRowFromDivisor =
          overtimeMonthlyDivisor > 0 && normalHoursPerDay > 0
            ? roundMoney(assignedSalaryBasic / overtimeMonthlyDivisor / normalHoursPerDay)
            : null
        const autoHourlyBaseRateForRow =
          overtimeBaseMode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
            ? monthDaysHourlyBaseRate
            : autoHourlyBaseRateForRowFromDivisor
        const hourlyBaseRate = autoHourlyBaseRateForRow !== null ? autoHourlyBaseRateForRow : 0
        const hourlyBaseSource =
          autoHourlyBaseRateForRow !== null
            ? overtimeBaseMode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
              ? 'month_days_division'
              : 'auto_statutory'
            : 'missing'
        const calculatedPayout = roundMoney(durationHours * hourlyBaseRate * multiplier)
        const isApproved = isApprovedOvertimeStatus(row?.status)
        return {
          id: `${String(row?.id || '').trim() || `ot-row-${index + 1}`}-${index}`,
          overtimeId: getDisplayOvertimeId(row),
          overtimeType,
          overtimeTypeLabel: getOvertimeTypeLabel(overtimeType, { short: true }),
          claimDate: row?.claimDate || '',
          status: row?.status || '',
          statusLabel: getOvertimeWorkflowStatusLabel(row),
          durationMinutes,
          durationHours,
          durationLabel: formatOvertimeDuration(durationMinutes),
          applicantRoles,
          normalHoursPerDay,
          hourlyBaseRate,
          hourlyBaseSource,
          monthlyDivisorUsed:
            overtimeBaseMode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
              ? monthDaysDivisor
              : overtimeMonthlyDivisor,
          multiplier,
          calculatedPayout,
          payablePayout: isApproved ? calculatedPayout : 0,
          isApproved,
        }
      })
      .sort((a, b) => {
        const av = new Date(a.claimDate || 0).getTime()
        const bv = new Date(b.claimDate || 0).getTime()
        if (Number.isNaN(av) && Number.isNaN(bv)) return 0
        if (Number.isNaN(av)) return 1
        if (Number.isNaN(bv)) return -1
        return av - bv
      })
  }, [
    period,
    isOvertimeEligible,
    overtimeEligibilityResolved,
    assignedSalaryBasic,
    overtimeBaseMode,
    overtimeMonthlyDivisor,
    resolveNormalHoursPerDayForRoles,
    overtimeRateMultipliers,
    overtimeRows,
    user?.roles,
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
    const totalHoursAll = roundMoney(
      overtimeRowsForPeriod.reduce((sum, row) => sum + row.durationHours, 0),
    )
    const approvedRows = overtimeRowsForPeriod.filter((row) => row.isApproved)
    const totalHoursApproved = roundMoney(
      approvedRows.reduce((sum, row) => sum + row.durationHours, 0),
    )
    const totalPayoutApproved = roundMoney(
      approvedRows.reduce((sum, row) => sum + row.payablePayout, 0),
    )
    return {
      totalHoursAll,
      totalHoursApproved,
      totalPayoutApproved,
      approvedCount: approvedRows.length,
    }
  }, [overtimeRowsForPeriod])
  const totalClaimImpact = useMemo(
    () => roundMoney(totalAmount + overtimeTotals.totalPayoutApproved),
    [overtimeTotals.totalPayoutApproved, totalAmount],
  )
  const projectedNetPayout = useMemo(
    () => roundMoney(assignedSalaryNet + totalClaimImpact),
    [assignedSalaryNet, totalClaimImpact],
  )

  return {
    overtimeRateSettings,
    setOvertimeRateSettings,
    overtimeBaseMode,
    overtimeNormalHoursStrategy,
    overtimeRateMultipliers,
    overtimeRoleNormalHoursPerDay,
    overtimeDefaultRoleHoursPerDay,
    overtimeMonthlyDivisor,
    overtimeGlobalNormalHoursPerDay,
    overtimeAutoHourlyBaseRate,
    overtimePreviewHoursPerDay,
    resolveNormalHoursPerDayForRoles,
    isOvertimeRowsLoading,
    overtimeRowsForPeriod,
    overtimeHourlySourceSummary,
    overtimeTotals,
    totalClaimImpact,
    projectedNetPayout,
  }
}

export default useOvertimeCalc
