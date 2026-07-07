import { parse, storageKey } from '../utils/inspectionSharedUtils'

const INSPECTION_CUSTOM_LOCATION_TYPE_KEY = 'report_inspection_custom_location_types_v1_user_'
const INSPECTION_CUSTOM_LOCATION_TYPE_V2_KEY = 'report_inspection_custom_location_types_v2_user_'

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

const normalizeCustomLocationRow = (row) => {
  if (!row || typeof row !== 'object') return null
  const rawKind = String(row.kind || 'main').trim()
  const kind = ['zone', 'main', 'sub'].includes(rawKind) ? rawKind : 'main'
  const title = String(row.title || row.value || '').trim()
  if (!title) return null
  const parentValue = String(row.parentValue || '').trim()
  if (kind !== 'zone' && kind !== 'main' && !parentValue) return null
  if (kind === 'sub' && !parentValue) return null
  return {
    kind,
    parentValue,
    value: title,
    title,
    description: String(row.description || '').trim(),
    iconKey: String(row.iconKey || '').trim(),
    hidden: Boolean(row.hidden),
  }
}

export const loadCustomLocationTypes = (userId) => {
  if (!userId) return []
  const v2StorageKey = storageKey(INSPECTION_CUSTOM_LOCATION_TYPE_V2_KEY, userId)
  const v2Raw = localStorage.getItem(v2StorageKey)
  const v2Rows = parse(v2Raw, [])
  const legacyRows = parse(
    localStorage.getItem(storageKey(INSPECTION_CUSTOM_LOCATION_TYPE_KEY, userId)),
    [],
  )
  const rows = v2Raw !== null ? v2Rows : legacyRows
  if (!Array.isArray(rows)) return []

  const seen = new Set()
  return rows
    .map((row) => normalizeCustomLocationRow(row) || normalizeCustomType(row))
    .filter(Boolean)
    .filter((row) => {
      const key = `${row.kind || 'main'}:${String(row.parentValue || '').toLowerCase()}:${row.value.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export const saveCustomLocationTypes = (userId, rows) => {
  if (!userId) return
  const normalizedRows = Array.isArray(rows)
    ? rows.map(normalizeCustomLocationRow).filter(Boolean)
    : []
  localStorage.setItem(
    storageKey(INSPECTION_CUSTOM_LOCATION_TYPE_V2_KEY, userId),
    JSON.stringify(normalizedRows),
  )
}
