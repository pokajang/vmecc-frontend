import {
  cancelOvertimeRecord,
  clearOvertimeDraftApi,
  createOvertimeRecord,
  deleteOvertimeRecordApi,
  fetchOvertimeDraft,
  fetchOvertimeEligibility,
  classifyOvertimeDateApi,
  fetchOvertimePolicy,
  fetchOvertimeRecords,
  saveOvertimeDraftApi,
  updateOvertimeRecord,
  fetchStaffOvertimeRecords,
  reviewStaffOvertimeRecord,
  recommendStaffOvertimeRecord,
  approveStaffOvertimeRecord,
  rejectStaffOvertimeRecord,
  cancelStaffOvertimeRecord,
} from './apiClient'
import featureFlags from 'src/config/featureFlags'

const mapApiErrorMeta = (error) => {
  const status = Number(error?.status || 0) || 0
  const code = String(error?.payload?.code || '').trim()
  const message = String(error?.payload?.message || error?.message || '').trim()
  const isIneligible = status === 403 && code === 'OT_NOT_APPLICABLE'
  return { status, code, message, isIneligible }
}

const normalizeApiClockTime = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  let match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    const hour = Number(match[1])
    const minute = Number(match[2])
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }
  match = raw.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
  if (match) {
    const hour = Number(match[1])
    const minute = Number(match[2])
    const second = Number(match[3])
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }
  match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/)
  if (match) {
    let hour = Number(match[1])
    const minute = Number(match[2])
    const meridiem = match[3].toUpperCase()
    if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
      if (meridiem === 'AM') hour = hour === 12 ? 0 : hour
      if (meridiem === 'PM') hour = hour === 12 ? 12 : hour + 12
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    }
  }
  return ''
}

export const mapOvertimeApiRowToUi = (row = {}, ownerUserId = '') => ({
  id: String(row.display_id || row.id || '').trim(),
  serverId: row?.id ?? null,
  ownerUserId: ownerUserId || String(row.owner_user_id || row.user_id || '').trim(),
  recordKey:
    String(row.record_key || '').trim() ||
    `${String(ownerUserId || row.owner_user_id || row.user_id || '').trim()}::${String(row.id || '').trim()}`,
  overtimeType: String(row.overtime_type || row.overtimeType || 'weekday').trim() || 'weekday',
  claimDate: String(row.claim_date || row.claimDate || '').trim(),
  startTime: normalizeApiClockTime(row.start_time || row.startTime || ''),
  endTime: normalizeApiClockTime(row.end_time || row.endTime || ''),
  isOvernight: Boolean(row.is_overnight ?? row.isOvernight),
  durationMinutes: Number(row.duration_minutes ?? row.durationMinutes ?? 0) || 0,
  durationLabel: String(row.durationLabel || '').trim(),
  reason: String(row.reason || '').trim(),
  status: String(row.status || 'Pending').trim() || 'Pending',
  appliedAt: String(row.applied_at || row.appliedAt || '').trim(),
  submittedBy: String(row.submitted_by || row.submittedBy || '').trim(),
  employee: String(row.employee || row.owner_label || '').trim(),
  employeeEmail: String(row.employee_email || '').trim(),
  avatarUrl: String(row.avatar_url || row.avatarUrl || '').trim(),
  team: String(row.team || '').trim(),
  workflowSnapshot: row.workflow_snapshot || row.workflowSnapshot || null,
  workflowStage: String(row.workflow_stage || row.workflowStage || 'review').trim() || 'review',
  nextActionRole:
    row.next_action_role === null || row.next_action_role === undefined
      ? (row.nextActionRole ?? null)
      : row.next_action_role,
  applicantRoles: Array.isArray(row.applicant_roles)
    ? row.applicant_roles
    : Array.isArray(row.applicantRoles)
      ? row.applicantRoles
      : [],
  approvalHistory: Array.isArray(row.approval_history)
    ? row.approval_history
    : Array.isArray(row.approvalHistory)
      ? row.approvalHistory
      : [],
  guidance_meta:
    row.guidance_meta && typeof row.guidance_meta === 'object'
      ? { ...row.guidance_meta }
      : row.guidanceMeta && typeof row.guidanceMeta === 'object'
        ? { ...row.guidanceMeta }
        : null,
})

const toApiPayload = (row = {}) => ({
  overtime_type: row.overtimeType,
  claim_date: row.claimDate,
  start_time: normalizeApiClockTime(row.startTime),
  end_time: normalizeApiClockTime(row.endTime),
  is_overnight: Boolean(row.isOvernight),
  duration_minutes: Number(row.durationMinutes || 0) || 0,
  reason: row.reason || '',
  attachment_id: row.attachmentId || null,
})

export const loadMyOvertimePolicyApiFirst = async () => {
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return {
      ok: false,
      data: null,
      source: 'api',
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const result = await fetchOvertimePolicy()
    return { ok: true, data: result?.data || null, source: 'api' }
  } catch (error) {
    return { ok: false, data: null, source: 'api', error }
  }
}

export const loadMyOvertimeEligibilityApiFirst = async () => {
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return {
      ok: false,
      data: null,
      source: 'api',
      error: new Error('API reads disabled by feature flag'),
    }
  }

  try {
    const result = await fetchOvertimeEligibility()
    const payload = result?.data && typeof result.data === 'object' ? result.data : {}
    return {
      ok: true,
      data: {
        eligible: payload?.eligible === true,
        applicableRoles: Array.isArray(payload?.applicableRoles) ? payload.applicableRoles : [],
        userRoles: Array.isArray(payload?.userRoles) ? payload.userRoles : [],
      },
      source: 'api',
    }
  } catch (error) {
    return { ok: false, data: null, source: 'api', error, ...mapApiErrorMeta(error) }
  }
}

export const classifyMyOvertimeDateApiFirst = async (claimDate) => {
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return {
      ok: false,
      data: null,
      source: 'api',
      error: new Error('API reads disabled by feature flag'),
    }
  }
  if (!claimDate) {
    return { ok: false, data: null, source: 'api', error: new Error('Missing claim date') }
  }
  try {
    const result = await classifyOvertimeDateApi(claimDate)
    return { ok: true, data: result?.data || null, meta: result?.meta || null, source: 'api' }
  } catch (error) {
    return { ok: false, data: null, source: 'api', error }
  }
}

export const loadMyOvertimeRecordsApiFirst = async (userId, params = {}) => {
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return {
      ok: false,
      data: [],
      source: 'api',
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const result = await fetchOvertimeRecords(params)
    const rows = Array.isArray(result?.data)
      ? result.data.map((row) => mapOvertimeApiRowToUi(row, userId))
      : []
    return { ok: true, data: rows, source: 'api' }
  } catch (error) {
    return { ok: false, data: [], source: 'api', error }
  }
}

export const submitMyOvertimeApiFirst = async (userId, row, existingServerId = null) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, error: new Error('API writes disabled by feature flag'), source: 'api' }
  }
  const payload = toApiPayload(row)
  try {
    const result = existingServerId
      ? await updateOvertimeRecord(existingServerId, payload)
      : await createOvertimeRecord(payload)
    const next = mapOvertimeApiRowToUi(result?.data || {}, userId)
    return { ok: true, data: next, meta: result?.meta || null, source: 'api' }
  } catch (error) {
    return { ok: false, error, source: 'api', ...mapApiErrorMeta(error) }
  }
}

export const cancelMyOvertimeApiFirst = async (serverId) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, error: new Error('API writes disabled by feature flag'), source: 'api' }
  }
  if (!serverId) return { ok: false, source: 'api' }
  try {
    const result = await cancelOvertimeRecord(serverId)
    return { ok: true, data: result?.data || null, source: 'api' }
  } catch (error) {
    return { ok: false, error, source: 'api' }
  }
}

export const deleteMyOvertimeApiFirst = async (serverId) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, error: new Error('API writes disabled by feature flag'), source: 'api' }
  }
  if (!serverId) return { ok: false, source: 'api' }
  try {
    await deleteOvertimeRecordApi(serverId)
    return { ok: true, source: 'api' }
  } catch (error) {
    return { ok: false, error, source: 'api' }
  }
}

export const loadMyOvertimeDraftApiFirst = async (_userId) => {
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return {
      ok: false,
      data: null,
      source: 'api',
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const result = await fetchOvertimeDraft()
    const payload = result?.data || null
    return { ok: true, data: payload, source: 'api' }
  } catch (error) {
    return { ok: false, data: null, source: 'api', error }
  }
}

export const saveMyOvertimeDraftApiFirst = async (_userId, payload) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  try {
    await saveOvertimeDraftApi(payload)
    return { ok: true, source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error, ...mapApiErrorMeta(error) }
  }
}

export const clearMyOvertimeDraftApiFirst = async (_userId) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  try {
    await clearOvertimeDraftApi()
    return { ok: true, source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const loadStaffOvertimeRecordsApiFirst = async (params = {}) => {
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return {
      ok: false,
      data: [],
      meta: null,
      filters: null,
      source: 'api',
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const result = await fetchStaffOvertimeRecords(params)
    const rows = Array.isArray(result?.data)
      ? result.data.map((row) =>
          mapOvertimeApiRowToUi(row, String(row.owner_user_id || row.user_id || '')),
        )
      : []
    return {
      ok: true,
      data: rows,
      meta: result?.meta || null,
      filters: result?.filters || null,
      source: 'api',
    }
  } catch (error) {
    return { ok: false, data: [], meta: null, filters: null, source: 'api', error }
  }
}

export const runStaffOvertimeWorkflowApi = async (row, decision, remarks = '') => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, error: new Error('API writes disabled by feature flag'), source: 'api' }
  }
  const ownerId = String(row?.ownerUserId || '').trim()
  const recordId = Number(row?.serverId || 0)
  if (!ownerId || !recordId) return { ok: false, source: 'api' }

  const payload = remarks ? { remarks } : {}

  try {
    const action = String(decision || '').toLowerCase()
    let result = null
    if (action === 'review') result = await reviewStaffOvertimeRecord(ownerId, recordId, payload)
    else if (action === 'recommend')
      result = await recommendStaffOvertimeRecord(ownerId, recordId, payload)
    else if (action === 'approve')
      result = await approveStaffOvertimeRecord(ownerId, recordId, payload)
    else if (action === 'reject')
      result = await rejectStaffOvertimeRecord(ownerId, recordId, payload)
    else if (action === 'cancel')
      result = await cancelStaffOvertimeRecord(ownerId, recordId, payload)
    else return { ok: false, source: 'api' }

    return { ok: true, data: mapOvertimeApiRowToUi(result?.data || {}, ownerId), source: 'api' }
  } catch (error) {
    return { ok: false, error, source: 'api' }
  }
}
