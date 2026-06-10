import { apiRequest } from 'src/services/apiClient'
import {
  normalizeInspectionTypeSlug,
  normalizeReportRecords,
  parse,
  readStorageValue,
  storageKey,
  writeStorageValue,
} from './inspectionSharedUtils'

const REPORT_RECORDS_KEY_PREFIX = 'report_records_v1_user_'
const INSPECTION_TYPE = 'inspection'

const filterInspectionRows = (rows) =>
  normalizeReportRecords(rows).filter(
    (row) => String(row?.reportType || '').toLowerCase() === INSPECTION_TYPE,
  )

export const loadAllRecordsForInspection = (userId) => {
  if (!userId) return []
  const rows = parse(readStorageValue(storageKey(REPORT_RECORDS_KEY_PREFIX, userId)), [])
  return normalizeReportRecords(rows)
}

export const saveAllRecordsForInspection = (userId, rows) => {
  if (!userId) return false
  return writeStorageValue(
    storageKey(REPORT_RECORDS_KEY_PREFIX, userId),
    JSON.stringify(normalizeReportRecords(rows)),
  )
}

export const loadInspectionRecords = (userId) =>
  filterInspectionRows(loadAllRecordsForInspection(userId))

export const saveInspectionRecords = (userId, rows) => {
  if (!userId) return false
  const existingRows = loadAllRecordsForInspection(userId)
  const nonInspectionRows = existingRows.filter(
    (row) => String(row?.reportType || '').toLowerCase() !== INSPECTION_TYPE,
  )
  return saveAllRecordsForInspection(userId, [...nonInspectionRows, ...filterInspectionRows(rows)])
}

const normalizeDraft = (row) => {
  if (!row || typeof row !== 'object') return null
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  return payload
}

export const loadInspectionDraft = async (userId) => {
  if (!userId) return null
  const response = await apiRequest(
    `/reports/draft?report_type=${encodeURIComponent(INSPECTION_TYPE)}`,
  )
  return normalizeDraft(response?.data)
}

export const saveInspectionDraft = async (userId, draft) => {
  if (!userId) return false
  const response = await apiRequest('/reports/draft', {
    method: 'POST',
    body: JSON.stringify({
      report_type: INSPECTION_TYPE,
      payload: draft && typeof draft === 'object' ? draft : {},
    }),
  })
  return Boolean(response?.data)
}

export const clearInspectionDraft = async (userId) => {
  if (!userId) return false
  await apiRequest(`/reports/draft?report_type=${encodeURIComponent(INSPECTION_TYPE)}`, {
    method: 'DELETE',
  })
  return true
}

export const normalizeInspectionDraftType = (value) => normalizeInspectionTypeSlug(value)
