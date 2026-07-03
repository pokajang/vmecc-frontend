import { apiRequest } from 'src/services/apiClient'
import { normalizeInspectionLocationKey } from './inspectionLocationDefaults'

const CACHE_KEY_PREFIX = 'inspection_location_catalog_cache_v1_'
const MIGRATION_KEY_PREFIX = 'inspection_location_catalog_migrated_v1_user_'

export const getInspectionTypeKey = (inspectionType) =>
  String(inspectionType || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const normalizeRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const id = row?.id ?? ''
      const value = String(row?.value || row?.title || row?.name || '').trim()
      if (!value) return null
      return {
        ...row,
        id,
        parentId: row?.parentId ?? row?.parent_id ?? null,
        value,
        title: String(row?.title || row?.name || value).trim(),
        description: String(row?.description || ''),
        iconKey: String(row?.iconKey || row?.icon_key || ''),
        source: String(row?.source || ''),
        custom: row?.custom === true || String(row?.source || '') === 'custom',
        subLocations: normalizeRows(row?.subLocations || row?.sub_locations || []),
      }
    })
    .filter(Boolean)

const getCacheKey = (inspectionType) =>
  `${CACHE_KEY_PREFIX}${getInspectionTypeKey(inspectionType) || 'general-inspection'}`

export const loadCachedInspectionLocationCatalog = (inspectionType) => {
  try {
    const raw = window.localStorage?.getItem(getCacheKey(inspectionType))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return normalizeRows(parsed?.data || parsed)
  } catch {
    return []
  }
}

export const saveCachedInspectionLocationCatalog = (inspectionType, rows) => {
  try {
    window.localStorage?.setItem(
      getCacheKey(inspectionType),
      JSON.stringify({ data: normalizeRows(rows), cachedAt: new Date().toISOString() }),
    )
  } catch {
    // Cache failures should not block inspection form usage.
  }
}

export const isInspectionLocationMigrationComplete = (userId) => {
  try {
    return window.localStorage?.getItem(`${MIGRATION_KEY_PREFIX}${userId || 'anonymous'}`) === '1'
  } catch {
    return false
  }
}

export const markInspectionLocationMigrationComplete = (userId) => {
  try {
    window.localStorage?.setItem(`${MIGRATION_KEY_PREFIX}${userId || 'anonymous'}`, '1')
  } catch {
    // Ignore local migration marker failures.
  }
}

export const fetchInspectionLocationOptions = async (inspectionType) => {
  const params = new URLSearchParams()
  const label = String(inspectionType || '').trim()
  if (label) {
    params.set('inspectionType', label)
    params.set('inspectionTypeKey', getInspectionTypeKey(label))
  }
  const response = await apiRequest(
    `/inspection/location-options${params.toString() ? `?${params.toString()}` : ''}`,
  )
  return {
    data: normalizeRows(response?.data),
    meta: response?.meta || {},
  }
}

export const createInspectionLocationOption = async ({
  inspectionType,
  parentId = null,
  name,
  description = '',
  iconKey = '',
}) => {
  const response = await apiRequest('/inspection/locations', {
    method: 'POST',
    body: JSON.stringify({
      inspectionType,
      inspectionTypeKey: getInspectionTypeKey(inspectionType),
      parentId,
      name,
      description,
      iconKey,
    }),
  })
  return normalizeRows([response?.data])[0] || null
}

export const updateInspectionLocationOption = async (
  id,
  { inspectionType = '', inspectionTypeKey = '', name, description = '', iconKey = '' },
) => {
  const response = await apiRequest(`/inspection/locations/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: JSON.stringify({
      inspectionType,
      inspectionTypeKey: inspectionTypeKey || getInspectionTypeKey(inspectionType),
      name,
      description,
      iconKey,
    }),
  })
  return normalizeRows([response?.data])[0] || null
}

export const deleteInspectionLocationOption = async (
  id,
  { inspectionType = '', inspectionTypeKey = '' } = {},
) => {
  const params = new URLSearchParams()
  if (inspectionType) {
    params.set('inspectionType', inspectionType)
    params.set('inspectionTypeKey', inspectionTypeKey || getInspectionTypeKey(inspectionType))
  }

  await apiRequest(
    `/inspection/locations/${encodeURIComponent(String(id))}${params.toString() ? `?${params.toString()}` : ''}`,
    {
      method: 'DELETE',
    },
  )
  return true
}

export const findLocationOptionByName = (rows = [], value = '') => {
  const key = normalizeInspectionLocationKey(value)
  return (
    normalizeRows(rows).find((row) => normalizeInspectionLocationKey(row.value) === key) || null
  )
}
