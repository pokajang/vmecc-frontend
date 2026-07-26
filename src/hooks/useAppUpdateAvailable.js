import { useCallback, useEffect, useRef, useState } from 'react'
import { checkForAppUpdate } from 'src/services/appVersion'
import {
  activateWaitingWorker,
  prepareAppUpdate,
  SERVICE_WORKER_UPDATE_READY_EVENT,
} from 'src/services/serviceWorkerUpdates'

export const APP_UPDATE_CHECK_INTERVAL_MS = 120000
export const APP_UPDATE_SNOOZE_KEY_PREFIX = 'vmecc-app-update-snoozed'
export const APP_UPDATE_SNOOZE_MS = 15 * 60 * 1000

const getSnoozeKey = (buildId) => `${APP_UPDATE_SNOOZE_KEY_PREFIX}:${String(buildId || '').trim()}`

const isSnoozed = (buildId, now = Date.now) => {
  const normalized = String(buildId || '').trim()
  if (!normalized || typeof sessionStorage === 'undefined') return false
  try {
    const snoozedAt = Number(sessionStorage.getItem(getSnoozeKey(normalized)) || 0)
    if (!snoozedAt || now() - snoozedAt >= APP_UPDATE_SNOOZE_MS) {
      sessionStorage.removeItem(getSnoozeKey(normalized))
      return false
    }
    return true
  } catch {
    return false
  }
}

const snooze = (buildId, now = Date.now) => {
  const normalized = String(buildId || '').trim()
  if (!normalized || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(getSnoozeKey(normalized), String(now()))
  } catch {
    // Non-fatal. The banner can remain visible if sessionStorage is unavailable.
  }
}

const useAppUpdateAvailable = () => {
  const mountedRef = useRef(false)
  const latestVersionRef = useRef(null)
  const preparationRef = useRef(null)
  const workerReadyRef = useRef(false)
  const [latestVersion, setLatestVersion] = useState(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [status, setStatus] = useState('current')
  const [error, setError] = useState('')

  const prepareUpdate = useCallback(async () => {
    if (preparationRef.current) return preparationRef.current
    setStatus('preparing')
    setError('')
    const preparation = prepareAppUpdate()
      .then((worker) => {
        workerReadyRef.current = Boolean(worker)
        if (mountedRef.current) setStatus('ready')
        return worker
      })
      .catch((prepareError) => {
        if (mountedRef.current) {
          setStatus('failed')
          setError(prepareError?.message || 'Unable to prepare the application update.')
        }
        throw prepareError
      })
      .finally(() => {
        preparationRef.current = null
      })
    preparationRef.current = preparation
    return preparation
  }, [])

  const checkNow = useCallback(async () => {
    const result = await checkForAppUpdate()
    if (!mountedRef.current) return result
    if (!result.latest) return result

    if (result.available && result.latest && !isSnoozed(result.latest.buildId)) {
      latestVersionRef.current = result.latest
      setLatestVersion(result.latest)
      setUpdateAvailable(true)
      setStatus((currentStatus) =>
        ['preparing', 'ready', 'activating'].includes(currentStatus) ? currentStatus : 'discovered',
      )
      void prepareUpdate().catch(() => {})
      return result
    }

    latestVersionRef.current = result.latest
    if (workerReadyRef.current && !isSnoozed(result.latest.buildId)) {
      setLatestVersion(result.latest)
      setUpdateAvailable(true)
      setStatus('ready')
      setError('')
      return result
    }
    setLatestVersion(result.latest)
    setUpdateAvailable(false)
    setStatus('current')
    setError('')
    return result
  }, [prepareUpdate])

  const dismissUpdate = useCallback(() => {
    if (latestVersionRef.current?.buildId) {
      snooze(latestVersionRef.current.buildId)
    }
    setUpdateAvailable(false)
  }, [])

  const applyUpdate = useCallback(async () => {
    setStatus('activating')
    setError('')
    try {
      const worker = await prepareUpdate()
      if (worker) await activateWaitingWorker()
      return true
    } catch (applyError) {
      if (mountedRef.current) {
        setStatus('failed')
        setError(applyError?.message || 'Unable to activate the application update.')
      }
      return false
    }
  }, [prepareUpdate])

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
    const handleWorkerUpdateReady = () => {
      if (!mountedRef.current) return
      workerReadyRef.current = true
      const buildId = latestVersionRef.current?.buildId
      if (buildId && isSnoozed(buildId)) return
      setUpdateAvailable(true)
      setStatus('ready')
      setError('')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener(SERVICE_WORKER_UPDATE_READY_EVENT, handleWorkerUpdateReady)

    return () => {
      mountedRef.current = false
      window.clearTimeout(initialCheckId)
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener(SERVICE_WORKER_UPDATE_READY_EVENT, handleWorkerUpdateReady)
    }
  }, [checkNow])

  return {
    updateAvailable,
    latestVersion,
    status,
    error,
    checkNow,
    prepareUpdate,
    applyUpdate,
    dismissUpdate,
  }
}

export default useAppUpdateAvailable
