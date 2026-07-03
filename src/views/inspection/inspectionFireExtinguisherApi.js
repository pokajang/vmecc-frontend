import { apiRequest } from 'src/services/apiClient'
import { normalizeInspectionLocationKey } from './inspectionLocationDefaults'

const CACHE_KEY_PREFIX = 'inspection_fire_extinguisher_catalog_cache_v2_'
const LEGACY_CACHE_KEY_PREFIX = 'inspection_fire_extinguisher_catalog_cache_v1_'

const normalizeFeType = (value) =>
  String(value || '')
    .trim()
    .replace(/CO[\u00b2\ufffd]/gi, 'CO2')

const normalizeRows = (rows = [], options = {}) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const catalogId = row?.catalogId ?? row?.catalog_id ?? row?.id ?? ''
      const sourceRowNumber = String(row?.sourceRowNumber ?? row?.source_row_number ?? '').trim()
      const idLocNo = String(row?.idLocNo || row?.id_loc_no || '').trim()
      const barcodeNo = String(row?.barcodeNo || row?.barcode_no || '').trim()
      const mainLocation = String(
        row?.mainLocation || row?.main_location || row?.location || '',
      ).trim()
      const subLocation = String(row?.subLocation || row?.sub_location || '').trim()
      const stableId = `fe:${catalogId || sourceRowNumber || `${idLocNo}:${barcodeNo}`}`
      const source = String(
        row?.equipmentSource || row?.equipment_source || row?.source || 'seed',
      ).trim()
      const migrateLegacySharedSeedFlags = options.legacySharedSeedPolicy && source === 'seed'
      if (!mainLocation && !idLocNo && !barcodeNo) return null
      return {
        ...row,
        id: String(row?.id || stableId),
        catalogId,
        sourceRowNumber,
        equipmentSource: source,
        source,
        zone: String(row?.zone || ''),
        mainLocation,
        location: mainLocation,
        subLocation,
        locationPath: [mainLocation, subLocation].filter(Boolean),
        idLocNo,
        barcodeNo,
        feType: normalizeFeType(row?.feType || row?.fe_type || ''),
        certificationValidity: String(
          row?.certificationValidity || row?.certification_validity || '',
        ),
        certificationValidityRaw: String(
          row?.certificationValidityRaw || row?.certification_validity_raw || '',
        ),
        daysLeftToExpire: String(row?.daysLeftToExpire || row?.days_left_to_expire || ''),
        canEdit: migrateLegacySharedSeedFlags ? true : row?.canEdit !== false,
        canDelete: migrateLegacySharedSeedFlags ? true : row?.canDelete !== false,
      }
    })
    .filter(Boolean)

const cacheKey = (mainLocation = '', subLocation = '', prefix = CACHE_KEY_PREFIX) =>
  `${prefix}${normalizeInspectionLocationKey(mainLocation) || 'all'}_${
    normalizeInspectionLocationKey(subLocation) || 'all'
  }`

export const loadCachedFireExtinguisherCatalog = (mainLocation = '', subLocation = '') => {
  try {
    const raw = window.localStorage?.getItem(cacheKey(mainLocation, subLocation))
    if (raw) {
      const parsed = JSON.parse(raw)
      return normalizeRows(parsed?.data || parsed)
    }
    const legacyRaw = window.localStorage?.getItem(
      cacheKey(mainLocation, subLocation, LEGACY_CACHE_KEY_PREFIX),
    )
    if (!legacyRaw) return []
    const parsed = JSON.parse(legacyRaw)
    return normalizeRows(parsed?.data || parsed, { legacySharedSeedPolicy: true })
  } catch {
    return []
  }
}

export const saveCachedFireExtinguisherCatalog = (
  mainLocation = '',
  subLocation = '',
  rows = [],
) => {
  try {
    window.localStorage?.setItem(
      cacheKey(mainLocation, subLocation),
      JSON.stringify({ data: normalizeRows(rows), cachedAt: new Date().toISOString() }),
    )
  } catch {
    // Cache failure should not block field inspection.
  }
}

export const fetchFireExtinguisherOptions = async ({
  mainLocation = '',
  subLocation = '',
  search = '',
}) => {
  const params = new URLSearchParams()
  if (mainLocation) params.set('mainLocation', mainLocation)
  if (subLocation) params.set('subLocation', subLocation)
  if (search) params.set('search', search)
  const response = await apiRequest(
    `/inspection/fire-extinguishers${params.toString() ? `?${params.toString()}` : ''}`,
  )
  return { data: normalizeRows(response?.data), meta: response?.meta || {} }
}

export const createFireExtinguisherOption = async (payload) => {
  const response = await apiRequest('/inspection/fire-extinguishers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return normalizeRows([response?.data])[0] || null
}

export const updateFireExtinguisherOption = async (id, payload) => {
  const response = await apiRequest(
    `/inspection/fire-extinguishers/${encodeURIComponent(String(id))}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return normalizeRows([response?.data])[0] || null
}

export const deleteFireExtinguisherOption = async (id) => {
  await apiRequest(`/inspection/fire-extinguishers/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  })
  return true
}

export const normalizeFireExtinguisherCatalogRows = normalizeRows
