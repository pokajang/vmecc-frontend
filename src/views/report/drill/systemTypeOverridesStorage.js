import { parse, storageKey } from '../utils'

const DRILL_TYPE_OVERRIDES_KEY = 'report_drill_type_overrides_v1_user_'
const DRILL_LOCATION_OVERRIDES_KEY = 'report_drill_location_overrides_v1_user_'

const normalizeOverride = (row) => {
  const value = String(row?.value || '').trim()
  if (!value) return null
  return {
    value,
    title: String(row?.title || '').trim() || value,
    description: String(row?.description || '').trim(),
    iconKey: String(row?.iconKey || '').trim(),
    hidden: Boolean(row?.hidden),
  }
}

const loadOverrides = (prefix, userId) => {
  if (!userId) return []
  const rows = parse(localStorage.getItem(storageKey(prefix, userId)), [])
  if (!Array.isArray(rows)) return []

  const seen = new Set()
  return rows
    .map(normalizeOverride)
    .filter(Boolean)
    .filter((row) => {
      const key = row.value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const saveOverrides = (prefix, userId, rows) => {
  if (!userId) return
  const normalizedRows = Array.isArray(rows) ? rows.map(normalizeOverride).filter(Boolean) : []
  localStorage.setItem(storageKey(prefix, userId), JSON.stringify(normalizedRows))
}

export const loadDrillTypeOverrides = (userId) => loadOverrides(DRILL_TYPE_OVERRIDES_KEY, userId)

export const saveDrillTypeOverrides = (userId, rows) =>
  saveOverrides(DRILL_TYPE_OVERRIDES_KEY, userId, rows)

export const loadDrillLocationOverrides = (userId) =>
  loadOverrides(DRILL_LOCATION_OVERRIDES_KEY, userId)

export const saveDrillLocationOverrides = (userId, rows) =>
  saveOverrides(DRILL_LOCATION_OVERRIDES_KEY, userId, rows)
