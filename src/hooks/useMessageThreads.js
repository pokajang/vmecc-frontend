import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { fetchMessageThreads } from 'src/services/apiClient'
import { broadcastThreads, getIsLeader, initMessageLeader } from './useMessageLeader'
import { logError } from 'src/services/logger'

const BASE_INTERVAL = 10000
const MAX_BACKOFF = 60000
const IDLE_TIMEOUT = 5 * 60 * 1000
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

const shouldBackoff = (err) => {
  if (!err) return false
  const status = err?.status
  if (status === 429 || status === 503 || status === 401 || status === 0) return true
  if (!status && (err instanceof TypeError || err?.message === 'Network Error')) return true
  return false
}

const isModuleDisabledError = (err) =>
  err?.status === 403 &&
  /module is disabled/i.test(String(err?.payload?.message || err?.message || ''))

let state = { data: [], loading: false, error: null }
let subscribers = new Map()
let subscriberId = 0
let timerId = null
let inFlight = null
let activeRequestController = null
let authUserId = null
let isVisible = true
let isIdle = false
let idleTimerId = null
let visibilityAttached = false
let idleAttached = false
let lifecycleAttached = false
let visibilityHandler = null
let lifecycleHandler = null
let isPageUnloading = false
let backoffMs = 0
let moduleBlocked = false
let leaderCleanup = null

const notify = () => subscribers.forEach(({ listener }) => listener(state))
const setState = (patch) => {
  state = { ...state, ...patch }
  notify()
}

const hasEnabledSubscribers = () => subscribers.size > 0 && Boolean(authUserId) && !moduleBlocked

const stopPolling = () => {
  if (timerId) {
    clearTimeout(timerId)
    timerId = null
  }
}

const abortRequest = () => {
  activeRequestController?.abort()
  activeRequestController = null
}

const schedulePoll = (delay) => {
  stopPolling()
  if (!hasEnabledSubscribers()) return
  timerId = setTimeout(async () => {
    if (!hasEnabledSubscribers()) return
    if (!isVisible || isIdle || !getIsLeader()) {
      schedulePoll(BASE_INTERVAL)
      return
    }
    await fetchThreads({ silent: true })
    schedulePoll(BASE_INTERVAL + backoffMs)
  }, delay)
}

const resetIdleTimer = () => {
  if (idleTimerId) clearTimeout(idleTimerId)
  if (isIdle) {
    isIdle = false
    schedulePoll(0)
  }
  idleTimerId = setTimeout(() => {
    isIdle = true
  }, IDLE_TIMEOUT)
}

const ensureIdleListener = () => {
  if (idleAttached || typeof document === 'undefined') return
  idleAttached = true
  IDLE_EVENTS.forEach((event) =>
    document.addEventListener(event, resetIdleTimer, { passive: true }),
  )
  resetIdleTimer()
}

const ensureVisibilityListener = () => {
  if (visibilityAttached || typeof document === 'undefined') return
  visibilityAttached = true
  visibilityHandler = () => {
    isVisible = !document.hidden
    if (isVisible) {
      resetIdleTimer()
      schedulePoll(0)
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)
  isVisible = !document.hidden
}

const ensureLifecycleListener = () => {
  if (lifecycleAttached || typeof window === 'undefined') return
  lifecycleAttached = true
  isPageUnloading = false
  lifecycleHandler = () => {
    isPageUnloading = true
    abortRequest()
  }
  window.addEventListener('pagehide', lifecycleHandler)
  window.addEventListener('beforeunload', lifecycleHandler)
}

const detachListeners = () => {
  if (typeof document !== 'undefined') {
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
    IDLE_EVENTS.forEach((event) => document.removeEventListener(event, resetIdleTimer))
  }
  if (typeof window !== 'undefined' && lifecycleHandler) {
    window.removeEventListener('pagehide', lifecycleHandler)
    window.removeEventListener('beforeunload', lifecycleHandler)
  }
  if (idleTimerId) clearTimeout(idleTimerId)
  idleTimerId = null
  visibilityAttached = false
  idleAttached = false
  lifecycleAttached = false
  visibilityHandler = null
  lifecycleHandler = null
}

const isUnloadFetchFailure = (err) =>
  isPageUnloading && !err?.status && (err instanceof TypeError || err?.message === 'Network Error')

const fetchThreads = async ({ silent = false } = {}) => {
  if (inFlight || !hasEnabledSubscribers()) return inFlight
  if (!silent && state.data.length === 0) setState({ loading: true, error: null })

  const controller = new AbortController()
  activeRequestController = controller
  inFlight = fetchMessageThreads({ limit: 300 }, { signal: controller.signal })
    .then((response) => {
      if (!hasEnabledSubscribers()) return
      backoffMs = 0
      const data = response?.data || []
      setState({ data, loading: false, error: null })
      broadcastThreads(data)
    })
    .catch((err) => {
      if (controller.signal.aborted || isUnloadFetchFailure(err)) return
      if (isModuleDisabledError(err)) {
        moduleBlocked = true
        stopPolling()
        setState({ data: [], loading: false, error: null })
        broadcastThreads([])
        return
      }
      if (shouldBackoff(err)) {
        backoffMs = Math.min(backoffMs ? backoffMs * 2 : 15000, MAX_BACKOFF)
      }
      if (err?.status !== 401) {
        logError('[useMessageThreads] fetchThreads failed', err, { status: err?.status })
      }
      if (!silent) {
        setState({ loading: false, error: err?.payload?.message || 'Unable to load messages.' })
      }
    })
    .finally(() => {
      if (activeRequestController === controller) activeRequestController = null
      inFlight = null
    })
  return inFlight
}

const syncAuthUser = () => {
  const nextAuthUserId = subscribers.values().next().value?.userId || null
  if (authUserId === nextAuthUserId) return
  authUserId = nextAuthUserId
  backoffMs = 0
  moduleBlocked = false
  stopPolling()
  abortRequest()
  setState({ data: [], loading: false, error: null })
}

const startPollingForLeader = () => {
  if (!hasEnabledSubscribers() || !getIsLeader()) return
  void fetchThreads({ silent: false })
  schedulePoll(BASE_INTERVAL)
}

const subscribe = (listener, userId) => {
  const id = ++subscriberId
  const wasEmpty = subscribers.size === 0
  subscribers.set(id, { listener, userId })
  syncAuthUser()
  ensureLifecycleListener()
  ensureVisibilityListener()
  ensureIdleListener()
  listener(state)

  if (wasEmpty) {
    leaderCleanup = initMessageLeader(
      (nowLeader) => {
        if (nowLeader) startPollingForLeader()
        else stopPolling()
      },
      (threads) => setState({ data: threads, loading: false, error: null }),
    )
  }
  startPollingForLeader()

  return () => {
    subscribers.delete(id)
    syncAuthUser()
    if (!subscribers.size) {
      stopPolling()
      abortRequest()
      if (leaderCleanup) {
        leaderCleanup()
        leaderCleanup = null
      }
      detachListeners()
    }
  }
}

export const refreshMessageThreads = () => fetchThreads({ silent: false })
export const isMessagingIdle = () => isIdle

export const updateMessageThreads = (updater) => {
  if (!hasEnabledSubscribers()) return
  const nextData = typeof updater === 'function' ? updater(state.data) : updater
  setState({ data: nextData })
}

const useMessageThreads = ({ enabled = true } = {}) => {
  const authUser = useSelector((store) => store.authUser)
  const [localState, setLocalState] = useState(state)

  useEffect(() => {
    if (!enabled || !authUser?.id) return undefined
    return subscribe(setLocalState, authUser.id)
  }, [authUser?.id, enabled])

  return {
    threads: localState.data,
    loading: localState.loading,
    error: localState.error,
    refresh: refreshMessageThreads,
    updateThreads: updateMessageThreads,
  }
}

export default useMessageThreads
