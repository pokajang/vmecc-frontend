import featureFlags from 'src/config/featureFlags'
import {
  createSalaryAssignment,
  createSalaryAssignmentDraftApi,
  deleteSalaryAssignmentApi,
  deleteSalaryAssignmentDraftApi,
  fetchSalaryAssignmentHistoryApi,
  fetchSalaryAssignmentDraftsApi,
  fetchSalaryAssignments,
  updateSalaryAssignmentApi,
  updateSalaryAssignmentDraftApi,
} from './apiClient'

const toNumber = (value) => {
  const parsed = Number.parseInt(String(value || '').trim(), 10)
  return Number.isFinite(parsed) ? parsed : null
}

const toUiAssignmentRow = (row = {}) => ({
  id: String(row?.reference_id || row?.id || '').trim(),
  referenceId: String(row?.reference_id || '').trim(),
  serverId: row?.id ?? null,
  employeeId: String(row?.employee_user_id || '').trim(),
  employee: String(row?.employee || '').trim(),
  email: String(row?.email || '')
    .trim()
    .toLowerCase(),
  team: String(row?.team || '').trim(),
  status: String(row?.status || '').trim() || 'Active',
  effectiveFrom: String(row?.effective_from || '').trim(),
  basicSalary: Number(row?.basic_salary || 0) || 0,
  allowanceTotal: Number(row?.allowance_total || 0) || 0,
  fixedAllowances: Number(row?.allowance_total || 0) || 0,
  allowances: Array.isArray(row?.allowances) ? row.allowances : [],
  employeeContributions: row?.employee_contributions || {},
  employerContributions: row?.employer_contributions || {},
  notesHistory: Array.isArray(row?.notes_history) ? row.notes_history : [],
  notes: '',
  createdBy: String(row?.created_by || '').trim(),
  updatedBy: String(row?.updated_by || '').trim(),
  createdAt: String(row?.created_at || '').trim(),
  updatedAt: String(row?.updated_at || '').trim(),
})

const toUiAssignmentHistoryRow = (row = {}) => ({
  id: String(row?.id || '').trim(),
  assignmentId: String(row?.assignmentId || '').trim(),
  at: String(row?.at || '').trim(),
  by: String(row?.by || '').trim(),
  employee: String(row?.employee || '').trim(),
  eventType: String(row?.eventType || '').trim() || 'Updated',
  summary: String(row?.summary || '').trim(),
  details: row?.details && typeof row.details === 'object' ? row.details : {},
})

const toApiAssignmentPayload = (row = {}) => ({
  reference_id: String(row?.referenceId || row?.id || '').trim() || null,
  employee_user_id: toNumber(row?.employeeId),
  status: String(row?.status || '').trim() || 'Active',
  effective_from: String(row?.effectiveFrom || '').trim() || null,
  basic_salary: Number(row?.basicSalary || 0) || 0,
  allowances: Array.isArray(row?.allowances) ? row.allowances : [],
  employee_contributions: row?.employeeContributions || {},
  employer_contributions: row?.employerContributions || {},
  notes_history: Array.isArray(row?.notesHistory) ? row.notesHistory : [],
})

const toUiDraftRecord = (row = {}) => ({
  id: String(row?.id || '').trim(),
  backendId: row?.id ?? null,
  name: String(row?.draft_name || '').trim() || 'Untitled draft',
  status: 'Draft',
  savedAt: String(row?.saved_at || '').trim(),
  updatedAt: String(row?.updated_at || '').trim(),
  sourceAssignmentId: String(row?.source_assignment_id || '').trim(),
  draftData: row?.payload && typeof row.payload === 'object' ? row.payload : {},
})

const toApiDraftPayload = (draftRecord = {}) => ({
  draft_name: String(draftRecord?.name || '').trim(),
  source_assignment_id: toNumber(draftRecord?.sourceAssignmentId),
  payload:
    draftRecord?.draftData && typeof draftRecord.draftData === 'object'
      ? draftRecord.draftData
      : {},
})

const loadDraftRowsFromApi = async () => {
  const result = await fetchSalaryAssignmentDraftsApi()
  return Array.isArray(result?.data) ? result.data.map(toUiDraftRecord) : []
}

export const loadSalaryAssignmentsApiFirst = async (userId) => {
  if (!featureFlags.salaryAssignmentsApiReadsPrimary) {
    return {
      ok: false,
      source: 'api',
      data: [],
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const result = await fetchSalaryAssignments()
    const rows = Array.isArray(result?.data) ? result.data.map(toUiAssignmentRow) : []
    return { ok: true, source: 'api', data: rows }
  } catch (error) {
    return { ok: false, source: 'api', data: [], error }
  }
}

export const loadSalaryAssignmentDraftsApiFirst = async (userId) => {
  if (!featureFlags.salaryAssignmentsApiReadsPrimary) {
    return {
      ok: false,
      source: 'api',
      data: [],
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const rows = await loadDraftRowsFromApi()
    return { ok: true, source: 'api', data: rows }
  } catch (error) {
    return { ok: false, source: 'api', data: [], error }
  }
}

export const loadSalaryAssignmentHistoryApiFirst = async (params = {}) => {
  if (!featureFlags.salaryAssignmentsApiReadsPrimary) {
    return {
      ok: false,
      source: 'api',
      data: [],
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const result = await fetchSalaryAssignmentHistoryApi(params)
    const rows = Array.isArray(result?.data) ? result.data.map(toUiAssignmentHistoryRow) : []
    return { ok: true, source: 'api', data: rows }
  } catch (error) {
    return { ok: false, source: 'api', data: [], error }
  }
}

export const upsertSalaryAssignmentApiFirst = async (userId, row, existingServerId = null) => {
  if (!featureFlags.salaryAssignmentsApiWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  try {
    const serverId = toNumber(existingServerId || row?.serverId || row?.id)
    const payload = toApiAssignmentPayload(row)
    const result = serverId
      ? await updateSalaryAssignmentApi(serverId, payload)
      : await createSalaryAssignment(payload)
    const next = toUiAssignmentRow(result?.data || {})
    const history = result?.history ? toUiAssignmentHistoryRow(result.history) : null
    return { ok: true, source: 'api', data: next, history }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const deleteSalaryAssignmentApiFirst = async (assignmentId) => {
  if (!featureFlags.salaryAssignmentsApiWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  const serverId = toNumber(assignmentId)
  if (!serverId) return { ok: false, source: 'api', error: new Error('Missing assignment id') }
  try {
    const result = await deleteSalaryAssignmentApi(serverId)
    const history = result?.history ? toUiAssignmentHistoryRow(result.history) : null
    return { ok: true, source: 'api', history }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const upsertSalaryAssignmentDraftApiFirst = async (userId, draftRecord) => {
  if (!featureFlags.salaryAssignmentsApiWritesPrimary) {
    return {
      ok: false,
      source: 'api',
      data: null,
      row: null,
      rows: [],
      error: new Error('API writes disabled by feature flag'),
    }
  }
  try {
    const serverId = toNumber(draftRecord?.backendId || draftRecord?.id)
    const payload = toApiDraftPayload(draftRecord)
    const result = serverId
      ? await updateSalaryAssignmentDraftApi(serverId, payload)
      : await createSalaryAssignmentDraftApi(payload)
    const mapped = toUiDraftRecord(result?.data || {})
    const rows = await loadDraftRowsFromApi()
    const normalizedRow =
      rows.find((row) => String(row?.id || '') === String(mapped?.id || '')) || mapped
    return {
      ok: true,
      source: 'api',
      data: normalizedRow,
      row: normalizedRow,
      rows,
    }
  } catch (error) {
    return {
      ok: false,
      source: 'api',
      data: null,
      row: null,
      rows: [],
      error,
    }
  }
}

export const renameSalaryAssignmentDraftApiFirst = async (
  userId,
  draftId,
  name,
  backendId = null,
) => {
  if (!featureFlags.salaryAssignmentsApiWritesPrimary) {
    return {
      ok: false,
      source: 'api',
      row: null,
      rows: [],
      error: new Error('API writes disabled by feature flag'),
    }
  }
  const targetBackendId = toNumber(backendId || draftId)
  if (!targetBackendId) {
    return {
      ok: false,
      source: 'api',
      row: null,
      rows: [],
      error: new Error('Missing backend draft id'),
    }
  }
  try {
    const result = await updateSalaryAssignmentDraftApi(targetBackendId, {
      draft_name: String(name || '').trim(),
    })
    const mapped = toUiDraftRecord(result?.data || {})
    const rows = await loadDraftRowsFromApi()
    const normalizedRow =
      rows.find((row) => String(row?.id || '') === String(mapped?.id || '')) || mapped
    return { ok: true, source: 'api', row: normalizedRow, rows }
  } catch (error) {
    return { ok: false, source: 'api', row: null, rows: [], error }
  }
}

export const deleteSalaryAssignmentDraftApiFirst = async (userId, draftId, backendId = null) => {
  if (!featureFlags.salaryAssignmentsApiWritesPrimary) {
    return {
      ok: false,
      source: 'api',
      rows: [],
      error: new Error('API writes disabled by feature flag'),
    }
  }
  const targetBackendId = toNumber(backendId || draftId)
  if (!targetBackendId) {
    return {
      ok: false,
      source: 'api',
      rows: [],
      error: new Error('Missing backend draft id'),
    }
  }
  try {
    await deleteSalaryAssignmentDraftApi(targetBackendId)
    const rows = await loadDraftRowsFromApi()
    return {
      ok: true,
      source: 'api',
      rows,
    }
  } catch (error) {
    return {
      ok: false,
      source: 'api',
      rows: [],
      error,
    }
  }
}
