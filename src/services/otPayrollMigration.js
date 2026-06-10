import featureFlags from 'src/config/featureFlags'
import { loadClaimDraftEntries, loadClaimRecords } from 'src/views/payroll/components/claimRecords'
import { loadOvertimeDraft, loadOvertimeRecords } from 'src/views/overtime/overtimePersistence'
import { loadOvertimeApprovalRules } from 'src/views/settings/overtimeApprovalRulesStorage'
import { loadSalaryWorkflowRules } from 'src/views/settings/salaryWorkflowStorage'
import { loadOvertimeRateSettings } from 'src/views/staff/salary-claims-management/utils'
import { hasPermission } from 'src/utils/authz'
import { importOtPayrollMigrationApi } from './apiClient'

const MIGRATION_VERSION = 1
const buildMarkerKey = (userId) => `vmecc_ot_payroll_migration_v${MIGRATION_VERSION}_${userId}`

const hasAnyOwnData = (userId) => {
  const overtimeRows = loadOvertimeRecords(userId, [])?.data || []
  const overtimeDraft = loadOvertimeDraft(userId)?.data || null
  const claimRows = loadClaimRecords(userId) || []
  const claimDraftRows = [
    ...loadClaimDraftEntries(userId, 'expense'),
    ...loadClaimDraftEntries(userId, 'salary'),
    ...loadClaimDraftEntries(userId, 'other'),
  ]

  return Boolean(overtimeRows.length || overtimeDraft || claimRows.length || claimDraftRows.length)
}

const readMarker = (userId) => {
  try {
    return localStorage.getItem(buildMarkerKey(userId))
  } catch {
    return null
  }
}

const writeMarker = (userId, payload) => {
  try {
    localStorage.setItem(buildMarkerKey(userId), JSON.stringify(payload))
  } catch {
    // Ignore marker failures; migration API remains the source of truth.
  }
}

const collectPayload = (user) => {
  const userId = user?.id
  const overtimeRows = loadOvertimeRecords(userId, [])?.data || []
  const overtimeDraft = loadOvertimeDraft(userId)?.data || null
  const claimRows = loadClaimRecords(userId) || []
  const claimDrafts = [
    ...loadClaimDraftEntries(userId, 'expense'),
    ...loadClaimDraftEntries(userId, 'salary'),
    ...loadClaimDraftEntries(userId, 'other'),
  ]

  const payload = {
    overtime: {
      records: overtimeRows,
      draft: overtimeDraft,
    },
    payroll: {
      claims: claimRows,
      drafts: claimDrafts,
    },
  }

  if (hasPermission(user, 'settings.manage')) {
    payload.settings = {
      overtimeApprovalRules: loadOvertimeApprovalRules(),
      overtimeRateSettings: loadOvertimeRateSettings(),
      salaryWorkflowRules: loadSalaryWorkflowRules().data,
    }
  }

  return payload
}

const totalMigratedCount = (report) => {
  if (!report || typeof report !== 'object') return 0
  const counters = []
  Object.values(report).forEach((section) => {
    if (!section || typeof section !== 'object') return
    counters.push(Number(section.created || 0) || 0)
    counters.push(Number(section.updated || 0) || 0)
  })
  return counters.reduce((sum, value) => sum + value, 0)
}

export const runOtPayrollMigrationOnce = async (user) => {
  const userId = String(user?.id || '').trim()
  if (!featureFlags.otPayrollMigrationEnabled) {
    return { ok: true, skipped: true, reason: 'flag-disabled' }
  }
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: true, skipped: true, reason: 'api-writes-disabled' }
  }
  if (!userId) {
    return { ok: false, skipped: true, reason: 'missing-user' }
  }

  const existing = readMarker(userId)
  if (existing) {
    return { ok: true, skipped: true, reason: 'already-migrated' }
  }

  if (!hasAnyOwnData(userId)) {
    writeMarker(userId, {
      migratedAt: new Date().toISOString(),
      report: null,
      reason: 'empty-local',
    })
    return { ok: true, skipped: true, reason: 'empty-local' }
  }

  try {
    const payload = collectPayload(user)
    const result = await importOtPayrollMigrationApi(payload)
    const report = result?.data || {}
    writeMarker(userId, {
      migratedAt: new Date().toISOString(),
      report,
    })
    return {
      ok: true,
      skipped: false,
      report,
      totalChanges: totalMigratedCount(report),
    }
  } catch (error) {
    return { ok: false, skipped: false, error }
  }
}
