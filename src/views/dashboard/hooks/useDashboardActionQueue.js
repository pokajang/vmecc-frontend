import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDashboardActionQueue } from 'src/services/apiClient'

const ACTION_QUEUE_TIMEOUT_MS = 10_000

const useDashboardActionQueue = ({ refreshToken = 0 } = {}) => {
  const [state, setState] = useState({ items: [], loading: true, error: null, asOf: null })
  const requestIdRef = useRef(0)

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, ACTION_QUEUE_TIMEOUT_MS)
    setState((current) => ({ ...current, loading: true, error: null }))

    fetchDashboardActionQueue({ signal: controller.signal })
      .then((payload) => {
        if (requestId !== requestIdRef.current) return
        setState({
          items: Array.isArray(payload?.items) ? payload.items : [],
          loading: false,
          error: null,
          asOf: payload?.asOf || null,
        })
      })
      .catch((error) => {
        if (requestId !== requestIdRef.current) return
        if (timedOut) {
          setState((current) => ({
            ...current,
            loading: false,
            error: 'The request timed out. Check your connection and retry.',
          }))
          return
        }
        if (error?.name === 'AbortError') return
        setState((current) => ({
          ...current,
          loading: false,
          error: error?.message || 'Unable to load action queue.',
        }))
      })
      .finally(() => window.clearTimeout(timeoutId))

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  useEffect(() => {
    let cancelRequest
    const timerId = window.setTimeout(() => {
      cancelRequest = load()
    }, 0)

    return () => {
      window.clearTimeout(timerId)
      cancelRequest?.()
    }
  }, [load, refreshToken])

  useEffect(() => {
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)
    return () => {
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [load])

  return { ...state, retry: load }
}

export default useDashboardActionQueue
