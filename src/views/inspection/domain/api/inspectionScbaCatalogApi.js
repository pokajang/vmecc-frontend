import { apiRequest } from 'src/services/apiClient'

const CACHE_KEY = 'inspection_scba_catalog_cache_v1'

const text = (value) => String(value || '').trim()

const normalizeField = (field) => {
  const label = text(field?.label || field?.name)
  const key = text(field?.key)
  if (!label || !key) return null
  return {
    key,
    label,
    kind: 'status',
  }
}

const normalizeItem = (row = {}, section = {}) => {
  const catalogItemId = row?.catalogItemId ?? row?.catalog_item_id ?? row?.itemId ?? row?.id ?? ''
  const brand = text(row?.brand)
  const serialNo = text(row?.serialNo || row?.serial_no || row?.serialNumber)
  const displayName = text(row?.displayName || row?.display_name || row?.name)
  const id = text(row?.id || catalogItemId || `${section.key}:${brand}:${serialNo}:${displayName}`)
  if (!id) return null

  return {
    ...row,
    id,
    catalogItemId,
    catalogSectionId:
      row?.catalogSectionId ?? row?.catalog_section_id ?? section.catalogSectionId ?? '',
    sectionKey: text(row?.sectionKey || row?.section_key || section.key),
    location: text(row?.location || row?.mainLocation || row?.main_location),
    mainLocation: text(row?.mainLocation || row?.main_location || row?.location),
    brand,
    serialNo,
    displayName,
    equipmentDescription: text(
      row?.equipmentDescription || row?.equipment_description || row?.details,
    ),
    equipmentSource: 'custom',
    isCustomEquipment: true,
    source: 'custom',
    canEdit: row?.canEdit !== false,
    canDelete: row?.canDelete !== false,
    removed: row?.removed === true,
  }
}

export const normalizeScbaCatalogSections = (sections = []) =>
  (Array.isArray(sections) ? sections : [])
    .map((section) => {
      const catalogSectionId =
        section?.catalogSectionId ??
        section?.catalog_section_id ??
        section?.sectionId ??
        section?.id ??
        ''
      const key = text(section?.key)
      const title = text(section?.title || section?.name)
      const fields = (Array.isArray(section?.fields) ? section.fields : [])
        .map(normalizeField)
        .filter(Boolean)
      if (!key || !title || fields.length === 0) return null
      const normalizedSection = {
        ...section,
        id: text(section?.id || catalogSectionId || key),
        catalogSectionId,
        key,
        title,
        shortLabel: text(section?.shortLabel || section?.short_label || title),
        fields,
        isCustomSection: true,
        source: 'custom',
        canEdit: section?.canEdit !== false,
        canDelete: section?.canDelete !== false,
        removed: section?.removed === true,
      }
      normalizedSection.rows = (Array.isArray(section?.rows) ? section.rows : [])
        .map((row) => normalizeItem(row, normalizedSection))
        .filter(Boolean)
      return normalizedSection
    })
    .filter(Boolean)

export const loadCachedScbaCatalog = () => {
  try {
    const raw = window.localStorage?.getItem(CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return normalizeScbaCatalogSections(parsed?.data || parsed)
  } catch {
    return []
  }
}

export const saveCachedScbaCatalog = (sections = []) => {
  try {
    window.localStorage?.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: normalizeScbaCatalogSections(sections),
        cachedAt: new Date().toISOString(),
      }),
    )
  } catch {
    // Cache failure should not block SCBA inspections.
  }
}

export const fetchScbaCatalog = async ({ mainLocation = '' } = {}) => {
  const params = new URLSearchParams()
  if (mainLocation) params.set('mainLocation', mainLocation)
  const response = await apiRequest(
    `/inspection/scba-catalog${params.toString() ? `?${params.toString()}` : ''}`,
  )
  return {
    data: normalizeScbaCatalogSections(response?.data),
    meta: response?.meta || {},
  }
}

export const createScbaCatalogSection = async ({ title, shortLabel = '', fields = [] }) => {
  const response = await apiRequest('/inspection/scba-catalog/sections', {
    method: 'POST',
    body: JSON.stringify({ title, shortLabel, fields }),
  })
  return normalizeScbaCatalogSections([response?.data])[0] || null
}

export const updateScbaCatalogSection = async (
  sectionId,
  { title, shortLabel = '', fields = [] },
) => {
  const response = await apiRequest(
    `/inspection/scba-catalog/sections/${encodeURIComponent(String(sectionId))}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ title, shortLabel, fields }),
    },
  )
  return normalizeScbaCatalogSections([response?.data])[0] || null
}

export const archiveScbaCatalogSection = async (sectionId) => {
  await apiRequest(`/inspection/scba-catalog/sections/${encodeURIComponent(String(sectionId))}`, {
    method: 'DELETE',
  })
  return true
}

export const createScbaCatalogItem = async (sectionId, payload) => {
  const response = await apiRequest(
    `/inspection/scba-catalog/sections/${encodeURIComponent(String(sectionId))}/items`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  return normalizeItem(response?.data, { catalogSectionId: sectionId }) || null
}

export const updateScbaCatalogItem = async (itemId, payload) => {
  const response = await apiRequest(
    `/inspection/scba-catalog/items/${encodeURIComponent(String(itemId))}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return normalizeItem(response?.data) || null
}

export const archiveScbaCatalogItem = async (itemId) => {
  await apiRequest(`/inspection/scba-catalog/items/${encodeURIComponent(String(itemId))}`, {
    method: 'DELETE',
  })
  return true
}
