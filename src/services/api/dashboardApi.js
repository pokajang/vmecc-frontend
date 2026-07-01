import { apiRequest } from './httpClient'

export const fetchMyDashboardStats = () => apiRequest('/dashboard/me')

export const fetchDashboardModuleStats = (module, period = 'this_month', options = {}) =>
  apiRequest(`/stats/${encodeURIComponent(module)}?period=${encodeURIComponent(period)}`, {
    ...(options || {}),
    signal: options?.signal,
  })
