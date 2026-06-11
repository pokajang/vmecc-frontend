const asBool = (value, fallback = false) => {
  if (typeof value === 'boolean') return value
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false
  return fallback
}

const asCsvList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export const featureFlags = {
  apiOtPayrollReadsPrimary: asBool(import.meta.env.VITE_API_OT_PAYROLL_READS_PRIMARY, true),
  apiOtPayrollWritesPrimary: asBool(import.meta.env.VITE_API_OT_PAYROLL_WRITES_PRIMARY, true),
  otPayrollLocalFallbackEnabled: asBool(
    import.meta.env.VITE_OT_PAYROLL_LOCAL_FALLBACK_ENABLED,
    false,
  ),
  otPayrollMigrationEnabled: asBool(import.meta.env.VITE_OT_PAYROLL_MIGRATION_ENABLED, false),
  salaryAssignmentsApiReadsPrimary: asBool(
    import.meta.env.VITE_SALARY_ASSIGNMENTS_API_READS_PRIMARY,
    true,
  ),
  salaryAssignmentsApiWritesPrimary: asBool(
    import.meta.env.VITE_SALARY_ASSIGNMENTS_API_WRITES_PRIMARY,
    true,
  ),
  salaryStatutoryRatesApiEnabled: asBool(
    import.meta.env.VITE_SALARY_STATUTORY_RATES_API_ENABLED,
    true,
  ),
  holidayGuidanceLeaveEnabled: asBool(import.meta.env.VITE_HOLIDAY_GUIDANCE_LEAVE_ENABLED, true),
  holidayGuidanceOvertimeEnabled: asBool(
    import.meta.env.VITE_HOLIDAY_GUIDANCE_OVERTIME_ENABLED,
    true,
  ),
  holidayGuidanceStaffVisibilityEnabled: asBool(
    import.meta.env.VITE_HOLIDAY_GUIDANCE_STAFF_VISIBILITY_ENABLED,
    false,
  ),
  reportLocalFallbackEnabled: asBool(import.meta.env.VITE_REPORT_LOCAL_FALLBACK_ENABLED, false),
  holidayGuidanceCohortUserIds: asCsvList(import.meta.env.VITE_HOLIDAY_GUIDANCE_COHORT_USER_IDS),
  holidayGuidanceCohortEmails: asCsvList(import.meta.env.VITE_HOLIDAY_GUIDANCE_COHORT_EMAILS),
}

const inGuidanceCohort = (user = null) => {
  const ids = featureFlags.holidayGuidanceCohortUserIds || []
  const emails = (featureFlags.holidayGuidanceCohortEmails || []).map((value) =>
    String(value).toLowerCase(),
  )
  if (ids.length === 0 && emails.length === 0) return true
  const userId = String(user?.id || '').trim()
  const userEmail = String(user?.email || '')
    .trim()
    .toLowerCase()
  if (userId && ids.includes(userId)) return true
  if (userEmail && emails.includes(userEmail)) return true
  return false
}

export const isHolidayGuidanceLeaveEnabledForUser = (user = null) =>
  featureFlags.holidayGuidanceLeaveEnabled && inGuidanceCohort(user)

export const isHolidayGuidanceOvertimeEnabledForUser = (user = null) =>
  featureFlags.holidayGuidanceOvertimeEnabled && inGuidanceCohort(user)

export const isHolidayGuidanceStaffVisibilityEnabledForUser = (user = null) =>
  featureFlags.holidayGuidanceStaffVisibilityEnabled && inGuidanceCohort(user)

export default featureFlags
