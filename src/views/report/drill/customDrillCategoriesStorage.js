import { parse, storageKey } from '../utils'

const DRILL_CUSTOM_CATEGORY_KEY = 'report_drill_custom_categories_v1_user_'

const normalizeCustomCategory = (row) => {
  const title = String(row?.title || row?.value || '').trim()
  if (!title) return null
  return {
    value: title,
    title,
    description: String(row?.description || '').trim(),
    iconKey: String(row?.iconKey || '').trim(),
  }
}

export const loadCustomDrillCategories = (userId) => {
  if (!userId) return []
  const rows = parse(localStorage.getItem(storageKey(DRILL_CUSTOM_CATEGORY_KEY, userId)), [])
  if (!Array.isArray(rows)) return []

  const seen = new Set()
  return rows
    .map(normalizeCustomCategory)
    .filter(Boolean)
    .filter((row) => {
      const key = row.value.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const saveCustomDrillCategories = (userId, rows) => {
  if (!userId) return
  const normalizedRows = Array.isArray(rows)
    ? rows.map(normalizeCustomCategory).filter(Boolean)
    : []
  localStorage.setItem(
    storageKey(DRILL_CUSTOM_CATEGORY_KEY, userId),
    JSON.stringify(normalizedRows),
  )
}
