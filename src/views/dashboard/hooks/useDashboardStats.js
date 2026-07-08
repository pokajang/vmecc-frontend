import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchDashboardModulesStats } from 'src/services/apiClient'

export const DASHBOARD_MODULES = ['payroll', 'overtime', 'leave', 'roster', 'reports']
const DASHBOARD_MODULE_FETCH_TIMEOUT_MS = 10_000

const createEmptyModuleState = () =>
  DASHBOARD_MODULES.reduce((acc, module) => {
    acc[module] = {
      loading: false,
      loaded: false,
      error: null,
      stats: {},
    }
    return acc
  }, {})

const createEmptyStats = () =>
  DASHBOARD_MODULES.reduce((acc, module) => {
    acc[module] = {}
    return acc
  }, {})

const normalizeModules = (modules) =>
  Array.isArray(modules)
    ? modules.filter((module) => DASHBOARD_MODULES.includes(module))
    : DASHBOARD_MODULES

const buildModuleKey = (modules) => normalizeModules(modules).join('|')
const buildRequestKey = ({ period, refreshToken, selectedModuleKey }) =>
  [period, refreshToken, selectedModuleKey].join('::')
const parseModuleKey = (moduleKey) => (moduleKey ? moduleKey.split('|') : [])

const useDashboardStats = ({ period = 'this_month', modules, refreshToken = 0 } = {}) => {
  const selectedModuleKey = useMemo(() => buildModuleKey(modules), [modules])
  const selectedModules = useMemo(() => parseModuleKey(selectedModuleKey), [selectedModuleKey])
  const [moduleStateMap, setModuleStateMap] = useState(() => createEmptyModuleState())
  const requestKey = useMemo(
    () => buildRequestKey({ period, refreshToken, selectedModuleKey }),
    [period, refreshToken, selectedModuleKey],
  )
  const [resolvedRequestKey, setResolvedRequestKey] = useState(() =>
    selectedModules.length === 0 ? requestKey : '',
  )
  const requestIdRef = useRef(0)
  const requestPending = selectedModules.length > 0 && requestKey !== resolvedRequestKey

  const effectiveModuleStateMap = useMemo(() => {
    if (!requestPending) return moduleStateMap

    const nextState = { ...moduleStateMap }
    selectedModules.forEach((module) => {
      nextState[module] = {
        loading: true,
        loaded: false,
        error: null,
        stats: {},
      }
    })
    return nextState
  }, [moduleStateMap, requestPending, selectedModules])

  const loading = selectedModules.some((module) => effectiveModuleStateMap[module]?.loading)
  const erroredModules = selectedModules.filter((module) =>
    Boolean(effectiveModuleStateMap[module]?.error),
  )
  const error =
    erroredModules.length > 0
      ? new Error(`Failed to load dashboard stats for: ${erroredModules.join(', ')}`)
      : null
  const stats = useMemo(() => {
    const nextStats = createEmptyStats()
    DASHBOARD_MODULES.forEach((module) => {
      nextStats[module] = effectiveModuleStateMap[module]?.stats || {}
    })
    return nextStats
  }, [effectiveModuleStateMap])

  useEffect(() => {
    if (selectedModules.length === 0 || requestKey === resolvedRequestKey) {
      return undefined
    }

    const requestId = ++requestIdRef.current
    const controller = new AbortController()
    let timerId

    const timeoutPromise = new Promise((resolve) => {
      timerId = setTimeout(() => {
        resolve({
          error: new Error('dashboard stats request timed out'),
        })
      }, DASHBOARD_MODULE_FETCH_TIMEOUT_MS)
      controller.signal.addEventListener('abort', () => clearTimeout(timerId), { once: true })
    })

    Promise.race([
      fetchDashboardModulesStats(selectedModules, period, {
        signal: controller.signal,
      }).then((payload) => ({
        payload: payload ?? {},
      })),
      timeoutPromise,
    ])
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return null
        }
        return { error }
      })
      .then((result) => {
        if (timerId) clearTimeout(timerId)
        if (requestId !== requestIdRef.current || result === null) return

        const nextState = selectedModules.reduce((acc, module) => {
          const fetchError = result?.error || null
          const payload = result?.payload?.[module] ?? {}

          acc[module] = {
            loading: false,
            loaded: !fetchError,
            error: fetchError
              ? String(fetchError.message || fetchError).replace(
                  /^dashboard/,
                  `${module} dashboard`,
                )
              : null,
            stats: fetchError ? {} : payload,
          }
          return acc
        }, {})

        setResolvedRequestKey(requestKey)
        setModuleStateMap((prev) => ({ ...prev, ...nextState }))
      })

    return () => {
      controller.abort()
      if (timerId) clearTimeout(timerId)
    }
  }, [period, refreshToken, requestKey, resolvedRequestKey, selectedModules])

  return {
    stats,
    loading,
    error,
    moduleStats: effectiveModuleStateMap,
  }
}

export default useDashboardStats
