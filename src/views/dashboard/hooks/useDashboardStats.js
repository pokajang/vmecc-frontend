import { useEffect, useMemo, useState } from 'react'
import { fetchDashboardModuleStats } from 'src/services/apiClient'

export const DASHBOARD_MODULES = ['payroll', 'overtime', 'leave', 'roster', 'reports']

const createEmptyStats = () =>
  DASHBOARD_MODULES.reduce((acc, module) => {
    acc[module] = {}
    return acc
  }, {})

const normalizeModules = (modules) =>
  Array.isArray(modules)
    ? modules.filter((module) => DASHBOARD_MODULES.includes(module))
    : DASHBOARD_MODULES

const useDashboardStats = ({ period = 'this_month', modules } = {}) => {
  const selectedModules = useMemo(() => normalizeModules(modules), [modules])
  const modulesKey = selectedModules.join('|')
  const [stats, setStats] = useState(() => createEmptyStats())
  const [loading, setLoading] = useState(selectedModules.length > 0)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const modulesForRequest = modulesKey ? modulesKey.split('|') : []

    Promise.resolve().then(async () => {
      if (cancelled) return

      setStats(createEmptyStats())
      setError(null)

      if (modulesForRequest.length === 0) {
        setLoading(false)
        return
      }

      setLoading(true)

      const results = await Promise.allSettled(
        modulesForRequest.map((module) =>
          fetchDashboardModuleStats(module, period).then((payload) => [module, payload ?? {}]),
        ),
      )
      if (cancelled) return

      const nextStats = createEmptyStats()
      const failedModules = []

      results.forEach((result, index) => {
        const module = modulesForRequest[index]
        if (result.status === 'fulfilled') {
          const [resolvedModule, payload] = result.value
          nextStats[resolvedModule] = payload
          return
        }
        failedModules.push(module)
      })

      setStats(nextStats)
      setError(
        failedModules.length > 0
          ? new Error(`Failed to load dashboard stats for: ${failedModules.join(', ')}`)
          : null,
      )
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [modulesKey, period])

  return { stats, loading, error }
}

export default useDashboardStats
