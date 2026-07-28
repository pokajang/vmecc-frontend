const DB_NAME = 'vmecc_inspection_offline_v1'
const DB_VERSION = 1
const STORE_NAME = 'records'
const MIRROR_PREFIX = 'inspection_offline_store_v1_'

const hasIndexedDb = () => {
  try {
    return Boolean(globalThis.indexedDB)
  } catch {
    return false
  }
}

const mirrorKey = (key) => `${MIRROR_PREFIX}${String(key || 'unknown')}`

const readMirror = (key, fallback = null) => {
  try {
    const raw = globalThis.localStorage?.getItem(mirrorKey(key))
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const writeMirror = (key, value) => {
  try {
    globalThis.localStorage?.setItem(mirrorKey(key), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const removeMirror = (key) => {
  try {
    globalThis.localStorage?.removeItem(mirrorKey(key))
    return true
  } catch {
    return false
  }
}

const openDb = () =>
  new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      resolve(null)
      return
    }
    const request = globalThis.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Unable to open offline store.'))
  })

const withStore = async (mode, callback) => {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    let result
    tx.oncomplete = () => {
      db.close()
      resolve(result)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error || new Error('Offline store transaction failed.'))
    }
    result = callback(store)
  })
}

export const offlineStoreKeys = {
  workspace: (userId) => `workspace:${String(userId || 'unknown')}`,
  draft: (userId) => `draft:${String(userId || 'unknown')}`,
  queue: (userId) => `queue:${String(userId || 'unknown')}`,
  photoUploads: (userId, scopeKey) =>
    `photo-uploads:${String(userId || 'unknown')}:${String(scopeKey || 'new')}`,
  feOperations: (userId, sessionUid) =>
    `fe-operations:${String(userId || 'unknown')}:${String(sessionUid || 'unknown')}`,
}

export const loadOfflineValueSync = (key, fallback = null) => readMirror(key, fallback)

export const saveOfflineValue = async (key, value) => {
  const record = {
    key: String(key || 'unknown'),
    value,
    updatedAt: new Date().toISOString(),
  }
  const mirrorSaved = writeMirror(record.key, record)
  let indexedDbSaved = false
  try {
    const result = await withStore('readwrite', (store) => store.put(record))
    indexedDbSaved = result !== null
  } catch {
    // The mirror keeps the module usable if IndexedDB is unavailable or blocked.
  }
  return {
    ...record,
    persisted: mirrorSaved || indexedDbSaved,
    mirrorSaved,
    indexedDbSaved,
  }
}

export const loadOfflineValue = async (key, fallback = null) => {
  const normalizedKey = String(key || 'unknown')
  try {
    const record = await withStore(
      'readonly',
      (store) =>
        new Promise((resolve, reject) => {
          const request = store.get(normalizedKey)
          request.onsuccess = () => resolve(request.result || null)
          request.onerror = () => reject(request.error)
        }),
    )
    if (record) {
      writeMirror(normalizedKey, record)
      return record
    }
  } catch {
    // Fall back to mirror below.
  }
  return readMirror(normalizedKey, fallback)
}

export const removeOfflineValue = async (key) => {
  const normalizedKey = String(key || 'unknown')
  removeMirror(normalizedKey)
  try {
    await withStore('readwrite', (store) => store.delete(normalizedKey))
  } catch {
    // Mirror removal already happened.
  }
  return true
}

export const loadOfflineQueueSync = (userId) =>
  loadOfflineValueSync(offlineStoreKeys.queue(userId), { value: [] })?.value || []

export const saveOfflineQueue = async (userId, rows) =>
  saveOfflineValue(offlineStoreKeys.queue(userId), Array.isArray(rows) ? rows : [])

export const loadOfflineWorkspaceSync = (userId) =>
  loadOfflineValueSync(offlineStoreKeys.workspace(userId), { value: null })?.value || null

export const saveOfflineWorkspace = async (userId, workspace) =>
  saveOfflineValue(offlineStoreKeys.workspace(userId), workspace || null)

export const clearOfflineWorkspace = async (userId) =>
  removeOfflineValue(offlineStoreKeys.workspace(userId))

export const loadOfflineDraftSync = (userId) =>
  loadOfflineValueSync(offlineStoreKeys.draft(userId), { value: null })?.value || null

export const saveOfflineDraft = async (userId, payload) =>
  saveOfflineValue(offlineStoreKeys.draft(userId), payload || null)

export const clearOfflineDraft = async (userId) =>
  removeOfflineValue(offlineStoreKeys.draft(userId))
