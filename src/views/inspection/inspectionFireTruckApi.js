import { apiRequest } from 'src/services/apiClient'

const CACHE_KEY = 'inspection_fire_truck_catalog_cache_v1'

const normalizePlate = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()

const normalizeRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const truckId = row?.truckId ?? row?.truck_id ?? row?.id ?? ''
      const plateNo = normalizePlate(row?.plateNo || row?.plate_no || row?.value || row?.title)
      if (!plateNo) return null
      const name = String(row?.name || row?.description || '').trim()
      const source = String(row?.source || 'seed').trim()
      return {
        ...row,
        id: String(truckId || plateNo),
        truckId,
        plateNo,
        value: plateNo,
        title: plateNo,
        name,
        description: name,
        roadTaxExpiry: String(row?.roadTaxExpiry || row?.road_tax_expiry || ''),
        insuranceExpiry: String(row?.insuranceExpiry || row?.insurance_expiry || ''),
        puspakomExpiry: String(row?.puspakomExpiry || row?.puspakom_expiry || ''),
        source,
        canEdit: row?.canEdit === true || (row?.canEdit !== false && source !== 'seed'),
        canDelete: row?.canDelete === true || (row?.canDelete !== false && source !== 'seed'),
      }
    })
    .filter(Boolean)

export const loadCachedFireTruckCatalog = () => {
  try {
    const raw = window.localStorage?.getItem(CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return normalizeRows(parsed?.data || parsed)
  } catch {
    return []
  }
}

export const saveCachedFireTruckCatalog = (rows = []) => {
  try {
    window.localStorage?.setItem(
      CACHE_KEY,
      JSON.stringify({ data: normalizeRows(rows), cachedAt: new Date().toISOString() }),
    )
  } catch {
    // Cache failure should not block truck readiness inspections.
  }
}

export const fetchFireTruckOptions = async () => {
  const response = await apiRequest('/inspection/fire-trucks')
  return { data: normalizeRows(response?.data), meta: response?.meta || {} }
}

export const createFireTruckOption = async (payload) => {
  const response = await apiRequest('/inspection/fire-trucks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return normalizeRows([response?.data])[0] || null
}

export const updateFireTruckOption = async (id, payload) => {
  const response = await apiRequest(`/inspection/fire-trucks/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return normalizeRows([response?.data])[0] || null
}

export const deleteFireTruckOption = async (id) => {
  await apiRequest(`/inspection/fire-trucks/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
  })
  return true
}

export const normalizeFireTruckCatalogRows = normalizeRows
