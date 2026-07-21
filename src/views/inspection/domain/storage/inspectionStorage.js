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
  return {
    ...payload,
    __serverDraftId: String(row.draft_id || '').trim(),
    __serverDraftVersion: Math.max(0, Number(row.version || 0) || 0),
    __serverDraftSavedAt: String(row.saved_at || '').trim(),
  }
}

const stripOfflineDraftMeta = (draft = {}) => {
  const payload = draft && typeof draft === 'object' ? { ...draft } : {}
  delete payload.__offlineSyncStatus
  delete payload.__offlineSavedAt
  delete payload.__offlineSyncError
  delete payload.__offlineDraftConflict
  delete payload.__serverDraftId
  delete payload.__serverDraftVersion
  delete payload.__serverDraftSavedAt
  return payload
}

const saveDraftToServer = async (draft = {}) => {
  const draftId = String(draft?.__serverDraftId || '').trim()
  const baseVersion = Math.max(0, Number(draft?.__serverDraftVersion || 0) || 0)
  const payload = stripOfflineDraftMeta(draft)
  if (draftId) {
    return apiRequest(`/reports/drafts/${encodeURIComponent(draftId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        payload,
        ...(baseVersion > 0 ? { base_version: baseVersion } : {}),
      }),
    })
  }
  return apiRequest('/reports/drafts', {
    method: 'POST',
    body: JSON.stringify({
      report_type: INSPECTION_TYPE,
      payload,
      create_new: true,
    }),
  })
}

const withSyncedDraftMeta = (draft, row) => ({
  ...stripOfflineDraftMeta(draft),
  ...normalizeDraft(row),
  __offlineSyncStatus: 'synced',
  __offlineSavedAt: new Date().toISOString(),
})

export const loadInspectionDraft = async (userId) => {
  if (!userId) return null
  const localDraft = loadOfflineDraftSync(userId)
  const localSyncStatus = String(localDraft?.__offlineSyncStatus || '').trim()
  if (localDraft && localSyncStatus === 'conflict') return localDraft
  if (localDraft && ['waiting', 'failed'].includes(localSyncStatus)) {
    try {
      const response = await saveDraftToServer(localDraft)
      if (response?.data) {
        const syncedDraft = withSyncedDraftMeta(localDraft, response.data)
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
  const incoming = draft && typeof draft === 'object' ? draft : {}
  const currentLocal = loadOfflineDraftSync(userId) || {}
  const payload = {
    ...incoming,
    __serverDraftId: String(incoming.__serverDraftId || currentLocal.__serverDraftId || '').trim(),
    __serverDraftVersion: Math.max(
      0,
      Number(incoming.__serverDraftVersion || currentLocal.__serverDraftVersion || 0) || 0,
    ),
    __serverDraftSavedAt: String(
      incoming.__serverDraftSavedAt || currentLocal.__serverDraftSavedAt || '',
    ).trim(),
  }
  await saveOfflineDraft(userId, {
    ...payload,
    __offlineSyncStatus:
      typeof navigator !== 'undefined' && navigator.onLine === false ? 'waiting' : 'syncing',
    __offlineSavedAt: new Date().toISOString(),
  })
  try {
    const response = await saveDraftToServer(payload)
    if (response?.data) {
      await saveOfflineDraft(userId, withSyncedDraftMeta(payload, response.data))
    }
    return {
      saved: Boolean(response?.data),
      synced: Boolean(response?.data),
      draft: response?.data ? normalizeDraft(response.data) : null,
    }
  } catch (error) {
    const conflict =
      Number(error?.status || 0) === 409 &&
      String(error?.payload?.code || '') === 'report_draft_version_conflict'
    await saveOfflineDraft(userId, {
      ...payload,
      __offlineSyncStatus: conflict ? 'conflict' : 'failed',
      __offlineSavedAt: new Date().toISOString(),
      __offlineSyncError: error?.message || 'Draft sync failed.',
      ...(conflict
        ? {
            __offlineDraftConflict: {
              detectedAt: new Date().toISOString(),
              serverDraft: error?.payload?.currentDraft || null,
            },
          }
        : {}),
    })
    return { saved: true, synced: false, conflict, error }
  }
}

export const clearInspectionDraft = async (userId, draftId = '') => {
  if (!userId) return false
  await clearOfflineDraft(userId)
  try {
    const normalizedDraftId = String(draftId || '').trim()
    await apiRequest(
      normalizedDraftId
        ? `/reports/drafts/${encodeURIComponent(normalizedDraftId)}`
        : `/reports/draft?report_type=${encodeURIComponent(INSPECTION_TYPE)}`,
      { method: 'DELETE' },
    )
  } catch {
    // Local draft is cleared even if the server is unavailable.
  }
  return true
}

export const getInspectionDraftConflict = (userId) => {
  const draft = loadOfflineDraftSync(userId)
  return draft?.__offlineSyncStatus === 'conflict' ? draft.__offlineDraftConflict || null : null
}

export const resolveInspectionDraftConflict = async (userId, strategy) => {
  const localDraft = loadOfflineDraftSync(userId)
  const conflict = localDraft?.__offlineDraftConflict
  if (!localDraft || !conflict) return { resolved: false }

  if (strategy === 'keep-server') {
    const serverDraft = normalizeDraft(conflict.serverDraft)
    if (!serverDraft) return { resolved: false }
    await saveOfflineDraft(userId, {
      ...serverDraft,
      __offlineSyncStatus: 'synced',
      __offlineSavedAt: new Date().toISOString(),
    })
    return { resolved: true, strategy, draft: serverDraft }
  }

  if (strategy === 'keep-local-as-new') {
    const localCopy = {
      ...stripOfflineDraftMeta(localDraft),
      __offlineSyncStatus: 'waiting',
      __offlineSavedAt: new Date().toISOString(),
    }
    await saveOfflineDraft(userId, localCopy)
    const result = await saveInspectionDraft(userId, localCopy)
    return {
      ...result,
      resolved: result?.synced === true,
      strategy,
      draft: localCopy,
    }
  }

  return { resolved: false }
}

export const normalizeInspectionDraftType = (value) => normalizeInspectionTypeSlug(value)
