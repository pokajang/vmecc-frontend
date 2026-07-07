import { apiRequest } from 'src/services/apiClient'
import {
  normalizeInspectionTypeSlug,
  normalizeReportRecords,
  parse,
  readStorageValue,
  storageKey,
  writeStorageValue,
} from '../utils/inspectionSharedUtils'
import {
  clearOfflineDraft,
  loadOfflineDraftSync,
  saveOfflineDraft,
} from '../offline/inspectionOfflineStore'

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

export const loadAllInspectionRecords = () => {
  try {
    const storage = globalThis.localStorage
    if (!storage) return []
    const rows = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!String(key || '').startsWith(REPORT_RECORDS_KEY_PREFIX)) continue
      rows.push(...parse(readStorageValue(key), []))
    }
    return filterInspectionRows(rows)
  } catch {
    return []
  }
}

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

const stripOfflineDraftMeta = (draft = {}) => {
  const payload = draft && typeof draft === 'object' ? { ...draft } : {}
  delete payload.__offlineSyncStatus
  delete payload.__offlineSavedAt
  delete payload.__offlineSyncError
  return payload
}

export const loadInspectionDraft = async (userId) => {
  if (!userId) return null
  const localDraft = loadOfflineDraftSync(userId)
  const localSyncStatus = String(localDraft?.__offlineSyncStatus || '').trim()
  if (localDraft && ['waiting', 'failed'].includes(localSyncStatus)) {
    try {
      const payload = stripOfflineDraftMeta(localDraft)
      const response = await apiRequest('/reports/draft', {
        method: 'POST',
        body: JSON.stringify({
          report_type: INSPECTION_TYPE,
          payload,
        }),
      })
      if (response?.data) {
        const syncedDraft = {
          ...payload,
          __offlineSyncStatus: 'synced',
          __offlineSavedAt: new Date().toISOString(),
        }
        await saveOfflineDraft(userId, syncedDraft)
        return syncedDraft
      }
    } catch {
      return localDraft
    }
  }
  try {
    const response = await apiRequest(
      `/reports/draft?report_type=${encodeURIComponent(INSPECTION_TYPE)}`,
    )
    const draft = normalizeDraft(response?.data)
    if (draft) await saveOfflineDraft(userId, { ...draft, __offlineSyncStatus: 'synced' })
    return draft || loadOfflineDraftSync(userId)
  } catch {
    return loadOfflineDraftSync(userId)
  }
}

export const saveInspectionDraft = async (userId, draft) => {
  if (!userId) return false
  const payload = draft && typeof draft === 'object' ? draft : {}
  await saveOfflineDraft(userId, {
    ...payload,
    __offlineSyncStatus:
      typeof navigator !== 'undefined' && navigator.onLine === false ? 'waiting' : 'syncing',
    __offlineSavedAt: new Date().toISOString(),
  })
  try {
    const response = await apiRequest('/reports/draft', {
      method: 'POST',
      body: JSON.stringify({
        report_type: INSPECTION_TYPE,
        payload,
      }),
    })
    if (response?.data) {
      await saveOfflineDraft(userId, {
        ...payload,
        __offlineSyncStatus: 'synced',
        __offlineSavedAt: new Date().toISOString(),
      })
    }
    return { saved: Boolean(response?.data), synced: Boolean(response?.data) }
  } catch (error) {
    await saveOfflineDraft(userId, {
      ...payload,
      __offlineSyncStatus: 'failed',
      __offlineSavedAt: new Date().toISOString(),
      __offlineSyncError: error?.message || 'Draft sync failed.',
    })
    return { saved: true, synced: false, error }
  }
}

export const clearInspectionDraft = async (userId) => {
  if (!userId) return false
  await clearOfflineDraft(userId)
  try {
    await apiRequest(`/reports/draft?report_type=${encodeURIComponent(INSPECTION_TYPE)}`, {
      method: 'DELETE',
    })
  } catch {
    // Local draft is cleared even if the server is unavailable.
  }
  return true
}

export const normalizeInspectionDraftType = (value) => normalizeInspectionTypeSlug(value)
