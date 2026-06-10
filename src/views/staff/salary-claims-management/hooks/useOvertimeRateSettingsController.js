import { useCallback, useMemo, useState } from 'react'
import { ROLE_OPTIONS } from 'src/constants/roles'
import { OVERTIME_BASE_HOUR_MODES, OVERTIME_NORMAL_HOURS_STRATEGIES } from '../utils'

const SAMPLE_BASIC_SALARY_DEFAULT = '3000'
const SAMPLE_MONTH_DAYS = 30
const SAMPLE_OVERTIME_HOURS = 2

const useOvertimeRateSettingsController = ({
  otRateSettings,
  otRateDirty,
  reloadOvertimeRates,
  persistOvertimeRates,
  updateOvertimeBaseHourField,
}) => {
  const [isApplicabilityEditing, setIsApplicabilityEditing] = useState(false)
  const [isRateEditing, setIsRateEditing] = useState(false)
  const [isBaseEditing, setIsBaseEditing] = useState(false)
  const [baseError, setBaseError] = useState(null)
  const [sampleBasicSalaryInput, setSampleBasicSalaryInput] = useState(SAMPLE_BASIC_SALARY_DEFAULT)
  const [isSampleBasicSalaryEditing, setIsSampleBasicSalaryEditing] = useState(false)
  const rateHistory = Array.isArray(otRateSettings?.rateHistory) ? otRateSettings.rateHistory : []

  const baseHourCalculation = useMemo(
    () => otRateSettings.baseHourCalculation || {},
    [otRateSettings.baseHourCalculation],
  )
  const normalHoursStrategy = [
    OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H,
    OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL,
    OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED,
  ].includes(baseHourCalculation?.normalHoursStrategy)
    ? baseHourCalculation?.normalHoursStrategy
    : OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H
  const roleNormalHoursPerDay = useMemo(() => {
    if (
      baseHourCalculation?.roleNormalHoursPerDay &&
      typeof baseHourCalculation.roleNormalHoursPerDay === 'object' &&
      !Array.isArray(baseHourCalculation.roleNormalHoursPerDay)
    ) {
      return baseHourCalculation.roleNormalHoursPerDay
    }
    return {}
  }, [baseHourCalculation?.roleNormalHoursPerDay])
  const defaultRoleHoursPerDay = String(baseHourCalculation?.defaultRoleHoursPerDay || '8').trim()
  const roleNormalHourOverrideCount = useMemo(
    () =>
      Object.values(roleNormalHoursPerDay).filter((value) => {
        const parsed = Number.parseFloat(value)
        return Number.isFinite(parsed) && parsed > 0
      }).length,
    [roleNormalHoursPerDay],
  )
  const hasRoleNormalHourOverrides = roleNormalHourOverrideCount > 0
  const roleNormalHourOverrideEntries = useMemo(
    () =>
      Object.entries(roleNormalHoursPerDay).filter(([, value]) => {
        const parsed = Number.parseFloat(value)
        return Number.isFinite(parsed) && parsed > 0
      }),
    [roleNormalHoursPerDay],
  )
  const selectedRoleOverrides = useMemo(
    () =>
      ROLE_OPTIONS.filter((role) =>
        Object.prototype.hasOwnProperty.call(roleNormalHoursPerDay, role),
      ),
    [roleNormalHoursPerDay],
  )

  const resolveNormalHoursPerDay = useCallback(
    (roleName = '') => {
      if (normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H) return 8
      if (normalHoursStrategy === OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL) {
        const parsed = Number.parseFloat(baseHourCalculation?.globalNormalHoursPerDay)
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 8
      }
      const roleKey = String(roleName || '').trim()
      const roleHours = Number.parseFloat(roleNormalHoursPerDay?.[roleKey])
      if (Number.isFinite(roleHours) && roleHours > 0) return roleHours
      return 8
    },
    [baseHourCalculation?.globalNormalHoursPerDay, normalHoursStrategy, roleNormalHoursPerDay],
  )
  const otApplicabilityRoles = (() => {
    const roles = Array.isArray(otRateSettings?.otApplicability?.roles)
      ? otRateSettings.otApplicability.roles
      : []
    const legacyTeam = String(otRateSettings?.otApplicability?.team || '').trim()
    const normalized = Array.from(
      new Set(
        [...roles.map((entry) => String(entry || '').trim()), legacyTeam].filter(
          (entry) => entry && ROLE_OPTIONS.includes(entry),
        ),
      ),
    )
    return normalized.length > 0 ? normalized : ['Tactical Response Team']
  })()

  const formatValue = useCallback((value, { prefix = '', suffix = '' } = {}) => {
    if (value === null || typeof value === 'undefined' || String(value).trim() === '') return '-'
    return `${prefix}${value}${suffix}`
  }, [])

  const validateBaseHourCalculation = useCallback((value) => {
    const mode = value?.mode || OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY
    if (mode !== OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION) {
      const monthlyDivisor = Number.parseFloat(value?.monthlyDivisor)
      if (!Number.isFinite(monthlyDivisor) || monthlyDivisor <= 0) {
        return 'Monthly divisor must be greater than zero.'
      }
    }
    const strategy = [
      OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H,
      OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL,
      OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED,
    ].includes(value?.normalHoursStrategy)
      ? value?.normalHoursStrategy
      : OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H
    if (strategy === OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL) {
      const globalNormalHoursPerDay = Number.parseFloat(value?.globalNormalHoursPerDay)
      if (!Number.isFinite(globalNormalHoursPerDay) || globalNormalHoursPerDay <= 0) {
        return 'Global normal hours/day must be greater than zero.'
      }
    }
    if (strategy === OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED) {
      const roleMap =
        value?.roleNormalHoursPerDay &&
        typeof value.roleNormalHoursPerDay === 'object' &&
        !Array.isArray(value.roleNormalHoursPerDay)
          ? value.roleNormalHoursPerDay
          : {}
      for (const [role, rawHours] of Object.entries(roleMap)) {
        const trimmedRole = String(role || '').trim()
        if (!trimmedRole) continue
        const parsedHours = Number.parseFloat(rawHours)
        if (String(rawHours).trim() === '') continue
        if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
          return `${trimmedRole}: hours/day must be greater than zero.`
        }
      }
    }

    return null
  }, [])

  const sampleOvertimeBreakdown = (() => {
    const sampleBasicSalary = Number.parseFloat(sampleBasicSalaryInput)
    if (!Number.isFinite(sampleBasicSalary) || sampleBasicSalary <= 0) {
      return {
        available: false,
        message: 'Set Sample Basic Salary to a value greater than 0.',
      }
    }

    const mode = baseHourCalculation?.mode || OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY
    const hoursPerDay = resolveNormalHoursPerDay()
    const strategy = normalHoursStrategy

    const hourlyBase =
      mode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
        ? sampleBasicSalary / SAMPLE_MONTH_DAYS / hoursPerDay
        : (() => {
            const divisor = Number.parseFloat(baseHourCalculation?.monthlyDivisor)
            if (!Number.isFinite(divisor) || divisor <= 0) return null
            return sampleBasicSalary / divisor / hoursPerDay
          })()

    if (!Number.isFinite(hourlyBase) || hourlyBase <= 0) {
      return {
        available: false,
        message: 'Set Monthly divisor to a value greater than 0.',
      }
    }

    const weekdayMultiplier = Number.parseFloat(otRateSettings?.weekdayMultiplier)
    const weekendMultiplier = Number.parseFloat(otRateSettings?.weekendMultiplier)
    const holidayMultiplier = Number.parseFloat(otRateSettings?.publicHolidayMultiplier)

    const toValidMultiplier = (value, fallback) =>
      Number.isFinite(value) && value > 0 ? value : fallback

    const weekday = toValidMultiplier(weekdayMultiplier, 1.5)
    const weekend = toValidMultiplier(weekendMultiplier, 2.0)
    const holiday = toValidMultiplier(holidayMultiplier, 3.0)
    const divisor = Number.parseFloat(baseHourCalculation?.monthlyDivisor)

    return {
      available: true,
      sampleBasicSalary,
      mode,
      strategy,
      hourlyBase,
      hoursPerDay,
      divisor,
      weekday,
      weekend,
      holiday,
      weekdayPayout: hourlyBase * SAMPLE_OVERTIME_HOURS * weekday,
      weekendPayout: hourlyBase * SAMPLE_OVERTIME_HOURS * weekend,
      holidayPayout: hourlyBase * SAMPLE_OVERTIME_HOURS * holiday,
    }
  })()

  const handleRateSave = useCallback(async () => {
    if (!otRateDirty) {
      setIsRateEditing(false)
      return
    }
    const ok = await persistOvertimeRates({ successMessage: 'Overtime rates updated.' })
    if (ok) {
      setIsRateEditing(false)
    }
  }, [otRateDirty, persistOvertimeRates])

  const handleRateCancel = useCallback(() => {
    reloadOvertimeRates()
    setIsRateEditing(false)
  }, [reloadOvertimeRates])

  const handleBaseSave = useCallback(async () => {
    const validationMessage = validateBaseHourCalculation(baseHourCalculation)
    if (validationMessage) {
      setBaseError(validationMessage)
      return
    }

    if (!otRateDirty) {
      setIsBaseEditing(false)
      setBaseError(null)
      return
    }

    const ok = await persistOvertimeRates({ successMessage: 'Base hour calculation updated.' })
    if (ok) {
      setIsBaseEditing(false)
      setBaseError(null)
    }
  }, [baseHourCalculation, otRateDirty, persistOvertimeRates, validateBaseHourCalculation])

  const handleBaseCancel = useCallback(() => {
    reloadOvertimeRates()
    setIsBaseEditing(false)
    setBaseError(null)
  }, [reloadOvertimeRates])

  const handleBaseResetDefaults = useCallback(() => {
    updateOvertimeBaseHourField('mode', OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY)
    updateOvertimeBaseHourField('monthlyDivisor', '26')
    updateOvertimeBaseHourField('globalNormalHoursPerDay', '8')
    updateOvertimeBaseHourField(
      'normalHoursStrategy',
      OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H,
    )
    updateOvertimeBaseHourField('roleNormalHoursPerDay', {})
    setBaseError(null)
  }, [updateOvertimeBaseHourField])

  const handleApplicabilitySave = useCallback(async () => {
    if (!otRateDirty) {
      setIsApplicabilityEditing(false)
      return
    }
    const ok = await persistOvertimeRates({ successMessage: 'OT applicability updated.' })
    if (ok) {
      setIsApplicabilityEditing(false)
    }
  }, [otRateDirty, persistOvertimeRates])

  const handleApplicabilityCancel = useCallback(() => {
    reloadOvertimeRates()
    setIsApplicabilityEditing(false)
  }, [reloadOvertimeRates])

  const discardUnsavedOtEdits = useCallback(() => {
    const shouldDiscard =
      !otRateDirty ||
      window.confirm('You have unsaved OT settings changes. Discard them and continue?')
    if (!shouldDiscard) return false
    reloadOvertimeRates()
    setIsRateEditing(false)
    setIsBaseEditing(false)
    setIsApplicabilityEditing(false)
    setBaseError(null)
    return true
  }, [otRateDirty, reloadOvertimeRates])

  return {
    isApplicabilityEditing,
    setIsApplicabilityEditing,
    isRateEditing,
    setIsRateEditing,
    isBaseEditing,
    setIsBaseEditing,
    baseError,
    sampleBasicSalaryInput,
    setSampleBasicSalaryInput,
    isSampleBasicSalaryEditing,
    setIsSampleBasicSalaryEditing,
    rateHistory,
    baseHourCalculation,
    normalHoursStrategy,
    roleNormalHoursPerDay,
    defaultRoleHoursPerDay,
    roleNormalHourOverrideCount,
    hasRoleNormalHourOverrides,
    roleNormalHourOverrideEntries,
    selectedRoleOverrides,
    resolveNormalHoursPerDay,
    otApplicabilityRoles,
    formatValue,
    sampleOvertimeBreakdown,
    handleRateSave,
    handleRateCancel,
    handleBaseSave,
    handleBaseCancel,
    handleBaseResetDefaults,
    handleApplicabilitySave,
    handleApplicabilityCancel,
    discardUnsavedOtEdits,
  }
}

export default useOvertimeRateSettingsController
