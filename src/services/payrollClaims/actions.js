import {
  fetchPayrollClaims,
  createPayrollClaim,
  updatePayrollClaim,
  cancelPayrollClaim,
  deletePayrollClaimApi,
  fetchStaffPayrollClaims,
  checkStaffPayrollClaim,
  reviewStaffPayrollClaim,
  approveStaffPayrollClaim,
  rejectStaffPayrollClaim,
  cancelStaffPayrollClaim,
  markStaffPayrollClaimPaid,
  unmarkStaffPayrollClaimPaid,
  bulkMarkStaffPayrollClaimsPaid,
  bulkUnmarkStaffPayrollClaimsPaid,
  fetchPayrollClaimDrafts,
  fetchPayrollPayslips,
  downloadPayrollPayslip,
  savePayrollClaimDraftApi,
  deletePayrollClaimDraftApi,
} from '../apiClient'
import featureFlags from 'src/config/featureFlags'
import { buildIdempotencyKey, toApiPayload, toUiClaimRow, toUiPayslipRow } from './mappers'

export const loadMyPayrollClaimsApiFirst = async (userId) => {
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return {
      ok: false,
      data: [],
      source: 'api',
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const result = await fetchPayrollClaims()
    const rows = Array.isArray(result?.data) ? result.data.map(toUiClaimRow) : []
    return { ok: true, data: rows, source: 'api' }
  } catch (error) {
    return { ok: false, data: [], source: 'api', error }
  }
}

export const loadMyPayrollPayslipsApiFirst = async () => {
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return {
      ok: false,
      data: [],
      source: 'api',
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const result = await fetchPayrollPayslips()
    const rows = Array.isArray(result?.data) ? result.data.map(toUiPayslipRow) : []
    return { ok: true, data: rows, source: 'api' }
  } catch (error) {
    return { ok: false, data: [], source: 'api', error }
  }
}

export const downloadMyPayrollPayslipApiFirst = async (payslipId) => {
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return { ok: false, source: 'api', error: new Error('API reads disabled by feature flag') }
  }
  const id = Number(payslipId || 0) || 0
  if (!id) {
    return { ok: false, source: 'api', error: new Error('Missing payslip id') }
  }
  try {
    const result = await downloadPayrollPayslip(id)
    return { ok: true, data: result, source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const submitMyPayrollClaimApiFirst = async (row, existingServerId = null) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  const payload = toApiPayload(row)
  const idempotencyKey = buildIdempotencyKey('payroll-claim-submit', [
    existingServerId ? 'update' : 'create',
    payload?.submission_key || row?.submissionKey || row?.sourceDraftId || payload?.period_value,
    payload?.claim_type,
  ])
  try {
    const result = existingServerId
      ? await updatePayrollClaim(
          existingServerId,
          { ...payload, idempotency_key: idempotencyKey },
          { headers: { 'X-Idempotency-Key': idempotencyKey } },
        )
      : await createPayrollClaim(
          { ...payload, idempotency_key: idempotencyKey },
          { headers: { 'X-Idempotency-Key': idempotencyKey } },
        )
    return { ok: true, data: toUiClaimRow(result?.data || {}), source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const cancelMyPayrollClaimApiFirst = async (serverId, remarks = '', options = {}) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  if (!serverId) return { ok: false, source: 'api' }
  try {
    const idempotencyKey =
      options?.idempotencyKey || buildIdempotencyKey('payroll-claim-cancel', [serverId])
    const payload = remarks
      ? { remarks, idempotency_key: idempotencyKey }
      : { idempotency_key: idempotencyKey }
    const result = await cancelPayrollClaim(serverId, payload, {
      headers: { 'X-Idempotency-Key': idempotencyKey },
    })
    return { ok: true, data: toUiClaimRow(result?.data || {}), source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const deleteMyPayrollClaimApiFirst = async (serverId, options = {}) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  if (!serverId) return { ok: false, source: 'api' }
  try {
    const idempotencyKey =
      options?.idempotencyKey || buildIdempotencyKey('payroll-claim-delete', [serverId])
    await deletePayrollClaimApi(serverId, {
      headers: { 'X-Idempotency-Key': idempotencyKey },
    })
    return { ok: true, source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const loadStaffPayrollClaimsApiFirst = async () => {
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return {
      ok: false,
      data: [],
      source: 'api',
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const result = await fetchStaffPayrollClaims()
    const rows = Array.isArray(result?.data) ? result.data.map(toUiClaimRow) : []
    return { ok: true, data: rows, source: 'api' }
  } catch (error) {
    return { ok: false, data: [], source: 'api', error }
  }
}

export const runStaffPayrollClaimWorkflowApi = async (row, decision, remarks = '') => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  const ownerId = String(row?.ownerId || '').trim()
  const claimId = Number(row?.serverId || 0)
  if (!ownerId || !claimId) return { ok: false, source: 'api' }

  const payload = remarks ? { remarks } : {}
  const action = String(decision || '').toLowerCase()

  try {
    let result = null
    if (action === 'check') result = await checkStaffPayrollClaim(ownerId, claimId, payload)
    else if (action === 'review') result = await reviewStaffPayrollClaim(ownerId, claimId, payload)
    else if (action === 'approve')
      result = await approveStaffPayrollClaim(ownerId, claimId, payload)
    else if (action === 'reject') result = await rejectStaffPayrollClaim(ownerId, claimId, payload)
    else if (action === 'cancel') result = await cancelStaffPayrollClaim(ownerId, claimId, payload)
    else return { ok: false, source: 'api' }

    return { ok: true, data: toUiClaimRow(result?.data || {}), source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const markStaffPayrollClaimPaidApiFirst = async (row, payload = {}) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  const ownerId = String(row?.ownerId || '').trim()
  const claimId = Number(row?.serverId || 0)
  if (!ownerId || !claimId) return { ok: false, source: 'api' }
  try {
    const result = await markStaffPayrollClaimPaid(ownerId, claimId, payload)
    return { ok: true, data: toUiClaimRow(result?.data || {}), source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const unmarkStaffPayrollClaimPaidApiFirst = async (row, payload = {}) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  const ownerId = String(row?.ownerId || '').trim()
  const claimId = Number(row?.serverId || 0)
  if (!ownerId || !claimId) return { ok: false, source: 'api' }
  try {
    const result = await unmarkStaffPayrollClaimPaid(ownerId, claimId, payload)
    return { ok: true, data: toUiClaimRow(result?.data || {}), source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const bulkMarkStaffPayrollClaimsPaidApiFirst = async (entries = [], payload = {}) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map((row) => ({
      owner_id: String(row?.ownerId || '').trim(),
      claim_id: Number(row?.serverId || 0) || 0,
    }))
    .filter((entry) => entry.owner_id && entry.claim_id > 0)
  if (normalizedEntries.length === 0) return { ok: false, source: 'api' }

  try {
    const result = await bulkMarkStaffPayrollClaimsPaid({
      entries: normalizedEntries,
      ...payload,
    })
    const updatedRows = Array.isArray(result?.data?.updated_rows)
      ? result.data.updated_rows.map((row) => toUiClaimRow(row))
      : []
    return {
      ok: true,
      data: {
        updatedRows,
        skipped: Array.isArray(result?.data?.skipped) ? result.data.skipped : [],
      },
      source: 'api',
    }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const bulkUnmarkStaffPayrollClaimsPaidApiFirst = async (entries = [], payload = {}) => {
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map((row) => ({
      owner_id: String(row?.ownerId || '').trim(),
      claim_id: Number(row?.serverId || 0) || 0,
    }))
    .filter((entry) => entry.owner_id && entry.claim_id > 0)
  if (normalizedEntries.length === 0) return { ok: false, source: 'api' }

  try {
    const result = await bulkUnmarkStaffPayrollClaimsPaid({
      entries: normalizedEntries,
      ...payload,
    })
    const updatedRows = Array.isArray(result?.data?.updated_rows)
      ? result.data.updated_rows.map((row) => toUiClaimRow(row))
      : []
    return {
      ok: true,
      data: {
        updatedRows,
        skipped: Array.isArray(result?.data?.skipped) ? result.data.skipped : [],
      },
      source: 'api',
    }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}
