import { parse, storageKey } from './inspectionSharedUtils'

const INSPECTION_INCIDENT_SYSTEM_OVERRIDES_KEY =
  'report_inspection_incident_system_overrides_v1_user_'
const INSPECTION_WEATHER_SYSTEM_OVERRIDES_KEY =
  'report_inspection_weather_system_overrides_v1_user_'
const INSPECTION_LOCATION_SYSTEM_OVERRIDES_KEY =
  'report_inspection_location_system_overrides_v1_user_'

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

export const loadIncidentSystemOverrides = (userId) =>
  loadOverrides(INSPECTION_INCIDENT_SYSTEM_OVERRIDES_KEY, userId)

export const saveIncidentSystemOverrides = (userId, rows) =>
  saveOverrides(INSPECTION_INCIDENT_SYSTEM_OVERRIDES_KEY, userId, rows)

export const loadWeatherSystemOverrides = (userId) =>
  loadOverrides(INSPECTION_WEATHER_SYSTEM_OVERRIDES_KEY, userId)

export const saveWeatherSystemOverrides = (userId, rows) =>
  saveOverrides(INSPECTION_WEATHER_SYSTEM_OVERRIDES_KEY, userId, rows)

export const loadLocationSystemOverrides = (userId) =>
  loadOverrides(INSPECTION_LOCATION_SYSTEM_OVERRIDES_KEY, userId)

export const saveLocationSystemOverrides = (userId, rows) =>
  saveOverrides(INSPECTION_LOCATION_SYSTEM_OVERRIDES_KEY, userId, rows)
