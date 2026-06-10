import {
  fetchPayrollClaimDrafts,
  savePayrollClaimDraftApi,
  deletePayrollClaimDraftApi,
} from '../apiClient'
import featureFlags from 'src/config/featureFlags'
import { buildIdempotencyKey } from './mappers'

const normalizeDraftType = (type) => {
  const raw = String(type || '')
    .trim()
    .toLowerCase()
  if (raw === 'other') return 'exceptional'
  if (raw === 'salary') return 'salary'
  return 'expense'
}

const toLocalDraftType = (type) => {
  const normalized = normalizeDraftType(type)
  return normalized === 'exceptional' ? 'other' : normalized
}

const LOCAL_AUTOSAVE_KEY_PREFIX = 'payroll-claim-autosave'
const LOCAL_RETRY_QUEUE_KEY_PREFIX = 'payroll-claim-autosave-retry'

const getStorage = () => {
  const storage = globalThis?.localStorage
  if (!storage) return null
  if (
    typeof storage.getItem !== 'function' ||
    typeof storage.setItem !== 'function' ||
    typeof storage.removeItem !== 'function' ||
    typeof storage.key !== 'function'
  ) {
    return null
  }
  return storage
}

const canUseStorage = () => Boolean(getStorage())
const normalizeStorageUserId = (userId) => String(userId || 'anon').trim() || 'anon'
const buildAutosavePrefix = (userId) =>
  `${LOCAL_AUTOSAVE_KEY_PREFIX}:${normalizeStorageUserId(userId)}:`
const buildRetryQueueKey = (userId) =>
  `${LOCAL_RETRY_QUEUE_KEY_PREFIX}:${normalizeStorageUserId(userId)}`

const parseStoredDraftPayload = (raw) => {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

const sanitizeDraftAttachmentState = (item = {}) => {
  const source = item && typeof item === 'object' ? item : {}
  return {
    attachmentId: Number(source.attachmentId || 0) || null,
    attachmentName: String(source.attachmentName || '').trim(),
    attachmentMimeType: String(source.attachmentMimeType || '').trim(),
    attachmentSizeBytes: Number(source.attachmentSizeBytes || 0) || 0,
    attachmentUploadState: String(source.attachmentUploadState || '').trim() || 'idle',
    needsReattach: source.needsReattach === true,
    attachmentMigrationAttempted: source.attachmentMigrationAttempted === true,
    attachmentError: String(source.attachmentError || '').trim(),
    legacyAttachmentDataUrl: '',
  }
}

const sanitizeDraftItemForStorage = (item = {}, draftType = 'expense') => {
  const attachment = sanitizeDraftAttachmentState(item)
  if (draftType === 'salary') {
    return {
      claimDate: String(item?.claimDate || '').trim(),
      claimType: String(item?.claimType || '').trim(),
      amount: String(item?.amount ?? '').trim(),
      lineNotes: String(item?.lineNotes || '').trim(),
      ...attachment,
    }
  }

  return {
    expenseDate: String(item?.expenseDate || '').trim(),
    category: String(item?.category || '').trim(),
    amount: String(item?.amount ?? '').trim(),
    lineNotes: String(item?.lineNotes || '').trim(),
    approvalNote: String(item?.approvalNote || '').trim(),
    fromLocation: String(item?.fromLocation || '').trim(),
    toLocation: String(item?.toLocation || '').trim(),
    distanceKm: String(item?.distanceKm ?? '').trim(),
    ratePerKm: String(item?.ratePerKm ?? '').trim(),
    destination: String(item?.destination || '').trim(),
    tripDateFrom: String(item?.tripDateFrom || '').trim(),
    tripDateTo: String(item?.tripDateTo || '').trim(),
    billedPeriod: String(item?.billedPeriod || '').trim(),
    claimant: String(item?.claimant || '').trim(),
    ...attachment,
  }
}

export const sanitizePayrollDraftPayloadForStorage = (payload = {}, draftType = '') => {
  const localType = toLocalDraftType(draftType || payload?.claimType || 'expense')
  const savedItems = Array.isArray(payload?.savedItems)
    ? payload.savedItems.map((item) => sanitizeDraftItemForStorage(item, localType))
    : []
  return {
    id: String(payload?.id || payload?.draftId || '').trim(),
    claimType: localType,
    backendId: Number(payload?.backendId || 0) || null,
    backendDraftId: String(payload?.backendDraftId || '').trim(),
    period: String(payload?.period || '').trim(),
    periodConfirmed: Boolean(payload?.periodConfirmed),
    payrollBaselineConfirmed: Boolean(payload?.payrollBaselineConfirmed),
    savedItems,
    draftItem: sanitizeDraftItemForStorage(payload?.draftItem || {}, localType),
    updatedAt: String(payload?.updatedAt || '').trim() || new Date().toISOString(),
    storageRedacted: true,
  }
}

const hasLocalDraftContent = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return false
  if (String(payload?.period || '').trim()) return true
  if (Boolean(payload?.periodConfirmed)) return true
  if (Boolean(payload?.payrollBaselineConfirmed)) return true
  if (Array.isArray(payload?.savedItems) && payload.savedItems.length > 0) return true
  const draftItem =
    payload?.draftItem && typeof payload.draftItem === 'object' ? payload.draftItem : null
  if (!draftItem) return false
  return Boolean(
    String(draftItem.expenseDate || '').trim() ||
      String(draftItem.claimDate || '').trim() ||
      String(draftItem.category || '').trim() ||
      String(draftItem.claimType || '').trim() ||
      String(draftItem.amount || '').trim() ||
      String(draftItem.lineNotes || '').trim() ||
      String(draftItem.attachmentName || '').trim(),
  )
}

export const loadLocalPayrollAutosaveDrafts = (userId) => {
  const storage = getStorage()
  if (!storage) return []
  const prefix = buildAutosavePrefix(userId)
  const drafts = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key || !key.startsWith(prefix)) continue
    const typeFromKey = key.slice(prefix.length)
    const localType = toLocalDraftType(typeFromKey || 'expense')
    const raw = storage.getItem(key)
    const payload = parseStoredDraftPayload(raw)
    if (!payload || !hasLocalDraftContent(payload)) continue
    const draftId = String(payload?.id || payload?.draftId || '').trim()
    if (!draftId) continue
    drafts.push({
      ...payload,
      id: draftId,
      claimType: String(payload?.claimType || localType).trim() || localType,
      backendId: null,
      backendDraftId: '',
      localAutosaveKey: key,
      localOnly: true,
      updatedAt: String(payload?.updatedAt || '').trim() || new Date().toISOString(),
    })
  }
  return drafts
}

export const deleteLocalPayrollAutosaveDraft = (userId, draftType) => {
  const storage = getStorage()
  if (!storage) return false
  const localType = toLocalDraftType(draftType || 'expense')
  const key = `${buildAutosavePrefix(userId)}${localType}`
  try {
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

const loadRetryQueue = (userId) => {
  const storage = getStorage()
  if (!storage) return []
  const key = buildRetryQueueKey(userId)
  const payload = parseStoredDraftPayload(storage.getItem(key))
  return Array.isArray(payload?.entries) ? payload.entries : []
}

const saveRetryQueue = (userId, entries) => {
  const storage = getStorage()
  if (!storage) return false
  const key = buildRetryQueueKey(userId)
  try {
    storage.setItem(
      key,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        entries: Array.isArray(entries) ? entries : [],
      }),
    )
    return true
  } catch {
    return false
  }
}

const removeRetryQueue = (userId) => {
  const storage = getStorage()
  if (!storage) return
  const key = buildRetryQueueKey(userId)
  try {
    storage.removeItem(key)
  } catch {
    // ignore storage errors
  }
}

export const enqueuePayrollDraftRetry = (userId, draftType, payload) => {
  const draftId = String(payload?.id || payload?.draftId || '').trim()
  if (!draftId) return
  const normalizedType = normalizeDraftType(draftType)
  const localType = toLocalDraftType(normalizedType)
  const redactedPayload = sanitizePayrollDraftPayloadForStorage(payload, localType)
  const current = loadRetryQueue(userId)
  const nextEntry = {
    draftType: localType,
    draftId,
    payload: redactedPayload,
    queuedAt: new Date().toISOString(),
  }
  const existingIndex = current.findIndex(
    (entry) =>
      String(entry?.draftId || '').trim() === draftId &&
      String(entry?.draftType || '').trim() === localType,
  )
  const nextEntries =
    existingIndex >= 0
      ? current.map((entry, index) => (index === existingIndex ? nextEntry : entry))
      : [...current, nextEntry]
  saveRetryQueue(userId, nextEntries)
}

export const clearPayrollDraftRetryEntry = (userId, draftType, draftId) => {
  const normalizedDraftId = String(draftId || '').trim()
  if (!normalizedDraftId) return
  const localType = toLocalDraftType(normalizeDraftType(draftType))
  const queue = loadRetryQueue(userId)
  if (queue.length === 0) return
  const nextQueue = queue.filter(
    (entry) =>
      !(
        String(entry?.draftId || '').trim() === normalizedDraftId &&
        String(entry?.draftType || '').trim() === localType
      ),
  )
  if (nextQueue.length === 0) {
    removeRetryQueue(userId)
    return
  }
  saveRetryQueue(userId, nextQueue)
}

export const clearPayrollDraftRetryEntriesByType = (userId, draftType) => {
  const localType = toLocalDraftType(normalizeDraftType(draftType))
  const queue = loadRetryQueue(userId)
  if (queue.length === 0) return
  const nextQueue = queue.filter((entry) => String(entry?.draftType || '').trim() !== localType)
  if (nextQueue.length === 0) {
    removeRetryQueue(userId)
    return
  }
  saveRetryQueue(userId, nextQueue)
}

export const flushPayrollDraftRetryQueue = async (userId) => {
  const queue = loadRetryQueue(userId)
  if (queue.length === 0) return { ok: true, synced: 0, pending: 0 }

  const remaining = []
  let synced = 0
  for (const entry of queue) {
    const draftType = String(entry?.draftType || 'expense').trim() || 'expense'
    const payload = entry?.payload && typeof entry.payload === 'object' ? entry.payload : null
    const draftId = String(entry?.draftId || payload?.id || '').trim()
    if (!payload || !draftId) continue
    try {
      const idempotencyKey = buildIdempotencyKey('payroll-draft-sync', [draftType, draftId])
      await savePayrollClaimDraftApi(
        {
          claim_type: normalizeDraftType(draftType),
          draft_id: draftId,
          idempotency_key: idempotencyKey,
          payload: {
            ...payload,
            id: draftId,
            claimType: toLocalDraftType(draftType),
          },
        },
        {
          headers: {
            'X-Idempotency-Key': idempotencyKey,
          },
        },
      )
      synced += 1
    } catch {
      remaining.push(entry)
    }
  }

  if (remaining.length === 0) {
    removeRetryQueue(userId)
  } else {
    saveRetryQueue(userId, remaining)
  }

  return { ok: remaining.length === 0, synced, pending: remaining.length }
}

const toLocalDraftEntry = (row = {}) => {
  const claimType = toLocalDraftType(row?.claim_type || row?.claimType || 'expense')
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {}
  return {
    ...payload,
    id: String(payload?.id || row?.draft_id || '').trim() || null,
    claimType,
    backendId: row?.id ?? payload?.backendId ?? null,
    backendDraftId: row?.draft_id ?? payload?.backendDraftId ?? null,
    updatedAt: payload?.updatedAt || row?.updated_at || row?.saved_at || new Date().toISOString(),
  }
}

export const loadMyPayrollClaimDraftsApiFirst = async (userId, claimType = '') => {
  const hasExplicitType = String(claimType || '').trim() !== ''
  const normalizedType = hasExplicitType ? normalizeDraftType(claimType) : ''
  if (!featureFlags.apiOtPayrollReadsPrimary) {
    return {
      ok: false,
      data: [],
      source: 'api',
      error: new Error('API reads disabled by feature flag'),
    }
  }
  try {
    const result = await fetchPayrollClaimDrafts(normalizedType || '')
    const rows = Array.isArray(result?.data) ? result.data : []
    const mappedRows = rows.map((row) => toLocalDraftEntry(row)).filter((row) => Boolean(row?.id))
    if (!hasExplicitType) return { ok: true, data: mappedRows, source: 'api' }
    const localKey = toLocalDraftType(normalizedType || 'expense')
    return {
      ok: true,
      data: mappedRows.filter((row) => (row?.claimType || '') === localKey),
      source: 'api',
    }
  } catch (error) {
    return { ok: false, data: [], source: 'api', error }
  }
}

export const saveMyPayrollClaimDraftApiFirst = async (userId, draftType, payload, options = {}) => {
  const normalizedType = normalizeDraftType(draftType)
  const localType = toLocalDraftType(normalizedType)
  const draftId = String(payload?.id || payload?.draftId || '').trim()
  const idempotencyKey = buildIdempotencyKey('payroll-draft-save', [localType, draftId])
  const localPayload = {
    ...sanitizePayrollDraftPayloadForStorage(payload, localType),
    id: draftId,
    claimType: localType,
  }

  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }

  try {
    const result = await savePayrollClaimDraftApi(
      {
        claim_type: normalizedType,
        draft_id: draftId || null,
        idempotency_key: idempotencyKey,
        payload: localPayload,
      },
      {
        ...options,
        headers: {
          ...(options?.headers || {}),
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    )
    const savedRow = result?.data || null
    const next = toLocalDraftEntry(savedRow || {})
    clearPayrollDraftRetryEntry(userId, localType, draftId)
    return { ok: true, data: next || localPayload, source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}

export const deleteMyPayrollClaimDraftApiFirst = async (draft, options = {}) => {
  const backendId = Number(draft?.backendId || draft?.id || 0)
  if (!featureFlags.apiOtPayrollWritesPrimary) {
    return { ok: false, source: 'api', error: new Error('API writes disabled by feature flag') }
  }
  if (!backendId) return { ok: false, source: 'api' }
  try {
    const idempotencyKey =
      options?.idempotencyKey || buildIdempotencyKey('payroll-draft-delete', [backendId])
    await deletePayrollClaimDraftApi(backendId, {
      headers: { 'X-Idempotency-Key': idempotencyKey },
    })
    return { ok: true, source: 'api' }
  } catch (error) {
    return { ok: false, source: 'api', error }
  }
}
