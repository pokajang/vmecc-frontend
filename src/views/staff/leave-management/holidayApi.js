import {
  batchSaveHolidaysApi,
  deleteHolidayApi,
  fetchHolidays,
  updateHolidayApi,
} from 'src/services/apiClient'

// Map the server row shape to the frontend row shape used throughout LeaveManagement.
const toFrontendRow = (row) => ({
  id: row.id,
  name: row.name,
  date: row.date, // 'YYYY-MM-DD'
  year: row.year,
  scope: row.scope,
  state: row.state,
  isDefaultNational: Boolean(row.is_default_national),
  fixedHolidayKey: row.fixed_holiday_key ?? null,
  createdAt: row.created_at ?? null,
  updatedAt: row.updated_at ?? null,
})

// ── Load all holidays (for hydration on mount) ────────────────────────────────
export const loadHolidays = async (params = {}) => {
  try {
    const payload = await fetchHolidays(params)
    const rows = Array.isArray(payload?.data) ? payload.data.map(toFrontendRow) : []
    return { ok: true, rows }
  } catch (error) {
    return { ok: false, error: error?.message || 'Unable to load holidays.', rows: [] }
  }
}

// ── Wizard: batch save nationals + additionals in one request ─────────────────
// nationals: array of { fixed_holiday_key, name, date, applicable }
// additionals: array of { name, date, scope, state }
export const batchSaveHolidays = async ({ nationals = [], additionals = [] } = {}) => {
  try {
    const payload = await batchSaveHolidaysApi({
      nationals: nationals.map((row) => ({
        fixed_holiday_key: row.key || row.fixedHolidayKey,
        name: row.name,
        date: row.date,
        applicable: Boolean(row.applicable),
      })),
      additionals: additionals.map((row) => ({
        name: row.name,
        date: row.date,
        scope: row.scope === 'State' ? 'State' : 'National',
        state: row.scope === 'State' ? row.state || 'All States' : 'All States',
      })),
    })
    const saved = Array.isArray(payload?.data) ? payload.data.map(toFrontendRow) : []
    return {
      ok: true,
      saved,
      skipped: payload?.skipped ?? [],
      message: payload?.message ?? '',
    }
  } catch (error) {
    return { ok: false, error: error?.message || 'Unable to save holidays.', saved: [] }
  }
}

// ── Single record update (table edit pencil) ──────────────────────────────────
export const updateHoliday = async (id, { name, date, scope, state }) => {
  try {
    const payload = await updateHolidayApi(id, {
      name,
      date,
      scope: scope === 'State' ? 'State' : 'National',
      state: scope === 'State' ? state || 'All States' : 'All States',
    })
    const row = payload?.data ? toFrontendRow(payload.data) : null
    return { ok: true, row }
  } catch (error) {
    return { ok: false, error: error?.message || 'Unable to update holiday.' }
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteHoliday = async (id) => {
  try {
    await deleteHolidayApi(id)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error?.message || 'Unable to delete holiday.' }
  }
}
