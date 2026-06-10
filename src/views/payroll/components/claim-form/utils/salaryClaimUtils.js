import { buildClaimPeriodOptions } from '../claimPeriodOptions'
import { normalizeLegacyRole, ROLE_OPTIONS } from 'src/constants/roles'
import {
  defaultOvertimeRateSettings,
  OVERTIME_BASE_HOUR_MODES,
  OVERTIME_NORMAL_HOURS_STRATEGIES,
} from 'src/views/staff/salary-claims-management/utils'
import { parseAmount, formatDate } from './claimFormUtils'

export const PAYROLL_MONTH_OPTIONS = buildClaimPeriodOptions(2)

export const ADJUSTMENT_DIRECTION_OPTIONS = ['Addition', 'Deduction']

export const DEFAULT_HEADER = {
  period: '',
}

export const createSalaryItem = () => ({
  claimDate: '',
  claimType: '',
  amount: '',
  attachmentId: null,
  attachmentName: '',
  attachmentError: '',
  attachmentUploadState: 'idle',
  needsReattach: false,
  attachmentMigrationAttempted: false,
  legacyAttachmentDataUrl: '',
  attachmentMimeType: '',
  attachmentSizeBytes: 0,
  lineNotes: '',
})

export const parseOptionalAmount = (value) => {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const toTitleLabel = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const normalizeRoleValue = (role) => normalizeLegacyRole(String(role || '').trim())

export const normalizeRoleList = (roles = []) =>
  Array.from(new Set((Array.isArray(roles) ? roles : []).map(normalizeRoleValue).filter(Boolean)))

export const roundMoney = (value) => Math.round(parseAmount(value) * 100) / 100

export const normalizeOvertimeRateSettingsPayload = (value = {}) => {
  const defaults = defaultOvertimeRateSettings()
  const source = value && typeof value === 'object' ? value : {}
  const sourceBaseHour =
    source?.baseHourCalculation &&
    typeof source.baseHourCalculation === 'object' &&
    !Array.isArray(source.baseHourCalculation)
      ? source.baseHourCalculation
      : {}
  const sourceApplicability =
    source?.otApplicability &&
    typeof source.otApplicability === 'object' &&
    !Array.isArray(source.otApplicability)
      ? source.otApplicability
      : {}
  const sourceApplicabilityRoles = Array.isArray(sourceApplicability?.roles)
    ? sourceApplicability.roles
    : []
  const normalizedApplicabilityRoles = Array.from(
    new Set(
      sourceApplicabilityRoles
        .map((entry) => normalizeRoleValue(entry))
        .filter((entry) => entry && ROLE_OPTIONS.includes(entry)),
    ),
  )
  const normalizedRoleNormalHours = Object.entries(
    sourceBaseHour?.roleNormalHoursPerDay &&
      typeof sourceBaseHour.roleNormalHoursPerDay === 'object' &&
      !Array.isArray(sourceBaseHour.roleNormalHoursPerDay)
      ? sourceBaseHour.roleNormalHoursPerDay
      : {},
  ).reduce((acc, [role, valueEntry]) => {
    const normalizedRole = normalizeRoleValue(role)
    if (!normalizedRole || !ROLE_OPTIONS.includes(normalizedRole)) return acc
    const normalizedValue = String(valueEntry ?? '').trim()
    if (!normalizedValue) return acc
    acc[normalizedRole] = normalizedValue
    return acc
  }, {})

  return {
    ...defaults,
    ...source,
    otApplicability: {
      roles:
        normalizedApplicabilityRoles.length > 0
          ? normalizedApplicabilityRoles
          : defaults.otApplicability.roles,
    },
    baseHourCalculation: {
      mode:
        sourceBaseHour?.mode === OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
          ? OVERTIME_BASE_HOUR_MODES.MONTH_DAYS_DIVISION
          : OVERTIME_BASE_HOUR_MODES.AUTO_STATUTORY,
      monthlyDivisor:
        sourceBaseHour?.monthlyDivisor === null ||
        typeof sourceBaseHour?.monthlyDivisor === 'undefined'
          ? defaults.baseHourCalculation.monthlyDivisor
          : String(sourceBaseHour.monthlyDivisor).trim(),
      globalNormalHoursPerDay:
        sourceBaseHour?.globalNormalHoursPerDay === null ||
        typeof sourceBaseHour?.globalNormalHoursPerDay === 'undefined'
          ? defaults.baseHourCalculation.globalNormalHoursPerDay
          : String(sourceBaseHour.globalNormalHoursPerDay).trim(),
      normalHoursStrategy: [
        OVERTIME_NORMAL_HOURS_STRATEGIES.STATUTORY_8H,
        OVERTIME_NORMAL_HOURS_STRATEGIES.GLOBAL,
        OVERTIME_NORMAL_HOURS_STRATEGIES.ROLE_BASED,
      ].includes(sourceBaseHour?.normalHoursStrategy)
        ? sourceBaseHour.normalHoursStrategy
        : defaults.baseHourCalculation.normalHoursStrategy,
      defaultRoleHoursPerDay:
        sourceBaseHour?.defaultRoleHoursPerDay === null ||
        typeof sourceBaseHour?.defaultRoleHoursPerDay === 'undefined'
          ? defaults.baseHourCalculation.defaultRoleHoursPerDay
          : String(sourceBaseHour.defaultRoleHoursPerDay).trim(),
      roleNormalHoursPerDay: normalizedRoleNormalHours,
    },
  }
}

export const firstNumericValue = (...values) => {
  for (const value of values) {
    const parsed = parseOptionalAmount(value)
    if (parsed !== null) return parsed
  }
  return null
}

export const sumObjectValues = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  let total = 0
  let hasNumeric = false
  Object.values(value).forEach((entry) => {
    const parsed = parseOptionalAmount(entry)
    if (parsed !== null) {
      total += parsed
      hasNumeric = true
    }
  })
  return hasNumeric ? total : null
}

export const parsePeriodValue = (value) => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null
  const [yearRaw, monthRaw] = value.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null
  return year * 100 + month
}

export const resolveAssignedSalaryConfig = (staff, periodValue, assignments = []) => {
  if (!Array.isArray(assignments) || assignments.length === 0) return null

  const targetId = staff?.id ? String(staff.id) : ''
  const targetEmail = String(staff?.email || '')
    .trim()
    .toLowerCase()
  const targetName = String(staff?.name || staff?.fullName || staff?.full_name || '')
    .trim()
    .toLowerCase()
  const targetPeriod = parsePeriodValue(periodValue)

  const candidates = assignments.filter((row) => {
    const rowId = String(row?.employeeId || '').trim()
    const rowEmail = String(row?.email || '')
      .trim()
      .toLowerCase()
    const rowName = String(row?.employee || '')
      .trim()
      .toLowerCase()
    if (targetId && rowId && targetId === rowId) return true
    if (targetEmail && rowEmail && targetEmail === rowEmail) return true
    if (targetName && rowName && targetName === rowName) return true
    return false
  })

  if (!candidates.length) return null

  const sorted = [...candidates].sort((a, b) => {
    const ap = parsePeriodValue(a?.effectiveFrom) || 0
    const bp = parsePeriodValue(b?.effectiveFrom) || 0
    return bp - ap
  })

  if (!targetPeriod) return sorted[0]

  const matchByPeriod = sorted.find((row) => {
    const rowPeriod = parsePeriodValue(row?.effectiveFrom)
    return rowPeriod !== null && rowPeriod <= targetPeriod
  })

  return matchByPeriod || sorted[0]
}

export const resolveAllowanceAmount = (staff) =>
  firstNumericValue(
    staff?.salaryAllowance,
    staff?.allowance,
    staff?.payroll?.allowance,
    staff?.payroll?.allowancesTotal,
    staff?.payroll?.fixedAllowance,
    staff?.compensation?.allowance,
    staff?.compensation?.allowancesTotal,
    sumObjectValues(staff?.allowances),
    sumObjectValues(staff?.payroll?.allowances),
  )

export const buildAssignedSalarySnapshot = (staff, period, assignedConfig = null) => {
  const hasConfiguredBaseline = Boolean(assignedConfig)
  if (!hasConfiguredBaseline) {
    return {
      period,
      hasConfiguredBaseline: false,
      basic: 0,
      allowance: 0,
      allowanceItems: [],
      gross: 0,
      epf: 0,
      perkeso: 0,
      sip: 0,
      deductionItems: [],
      totalDeductions: 0,
      net: 0,
    }
  }

  const basic = roundMoney(
    firstNumericValue(
      assignedConfig?.basicSalary,
      staff?.salaryBasic,
      staff?.basicSalary,
      staff?.salary,
      staff?.payroll?.basic,
      staff?.payroll?.basicSalary,
      staff?.compensation?.basic,
      staff?.compensation?.basicSalary,
    ),
  )
  const fallbackAllowance = roundMoney(
    firstNumericValue(assignedConfig?.fixedAllowances, resolveAllowanceAmount(staff)) ?? 0,
  )
  const configuredAllowances = Array.isArray(assignedConfig?.allowances)
    ? assignedConfig.allowances
        .map((entry, index) => {
          const amount = roundMoney(parseAmount(entry?.amount))
          if (amount === 0) return null
          return {
            key: `allowance-${entry?.id || index}`,
            label: String(entry?.name || '').trim() || `Allowance ${index + 1}`,
            amount,
          }
        })
        .filter(Boolean)
    : []
  const allowanceItems =
    configuredAllowances.length > 0
      ? configuredAllowances
      : fallbackAllowance > 0
        ? [{ key: 'allowance-fixed', label: 'Fixed Allowances', amount: fallbackAllowance }]
        : []
  const allowanceTotal = roundMoney(allowanceItems.reduce((sum, item) => sum + item.amount, 0))

  const baseDeductionItems = ['epf', 'perkeso', 'sip'].map((key) => {
    const configuredValue = firstNumericValue(
      assignedConfig?.employeeContributions?.[key],
      assignedConfig?.[key],
      staff?.[key],
      staff?.payroll?.[key],
      staff?.deductions?.[key],
      key === 'perkeso' ? staff?.socso : null,
      key === 'perkeso' ? staff?.payroll?.socso : null,
    )
    return {
      key,
      label: key === 'perkeso' ? 'PERKESO (SOCSO)' : key === 'sip' ? 'SIP' : key.toUpperCase(),
      amount: roundMoney(configuredValue ?? 0),
    }
  })
  const extraConfiguredDeductions = Object.entries(assignedConfig?.employeeContributions || {})
    .filter(([key]) => !['epf', 'perkeso', 'sip'].includes(String(key || '').toLowerCase()))
    .map(([key, value]) => {
      const amount = roundMoney(parseAmount(value))
      if (amount === 0) return null
      return { key: String(key || '').toLowerCase(), label: toTitleLabel(key), amount }
    })
    .filter(Boolean)
  const deductionItems = [...baseDeductionItems, ...extraConfiguredDeductions]

  const epf = roundMoney(deductionItems.find((item) => item.key === 'epf')?.amount || 0)
  const perkeso = roundMoney(deductionItems.find((item) => item.key === 'perkeso')?.amount || 0)
  const sip = roundMoney(deductionItems.find((item) => item.key === 'sip')?.amount || 0)
  const gross = roundMoney(basic + allowanceTotal)
  const totalDeductions = roundMoney(deductionItems.reduce((sum, item) => sum + item.amount, 0))
  const net = roundMoney(gross - totalDeductions)

  return {
    period,
    hasConfiguredBaseline: true,
    basic,
    allowance: allowanceTotal,
    allowanceItems,
    gross,
    epf,
    perkeso,
    sip,
    deductionItems,
    totalDeductions,
    net,
  }
}

export const resolveDaysInMonth = (claimDate, periodValue = '') => {
  const dateFromClaim = new Date(claimDate)
  if (!Number.isNaN(dateFromClaim.getTime())) {
    return new Date(dateFromClaim.getFullYear(), dateFromClaim.getMonth() + 1, 0).getDate()
  }
  if (/^\d{4}-\d{2}$/.test(periodValue)) {
    const [yearRaw, monthRaw] = periodValue.split('-')
    const year = Number.parseInt(yearRaw, 10)
    const month = Number.parseInt(monthRaw, 10)
    if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
      return new Date(year, month, 0).getDate()
    }
  }
  return null
}

export const getMonthLabel = (value) =>
  PAYROLL_MONTH_OPTIONS.find((option) => option.value === value)?.label || value || ''

export const normalizeItem = (item) => {
  const source = item && typeof item === 'object' ? item : {}
  const sourceAttachmentId =
    Number(source.attachmentId || source.attachment_id || source?.attachment?.id || 0) || null
  const legacyAttachmentDataUrl = String(
    source.attachmentDataUrl || source.legacyAttachmentDataUrl || '',
  ).trim()
  const sourceAttachmentName = String(
    source.attachmentName || source?.attachment?.original_name || '',
  ).trim()
  const hasAttachmentId = Number(sourceAttachmentId || 0) > 0
  const hasLegacyBinary = legacyAttachmentDataUrl.length > 0
  const hasNameOnlyAttachment =
    !hasAttachmentId && sourceAttachmentName.length > 0 && !hasLegacyBinary
  const attachmentUploadState = String(source.attachmentUploadState || '').trim()
  const normalizedUploadState = attachmentUploadState
    ? attachmentUploadState
    : hasAttachmentId
      ? 'uploaded'
      : hasLegacyBinary
        ? 'pending_migration'
        : hasNameOnlyAttachment
          ? 'failed'
          : 'idle'
  const needsReattach =
    source.needsReattach === true ||
    hasNameOnlyAttachment ||
    (normalizedUploadState === 'failed' && !hasAttachmentId)
  const migrationAttempted = source.attachmentMigrationAttempted === true
  const direction =
    source.claimType === '' || source.claimType === null || typeof source.claimType === 'undefined'
      ? ''
      : ADJUSTMENT_DIRECTION_OPTIONS.includes(source.claimType)
        ? source.claimType
        : ADJUSTMENT_DIRECTION_OPTIONS[0]
  return {
    ...createSalaryItem(),
    ...source,
    claimDate: String(source.claimDate || source.claim_date || '').trim(),
    amount: String(source.amount ?? '').trim(),
    attachmentId: sourceAttachmentId,
    attachmentName: sourceAttachmentName,
    attachmentError: String(source.attachmentError || '').trim(),
    attachmentUploadState: normalizedUploadState,
    needsReattach,
    attachmentMigrationAttempted: migrationAttempted,
    legacyAttachmentDataUrl,
    attachmentMimeType: String(
      source.attachmentMimeType || source?.attachment?.mime_type || '',
    ).trim(),
    attachmentSizeBytes: Number(source.attachmentSizeBytes || source?.attachment?.size || 0) || 0,
    lineNotes: String(source.lineNotes || source.notes || '').trim(),
    claimType: direction,
  }
}

export const validateSalaryAdjustmentDraft = (draftItem = {}) => {
  if (!draftItem.claimDate) return 'Work or claim date is required.'
  if (!draftItem.claimType) return 'Adjustment direction is required.'
  if (draftItem.attachmentUploadState === 'uploading') {
    return 'Attachment upload is in progress. Please wait before saving.'
  }
  if (draftItem.attachmentUploadState === 'failed' || draftItem.needsReattach) {
    return 'Attachment upload failed. Reattach or remove the file before saving.'
  }
  if (parseAmount(draftItem.amount) <= 0) return 'Amount must be greater than zero.'
  return null
}

export const getSignedAdjustmentAmount = (item) => {
  const amount = parseAmount(item?.amount)
  return item?.claimType === 'Deduction' ? -amount : amount
}

export const getItemSummaryText = (item) => {
  if (item.lineNotes?.trim()) return item.lineNotes.trim()
  if (item.claimType) return `${item.claimType} adjustment`
  return item.claimDate ? formatDate(item.claimDate) : 'No notes'
}

export const hasDraftContent = (value = {}) => {
  if (!value || typeof value !== 'object') return false
  if (String(value?.period || '').trim()) return true
  if (Boolean(value?.periodConfirmed)) return true
  if (Boolean(value?.payrollBaselineConfirmed)) return true
  if (Array.isArray(value?.savedItems) && value.savedItems.length > 0) return true
  const draftItem = value?.draftItem && typeof value.draftItem === 'object' ? value.draftItem : null
  if (!draftItem) return false
  return Boolean(
    String(draftItem.claimDate || '').trim() ||
      String(draftItem.claimType || '').trim() ||
      String(draftItem.amount || '').trim() ||
      String(draftItem.lineNotes || '').trim() ||
      String(draftItem.attachmentName || '').trim(),
  )
}

export const isApprovedOvertimeStatus = (status) =>
  String(status || '')
    .trim()
    .toLowerCase() === 'approved'
