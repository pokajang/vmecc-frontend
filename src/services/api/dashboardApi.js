import { apiRequest } from './httpClient'

export const fetchMyDashboardStats = () => apiRequest('/dashboard/me')
