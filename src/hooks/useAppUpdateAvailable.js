import { useCallback, useEffect, useRef, useState } from 'react'
import { checkForAppUpdate } from 'src/services/appVersion'

export const APP_UPDATE_CHECK_INTERVAL_MS = 120000
export const APP_UPDATE_SNOOZE_KEY_PREFIX = 'vmecc-app-update-snoozed'

const getSnoozeKey = (buildId) => `${APP_UPDATE_SNOOZE_KEY_PREFIX}:${String(buildId || '').trim()}`

const isSnoozed = (buildId) => {
  const normalized = String(buildId || '').trim()
  if (!normalized || typeof sessionStorage === 'undefined') return false
  try {
    return sessionStorage.getItem(getSnoozeKey(normalized)) === '1'
  } catch {
    return false
  }
}

const snooze = (buildId) => {
  const normalized = String(buildId || '').trim()
  if (!normalized || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(getSnoozeKey(normalized), '1')
  } catch {
    // Non-fatal. The banner can remain visible if sessionStorage is unavailable.
  }
}

const useAppUpdateAvailable = () => {
  const mountedRef = useRef(false)
  const latestVersionRef = useRef(null)
  const [latestVersion, setLatestVersion] = useState(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const checkNow = useCallback(async () => {
    const result = await checkForAppUpdate()
    if (!mountedRef.current) return result
    if (!result.latest) return result

    if (result.available && result.latest && !isSnoozed(result.latest.buildId)) {
      latestVersionRef.current = result.latest
      setLatestVersion(result.latest)
      setUpdateAvailable(true)
      return result
    }

    latestVersionRef.current = result.latest
    setLatestVersion(result.latest)
    setUpdateAvailable(false)
    return result
  }, [])

  const dismissUpdate = useCallback(() => {
    if (latestVersionRef.current?.buildId) {
      snooze(latestVersionRef.current.buildId)
    }
    setUpdateAvailable(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const initialCheckId = window.setTimeout(() => {
      void checkNow()
    }, 0)

    const intervalId = window.setInterval(() => {
      void checkNow()
    }, APP_UPDATE_CHECK_INTERVAL_MS)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkNow()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mountedRef.current = false
      window.clearTimeout(initialCheckId)
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkNow])

  return {
    updateAvailable,
    latestVersion,
    checkNow,
    dismissUpdate,
  }
}

export default useAppUpdateAvailable
