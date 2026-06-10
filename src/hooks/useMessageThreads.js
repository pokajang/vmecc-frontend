import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { fetchMessageThreads } from 'src/services/apiClient'
import { broadcastThreads, getIsLeader, initMessageLeader } from './useMessageLeader'
import { logError } from 'src/services/logger'

const BASE_INTERVAL = 10000
const MAX_BACKOFF = 60000

// Errors that warrant exponential backoff — server overload, auth loss, network down
const shouldBackoff = (err) => {
  if (!err) return false
  const status = err?.status
  if (status === 429 || status === 503 || status === 401 || status === 0) return true
  if (!status && (err instanceof TypeError || err?.message === 'Network Error')) return true
  return false
}

let state = {
  data: [],
  loading: false,
  error: null,
}

const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

let subscribers = new Set()
let timerId = null
let inFlight = null
let authUserId = null
let isVisible = true
let isIdle = false
let idleTimerId = null
let visibilityAttached = false
let idleAttached = false
let backoffMs = 0

const notify = () => {
  subscribers.forEach((listener) => listener(state))
}

const setState = (patch) => {
  state = { ...state, ...patch }
  notify()
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
  IDLE_EVENTS.forEach((evt) => document.addEventListener(evt, resetIdleTimer, { passive: true }))
  resetIdleTimer()
}

const ensureVisibilityListener = () => {
  if (visibilityAttached || typeof document === 'undefined') return
  const handleVisibility = () => {
    isVisible = !document.hidden
    if (isVisible) {
      resetIdleTimer()
      schedulePoll(0)
    }
  }
  visibilityAttached = true
  document.addEventListener('visibilitychange', handleVisibility)
  handleVisibility()
}

const stopPolling = () => {
  if (timerId) {
    clearTimeout(timerId)
    timerId = null
  }
}

const schedulePoll = (delay) => {
  stopPolling()
  timerId = setTimeout(async () => {
    if (!subscribers.size) return
    if (!isVisible || isIdle || !getIsLeader()) {
      schedulePoll(BASE_INTERVAL)
      return
    }
    await fetchThreads({ silent: true })
    schedulePoll(BASE_INTERVAL + backoffMs)
  }, delay)
}

const fetchThreads = async ({ silent = false } = {}) => {
  if (inFlight || !authUserId) return inFlight
  if (!silent && state.data.length === 0) {
    setState({ loading: true, error: null })
  }
  inFlight = fetchMessageThreads({ limit: 300 })
    .then((response) => {
      backoffMs = 0
      const data = response?.data || []
      setState({ data, loading: false, error: null })
      broadcastThreads(data)
    })
    .catch((err) => {
      if (shouldBackoff(err)) {
        backoffMs = Math.min(backoffMs ? backoffMs * 2 : 15000, MAX_BACKOFF)
      }
      // Log every poll failure so ops can detect systemic API issues without user reports
      if (err?.status !== 401) {
        logError('[useMessageThreads] fetchThreads failed', err, { status: err?.status })
      }
      if (!silent) {
        setState({ loading: false, error: err?.payload?.message || 'Unable to load messages.' })
      }
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

const setAuthUserId = (nextId) => {
  if (authUserId === nextId) return
  authUserId = nextId
  backoffMs = 0 // reset backoff on every user change so a new session is never penalised for a prior one
  if (!authUserId) {
    setState({ data: [], loading: false, error: null })
    stopPolling()
    return
  }
  setState({ data: [], loading: false, error: null })
  fetchThreads({ silent: false })
  schedulePoll(BASE_INTERVAL)
}

let leaderCleanup = null

const subscribe = (listener) => {
  subscribers.add(listener)
  ensureVisibilityListener()
  ensureIdleListener()
  listener(state)
  if (subscribers.size === 1) {
    leaderCleanup = initMessageLeader(
      (nowLeader) => {
        // Leadership changed — start or stop polling accordingly
        if (nowLeader && authUserId) {
          fetchThreads({ silent: false })
          schedulePoll(BASE_INTERVAL)
        }
      },
      (threads) => {
        // Received broadcast from leader tab — update state without fetching
        setState({ data: threads, loading: false, error: null })
      },
    )
    if (authUserId) schedulePoll(0)
  }
  return () => {
    subscribers.delete(listener)
    if (!subscribers.size) {
      stopPolling()
      if (leaderCleanup) {
        leaderCleanup()
        leaderCleanup = null
      }
      // Reset attachment flags so a remount (e.g. same-tab session swap) re-initialises listeners
      visibilityAttached = false
      idleAttached = false
    }
  }
}

export const refreshMessageThreads = () => fetchThreads({ silent: false })
export const isMessagingIdle = () => isIdle

export const updateMessageThreads = (updater) => {
  const nextData = typeof updater === 'function' ? updater(state.data) : updater
  setState({ data: nextData })
}

const useMessageThreads = () => {
  const authUser = useSelector((store) => store.authUser)
  const [localState, setLocalState] = useState(state)

  useEffect(() => {
    setAuthUserId(authUser?.id || null)
  }, [authUser?.id])

  useEffect(() => subscribe(setLocalState), [])

  return {
    threads: localState.data,
    loading: localState.loading,
    error: localState.error,
    refresh: refreshMessageThreads,
    updateThreads: updateMessageThreads,
  }
}

export default useMessageThreads
