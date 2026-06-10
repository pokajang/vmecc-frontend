import { apiRequest } from './httpClient'

// Role permissions matrix
export const fetchRolePermissions = () => apiRequest('/settings/role-permissions')
export const saveRolePermissions = (matrix) =>
  apiRequest('/settings/role-permissions', {
    method: 'PUT',
    body: JSON.stringify({ matrix }),
  })
