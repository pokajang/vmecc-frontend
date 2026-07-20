import { apiRequest } from 'src/services/apiClient'
import { downloadReportFile } from 'src/services/api/reportPdfApi'
import { normalizeInspectionLocationKey } from '../../form/inspectionLocationDefaults'
import { calculateFireExtinguisherDaysLeft } from '../fireExtinguisherDateUtils'
import { getFireExtinguisherCanonicalAssetKey } from '../../types/fire-extinguisher/identity'

const CACHE_KEY_PREFIX = 'inspection_fire_extinguisher_catalog_cache_v3_'
const LOCATION_CACHE_KEY_PREFIX = 'inspection_fire_extinguisher_catalog_cache_v2_'
const LEGACY_CACHE_KEY_PREFIX = 'inspection_fire_extinguisher_catalog_cache_v1_'

export const FIRE_EXTINGUISHER_DUPLICATE_LOCATOR_CODE = 'FIRE_EXTINGUISHER_DUPLICATE_LOCATOR'

const normalizeFeType = (value) =>
  String(value || '')
    .trim()
    .replace(/CO[\u00b2\ufffd]/gi, 'CO2')

const firstText = (...values) => {
  const match = values.find((value) => String(value ?? '').trim() !== '')
  return match === undefined ? '' : String(match).trim()
}

const objectValue = (value) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}

export const normalizeFireExtinguisherLastInspection = (row = {}) => {
  const source = objectValue(
    row?.lastInspection || row?.last_inspection || row?.latestInspection || row?.latest_inspection,
  )
  const inspectedAt = firstText(
    source.inspectedAt,
    source.inspected_at,
    row?.lastInspectedAt,
    row?.last_inspected_at,
    row?.lastInspectionAt,
    row?.last_inspection_at,
  )
  const submittedAt = firstText(
    source.submittedAt,
    source.submitted_at,
    row?.lastSubmittedAt,
    row?.last_submitted_at,
    inspectedAt,
  )
  const inspectedBy = firstText(
    source.inspectedBy,
    source.inspected_by,
    row?.lastInspectedBy,
    row?.last_inspected_by,
  )
  const submittedBy = firstText(
    source.submittedBy,
    source.submitted_by,
    row?.lastSubmittedBy,
    row?.last_submitted_by,
    inspectedBy,
  )
  const reportId = firstText(
    source.reportId,
    source.report_id,
    source.recordId,
    source.record_id,
    row?.lastInspectionReportId,
    row?.last_inspection_report_id,
  )
  const displayId = firstText(
    source.displayId,
    source.display_id,
    row?.lastInspectionDisplayId,
    row?.last_inspection_display_id,
  )

  if (!inspectedAt && !submittedAt && !inspectedBy && !submittedBy && !reportId && !displayId) {
    return null
  }

  return {
    inspectedAt: inspectedAt || submittedAt,
    submittedAt: submittedAt || inspectedAt,
    inspectedBy: inspectedBy || submittedBy,
    submittedBy: submittedBy || inspectedBy,
    reportId,
    displayId,
  }
}

const normalizeRows = (rows = [], options = {}) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const rowWithoutDerivedValidity = { ...(row || {}) }
      delete rowWithoutDerivedValidity.certificationValidityRaw
      delete rowWithoutDerivedValidity.certification_validity_raw
      delete rowWithoutDerivedValidity.daysLeftToExpire
      delete rowWithoutDerivedValidity.days_left_to_expire
      const catalogId = row?.catalogId ?? row?.catalog_id ?? row?.id ?? ''
      const activeIdentityKey = String(
        row?.activeIdentityKey || row?.active_identity_key || '',
      ).trim()
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
      const certificationValidity = String(
        row?.certificationValidity || row?.certification_validity || '',
      )

      return {
        ...rowWithoutDerivedValidity,
        id: String(row?.id || stableId),
        catalogId,
        canonicalAssetKey: getFireExtinguisherCanonicalAssetKey({
          ...row,
          catalogId,
          activeIdentityKey,
          zone: row?.zone || '',
          mainLocation,
          subLocation,
          idLocNo,
          barcodeNo,
        }),
        activeIdentityKey,
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
        certificationValidity,
        daysLeftToExpire: calculateFireExtinguisherDaysLeft(certificationValidity),
        lastInspection: normalizeFireExtinguisherLastInspection(row),
        canEdit: migrateLegacySharedSeedFlags ? true : row?.canEdit !== false,
        canDelete: migrateLegacySharedSeedFlags ? true : row?.canDelete !== false,
      }
    })
    .filter(Boolean)

const cacheKey = (zone = '', mainLocation = '', subLocation = '', prefix = CACHE_KEY_PREFIX) =>
  `${prefix}${normalizeInspectionLocationKey(zone) || 'all'}_${
    normalizeInspectionLocationKey(mainLocation) || 'all'
  }_${normalizeInspectionLocationKey(subLocation) || 'all'}`

const legacyLocationCacheKey = (
  mainLocation = '',
  subLocation = '',
  prefix = LOCATION_CACHE_KEY_PREFIX,
) =>
  `${prefix}${normalizeInspectionLocationKey(mainLocation) || 'all'}_${
    normalizeInspectionLocationKey(subLocation) || 'all'
  }`

export function loadCachedFireExtinguisherCatalog(zone = '', mainLocation = '', subLocation = '') {
  if (arguments.length <= 2) {
    subLocation = mainLocation
    mainLocation = zone
    zone = ''
  }
  try {
    const raw = window.localStorage?.getItem(cacheKey(zone, mainLocation, subLocation))
    if (raw) {
      const parsed = JSON.parse(raw)
      return normalizeRows(parsed?.data || parsed)
    }
    const locationRaw = window.localStorage?.getItem(
      legacyLocationCacheKey(mainLocation, subLocation),
    )
    if (locationRaw) {
      const parsed = JSON.parse(locationRaw)
      return normalizeRows(parsed?.data || parsed)
    }
    const legacyRaw = window.localStorage?.getItem(
      legacyLocationCacheKey(mainLocation, subLocation, LEGACY_CACHE_KEY_PREFIX),
    )
    if (!legacyRaw) return []
    const parsed = JSON.parse(legacyRaw)
    return normalizeRows(parsed?.data || parsed, { legacySharedSeedPolicy: true })
  } catch {
    return []
  }
}

export function saveCachedFireExtinguisherCatalog(
  zone = '',
  mainLocation = '',
  subLocation = '',
  rows = [],
) {
  if (arguments.length <= 3) {
    rows = subLocation
    subLocation = mainLocation
    mainLocation = zone
    zone = ''
  }
  try {
    window.localStorage?.setItem(
      cacheKey(zone, mainLocation, subLocation),
      JSON.stringify({ data: normalizeRows(rows), cachedAt: new Date().toISOString() }),
    )
  } catch {
    // Cache failure should not block field inspection.
  }
}

export const fetchFireExtinguisherOptions = async ({
  zone = '',
  mainLocation = '',
  subLocation = '',
  search = '',
}) => {
  const params = new URLSearchParams()
  if (zone) params.set('zone', zone)
  if (mainLocation) params.set('mainLocation', mainLocation)
  if (subLocation) params.set('subLocation', subLocation)
  if (search) params.set('search', search)
  const response = await apiRequest(
    `/inspection/fire-extinguishers${params.toString() ? `?${params.toString()}` : ''}`,
  )
  return { data: normalizeRows(response?.data), meta: response?.meta || {} }
}

export const lookupFireExtinguisherByLocator = async (locator = '') => {
  const params = new URLSearchParams()
  const normalizedLocator = String(locator || '').trim()
  if (normalizedLocator) params.set('locator', normalizedLocator)
  const response = await apiRequest(
    `/inspection/fire-extinguishers/lookup${params.toString() ? `?${params.toString()}` : ''}`,
  )
  return { data: normalizeRows([response?.data])[0] || null, meta: response?.meta || {} }
}

export const createFireExtinguisherOption = async (
  payload,
  { confirmDuplicate = Boolean(payload?.confirmDuplicate) } = {},
) => {
  const response = await apiRequest('/inspection/fire-extinguishers', {
    method: 'POST',
    body: JSON.stringify({ ...payload, confirmDuplicate }),
  })
  return normalizeRows([response?.data])[0] || null
}

export const createFireExtinguisherBatch = async (payload) => {
  const response = await apiRequest('/inspection/fire-extinguishers/batch', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const rows = normalizeRows(response?.data)
  return { data: rows, meta: { ...(response?.meta || {}), count: rows.length } }
}

export const getFireExtinguisherDuplicateConflict = (error) => {
  if (
    Number(error?.status) !== 409 ||
    error?.payload?.code !== FIRE_EXTINGUISHER_DUPLICATE_LOCATOR_CODE
  ) {
    return null
  }

  const matches = normalizeRows(error?.payload?.data?.matches || [])
  return {
    message:
      String(error?.payload?.message || '').trim() ||
      'One or more active fire extinguishers use this locator.',
    matches,
    count: Number(error?.payload?.meta?.count ?? matches.length) || matches.length,
  }
}

export const getFireExtinguisherBatchDuplicateConflict = (error) => {
  if (
    Number(error?.status) !== 409 ||
    error?.payload?.code !== FIRE_EXTINGUISHER_DUPLICATE_LOCATOR_CODE
  ) {
    return null
  }

  const conflicts = (
    Array.isArray(error?.payload?.data?.conflicts) ? error.payload.data.conflicts : []
  ).map((conflict) => ({
    index: Number(conflict?.index),
    matches: normalizeRows(conflict?.matches || []),
    batchMatches: normalizeRows(
      (conflict?.batchMatches || []).map((row) => ({
        ...row,
        batchIndex: Number(row?.index),
      })),
    ),
  }))

  return {
    message:
      String(error?.payload?.message || '').trim() ||
      'One or more batch lines use a locator that is already in use.',
    conflicts,
    count: Number(error?.payload?.meta?.count ?? conflicts.length) || conflicts.length,
  }
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

const fireExtinguisherLifecycleAction = async (id, action, payload = {}) => {
  const response = await apiRequest(
    `/inspection/fire-extinguishers/${encodeURIComponent(String(id))}/${action}`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
  return normalizeRows([response?.data])[0] || null
}

export const markFireExtinguisherOutOfService = (id, payload) =>
  fireExtinguisherLifecycleAction(id, 'out-of-service', payload)

export const returnFireExtinguisherToService = (id, payload = {}) =>
  fireExtinguisherLifecycleAction(id, 'return-to-service', payload)

export const retireFireExtinguisher = (id, payload) =>
  fireExtinguisherLifecycleAction(id, 'retire', payload)

export const restoreFireExtinguisher = (id, payload = {}) =>
  fireExtinguisherLifecycleAction(id, 'restore', payload)

export const fetchFireExtinguisherInspectionHistory = async (id, params = {}, options = {}) => {
  const { page = 1, perPage = 25, ...filters } = params || {}
  const query = new URLSearchParams({ page: String(page), perPage: String(perPage) })
  Object.entries(filters).forEach(([key, value]) => {
    const normalized = String(value ?? '').trim()
    if (normalized) query.set(key, normalized)
  })
  const response = await apiRequest(
    `/inspection/fire-extinguishers/${encodeURIComponent(String(id))}/inspection-history?${query}`,
    { signal: options.signal },
  )
  return { data: Array.isArray(response?.data) ? response.data : [], meta: response?.meta || {} }
}

export const fetchFireExtinguisherInspectionHistoryDetail = async (id, reportId) => {
  const response = await apiRequest(
    `/inspection/fire-extinguishers/${encodeURIComponent(String(id))}/inspection-history/${encodeURIComponent(String(reportId))}`,
  )
  return response?.data || null
}

const normalizeCoverageRow = (row = {}) => {
  const reportCount =
    Number(row.reportCount ?? row.report_count ?? row.duplicateCount ?? row.duplicate_count ?? 0) ||
    0
  return {
    ...row,
    id: String(row.id || `fe-coverage-${row.catalogId || row.catalog_id || ''}`),
    catalogId: row.catalogId ?? row.catalog_id ?? '',
    canonicalAssetKey: String(row.canonicalAssetKey || row.canonical_asset_key || ''),
    zone: String(row.zone || ''),
    location: String(row.location || row.mainLocation || row.main_location || ''),
    mainLocation: String(row.mainLocation || row.main_location || row.location || ''),
    subLocation: String(row.subLocation || row.sub_location || ''),
    idLocNo: String(row.idLocNo || row.id_loc_no || ''),
    feType: normalizeFeType(row.feType || row.fe_type || ''),
    barcodeNo: String(row.barcodeNo || row.barcode_no || ''),
    certificationValidity: String(row.certificationValidity || row.certification_validity || ''),
    daysLeft:
      row.daysLeft ?? row.days_left ?? row.daysLeftToExpire ?? row.days_left_to_expire ?? '',
    physical: String(row.physical || ''),
    signage: String(row.signage || ''),
    boxKey: String(row.boxKey || row.box_key || ''),
    boxGlass: String(row.boxGlass || row.box_glass || ''),
    operational: String(row.operational || ''),
    inspectedBy: String(row.inspectedBy || row.inspected_by || ''),
    inspectionDate: String(
      row.inspectionDate || row.inspection_date || row.latestInspectionAt || '',
    ),
    latestInspectionAt: String(
      row.latestInspectionAt || row.latest_inspection_at || row.inspectionDate || '',
    ),
    remarks: String(row.remarks || ''),
    issueCount: Number(row.issueCount ?? row.issue_count ?? 0) || 0,
    evidenceCount: Number(row.evidenceCount ?? row.evidence_count ?? 0) || 0,
    reportCount,
    locatorDuplicateCount:
      Number(row.locatorDuplicateCount ?? row.locator_duplicate_count ?? 0) || 0,
    repeatCount: Number(row.repeatCount ?? row.repeat_count ?? Math.max(0, reportCount - 1)) || 0,
    duplicateCount: reportCount,
    latestReportId: String(row.latestReportId || row.latest_report_id || ''),
  }
}

const normalizeCoverageCheck = (check = {}) => ({
  ...check,
  key: String(check.key || ''),
  checkKey: String(check.checkKey || check.check_key || ''),
  label: String(check.label || ''),
  value: String(check.value || ''),
  hasDefect: Boolean(check.hasDefect ?? check.has_defect),
  remarks: String(check.remarks || ''),
  evidenceCount: Number(check.evidenceCount ?? check.evidence_count ?? 0) || 0,
  photos: Array.isArray(check.photos) ? check.photos : [],
  reportId: check.reportId ?? check.report_id ?? null,
  displayId: String(check.displayId || check.display_id || ''),
  submittedAt: String(check.submittedAt || check.submitted_at || ''),
  submittedBy: String(check.submittedBy || check.submitted_by || ''),
})

export const normalizeFireExtinguisherCoverageRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map(normalizeCoverageRow)

export const fetchFireExtinguisherCoverage = async (params = {}, options = {}) => {
  const query = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    const normalized = String(value ?? '').trim()
    if (normalized) query.set(key, normalized)
  })
  const response = await apiRequest(
    `/inspection/fire-extinguishers/coverage${query.toString() ? `?${query.toString()}` : ''}`,
    { signal: options.signal },
  )
  return {
    data: normalizeFireExtinguisherCoverageRows(response?.data),
    meta: response?.meta || {},
  }
}

export const fetchFireExtinguisherCoverageDetail = async (catalogId, params = {}, options = {}) => {
  const query = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    const normalized = String(value ?? '').trim()
    if (normalized) query.set(key, normalized)
  })
  const response = await apiRequest(
    `/inspection/fire-extinguishers/coverage/${encodeURIComponent(String(catalogId))}${
      query.toString() ? `?${query.toString()}` : ''
    }`,
    { signal: options.signal },
  )
  const row = normalizeCoverageRow(response?.data || {})
  return {
    data: {
      ...row,
      checks: (Array.isArray(response?.data?.checks) ? response.data.checks : []).map(
        normalizeCoverageCheck,
      ),
      duplicateReports: Array.isArray(response?.data?.duplicateReports)
        ? response.data.duplicateReports
        : [],
    },
    meta: response?.meta || {},
  }
}

export const previewFireExtinguisherExceptionExport = async (payload) => {
  const response = await apiRequest('/inspection/fire-extinguishers/exception-export/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const data = response?.data || {}

  return {
    total: Number(data.total) || 0,
    issues: Number(data.issues) || 0,
    expired: Number(data.expired) || 0,
    overlap: Number(data.overlap) || 0,
    appliedFilters: Array.isArray(data.appliedFilters) ? data.appliedFilters : [],
    scope: String(data.scope || payload?.scope || 'current_filters'),
  }
}

export const downloadFireExtinguisherExceptionExport = async (payload) => {
  const format = payload?.format === 'docx' ? 'docx' : 'pdf'
  const isDocx = format === 'docx'

  return downloadReportFile({
    endpoint: '/inspection/fire-extinguishers/exception-export/download',
    payload: { ...payload, format },
    accept: isDocx
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf',
    acceptedContentTypes: isDocx
      ? ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      : ['application/pdf'],
  })
}

export const normalizeFireExtinguisherCatalogRows = normalizeRows
