import { apiRequest } from 'src/services/apiClient'
import { normalizeInspectionLocationKey } from '../../form/inspectionLocationDefaults'

const CACHE_KEY_PREFIX = 'inspection_location_catalog_cache_v3_'
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
      const children = normalizeRows(row?.children || row?.subLocations || row?.sub_locations || [])
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
        children,
        subLocations: children,
      }
    })
    .filter(Boolean)

const getCacheKey = (inspectionType) =>
  `${CACHE_KEY_PREFIX}${getInspectionTypeKey(inspectionType) || 'general-inspection'}`

const ZONE_LOCATION_INSPECTION_TYPE_KEYS = new Set([
  'fire-extinguisher-inspection',
  'general-inspection',
  'health-safety-environment-inspection',
])

const isZoneLocationInspectionType = (inspectionType) =>
  ZONE_LOCATION_INSPECTION_TYPE_KEYS.has(getInspectionTypeKey(inspectionType))

export const hasFireExtinguisherZoneHierarchy = (rows = []) =>
  (Array.isArray(rows) ? rows : []).some((zone) =>
    (Array.isArray(zone?.subLocations) ? zone.subLocations : zone?.children || []).some(
      (area) =>
        (Array.isArray(area?.subLocations) ? area.subLocations : area?.children || []).length > 0,
    ),
  )

export const loadCachedInspectionLocationCatalog = (inspectionType) => {
  try {
    const key = getCacheKey(inspectionType)
    const raw = window.localStorage?.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const rows = normalizeRows(parsed?.data || parsed)
    if (isZoneLocationInspectionType(inspectionType) && !hasFireExtinguisherZoneHierarchy(rows)) {
      window.localStorage?.removeItem(key)
      return []
    }
    return rows
  } catch {
    return []
  }
}

export const saveCachedInspectionLocationCatalog = (inspectionType, rows) => {
  try {
    const normalizedRows = normalizeRows(rows)
    if (
      isZoneLocationInspectionType(inspectionType) &&
      !hasFireExtinguisherZoneHierarchy(normalizedRows)
    ) {
      window.localStorage?.removeItem(getCacheKey(inspectionType))
      return
    }
    window.localStorage?.setItem(
      getCacheKey(inspectionType),
      JSON.stringify({ data: normalizedRows, cachedAt: new Date().toISOString() }),
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

export const fetchInspectionLocationOptions = async (inspectionType, options = {}) => {
  const params = new URLSearchParams()
  const label = String(inspectionType || '').trim()
  if (label) {
    params.set('inspectionType', label)
    params.set('inspectionTypeKey', getInspectionTypeKey(label))
  }
  const response = await apiRequest(
    `/inspection/location-options${params.toString() ? `?${params.toString()}` : ''}`,
    options,
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
