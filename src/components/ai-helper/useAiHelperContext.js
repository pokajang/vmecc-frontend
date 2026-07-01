import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { fetchAiHelperContext } from 'src/services/apiClient'
import {
  AI_HELPER_CONTEXT_STALE_MS,
  AI_HELPER_LANDING_GROUP_LIMIT,
  getPromptStarters,
  safeAiHelperError,
} from './constants'
import { resolveAiHelperRouteContext, routeContextSignature } from './routeContext'

const isContextStale = (loadedAt) => {
  if (!loadedAt) return false
  return Date.now() - loadedAt >= AI_HELPER_CONTEXT_STALE_MS
}

const makeContextCacheEntry = (data = null, loadedAt = null) => ({
  data,
  loadedAt,
  loading: false,
})

const useAiHelperContext = ({ location, open }) => {
  const [contextState, setContextState] = useState({
    status: 'idle',
    data: null,
    error: null,
    loadedAt: null,
    isStale: false,
  })
  const contextCacheRef = useRef({})
  const routeContext = useMemo(() => resolveAiHelperRouteContext(location), [location])
  const routeSignature = useMemo(() => routeContextSignature(routeContext), [routeContext])
  const currentPageContext = contextState.data?.page || routeContext
  const promptStarters = useMemo(
    () => getPromptStarters(currentPageContext).slice(0, AI_HELPER_LANDING_GROUP_LIMIT),
    [currentPageContext],
  )

  useEffect(() => {
    if (!open) return

    const cached = contextCacheRef.current[routeSignature]
    if (cached?.data) {
      setContextState({
        status: 'ready',
        data: cached.data,
        error: null,
        loadedAt: cached.loadedAt,
        isStale: isContextStale(cached.loadedAt),
      })

      if (!isContextStale(cached.loadedAt)) return
    }

    if (cached?.loading) return

    contextCacheRef.current[routeSignature] = makeContextCacheEntry(cached?.data, cached?.loadedAt)
    contextCacheRef.current[routeSignature].loading = true

    if (!cached?.data) {
      setContextState((prev) => ({ ...prev, status: 'loading', error: null }))
    }

    let cancelled = false
    fetchAiHelperContext(routeContext)
      .then((response) => {
        if (cancelled) return
        const next = response?.data || null
        const loadedAt = Date.now()
        contextCacheRef.current[routeSignature] = makeContextCacheEntry(next, loadedAt)
        setContextState({
          status: 'ready',
          data: next,
          error: null,
          loadedAt,
          isStale: false,
        })
      })
      .catch((error) => {
        if (cancelled) return
        const latestCached = contextCacheRef.current[routeSignature]
        if (latestCached?.data) {
          setContextState((prev) => ({
            ...prev,
            status: 'ready',
            data: latestCached.data,
            error: safeAiHelperError(error, 'Page guidance is unavailable.'),
            loadedAt: latestCached.loadedAt,
            isStale: isContextStale(latestCached.loadedAt),
          }))
          contextCacheRef.current[routeSignature] = {
            ...latestCached,
            loading: false,
          }
          return
        }

        setContextState({
          status: 'error',
          data: null,
          error: safeAiHelperError(error, 'Page guidance is unavailable.'),
          loadedAt: null,
          isStale: false,
        })
        contextCacheRef.current[routeSignature] = makeContextCacheEntry(null, null)
      })
      .finally(() => {
        if (cancelled) return
        if (contextCacheRef.current[routeSignature]?.loading) {
          contextCacheRef.current[routeSignature].loading = false
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, routeContext, routeSignature])

  const refreshCurrentContext = useCallback(() => {
    delete contextCacheRef.current[routeSignature]
    return fetchAiHelperContext(routeContext)
      .then((response) => {
        const next = response?.data || null
        const loadedAt = Date.now()
        contextCacheRef.current[routeSignature] = makeContextCacheEntry(next, loadedAt)
        setContextState({
          status: 'ready',
          data: next,
          error: null,
          loadedAt,
          isStale: false,
        })
      })
      .catch(() => null)
  }, [routeContext, routeSignature])

  return {
    contextPage: contextState.data?.page,
    contextState,
    currentPageContext,
    promptStarters,
    refreshCurrentContext,
    routeContext,
  }
}

export default useAiHelperContext
