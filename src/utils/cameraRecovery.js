const STORAGE_KEY = 'vmecc_pending_camera_operation'
const MAX_AGE_MS = 2 * 60 * 60 * 1000

export const markPendingCameraOperation = (details = {}) => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...details,
        phase: 'picker',
        route: globalThis.location?.pathname || '/',
        createdAt: new Date().toISOString(),
      }),
    )
  } catch {
    /* non-fatal */
  }
}

export const markPendingCameraUploadStarted = (module) => {
  const current = getPendingCameraOperation()
  if (!current || String(current.module) !== String(module)) return
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, phase: 'uploading', uploadStartedAt: new Date().toISOString() }),
    )
  } catch {
    /* non-fatal */
  }
}

export const getInterruptedCameraFallback = (module) => {
  const pending = getPendingCameraOperation()
  if (!pending || String(pending.module) !== String(module)) return null
  return {
    message:
      'The previous camera operation was interrupted. Retry the camera or upload the photo manually.',
    errorCode: 'camera_interrupted',
    phase: String(pending.phase || 'picker'),
  }
}

export const consumeInterruptedCameraFallback = (module) => {
  const fallback = getInterruptedCameraFallback(module)
  if (fallback) clearPendingCameraOperation()
  return fallback
}

export const subscribeToCameraReturn = (module, onInterrupted, graceMs = 1200) => {
  if (!globalThis.document?.addEventListener) return () => {}
  let leftPage = false
  let timer = null
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      leftPage = true
      return
    }
    if (!leftPage) return
    clearTimeout(timer)
    timer = setTimeout(
      () => {
        const pending = getPendingCameraOperation()
        if (
          pending &&
          String(pending.module) === String(module) &&
          String(pending.phase || 'picker') === 'picker'
        ) {
          onInterrupted?.(getInterruptedCameraFallback(module))
        }
      },
      Math.max(250, graceMs),
    )
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

export const clearPendingCameraOperation = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* non-fatal */
  }
}

export const getPendingCameraOperation = () => {
  try {
    const row = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
    const createdAt = new Date(row?.createdAt || '').getTime()
    if (!row || !Number.isFinite(createdAt) || Date.now() - createdAt > MAX_AGE_MS) {
      clearPendingCameraOperation()
      return null
    }
    return row
  } catch {
    clearPendingCameraOperation()
    return null
  }
}

export const isLikelyEmbeddedBrowser = () => {
  const ua = String(globalThis.navigator?.userAgent || '').toLowerCase()
  return /\b(fbav|fban|instagram|line\/|wv\)|; wv|micromessenger)\b/.test(ua)
}
