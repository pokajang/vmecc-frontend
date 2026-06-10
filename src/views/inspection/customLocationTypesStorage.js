import { parse, storageKey } from './inspectionSharedUtils'

const INSPECTION_CUSTOM_LOCATION_TYPE_KEY = 'report_inspection_custom_location_types_v1_user_'

const normalizeCustomType = (row) => {
  const title = String(row?.title || row?.value || '').trim()
  if (!title) return null
  const description = String(row?.description || '').trim()
  return {
    value: title,
    title,
    description,
    iconKey: String(row?.iconKey || '').trim(),
  }
}

export const loadCustomLocationTypes = (userId) => {
  if (!userId) return []
  const rows = parse(
    localStorage.getItem(storageKey(INSPECTION_CUSTOM_LOCATION_TYPE_KEY, userId)),
    [],
  )
  if (!Array.isArray(rows)) return []

  const seen = new Set()
  return rows
    .map(normalizeCustomType)
    .filter(Boolean)
    .filter((row) => {
      const key = row.value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const saveCustomLocationTypes = (userId, rows) => {
  if (!userId) return
  const normalizedRows = Array.isArray(rows) ? rows.map(normalizeCustomType).filter(Boolean) : []
  localStorage.setItem(
    storageKey(INSPECTION_CUSTOM_LOCATION_TYPE_KEY, userId),
    JSON.stringify(normalizedRows),
  )
}
