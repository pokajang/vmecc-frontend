import { apiRequest } from './httpClient'

export const fetchDashboardModuleStats = (module, period = 'this_month', options = {}) =>
  apiRequest(`/stats/${encodeURIComponent(module)}?period=${encodeURIComponent(period)}`, {
    ...(options || {}),
    signal: options?.signal,
  })

export const fetchDashboardModulesStats = (modules, period = 'this_month', options = {}) => {
  const selectedModules = Array.isArray(modules) ? modules.filter(Boolean) : []
  const query = new URLSearchParams({
    period,
    modules: selectedModules.join(','),
  })

  return apiRequest(`/stats?${query.toString()}`, {
    ...(options || {}),
    signal: options?.signal,
  })
}

export const fetchDashboardActionQueue = (options = {}) =>
  apiRequest('/dashboard/action-queue', {
    ...(options || {}),
    signal: options?.signal,
  })
