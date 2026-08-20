import { parse, storageKey } from '../utils'

const DRILL_CUSTOM_ENVIRONMENT_KEY = 'report_drill_custom_environments_v1_user_'

const normalizeCustomEnvironment = (row) => {
  const title = String(row?.title || row?.value || '').trim()
  if (!title) return null
  return {
    value: title,
    title,
    description: String(row?.description || '').trim(),
    iconKey: String(row?.iconKey || '').trim(),
  }
}

export const loadCustomDrillEnvironments = (userId) => {
  if (!userId) return []
  const rows = parse(localStorage.getItem(storageKey(DRILL_CUSTOM_ENVIRONMENT_KEY, userId)), [])
  if (!Array.isArray(rows)) return []

  const seen = new Set()
  return rows
    .map(normalizeCustomEnvironment)
    .filter(Boolean)
    .filter((row) => {
      const key = row.value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const saveCustomDrillEnvironments = (userId, rows) => {
  if (!userId) return
  const normalizedRows = Array.isArray(rows)
    ? rows.map(normalizeCustomEnvironment).filter(Boolean)
    : []
  localStorage.setItem(
    storageKey(DRILL_CUSTOM_ENVIRONMENT_KEY, userId),
    JSON.stringify(normalizedRows),
  )
}
