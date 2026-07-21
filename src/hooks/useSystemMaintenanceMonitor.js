import { useEffect, useRef } from 'react'
import { loadSystemMaintenanceSetting } from 'src/views/settings/systemMaintenanceStorage'

export const MAINTENANCE_OFF_POLL_INTERVAL_MS = 60_000
export const MAINTENANCE_ACTIVE_POLL_INTERVAL_MS = 10_000
export const MAINTENANCE_ERROR_BACKOFF_BASE_MS = 15_000
export const MAINTENANCE_ERROR_BACKOFF_MAX_MS = 5 * 60_000

const ACTIVE_ERROR_BACKOFF_MAX_MS = 60_000
const GRACE_DEADLINE_ALLOWANCE_MS = 250
const OFF_POLL_JITTER_RATIO = 0.1
const EVENT_REFRESH_DEDUP_MS = 750

const isPageVisible = () =>
  typeof document === 'undefined' ||
  !document.visibilityState ||
  document.visibilityState === 'visible'

const isBrowserOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false

const isActiveMaintenance = (setting = {}) =>
  Boolean(setting?.enabled) &&
  ['grace', 'enforced'].includes(
    String(setting?.phase || '')
      .trim()
      .toLowerCase(),
  )

const addPositiveJitter = (delay, random, maximum = Number.POSITIVE_INFINITY) =>
  Math.min(
    maximum,
    Math.round(delay + delay * OFF_POLL_JITTER_RATIO * Math.max(0, Math.min(1, random()))),
  )

export const getSystemMaintenancePollDelay = ({
  setting = {},
  failureCount = 0,
  now = Date.now(),
  random = Math.random,
} = {}) => {
  if (failureCount > 0) {
    const maximum = isActiveMaintenance(setting)
      ? ACTIVE_ERROR_BACKOFF_MAX_MS
      : MAINTENANCE_ERROR_BACKOFF_MAX_MS
    const delay = Math.min(
      MAINTENANCE_ERROR_BACKOFF_BASE_MS * 2 ** Math.max(0, failureCount - 1),
      maximum,
    )
    return addPositiveJitter(delay, random, maximum)
  }

  const phase = String(setting?.phase || '')
    .trim()
    .toLowerCase()
  if (Boolean(setting?.enabled) && phase === 'grace') {
    const graceEndsAt = Date.parse(String(setting?.graceEndsAt || ''))
    if (Number.isFinite(graceEndsAt)) {
      return Math.max(
        1,
        Math.min(
          MAINTENANCE_ACTIVE_POLL_INTERVAL_MS,
          graceEndsAt - now + GRACE_DEADLINE_ALLOWANCE_MS,
        ),
      )
    }
    return MAINTENANCE_ACTIVE_POLL_INTERVAL_MS
  }

  if (Boolean(setting?.enabled) && phase === 'enforced') {
    return MAINTENANCE_ACTIVE_POLL_INTERVAL_MS
  }

  return addPositiveJitter(MAINTENANCE_OFF_POLL_INTERVAL_MS, random)
}

const maintenanceStateKey = (setting = {}) =>
  [
    Boolean(setting?.enabled) ? '1' : '0',
    String(setting?.phase || ''),
    String(setting?.graceEndsAt || ''),
    String(setting?.updatedAt || ''),
  ].join('|')

const useSystemMaintenanceMonitor = ({
  enabled,
  setting,
  onUpdate,
  onResult,
  loadSetting = loadSystemMaintenanceSetting,
  now = Date.now,
  random = Math.random,
} = {}) => {
  const settingRef = useRef(setting)
  const onUpdateRef = useRef(onUpdate)
  const onResultRef = useRef(onResult)
  const loadSettingRef = useRef(loadSetting)
  const runtimeRef = useRef(null)
  const stateKey = maintenanceStateKey(setting)

  settingRef.current = setting
  onUpdateRef.current = onUpdate
  onResultRef.current = onResult
  loadSettingRef.current = loadSetting

  useEffect(() => {
    if (!enabled) return undefined

    const runtime = {
      active: true,
      controller: null,
      failureCount: 0,
      inFlight: null,
      lastImmediateAt: Number.NEGATIVE_INFINITY,
      pendingImmediate: false,
      timer: null,
    }
    runtimeRef.current = runtime

    const clearTimer = () => {
      if (runtime.timer !== null) {
        window.clearTimeout(runtime.timer)
        runtime.timer = null
      }
    }

    const canPoll = () => runtime.active && isPageVisible() && isBrowserOnline()

    const scheduleNext = () => {
      clearTimer()
      if (!canPoll() || runtime.inFlight) return

      const delay = getSystemMaintenancePollDelay({
        setting: settingRef.current,
        failureCount: runtime.failureCount,
        now: now(),
        random,
      })
      runtime.timer = window.setTimeout(() => {
        runtime.timer = null
        void requestNow()
      }, delay)
    }

    const requestNow = async () => {
      if (!canPoll() || runtime.inFlight) return runtime.inFlight

      clearTimer()
      const controller = new AbortController()
      runtime.controller = controller

      const request = (async () => {
        let result
        try {
          result = await loadSettingRef.current({ signal: controller.signal })
        } catch (error) {
          result = { ok: false, error }
        }

        if (!runtime.active) return result

        const aborted = controller.signal.aborted || result?.error?.name === 'AbortError'
        if (aborted) return result

        if (result?.ok) {
          runtime.failureCount = 0
          settingRef.current = result.data
          onUpdateRef.current?.(result.data)
        } else {
          runtime.failureCount += 1
        }

        onResultRef.current?.(result)

        return result
      })()

      runtime.inFlight = request
      try {
        return await request
      } finally {
        if (runtime.inFlight === request) {
          runtime.inFlight = null
          runtime.controller = null
        }
        if (runtime.active && runtime.pendingImmediate && canPoll()) {
          runtime.pendingImmediate = false
          runtime.lastImmediateAt = now()
          void requestNow()
        } else if (runtime.active) {
          scheduleNext()
        }
      }
    }

    runtime.scheduleNext = scheduleNext
    runtime.requestNow = requestNow

    const refreshForBrowserEvent = () => {
      if (!canPoll()) return
      const timestamp = now()
      if (runtime.inFlight) {
        if (runtime.controller?.signal.aborted) runtime.pendingImmediate = true
        return
      }
      if (timestamp - runtime.lastImmediateAt < EVENT_REFRESH_DEDUP_MS) {
        scheduleNext()
        return
      }
      runtime.lastImmediateAt = timestamp
      void requestNow()
    }

    const handleVisibilityChange = () => {
      if (!isPageVisible()) {
        runtime.pendingImmediate = false
        runtime.lastImmediateAt = Number.NEGATIVE_INFINITY
        clearTimer()
        runtime.controller?.abort()
        return
      }
      refreshForBrowserEvent()
    }

    const handleOffline = () => {
      runtime.pendingImmediate = false
      runtime.lastImmediateAt = Number.NEGATIVE_INFINITY
      clearTimer()
      runtime.controller?.abort()
    }

    if (canPoll()) {
      runtime.lastImmediateAt = now()
      void requestNow()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', refreshForBrowserEvent)
    window.addEventListener('pageshow', refreshForBrowserEvent)
    window.addEventListener('online', refreshForBrowserEvent)
    window.addEventListener('offline', handleOffline)

    return () => {
      runtime.active = false
      clearTimer()
      runtime.controller?.abort()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', refreshForBrowserEvent)
      window.removeEventListener('pageshow', refreshForBrowserEvent)
      window.removeEventListener('online', refreshForBrowserEvent)
      window.removeEventListener('offline', handleOffline)
      if (runtimeRef.current === runtime) runtimeRef.current = null
    }
  }, [enabled, now, random])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!enabled || !runtime?.active) return
    runtime.scheduleNext?.()
  }, [enabled, stateKey])
}

export default useSystemMaintenanceMonitor
