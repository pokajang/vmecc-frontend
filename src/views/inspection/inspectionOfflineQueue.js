import { persistInspectionRecord } from './inspectionApi'
import { loadOfflineQueueSync, saveOfflineQueue } from './inspectionOfflineStore'
import { normalizeInspectionTypeSlug } from './inspectionSharedUtils'

const QUEUE_KEY_PREFIX = 'inspection_offline_queue_v1_'
const QUEUEABLE_STATUSES = new Set(['queued', 'syncing', 'failed', 'synced', 'conflict'])
const BASE_RETRY_DELAY_MS = 60 * 1000
const MAX_RETRY_DELAY_MS = 30 * 60 * 1000

const getQueueKey = (userId) => `${QUEUE_KEY_PREFIX}${String(userId || 'unknown')}`
const isConflictError = (error) =>
  Number(error?.status || 0) === 409 &&
  String(error?.payload?.code || error?.code || '').trim() === 'REPORT_VERSION_CONFLICT'

const getRetryDelayMs = (attempts) =>
  Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** Math.max(0, Number(attempts || 0) - 1))

export const getInspectionQueueRetryDelayMs = (attempts) => getRetryDelayMs(attempts)

export const getInspectionQueueNextRetryAt = (item = {}) => {
  const lastAttempt = new Date(String(item.lastAttemptAt || '').trim()).getTime()
  if (!lastAttempt || Number.isNaN(lastAttempt)) return ''
  const nextMs = lastAttempt + getRetryDelayMs(item.attempts)
  return new Date(nextMs).toISOString()
}

const isRetryDue = (item = {}, nowMs = Date.now()) => {
  if (item.status === 'conflict' || item.status === 'syncing') return false
  if (!item.lastAttemptAt) return true
  const nextRetryAt = new Date(getInspectionQueueNextRetryAt(item)).getTime()
  return Number.isNaN(nextRetryAt) || nextRetryAt <= nowMs
}

const parseRows = (raw) => {
  try {
    const parsed = JSON.parse(String(raw || '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeQueueHistory = (history) =>
  (Array.isArray(history) ? history : [])
    .map((event) => {
      if (!event || typeof event !== 'object') return null
      const action = String(event.action || '').trim()
      const at = String(event.at || '').trim()
      if (!action || !at) return null
      return {
        action,
        at,
        message: String(event.message || '').trim(),
        status: String(event.status || '').trim(),
        attempts: Math.max(0, Number(event.attempts || 0) || 0),
      }
    })
    .filter(Boolean)

const appendQueueHistory = (history, event = {}, snapshot = {}) => {
  const action = String(event.action || '').trim()
  if (!action) return normalizeQueueHistory(history)
  return [
    ...normalizeQueueHistory(history),
    {
      action,
      at: String(event.at || new Date().toISOString()).trim(),
      message: String(event.message || '').trim(),
      status: String(event.status || snapshot.status || '').trim(),
      attempts: Math.max(0, Number(event.attempts ?? snapshot.attempts ?? 0) || 0),
    },
  ].slice(-30)
}

const normalizeQueueItem = (item = {}, userId = '', { preserveSyncing = false } = {}) => {
  const record = item?.record && typeof item.record === 'object' ? item.record : null
  const queueId = String(item?.queueId || item?.id || '').trim()
  const nowIso = new Date().toISOString()
  if (!record || !queueId) return null
  const rawOperation = String(item.operation || '').trim()
  const rawStatus = String(item.status || '').trim()
  const status = QUEUEABLE_STATUSES.has(rawStatus)
    ? rawStatus === 'syncing' && !preserveSyncing
      ? 'queued'
      : rawStatus
    : 'queued'

  return {
    queueId,
    userId: String(item.userId || userId || '').trim(),
    record,
    submissionKey: String(item.submissionKey || record.submissionKey || queueId).trim(),
    status,
    operation: ['create', 'update'].includes(rawOperation)
      ? rawOperation
      : Number(record.version || 0) > 0
        ? 'update'
        : 'create',
    baseVersion: Number(item.baseVersion || record.version || 0) || 0,
    baseRevision: Number(item.baseRevision || record.revision || 0) || 0,
    baseServerSnapshot:
      item.baseServerSnapshot && typeof item.baseServerSnapshot === 'object'
        ? item.baseServerSnapshot
        : null,
    conflictServerSnapshot:
      item.conflictServerSnapshot && typeof item.conflictServerSnapshot === 'object'
        ? item.conflictServerSnapshot
        : null,
    conflictDetectedAt: String(item.conflictDetectedAt || '').trim(),
    resolutionStatus: String(item.resolutionStatus || '').trim(),
    attempts: Math.max(0, Number(item.attempts || 0) || 0),
    lastError: String(item.lastError || '').trim(),
    history: normalizeQueueHistory(item.history),
    createdAt: String(item.createdAt || nowIso).trim(),
    updatedAt: String(item.updatedAt || nowIso).trim(),
    lastAttemptAt: String(item.lastAttemptAt || '').trim(),
  }
}

const writeQueue = (userId, rows) => {
  try {
    const safeRows = rows.filter(Boolean)
    globalThis.localStorage?.setItem(getQueueKey(userId), JSON.stringify(safeRows))
    saveOfflineQueue(userId, safeRows)
    return true
  } catch {
    return false
  }
}

const makeQueueId = () => {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch {
    // Fall through.
  }
  return `inspection-queue-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const makeInspectionSubmissionKey = (userId, record = {}) => {
  const recordId = String(record?.id || '').trim()
  if (recordId) return `inspection:${String(userId || 'unknown')}:${recordId}`
  return `inspection:${String(userId || 'unknown')}:${makeQueueId()}`
}

export const loadInspectionQueue = (userId) => {
  try {
    const offlineRows = loadOfflineQueueSync(userId)
    const legacyRows = parseRows(globalThis.localStorage?.getItem(getQueueKey(userId)))
    const rows = offlineRows.length > 0 ? offlineRows : legacyRows
    if (offlineRows.length === 0 && legacyRows.length > 0) saveOfflineQueue(userId, legacyRows)
    return rows.map((row) => normalizeQueueItem(row, userId)).filter(Boolean)
  } catch {
    return []
  }
}

export const enqueueInspectionSubmission = ({
  userId,
  record,
  submissionKey = '',
  operation = '',
  baseServerSnapshot = null,
}) => {
  const queueId = makeQueueId()
  const nowIso = new Date().toISOString()
  const resolvedSubmissionKey = String(submissionKey || makeInspectionSubmissionKey(userId, record))
  const item = normalizeQueueItem(
    {
      queueId,
      userId,
      record: {
        ...(record && typeof record === 'object' ? record : {}),
        submissionKey: resolvedSubmissionKey,
      },
      submissionKey: resolvedSubmissionKey,
      status: 'queued',
      operation,
      baseVersion: Number(record?.version || 0) || 0,
      baseRevision: Number(record?.revision || 0) || 0,
      baseServerSnapshot,
      conflictServerSnapshot: null,
      conflictDetectedAt: '',
      resolutionStatus: '',
      attempts: 0,
      lastError: '',
      history: [
        {
          action: 'queued',
          at: nowIso,
          message: 'Inspection submission queued on this device.',
          status: 'queued',
          attempts: 0,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
      lastAttemptAt: '',
    },
    userId,
  )
  if (!item) return null

  const existing = loadInspectionQueue(userId)
  const next = [
    item,
    ...existing.filter((row) => String(row.submissionKey) !== String(item.submissionKey)),
  ]
  return writeQueue(userId, next) ? item : null
}

export const removeInspectionQueueItem = (userId, queueId) => {
  const id = String(queueId || '').trim()
  if (!id) return false
  return writeQueue(
    userId,
    loadInspectionQueue(userId).filter((row) => String(row.queueId) !== id),
  )
}

export const markInspectionQueueItem = (userId, queueId, updates = {}) => {
  const id = String(queueId || '').trim()
  if (!id) return null
  let updatedItem = null
  const nowIso = new Date().toISOString()
  const next = loadInspectionQueue(userId).map((row) => {
    if (String(row.queueId) !== id) return row
    const { historyEvent, ...safeUpdates } = updates && typeof updates === 'object' ? updates : {}
    const merged = {
      ...row,
      ...safeUpdates,
      ...(historyEvent
        ? {
            history: appendQueueHistory(row.history, historyEvent, {
              ...row,
              ...safeUpdates,
            }),
          }
        : {}),
    }
    updatedItem = normalizeQueueItem(
      {
        ...merged,
        updatedAt: nowIso,
      },
      userId,
      { preserveSyncing: true },
    )
    return updatedItem
  })
  writeQueue(userId, next)
  return updatedItem
}

export const isInspectionQueueableError = (error) => {
  const status = Number(error?.status || 0)
  if (!status) return true
  if ([400, 401, 403, 404, 409, 413, 419, 422].includes(status)) return false
  return status >= 500
}

export const toQueuedInspectionRecord = (item = {}) => {
  const record = item?.record && typeof item.record === 'object' ? item.record : {}
  return {
    ...record,
    id: item.queueId,
    recordKey: `queued-${item.queueId}`,
    queueId: item.queueId,
    sourceReportUid: record.id || item.baseServerSnapshot?.id || '',
    userId: item.userId,
    submissionKey: item.submissionKey,
    recordKind: 'queued',
    reportType: 'inspection',
    queueStatus: item.status,
    operation: item.operation,
    status:
      item.status === 'conflict'
        ? 'Queued - Conflict'
        : item.status === 'failed'
          ? 'Queued - Failed sync'
          : 'Queued',
    displayId: record.displayId || 'Queued',
    submittedAt: record.submittedAt || item.createdAt,
    queuedAt: item.createdAt,
    updatedAt: item.updatedAt,
    lastAttemptAt: item.lastAttemptAt,
    nextRetryAt: getInspectionQueueNextRetryAt(item),
    lastError: item.lastError,
    history: item.history,
    attempts: item.attempts,
    baseVersion: item.baseVersion,
    baseRevision: item.baseRevision,
    baseServerSnapshot: item.baseServerSnapshot,
    conflictServerSnapshot: item.conflictServerSnapshot,
    conflictDetectedAt: item.conflictDetectedAt,
    resolutionStatus: item.resolutionStatus,
  }
}

export const getInspectionQueueSummary = (queueRows = []) => {
  const rows = Array.isArray(queueRows) ? queueRows : []
  const activeRows = rows.filter((row) => row.status !== 'synced')
  const failedRows = activeRows.filter((row) => row.status === 'failed')
  const conflictRows = activeRows.filter((row) => row.status === 'conflict')
  const syncingRows = activeRows.filter((row) => row.status === 'syncing')
  return {
    count: activeRows.length,
    failedCount: failedRows.length,
    conflictCount: conflictRows.length,
    syncingCount: syncingRows.length,
    lastError:
      conflictRows[0]?.lastError ||
      failedRows[0]?.lastError ||
      activeRows.find((row) => row.lastError)?.lastError ||
      '',
  }
}

export const syncInspectionQueue = async ({
  userId,
  onItemSynced,
  force = false,
  queueId = '',
} = {}) => {
  const targetQueueId = String(queueId || '').trim()
  const rows = loadInspectionQueue(userId).filter(
    (row) =>
      normalizeInspectionTypeSlug(row?.record?.reportType) === 'inspection' &&
      (!targetQueueId || String(row.queueId || '') === targetQueueId),
  )
  const results = []

  for (const item of rows) {
    if (item.status === 'syncing' || item.status === 'conflict' || (!force && !isRetryDue(item))) {
      continue
    }
    const attemptAt = new Date().toISOString()
    if (force) {
      markInspectionQueueItem(userId, item.queueId, {
        historyEvent: {
          action: 'manual_retry',
          at: attemptAt,
          message: 'Manual retry requested.',
          status: item.status,
          attempts: item.attempts,
        },
      })
    }
    markInspectionQueueItem(userId, item.queueId, {
      status: 'syncing',
      attempts: item.attempts + 1,
      lastAttemptAt: attemptAt,
      lastError: '',
      historyEvent: {
        action: 'sync_started',
        at: attemptAt,
        message: 'Sync attempt started.',
        status: 'syncing',
        attempts: item.attempts + 1,
      },
    })
    try {
      const syncOptions = { submissionKey: item.submissionKey }
      if (item.operation === 'update') syncOptions.expectedVersion = item.baseVersion
      const saved = await persistInspectionRecord(userId, item.record, syncOptions)
      if (!saved) throw new Error('Unable to sync queued inspection.')
      markInspectionQueueItem(userId, item.queueId, {
        status: 'synced',
        historyEvent: {
          action: 'sync_succeeded',
          message: 'Queued inspection synced successfully.',
          status: 'synced',
          attempts: item.attempts + 1,
        },
      })
      removeInspectionQueueItem(userId, item.queueId)
      onItemSynced?.(item)
      results.push({ queueId: item.queueId, synced: true })
    } catch (error) {
      if (isConflictError(error)) {
        markInspectionQueueItem(userId, item.queueId, {
          status: 'conflict',
          lastError: error?.message || 'Version conflict. Resolve before syncing.',
          conflictServerSnapshot:
            error?.payload?.currentReport && typeof error.payload.currentReport === 'object'
              ? error.payload.currentReport
              : null,
          conflictDetectedAt: new Date().toISOString(),
          resolutionStatus: 'needs_resolution',
          historyEvent: {
            action: 'conflict_detected',
            message: error?.message || 'Version conflict detected.',
            status: 'conflict',
            attempts: item.attempts + 1,
          },
        })
        results.push({ queueId: item.queueId, synced: false, conflict: true, error })
        continue
      }
      markInspectionQueueItem(userId, item.queueId, {
        status: 'failed',
        lastError: error?.message || 'Unable to sync queued inspection.',
        historyEvent: {
          action: 'sync_failed',
          message: error?.message || 'Unable to sync queued inspection.',
          status: 'failed',
          attempts: item.attempts + 1,
        },
      })
      results.push({ queueId: item.queueId, synced: false, error })
    }
  }

  return results
}
