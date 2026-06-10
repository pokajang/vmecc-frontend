/**
 * Leave persistence — API-backed.
 *
 * All functions that previously read/wrote localStorage now call the REST API.
 * The function signatures are preserved so call-sites require minimal changes.
 * Async functions return { ok, data/rows, ... } to match the old localStorage shape.
 */
import { apiRequest, buildApiUrl } from 'src/services/apiClient'
import { normalizeApiLeaveRecord, normalizeApiAssignmentRow } from './leaveApiNormalizer'

// ── Leave Records ─────────────────────────────────────────────────────────────

/**
 * Load own leave records (GET /leave).
 * Returns { ok, data: LeaveRecord[] }
 */
export const loadLeaveRecords = async (userId, _fallbackRows = []) => {
  try {
    const result = await apiRequest('/leave')
    const data = (result?.data ?? []).map(normalizeApiLeaveRecord)
    return { ok: true, data, missing: false, migrated: false, recovered: false }
  } catch (error) {
    return { ok: false, data: [], missing: false, migrated: false, recovered: true, error }
  }
}

/**
 * Load all leave records across all users (staff view — GET /staff/leave/records).
 * Returns { ok, data: LeaveRecord[] }
 */
export const loadAllLeaveRecords = async (_fallbackRows = []) => {
  try {
    const result = await apiRequest('/staff/leave/records')
    const data = (result?.data ?? []).map(normalizeApiLeaveRecord)
    return { ok: true, data, missing: false, migrated: false, recovered: false }
  } catch (error) {
    return { ok: false, data: [], missing: false, migrated: false, recovered: true, error }
  }
}

/**
 * No-op: server manages record state.
 */
export const saveLeaveRecords = async (_userId, _rows) => ({ ok: true })

// ── Leave Assignments (own balance) ───────────────────────────────────────────

/**
 * Load own leave balance (GET /leave/balance).
 * Returns { ok, rows: AssignmentRow[] }
 */
export const loadLeaveAssignmentsForUser = async (userId, _fallbackRows = []) => {
  try {
    const result = await apiRequest('/leave/balance')
    const rows = (result?.data ?? []).map(normalizeApiAssignmentRow)
    return { ok: true, rows, migrated: false, recovered: false }
  } catch (error) {
    return { ok: false, rows: [], migrated: false, recovered: true, error }
  }
}

/**
 * No-op: server manages assignment state.
 */
export const saveLeaveAssignments = async (_userId, _rows) => ({ ok: true })

/**
 * No-op: submission is done directly via apiRequest in Leave.js.
 */
export const saveLeaveSubmissionAtomic = async (_payload) => ({ ok: true })

// ── Draft ─────────────────────────────────────────────────────────────────────

/**
 * Load own draft (GET /leave/draft).
 * Returns { ok, data: draftData | null }
 */
export const loadLeaveDraft = async (_userId) => {
  try {
    const result = await apiRequest('/leave/draft')
    const draft = result?.data?.draft_data ?? null
    return { ok: true, data: draft, missing: !draft, migrated: false, recovered: false }
  } catch (error) {
    return { ok: false, data: null, missing: true, migrated: false, recovered: true, error }
  }
}

/**
 * Save own draft (POST /leave/draft).
 * Returns { ok }
 */
export const saveLeaveDraft = async (_userId, draft) => {
  try {
    await apiRequest('/leave/draft', {
      method: 'POST',
      body: JSON.stringify({ draft_data: draft }),
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

/**
 * Delete own draft (DELETE /leave/draft).
 * Returns { ok }
 */
export const clearLeaveDraft = async (_userId) => {
  try {
    await apiRequest('/leave/draft', { method: 'DELETE' })
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

// ── Attachments ───────────────────────────────────────────────────────────────

/**
 * Upload attachment (POST /leave/attachments via multipart).
 * Returns { ok, attachmentId } where attachmentId is the integer DB id.
 */
export const putLeaveAttachmentBlob = async (_userId, file, _meta = {}) => {
  if (!file) return { ok: false, error: new Error('No file provided.') }

  try {
    const formData = new FormData()
    formData.append('file', file)

    const result = await apiRequest('/leave/attachments', {
      method: 'POST',
      body: formData,
      // Let browser set Content-Type (multipart/form-data with boundary)
      headers: { Accept: 'application/json' },
    })

    const attachmentId = result?.data?.id ?? null
    return { ok: true, attachmentId }
  } catch (error) {
    return { ok: false, error }
  }
}

/**
 * Retrieve attachment metadata (GET /leave/attachments/{id}).
 * The browser streams the file directly — this returns a URL for use in <img> or <a>.
 */
export const getLeaveAttachmentBlob = async (_userId, attachmentId) => {
  if (!attachmentId) return { ok: false, error: new Error('No attachmentId provided.') }
  // Return a URL pointing to the API endpoint using configured base URL.
  const url = buildApiUrl(`/leave/attachments/${attachmentId}`)
  return { ok: true, record: { blobUrl: url, id: attachmentId } }
}

/**
 * Delete attachment (DELETE /leave/attachments/{id}).
 */
export const deleteLeaveAttachmentBlob = async (attachmentId) => {
  if (!attachmentId) return { ok: true }
  try {
    await apiRequest(`/leave/attachments/${attachmentId}`, { method: 'DELETE' })
    return { ok: true }
  } catch (error) {
    return { ok: false, error }
  }
}

/**
 * No-op: server manages attachment cleanup.
 */
export const pruneLeaveAttachmentBlobs = async (_opts) => ({ ok: true, deleted: 0 })

// ── ID Generation ─────────────────────────────────────────────────────────────

/**
 * No-op: server generates the display ID.
 * Returns empty string; callers should use the id returned from the API.
 */
export const generateLeaveId = (_rows, _leaveType, _now) => ''

// ── Key helpers (kept for backward-compat but no longer used for storage) ─────
export const getLeaveRecordsKey = (_userId) => ''
export const getLeaveDraftKey = (_userId) => ''
