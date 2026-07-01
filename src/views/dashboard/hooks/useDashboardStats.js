import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchDashboardModuleStats } from 'src/services/apiClient'

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
const parseModuleKey = (moduleKey) => (moduleKey ? moduleKey.split('|') : [])

const useDashboardStats = ({ period = 'this_month', modules, refreshToken = 0 } = {}) => {
  const selectedModuleKey = useMemo(() => buildModuleKey(modules), [modules])
  const selectedModules = useMemo(() => parseModuleKey(selectedModuleKey), [selectedModuleKey])
  const [moduleStateMap, setModuleStateMap] = useState(() => createEmptyModuleState())
  const requestIdRef = useRef(0)

  const loading = selectedModules.some((module) => moduleStateMap[module]?.loading)
  const erroredModules = selectedModules.filter((module) => Boolean(moduleStateMap[module]?.error))
  const error =
    erroredModules.length > 0
      ? new Error(`Failed to load dashboard stats for: ${erroredModules.join(', ')}`)
      : null
  const stats = useMemo(() => {
    const nextStats = createEmptyStats()
    DASHBOARD_MODULES.forEach((module) => {
      nextStats[module] = moduleStateMap[module]?.stats || {}
    })
    return nextStats
  }, [moduleStateMap])

  useEffect(() => {
    if (selectedModules.length === 0) {
      setModuleStateMap((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([module]) => [
            module,
            { ...prev[module], loading: false, loaded: true },
          ]),
        ),
      )
      return undefined
    }

    const requestId = ++requestIdRef.current
    const controllers = {}
    const timeoutTimerIds = new Set()

    const withRequestStateReset = selectedModules.reduce((acc, module) => {
      acc[module] = { loading: true, loaded: false, error: null, stats: {} }
      return acc
    }, {})

    setModuleStateMap((prev) => ({ ...prev, ...withRequestStateReset }))

    const requests = selectedModules.map(async (module) => {
      const controller = new AbortController()
      controllers[module] = controller
      let timerId

      const timeoutPromise = new Promise((resolve) => {
        timerId = setTimeout(() => {
          clearTimeout(timerId)
          resolve({
            module,
            error: new Error(`${module} dashboard stats request timed out`),
          })
        }, DASHBOARD_MODULE_FETCH_TIMEOUT_MS)
        timeoutTimerIds.add(timerId)
        controller.signal.addEventListener('abort', () => clearTimeout(timerId), { once: true })
      })

      try {
        const result = await Promise.race([
          fetchDashboardModuleStats(module, period, {
            signal: controller.signal,
          }).then((payload) => ({
            module,
            payload: payload ?? {},
          })),
          timeoutPromise,
        ])
        return result
      } catch (error) {
        if (error?.name === 'AbortError') {
          return null
        }
        return { module, error }
      } finally {
        if (timerId) {
          clearTimeout(timerId)
          timeoutTimerIds.delete(timerId)
        }
      }
    })

    Promise.allSettled(requests).then((results) => {
      if (requestId !== requestIdRef.current) return

      const nextState = selectedModules.reduce((acc, module, index) => {
        const result = results[index]
        const value = result?.status === 'fulfilled' ? result.value : null
        const fetchError =
          value?.error ||
          (result?.status === 'rejected'
            ? result.reason || new Error(`${module} dashboard stats request failed`)
            : null)

        acc[module] = {
          loading: false,
          loaded: !fetchError,
          error: fetchError ? String(fetchError.message || fetchError) : null,
          stats: value?.payload || {},
        }
        return acc
      }, {})

      setModuleStateMap((prev) => ({ ...prev, ...nextState }))
    })

    return () => {
      Object.values(controllers).forEach((controller) => controller.abort())
      timeoutTimerIds.forEach((timerId) => clearTimeout(timerId))
    }
  }, [period, refreshToken, selectedModules])

  return {
    stats,
    loading,
    error,
    moduleStats: moduleStateMap,
  }
}

export default useDashboardStats
