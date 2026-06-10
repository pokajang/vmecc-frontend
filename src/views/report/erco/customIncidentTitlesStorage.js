import { parse, storageKey } from '../utils'

const ERCO_CUSTOM_INCIDENT_TITLE_KEY = 'report_erco_custom_incident_titles_v1_user_'

const normalizeCustomTitle = (row) => {
  const title = String(row?.title || row?.value || '').trim()
  if (!title) return null
  const description = String(row?.description || '').trim()
  return {
    value: title,
    title,
    description,
  }
}

export const loadCustomIncidentTitles = (userId) => {
  if (!userId) return []
  const rows = parse(localStorage.getItem(storageKey(ERCO_CUSTOM_INCIDENT_TITLE_KEY, userId)), [])
  if (!Array.isArray(rows)) return []

  const seen = new Set()
  return rows
    .map(normalizeCustomTitle)
    .filter(Boolean)
    .filter((row) => {
      const key = row.value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const saveCustomIncidentTitles = (userId, rows) => {
  if (!userId) return
  const normalizedRows = Array.isArray(rows) ? rows.map(normalizeCustomTitle).filter(Boolean) : []
  localStorage.setItem(
    storageKey(ERCO_CUSTOM_INCIDENT_TITLE_KEY, userId),
    JSON.stringify(normalizedRows),
  )
}
