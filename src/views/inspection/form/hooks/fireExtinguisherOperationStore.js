import {
  loadOfflineValueSync,
  offlineStoreKeys,
  saveOfflineValue,
} from '../../domain/offline/inspectionOfflineStore'
import { getFireExtinguisherAssetKey } from '../../domain/api/inspectionSessionApi'
import { notifyInspectionSyncStateChanged } from '../../domain/sync/inspectionSyncEvents'

const SCHEMA_VERSION = 2
const LEGACY_KEY_PREFIX = 'inspection_fe_session_complete_retry_v1_'
const MIGRATION_MARKER_PREFIX = 'inspection_fe_operation_migration_v2_'
const BASE_RETRY_DELAY_MS = 60 * 1000
const MAX_RETRY_DELAY_MS = 30 * 60 * 1000

const text = (value) => String(value || '').trim()
const nowIso = () => new Date().toISOString()

export const getFireExtinguisherOperationRetryDelayMs = (attempts, random = Math.random) => {
  const base = Math.min(
    MAX_RETRY_DELAY_MS,
    BASE_RETRY_DELAY_MS * 2 ** Math.max(0, Number(attempts || 0) - 1),
  )
  return Math.round(base * (1 + Math.max(0, Math.min(1, Number(random()) || 0)) * 0.2))
}

const legacyKey = (userId, sessionUid) =>
  `${LEGACY_KEY_PREFIX}${text(userId) || 'unknown'}_${text(sessionUid) || 'unknown'}`

const migrationMarkerKey = (userId, sessionUid) =>
  `${MIGRATION_MARKER_PREFIX}${text(userId) || 'unknown'}_${text(sessionUid) || 'unknown'}`

const readJson = (key, fallback) => {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const writeMarker = (userId, sessionUid) => {
  try {
    globalThis.localStorage?.setItem(migrationMarkerKey(userId, sessionUid), '1')
    return true
  } catch {
    return false
  }
}

const hasMigrationMarker = (userId, sessionUid) => {
  try {
    return globalThis.localStorage?.getItem(migrationMarkerKey(userId, sessionUid)) === '1'
  } catch {
    return false
  }
}

export const createFireExtinguisherOperationId = () => {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return `fe-op:${cryptoApi.randomUUID()}`
  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error('Secure operation identifiers are unavailable in this browser.')
  }

  const bytes = new Uint8Array(16)
  cryptoApi.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
  return `fe-op:${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20,
  )}-${hex.slice(20)}`
}

const normalizeOperation = (operation = {}, defaults = {}) => {
  const row = operation?.row && typeof operation.row === 'object' ? operation.row : null
  const assetKey = text(operation.assetKey || getFireExtinguisherAssetKey(row))
  const operationId = text(operation.operationId)
  const type = operation.type === 'reset' ? 'reset' : 'complete'
  if (!row || !assetKey || !operationId) return null

  return {
    schemaVersion: SCHEMA_VERSION,
    operationId,
    userId: text(operation.userId || defaults.userId),
    sessionUid: text(operation.sessionUid || defaults.sessionUid),
    assetKey,
    type,
    row,
    baseVersion: Math.max(0, Number(operation.baseVersion || 0) || 0),
    forceRecheck: operation.forceRecheck === true,
    state: ['pending', 'retryable', 'conflict'].includes(operation.state)
      ? operation.state
      : 'pending',
    attempts: Math.max(0, Number(operation.attempts || 0) || 0),
    nextRetryAt: text(operation.nextRetryAt),
    lastAttemptAt: text(operation.lastAttemptAt),
    lastError: text(operation.lastError),
    lastErrorCode: text(operation.lastErrorCode),
    leaseRenewedAt: text(operation.leaseRenewedAt),
    legacyAssetKey: text(operation.legacyAssetKey),
    createdAt: text(operation.createdAt || nowIso()),
    updatedAt: text(operation.updatedAt || nowIso()),
  }
}

const storeKey = (userId, sessionUid) => offlineStoreKeys.feOperations(userId, sessionUid)

const persistOperations = (userId, sessionUid, operations) => {
  const normalized = (Array.isArray(operations) ? operations : [])
    .map((operation) => normalizeOperation(operation, { userId, sessionUid }))
    .filter(Boolean)
  void saveOfflineValue(storeKey(userId, sessionUid), normalized)
  notifyInspectionSyncStateChanged({ userId: text(userId), sessionUid: text(sessionUid) })
  return normalized
}

const migrateLegacyOperations = (userId, sessionUid) => {
  if (hasMigrationMarker(userId, sessionUid)) return []
  const legacyRows = readJson(legacyKey(userId, sessionUid), [])
  if (!Array.isArray(legacyRows) || legacyRows.length === 0) {
    writeMarker(userId, sessionUid)
    return []
  }

  const migrated = legacyRows
    .map((legacy) => {
      const row = legacy?.row && typeof legacy.row === 'object' ? legacy.row : null
      const assetKey = text(legacy?.assetKey || getFireExtinguisherAssetKey(row))
      if (!row || !assetKey) return null
      return normalizeOperation(
        {
          operationId: createFireExtinguisherOperationId(),
          type: 'complete',
          row,
          assetKey,
          baseVersion: legacy?.options?.baseVersion,
          forceRecheck: legacy?.options?.forceRecheck === true,
          state: 'retryable',
          attempts: legacy?.attempts,
          lastAttemptAt: legacy?.lastAttemptAt,
          lastError: legacy?.lastError,
          legacyAssetKey: assetKey,
          createdAt: legacy?.createdAt,
          updatedAt: legacy?.updatedAt,
        },
        { userId, sessionUid },
      )
    })
    .filter(Boolean)

  persistOperations(userId, sessionUid, migrated)
  writeMarker(userId, sessionUid)
  return migrated
}

export const loadFireExtinguisherOperations = ({ userId = '', sessionUid = '' } = {}) => {
  const record = loadOfflineValueSync(storeKey(userId, sessionUid), { value: [] })
  const stored = (Array.isArray(record?.value) ? record.value : [])
    .map((operation) => normalizeOperation(operation, { userId, sessionUid }))
    .filter(Boolean)
  if (stored.length > 0 || hasMigrationMarker(userId, sessionUid)) return stored
  return migrateLegacyOperations(userId, sessionUid)
}

export const listFireExtinguisherOperationSessionUids = (userId = '') => {
  const normalizedUserId = text(userId) || 'unknown'
  const mirrorPrefix = `inspection_offline_store_v1_fe-operations:${normalizedUserId}:`
  const legacyPrefix = `${LEGACY_KEY_PREFIX}${normalizedUserId}_`
  const sessionUids = new Set()
  const storage = globalThis.localStorage
  if (!storage) return []

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index) || ''
      if (key.startsWith(mirrorPrefix)) sessionUids.add(key.slice(mirrorPrefix.length))
      if (key.startsWith(legacyPrefix)) sessionUids.add(key.slice(legacyPrefix.length))
    }
  } catch {
    return []
  }

  return [...sessionUids].filter(Boolean)
}

export const enqueueFireExtinguisherOperation = ({
  userId = '',
  sessionUid = '',
  operationId = '',
  type = 'complete',
  row,
  baseVersion = 0,
  forceRecheck = false,
  state = '',
  error = null,
} = {}) => {
  const assetKey = text(getFireExtinguisherAssetKey(row))
  if (!assetKey || !row) return null
  const existing = loadFireExtinguisherOperations({ userId, sessionUid })
  const normalizedId = text(operationId) || createFireExtinguisherOperationId()
  const previous = existing.find((operation) => operation.operationId === normalizedId)
  const now = nowIso()
  const nextAttempts = Number(previous?.attempts || 0) + (error ? 1 : 0)
  const nextState = ['pending', 'retryable', 'conflict'].includes(state)
    ? state
    : error
      ? 'retryable'
      : 'pending'
  const next = normalizeOperation(
    {
      ...(previous || {}),
      operationId: normalizedId,
      type,
      row,
      assetKey,
      baseVersion,
      forceRecheck,
      state: nextState,
      attempts: nextAttempts,
      nextRetryAt:
        nextState === 'retryable'
          ? new Date(
              Date.now() + getFireExtinguisherOperationRetryDelayMs(nextAttempts),
            ).toISOString()
          : '',
      lastAttemptAt: error ? now : previous?.lastAttemptAt,
      lastError: error?.message || previous?.lastError,
      lastErrorCode: error?.payload?.code || error?.code || previous?.lastErrorCode,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    },
    { userId, sessionUid },
  )
  if (!next) return null

  persistOperations(userId, sessionUid, [
    ...existing.filter((operation) => operation.operationId !== normalizedId),
    next,
  ])
  return next
}

export const enqueueFireExtinguisherOperationDurably = async (options = {}) => {
  const operation = enqueueFireExtinguisherOperation(options)
  if (!operation) return null
  const userId = operation.userId
  const sessionUid = operation.sessionUid
  const operations = loadFireExtinguisherOperations({ userId, sessionUid })
  const persisted = await saveOfflineValue(storeKey(userId, sessionUid), operations)
  if (!persisted?.persisted) {
    const error = new Error(
      'This device could not safely store the inspection operation. Free storage space or change browser storage settings, then try again.',
    )
    error.code = 'inspection_operation_storage_unavailable'
    throw error
  }
  return operation
}

export const updateFireExtinguisherOperation = ({
  userId = '',
  sessionUid = '',
  operationId = '',
  patch = {},
} = {}) => {
  const operations = loadFireExtinguisherOperations({ userId, sessionUid })
  let updated = null
  const next = operations.map((operation) => {
    if (operation.operationId !== text(operationId)) return operation
    updated = normalizeOperation(
      { ...operation, ...patch, operationId: operation.operationId, updatedAt: nowIso() },
      { userId, sessionUid },
    )
    return updated || operation
  })
  persistOperations(userId, sessionUid, next)
  return updated
}

export const rebaseFollowingFireExtinguisherOperations = ({
  userId = '',
  sessionUid = '',
  operationId = '',
  resultVersion = 0,
} = {}) => {
  const operations = loadFireExtinguisherOperations({ userId, sessionUid })
  const completedIndex = operations.findIndex(
    (operation) => operation.operationId === text(operationId),
  )
  const completed = operations[completedIndex]
  const normalizedVersion = Math.max(0, Number(resultVersion || 0) || 0)
  if (!completed || normalizedVersion === 0) return operations

  return persistOperations(
    userId,
    sessionUid,
    operations.map((operation, index) =>
      index > completedIndex &&
      operation.assetKey === completed.assetKey &&
      operation.state !== 'conflict'
        ? { ...operation, baseVersion: normalizedVersion, updatedAt: nowIso() }
        : operation,
    ),
  )
}

const removeLegacyAsset = (userId, sessionUid, assetKey) => {
  const key = legacyKey(userId, sessionUid)
  const legacyRows = readJson(key, [])
  if (!Array.isArray(legacyRows)) return
  const remaining = legacyRows.filter(
    (legacy) => text(legacy?.assetKey || getFireExtinguisherAssetKey(legacy?.row)) !== assetKey,
  )
  try {
    if (remaining.length === 0) globalThis.localStorage?.removeItem(key)
    else globalThis.localStorage?.setItem(key, JSON.stringify(remaining))
  } catch {
    // The migrated operation remains authoritative in the new store.
  }
}

export const acknowledgeFireExtinguisherOperation = ({
  userId = '',
  sessionUid = '',
  operationId = '',
} = {}) => {
  const operations = loadFireExtinguisherOperations({ userId, sessionUid })
  const acknowledged = operations.find((operation) => operation.operationId === text(operationId))
  if (!acknowledged) return false
  persistOperations(
    userId,
    sessionUid,
    operations.filter((operation) => operation.operationId !== acknowledged.operationId),
  )
  if (acknowledged.legacyAssetKey) {
    removeLegacyAsset(userId, sessionUid, acknowledged.legacyAssetKey)
  }
  return true
}
