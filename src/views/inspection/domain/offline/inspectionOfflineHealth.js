import {
  loadOfflineDraftSync,
  loadOfflineQueueSync,
  loadOfflineValue,
  loadOfflineValueSync,
  offlineStoreKeys,
} from './inspectionOfflineStore'

const LOW_STORAGE_REMAINING_BYTES = 25 * 1024 * 1024
const APP_SHELL_CACHE_PREFIX = 'vmecc-app-shell-'
const SERVICE_WORKER_READY_TIMEOUT_MS = 2500

const waitForServiceWorkerReady = (readyPromise) =>
  new Promise((resolve) => {
    if (!readyPromise?.then) {
      resolve(null)
      return
    }

    const timeoutId = globalThis.setTimeout?.(() => resolve(null), SERVICE_WORKER_READY_TIMEOUT_MS)
    readyPromise
      .then((registration) => {
        if (timeoutId) globalThis.clearTimeout(timeoutId)
        resolve(registration || null)
      })
      .catch(() => {
        if (timeoutId) globalThis.clearTimeout(timeoutId)
        resolve(null)
      })
  })

const isOfflineAppShellCacheExpected = () => Boolean(import.meta.env.PROD)

const getServiceWorkerMessageTarget = async () => {
  const serviceWorker = globalThis.navigator?.serviceWorker
  if (!serviceWorker) {
    return { target: null, error: 'Service worker is unavailable.' }
  }

  if (serviceWorker.controller) return { target: serviceWorker.controller, error: '' }

  const registration = await waitForServiceWorkerReady(serviceWorker.ready)
  const target = registration?.active || serviceWorker.controller || null
  return target
    ? { target, error: '' }
    : { target: null, error: 'Service worker is not active yet.' }
}

const postServiceWorkerMessage = async (type, { target: explicitTarget = null } = {}) => {
  if (typeof MessageChannel === 'undefined') {
    return { ok: false, error: 'MessageChannel is unavailable.' }
  }

  const { target, error } = explicitTarget
    ? { target: explicitTarget, error: '' }
    : await getServiceWorkerMessageTarget()
  if (!target) return { ok: false, error }

  return new Promise((resolve) => {
    const channel = new MessageChannel()
    const timeoutId = globalThis.setTimeout?.(() => {
      resolve({ ok: false, error: 'Service worker did not respond.' })
    }, 3000)

    channel.port1.onmessage = (event) => {
      if (timeoutId) globalThis.clearTimeout(timeoutId)
      resolve(event.data || { ok: false, error: 'Service worker response was empty.' })
    }
    target.postMessage({ type }, [channel.port2])
  })
}

const getCacheStatus = async () => {
  if (!isOfflineAppShellCacheExpected()) {
    return {
      cacheName: '',
      shellCount: 0,
      cachedShellCount: 0,
      cacheExpected: false,
      message: 'Offline app shell cache is only checked in production builds.',
    }
  }

  const fromServiceWorker = await postServiceWorkerMessage('VMECC_GET_OFFLINE_CACHE_STATUS')
  if (fromServiceWorker?.ok) {
    return {
      ...fromServiceWorker.payload,
      cacheExpected: true,
    }
  }

  try {
    const keys = await globalThis.caches?.keys?.()
    const cacheName = (Array.isArray(keys) ? keys : []).find((key) =>
      String(key || '').startsWith(APP_SHELL_CACHE_PREFIX),
    )
    return {
      cacheName: cacheName || '',
      shellCount: 0,
      cachedShellCount: cacheName ? 1 : 0,
      cacheExpected: true,
      message: fromServiceWorker?.error || '',
    }
  } catch {
    return {
      cacheName: '',
      shellCount: 0,
      cachedShellCount: 0,
      cacheExpected: true,
      message: fromServiceWorker?.error || 'Cache API is unavailable.',
    }
  }
}

export const refreshInspectionOfflineAssets = async () => {
  const readyPromise = globalThis.navigator?.serviceWorker?.ready
  const registration = readyPromise?.catch ? await readyPromise.catch(() => null) : null
  await registration?.update?.()
  const response = await postServiceWorkerMessage('VMECC_REFRESH_OFFLINE_ASSETS', {
    target: registration?.waiting || registration?.active || null,
  })
  if (response?.ok) return response.payload
  throw new Error(response?.error || 'Unable to refresh offline assets.')
}

export const getInspectionOfflineHealth = async (userId) => {
  const queueRows = loadOfflineQueueSync(userId)
  const draftRecord = loadOfflineValueSync(offlineStoreKeys.draft(userId), null)
  const localDraft = loadOfflineDraftSync(userId)
  const estimatePromise = globalThis.navigator?.storage?.estimate?.()
  const storageEstimate =
    (estimatePromise?.catch ? await estimatePromise.catch(() => null) : null) || null
  const cacheStatus = await getCacheStatus()
  let indexedDbAvailable = false
  let indexedDbStatus = 'Unavailable'

  try {
    indexedDbAvailable = Boolean(globalThis.indexedDB)
    if (indexedDbAvailable) {
      await loadOfflineValue(offlineStoreKeys.queue(userId), { value: [] })
      indexedDbStatus = 'Available'
    }
  } catch (error) {
    indexedDbStatus = error?.message || 'Blocked'
  }

  const quota = Number(storageEstimate?.quota || 0) || 0
  const usage = Number(storageEstimate?.usage || 0) || 0
  const remaining = quota > 0 ? Math.max(0, quota - usage) : 0
  const warnings = []
  if (!indexedDbAvailable || indexedDbStatus !== 'Available') warnings.push('IndexedDB unavailable')
  if (quota > 0 && remaining < LOW_STORAGE_REMAINING_BYTES) warnings.push('Storage quota is low')
  if (cacheStatus?.cacheExpected !== false && !cacheStatus?.cacheName) {
    warnings.push('Offline app shell cache not detected')
  }

  return {
    indexedDbAvailable,
    indexedDbStatus,
    cacheBuildId: String(cacheStatus?.buildId || '').trim(),
    cacheName: cacheStatus?.cacheName || '',
    cacheExpected: cacheStatus?.cacheExpected !== false,
    cachedShellCount: Number(cacheStatus?.cachedShellCount || 0),
    shellCount: Number(cacheStatus?.shellCount || 0),
    cacheMessage: cacheStatus?.message || '',
    pendingQueueCount: Array.isArray(queueRows) ? queueRows.length : 0,
    localDraftExists: Boolean(localDraft),
    lastLocalDraftSave: String(
      localDraft?.__offlineSavedAt || localDraft?.savedAt || draftRecord?.updatedAt || '',
    ).trim(),
    lastServerDraftSync:
      String(localDraft?.__offlineSyncStatus || '').trim() === 'synced'
        ? String(localDraft?.__offlineSavedAt || draftRecord?.updatedAt || '').trim()
        : '',
    draftSyncStatus: String(localDraft?.__offlineSyncStatus || '').trim(),
    storageUsage: usage,
    storageQuota: quota,
    storageRemaining: remaining,
    warnings,
  }
}
