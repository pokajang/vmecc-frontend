import { ROLE_OPTIONS } from 'src/constants/roles'
import {
  OVERTIME_BASE_HOUR_MODES,
  OVERTIME_NORMAL_HOURS_STRATEGIES,
  OVERTIME_RATE_SETTINGS_KEY,
} from './constants'

export const defaultOvertimeRateSettings = () => ({
  otApplicability: {
    roles: ['Tactical Response Team'],
  },
  hourlyRate: '',
  dailyRate: '',
  weekdayMultiplier: '1.5',
  weekendMultiplier: '2.0',
  publicHolidayMultiplier: '3.0',
  baseHourCalculation: {
    mode: OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY,
    monthlyDivisor: '26',
    globalNormalHoursPerDay: '8',
    normalHoursStrategy: OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H,
    defaultRoleHoursPerDay: '8',
    roleNormalHoursPerDay: {},
  },
  updatedAt: null,
  updatedBy: '',
  rateHistory: [],
})

export const loadOvertimeRateSettings = () => {
  try {
    const raw = localStorage.getItem(OVERTIME_RATE_SETTINGS_KEY)
    if (!raw) return defaultOvertimeRateSettings()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultOvertimeRateSettings()
    const sourceBaseHour =
      parsed?.baseHourCalculation &&
      typeof parsed.baseHourCalculation === 'object' &&
      !Array.isArray(parsed.baseHourCalculation)
        ? parsed.baseHourCalculation
        : {}
    const sourceApplicability =
      parsed?.otApplicability &&
      typeof parsed.otApplicability === 'object' &&
      !Array.isArray(parsed.otApplicability)
        ? parsed.otApplicability
        : {}
    const sourceApplicabilityRoles = Array.isArray(sourceApplicability?.roles)
      ? sourceApplicability.roles
      : []
    const legacyTeamRole =
      sourceApplicability?.team === null || typeof sourceApplicability?.team === 'undefined'
        ? ''
        : String(sourceApplicability.team).trim()
    const normalizedApplicabilityRoles = Array.from(
      new Set(
        [
          ...sourceApplicabilityRoles.map((entry) => String(entry || '').trim()),
          legacyTeamRole,
        ].filter((entry) => entry && ROLE_OPTIONS.includes(entry)),
      ),
    )
    const normalizedBaseHourCalculation = {
      mode: [
        OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY,
        OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION,
      ].includes(sourceBaseHour?.mode)
        ? sourceBaseHour?.mode
        : OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY,
      normalHoursStrategy: [
        OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H,
        OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL,
        OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED,
      ].includes(sourceBaseHour?.normalHoursStrategy)
        ? sourceBaseHour?.normalHoursStrategy
        : OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H,
      monthlyDivisor:
        sourceBaseHour?.monthlyDivisor === null ||
        typeof sourceBaseHour?.monthlyDivisor === 'undefined'
          ? '26'
          : String(sourceBaseHour.monthlyDivisor).trim(),
      globalNormalHoursPerDay:
        sourceBaseHour?.globalNormalHoursPerDay === null ||
        typeof sourceBaseHour?.globalNormalHoursPerDay === 'undefined'
          ? '8'
          : String(sourceBaseHour.globalNormalHoursPerDay).trim(),
      defaultRoleHoursPerDay:
        sourceBaseHour?.defaultRoleHoursPerDay === null ||
        typeof sourceBaseHour?.defaultRoleHoursPerDay === 'undefined'
          ? '8'
          : String(sourceBaseHour.defaultRoleHoursPerDay).trim(),
      roleNormalHoursPerDay: Object.entries(
        sourceBaseHour?.roleNormalHoursPerDay &&
          typeof sourceBaseHour?.roleNormalHoursPerDay === 'object' &&
          !Array.isArray(sourceBaseHour?.roleNormalHoursPerDay)
          ? sourceBaseHour.roleNormalHoursPerDay
          : {},
      ).reduce((acc, [role, value]) => {
        const roleName = String(role || '').trim()
        if (!roleName || !ROLE_OPTIONS.includes(roleName)) return acc
        const normalized = String(value ?? '').trim()
        if (!normalized) return acc
        acc[roleName] = normalized
        return acc
      }, {}),
    }
    let normalizedHistory = Array.isArray(parsed?.rateHistory)
      ? parsed.rateHistory.filter((entry) => entry && typeof entry === 'object')
      : []
    if (normalizedHistory.length === 0 && parsed?.updatedAt) {
      normalizedHistory = [
        {
          id: `otr-legacy-${String(parsed.updatedAt)}`,
          at: parsed.updatedAt,
          by: parsed.updatedBy || '',
          weekdayMultiplier: String(parsed.weekdayMultiplier || ''),
          weekendMultiplier: String(parsed.weekendMultiplier || ''),
          publicHolidayMultiplier: String(parsed.publicHolidayMultiplier || ''),
        },
      ]
    }
    const normalized = {
      ...defaultOvertimeRateSettings(),
      ...parsed,
      otApplicability: {
        roles:
          normalizedApplicabilityRoles.length > 0
            ? normalizedApplicabilityRoles
            : defaultOvertimeRateSettings().otApplicability.roles,
      },
      baseHourCalculation: normalizedBaseHourCalculation,
      rateHistory: normalizedHistory,
    }
    const hasLegacyRoleOverrideMode = sourceBaseHour?.mode === 'role_override'
    const hasLegacyRoleOverridesField = Object.prototype.hasOwnProperty.call(
      sourceBaseHour,
      'roleOverrides',
    )
    if (hasLegacyRoleOverrideMode || hasLegacyRoleOverridesField) {
      saveOvertimeRateSettings(normalized)
    }
    return normalized
  } catch {
    return defaultOvertimeRateSettings()
  }
}

export const saveOvertimeRateSettings = (next) => {
  try {
    localStorage.setItem(OVERTIME_RATE_SETTINGS_KEY, JSON.stringify(next))
    return true
  } catch {
    return false
  }
}
