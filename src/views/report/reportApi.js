import { apiRequest, buildApiUrl } from 'src/services/apiClient'
import { REPORT_TYPE_CONFIG } from './constants'
import { loadReportRecords, saveReportRecords } from './reportStorage'
import { normalizeReportRecords } from './utils'

const REPORT_API_ENABLED_TYPES_RAW = String(import.meta.env.VITE_REPORT_API_TYPES || '*')
  .split(',')
  .map((value) =>
    String(value || '')
      .trim()
      .toLowerCase(),
  )
  .filter(Boolean)
const ALL_REPORT_TYPES = Object.keys(REPORT_TYPE_CONFIG).map((value) => value.toLowerCase())
const REPORT_API_ENABLED_TYPES =
  REPORT_API_ENABLED_TYPES_RAW.includes('*') || REPORT_API_ENABLED_TYPES_RAW.length === 0
    ? ALL_REPORT_TYPES
    : REPORT_API_ENABLED_TYPES_RAW

const toApiStatus = (status) => {
  const value = String(status || '')
    .trim()
    .toLowerCase()
  if (value === 'draft') return 'Draft'
  if (value === 'reviewed') return 'Reviewed'
  if (value === 'approved') return 'Approved'
  if (value === 'rejected') return 'Rejected'
  if (value === 'cancelled') return 'Cancelled'
  return 'Submitted'
}

const toPayload = (row) => {
  const safe = row && typeof row === 'object' ? { ...row } : {}
  delete safe.id
  delete safe.version
  delete safe.revision
  delete safe.createdAt
  delete safe.updatedAt
  delete safe.recordKind
  delete safe.reportType
  return safe
}

const normalizeType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export const isReportApiEnabled = (reportTypeSlug) =>
  REPORT_API_ENABLED_TYPES.includes(normalizeType(reportTypeSlug))

export const fetchReportRecords = async () => {
  const response = await apiRequest('/reports')
  const rows = Array.isArray(response?.data) ? response.data : []
  return normalizeReportRecords(rows)
}

export const refreshReportRecord = async (reportUid) => {
  const response = await apiRequest(
    `/reports/${encodeURIComponent(String(reportUid || '').trim())}`,
  )
  return response?.data || null
}

export const persistReportRecords = async (userId, rows) => {
  if (!userId) return false
  const desiredRows = Array.isArray(rows) ? rows : []
  const byType = new Map()
  desiredRows.forEach((row) => {
    const type = normalizeType(row?.reportType)
    if (!type) return
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type).push(row)
  })

  const localRows = loadReportRecords(userId)
  const localRowsByType = new Map()
  localRows.forEach((row) => {
    const type = normalizeType(row?.reportType)
    if (!type) return
    if (!localRowsByType.has(type)) localRowsByType.set(type, [])
    localRowsByType.get(type).push(row)
  })

  let ok = true

  // Union of desired types and currently stored types ensures that deleting
  // the last record of a type still triggers the API DELETE for that type.
  const allTypes = new Set([...byType.keys(), ...localRowsByType.keys()])

  for (const type of allTypes) {
    const rowsForType = byType.get(type) ?? []
    if (!isReportApiEnabled(type)) {
      localRowsByType.set(type, rowsForType)
      continue
    }
    const saved = await persistReportRecordsToApi(type, rowsForType)
    if (!saved) ok = false
  }

  const mergedLocalRows = []
  for (const rowsForType of localRowsByType.values()) {
    mergedLocalRows.push(...rowsForType)
  }
  if (!saveReportRecords(userId, mergedLocalRows)) ok = false

  return ok
}

const persistReportRecordsToApi = async (reportTypeSlug, rows) => {
  const reportType = normalizeType(reportTypeSlug)
  if (!reportType) return false
  const desiredRows = (Array.isArray(rows) ? rows : []).filter(
    (row) => row?.recordKind !== 'draft' && normalizeType(row?.reportType) === reportType,
  )
  const latestRows = await fetchReportRecords()
  const latestRowsForType = latestRows.filter(
    (row) => normalizeType(row?.reportType) === reportType,
  )
  const latestMap = new Map(latestRowsForType.map((row) => [String(row?.id || ''), row]))
  const desiredIds = new Set(desiredRows.map((row) => String(row?.id || '').trim()).filter(Boolean))
  let ok = true

  for (const row of desiredRows) {
    const reportUid = String(row?.id || '').trim()
    if (!reportUid) continue

    const latest = latestMap.get(reportUid)
    const body = {
      display_id: String(row?.displayId || row?.id || '').trim(),
      report_type: String(row?.reportType || '').trim(),
      payload: toPayload(row),
      status: toApiStatus(row?.status),
    }

    try {
      if (!latest) {
        await apiRequest('/reports', {
          method: 'POST',
          body: JSON.stringify({
            ...body,
            report_uid: reportUid,
          }),
        })
      } else {
        await apiRequest(`/reports/${encodeURIComponent(reportUid)}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...body,
            version: Number(latest?.version || row?.version || 1),
          }),
        })
      }
    } catch {
      ok = false
    }
  }

  for (const latest of latestRowsForType) {
    const reportUid = String(latest?.id || '').trim()
    if (!reportUid || desiredIds.has(reportUid)) continue
    try {
      await apiRequest(`/reports/${encodeURIComponent(reportUid)}`, { method: 'DELETE' })
    } catch {
      ok = false
    }
  }

  return ok
}

const migrationKey = (userId, reportTypeSlug) =>
  `report_api_migrated_v1_user_${String(userId || 'unknown')}_${normalizeType(reportTypeSlug)}`

const readMigrationMarker = (key) => {
  try {
    return globalThis.localStorage?.getItem(key) === '1'
  } catch {
    return false
  }
}

const writeMigrationMarker = (key) => {
  try {
    globalThis.localStorage?.setItem(key, '1')
    return true
  } catch {
    return false
  }
}

export const runReportApiBackfillMigration = async ({ userId, reportTypeSlug }) => {
  if (!userId) return { migrated: false, reason: 'missing-user' }
  const type = normalizeType(reportTypeSlug)
  if (!isReportApiEnabled(type)) return { migrated: false, reason: 'type-disabled' }
  const marker = migrationKey(userId, type)
  if (readMigrationMarker(marker)) return { migrated: false, reason: 'already-migrated' }

  const localRows = loadReportRecords(userId).filter(
    (row) => normalizeType(row?.reportType) === type,
  )
  if (localRows.length === 0) {
    writeMigrationMarker(marker)
    return { migrated: false, reason: 'no-local-rows' }
  }

  const ok = await persistReportRecordsToApi(type, localRows)
  if (!ok) return { migrated: false, reason: 'failed' }

  const syncedRows = (await fetchReportRecords()).filter(
    (row) => normalizeType(row?.reportType) === type,
  )
  const syncedIds = new Set(syncedRows.map((row) => String(row?.id || '').trim()).filter(Boolean))
  const localIds = Array.from(
    new Set(localRows.map((row) => String(row?.id || '').trim()).filter(Boolean)),
  )
  const allPresent = localIds.every((id) => syncedIds.has(id))
  if (!allPresent) return { migrated: false, reason: 'verification-failed' }

  writeMigrationMarker(marker)
  return { migrated: true, reason: 'migrated' }
}

export const downloadErcoReportPdf = async (record) => {
  const reportUid = String(record?.id || '').trim()
  const reportVersion = Number(record?.version || 0) || undefined
  const response = await fetch(buildApiUrl('/reports/erco/pdf'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: '*/*',
    },
    body: JSON.stringify(
      reportUid ? { report_uid: reportUid, version: reportVersion, record } : { record },
    ),
  })

  if (!response.ok) {
    let message = 'Download failed'
    try {
      const payload = await response.json()
      message = payload?.message || message
    } catch {
      const text = await response.text()
      if (text) message = text
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('content-disposition') || ''
  const filenameMatch = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(contentDisposition)
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : ''
  return { blob, filename: String(filename || '').trim() }
}

const transitionReport = async ({ reportUid, action, version, remarks }) => {
  const path = `/reports/${encodeURIComponent(String(reportUid || '').trim())}/${action}`
  const response = await apiRequest(path, {
    method: 'POST',
    body: JSON.stringify({
      version: Number(version || 0) || 1,
      remarks: String(remarks || ''),
    }),
  })
  return response?.data || null
}

export const reviewReportRecord = async ({ reportUid, version, remarks = '' }) =>
  transitionReport({ reportUid, action: 'review', version, remarks })

export const approveReportRecord = async ({ reportUid, version, remarks = '' }) =>
  transitionReport({ reportUid, action: 'approve', version, remarks })

export const rejectReportRecord = async ({ reportUid, version, remarks }) =>
  transitionReport({ reportUid, action: 'reject', version, remarks })
