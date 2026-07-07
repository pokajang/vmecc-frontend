import { getFireExtinguisherAssetKey } from '../../domain/api/inspectionSessionApi'

const STORAGE_KEY_PREFIX = 'inspection_fe_session_complete_retry_v1_'

const text = (value) => String(value || '').trim()

const storageKey = ({ userId = '', sessionUid = '' } = {}) =>
  `${STORAGE_KEY_PREFIX}${text(userId) || 'unknown'}_${text(sessionUid) || 'unknown'}`

const storageKeyForUserPrefix = (userId = '') =>
  `${STORAGE_KEY_PREFIX}${text(userId) || 'unknown'}_`

const readRows = (key) => {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeRows = (key, rows) => {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(Array.isArray(rows) ? rows : []))
    return true
  } catch {
    return false
  }
}

const normalizeQueueItem = (item = {}) => {
  const row = item?.row && typeof item.row === 'object' ? item.row : null
  const assetKey = text(item.assetKey || getFireExtinguisherAssetKey(row))
  if (!row || !assetKey) return null

  return {
    assetKey,
    row,
    options: item.options && typeof item.options === 'object' ? item.options : {},
    attempts: Math.max(0, Number(item.attempts || 0) || 0),
    lastError: text(item.lastError),
    lastAttemptAt: text(item.lastAttemptAt),
    createdAt: text(item.createdAt || new Date().toISOString()),
    updatedAt: text(item.updatedAt || new Date().toISOString()),
  }
}

export const isFireExtinguisherSessionRetryableError = (error) => {
  const status = Number(error?.status || 0)
  if (!status) return true
  if ([400, 401, 403, 404, 409, 413, 419, 422].includes(status)) return false
  return status >= 500
}

export const loadFireExtinguisherSessionRetryQueue = ({ userId = '', sessionUid = '' } = {}) =>
  readRows(storageKey({ userId, sessionUid })).map(normalizeQueueItem).filter(Boolean)

export const countFireExtinguisherSessionRetryQueue = ({ userId = '', sessionUid = '' } = {}) => {
  const normalizedSessionUid = text(sessionUid)
  if (normalizedSessionUid) {
    return loadFireExtinguisherSessionRetryQueue({
      userId,
      sessionUid: normalizedSessionUid,
    }).length
  }

  const prefix = storageKeyForUserPrefix(userId)
  const storage = globalThis.localStorage
  if (!storage) return 0

  let count = 0
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key || !key.startsWith(prefix)) continue
      count += readRows(key).map(normalizeQueueItem).filter(Boolean).length
    }
  } catch {
    return 0
  }
  return count
}

export const enqueueFireExtinguisherSessionRetry = ({
  userId = '',
  sessionUid = '',
  row,
  options = {},
  error = null,
} = {}) => {
  const key = storageKey({ userId, sessionUid })
  const assetKey = text(getFireExtinguisherAssetKey(row))
  if (!assetKey) return null

  const nowIso = new Date().toISOString()
  const existing = loadFireExtinguisherSessionRetryQueue({ userId, sessionUid })
  const previous = existing.find((item) => item.assetKey === assetKey)
  const nextItem = normalizeQueueItem({
    assetKey,
    row,
    options,
    attempts: Number(previous?.attempts || 0) + 1,
    lastError: text(error?.message || 'Session sync failed.'),
    lastAttemptAt: nowIso,
    createdAt: previous?.createdAt || nowIso,
    updatedAt: nowIso,
  })
  if (!nextItem) return null

  const nextRows = [nextItem, ...existing.filter((item) => item.assetKey !== assetKey)]
  return writeRows(key, nextRows) ? nextItem : null
}

export const removeFireExtinguisherSessionRetry = ({
  userId = '',
  sessionUid = '',
  assetKey = '',
} = {}) => {
  const key = storageKey({ userId, sessionUid })
  const normalizedAssetKey = text(assetKey)
  if (!normalizedAssetKey) return false
  return writeRows(
    key,
    loadFireExtinguisherSessionRetryQueue({ userId, sessionUid }).filter(
      (item) => item.assetKey !== normalizedAssetKey,
    ),
  )
}
