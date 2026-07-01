import { parse, storageKey } from '../utils'

const DRILL_CUSTOM_LOCATION_KEY = 'report_drill_custom_locations_v1_user_'

const normalizeCustomLocation = (row) => {
  const title = String(row?.title || row?.value || '').trim()
  if (!title) return null
  return {
    value: title,
    title,
    description: String(row?.description || '').trim(),
    iconKey: String(row?.iconKey || '').trim(),
  }
}

export const loadCustomDrillLocations = (userId) => {
  if (!userId) return []
  const rows = parse(localStorage.getItem(storageKey(DRILL_CUSTOM_LOCATION_KEY, userId)), [])
  if (!Array.isArray(rows)) return []

  const seen = new Set()
  return rows
    .map(normalizeCustomLocation)
    .filter(Boolean)
    .filter((row) => {
      const key = row.value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const saveCustomDrillLocations = (userId, rows) => {
  if (!userId) return
  const normalizedRows = Array.isArray(rows)
    ? rows.map(normalizeCustomLocation).filter(Boolean)
    : []
  localStorage.setItem(
    storageKey(DRILL_CUSTOM_LOCATION_KEY, userId),
    JSON.stringify(normalizedRows),
  )
}
