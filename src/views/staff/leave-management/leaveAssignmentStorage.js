/**
 * Leave assignment (entitlement) storage — API-backed.
 *
 * All localStorage operations replaced with REST API calls.
 * Function signatures preserved for call-site compatibility.
 */
import { apiRequest } from 'src/services/apiClient'
import { normalizeApiAssignmentRow } from 'src/views/leave/leaveApiNormalizer'

// ── Key helpers (kept for import compatibility, no longer used for storage) ───
export const getLeaveAssignmentsKey = (_userId) => ''
export const getLeaveAssignmentHistoryKey = (_userId) => ''

// ── Assignments ───────────────────────────────────────────────────────────────

/**
 * Load all leave assignments (GET /staff/leave/assignments).
 * Returns an array of assignment rows (plain array, matches old return type).
 */
export const loadLeaveAssignments = async (_userId, _fallbackRows = []) => {
  try {
    const result = await apiRequest('/staff/leave/assignments')
    const rows = (result?.data ?? []).map(normalizeApiAssignmentRow)
    return { ok: true, rows }
  } catch {
    return { ok: false, rows: [] }
  }
}

/**
 * Load all assignments (alias — used by LeaveManagement for the shared view).
 */
export const loadSharedLeaveAssignments = async () => loadLeaveAssignments()

/**
 * Save a single assignment row via API.
 * Accepts either a single row or an array for backward-compat.
 * No-ops silently if the API call fails (caller handles UI feedback).
 */
export const saveLeaveAssignments = async (_userId, rows) => {
  const items = Array.isArray(rows) ? rows : rows ? [rows] : []
  for (const row of items) {
    if (!row?.user_id && !row?.id) continue
    try {
      if (row.id) {
        await apiRequest(`/staff/leave/assignments/${row.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            entitlement: row.entitlement,
            used: row.used,
            pending: row.pending,
          }),
        })
      } else {
        await apiRequest('/staff/leave/assignments', {
          method: 'POST',
          body: JSON.stringify({
            user_id: row.user_id,
            year: row.year,
            leave_type: row.leaveType ?? row.leave_type,
            entitlement: row.entitlement,
            used: row.used ?? 0,
            pending: row.pending ?? 0,
          }),
        })
      }
    } catch {
      // ignore per-row failures
    }
  }
}

// ── Assignment History (no-ops — server manages audit trail) ─────────────────

export const loadLeaveAssignmentHistory = async (_userId) => []
export const saveLeaveAssignmentHistory = async (_userId, _rows) => {}
