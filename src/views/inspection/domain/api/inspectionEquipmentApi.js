import { apiRequest } from 'src/services/apiClient'
import { normalizeInspectionLocationKey } from '../../form/inspectionLocationDefaults'
import { getInspectionTypeKey } from './inspectionLocationApi'

const CACHE_KEY_PREFIX = 'inspection_equipment_catalog_cache_v1_'

const normalizeRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const equipment = String(row?.equipment || row?.value || row?.title || row?.name || '').trim()
      const mainLocation = String(
        row?.mainLocation || row?.main_location || row?.location || '',
      ).trim()
      if (!equipment) return null
      const equipmentId =
        row?.equipmentId ??
        row?.equipment_id ??
        row?.equipmentCatalogId ??
        row?.equipment_catalog_id ??
        row?.id ??
        ''
      const source =
        String(row?.equipmentSource || row?.equipment_source || row?.source || '').trim() || 'seed'
      const equipmentKey =
        String(row?.equipmentKey || row?.equipment_key || '').trim() ||
        normalizeInspectionLocationKey(equipment)
      const stableSeedId = `${normalizeInspectionLocationKey(mainLocation)}:${equipmentKey}`
      return {
        ...row,
        id: String(source === 'seed' ? stableSeedId : row?.id || equipmentId || stableSeedId),
        equipmentId,
        equipmentKey,
        equipment,
        value: equipment,
        title: String(row?.title || row?.name || equipment).trim(),
        description: String(row?.description || ''),
        equipmentDescription: String(
          row?.equipmentDescription || row?.equipment_description || row?.description || '',
        ),
        mainLocation,
        location: mainLocation,
        equipmentSource: source,
        source,
        isCustomEquipment:
          row?.isCustomEquipment === true || row?.custom === true || source === 'custom',
        canEdit: row?.canEdit === true || (row?.canEdit !== false && source !== 'seed'),
        canDelete: row?.canDelete === true || (row?.canDelete !== false && source !== 'seed'),
      }
    })
    .filter(Boolean)

const getCacheKey = (inspectionType, mainLocation = '') =>
  `${CACHE_KEY_PREFIX}${getInspectionTypeKey(inspectionType) || 'hydraulic-rescue-tools-inspection'}_${normalizeInspectionLocationKey(mainLocation) || 'all'}`

export const loadCachedInspectionEquipmentCatalog = (inspectionType, mainLocation = '') => {
  try {
    const raw = window.localStorage?.getItem(getCacheKey(inspectionType, mainLocation))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return normalizeRows(parsed?.data || parsed)
  } catch {
    return []
  }
}

export const saveCachedInspectionEquipmentCatalog = (
  inspectionType,
  mainLocation = '',
  rows = [],
) => {
  try {
    window.localStorage?.setItem(
      getCacheKey(inspectionType, mainLocation),
      JSON.stringify({ data: normalizeRows(rows), cachedAt: new Date().toISOString() }),
    )
  } catch {
    // Cache failures should not block inspection usage.
  }
}

export const fetchInspectionEquipmentOptions = async ({ inspectionType, mainLocation = '' }) => {
  const params = new URLSearchParams()
  const label = String(inspectionType || '').trim()
  if (label) {
    params.set('inspectionType', label)
    params.set('inspectionTypeKey', getInspectionTypeKey(label))
  }
  if (mainLocation) params.set('mainLocation', mainLocation)
  const response = await apiRequest(
    `/inspection/equipment-options${params.toString() ? `?${params.toString()}` : ''}`,
  )
  return {
    data: normalizeRows(response?.data),
    meta: response?.meta || {},
  }
}

export const createInspectionEquipmentOption = async ({
  inspectionType,
  mainLocation,
  mainLocationId = '',
  name,
  description = '',
}) => {
  const response = await apiRequest('/inspection/equipment', {
    method: 'POST',
    body: JSON.stringify({
      inspectionType,
      inspectionTypeKey: getInspectionTypeKey(inspectionType),
      mainLocation,
      mainLocationId,
      name,
      description,
    }),
  })
  return normalizeRows([response?.data])[0] || null
}

export const updateInspectionEquipmentOption = async (id, { name, description = '' }) => {
  const response = await apiRequest(`/inspection/equipment/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, description }),
  })
  return normalizeRows([response?.data])[0] || null
}

export const deleteInspectionEquipmentOption = async (id) => {
  await apiRequest(`/inspection/equipment/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  })
  return true
}

export const normalizeInspectionEquipmentRows = normalizeRows
