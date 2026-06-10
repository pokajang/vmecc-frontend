import { apiRequest } from './httpClient'

export const loginRequest = (credentials) =>
  apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })

export const requestPasswordReset = (payload) =>
  apiRequest('/password/forgot', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const resetPassword = (payload) =>
  apiRequest('/password/reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const logoutRequest = () =>
  apiRequest('/auth/logout', {
    method: 'POST',
  })

export const fetchSession = () => apiRequest('/auth/session')

export const fetchGoogleAuthUrl = () => apiRequest('/auth/google/redirect')

export const fetchUsers = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/users?${query.toString()}` : '/users'
  return apiRequest(path)
}

export const createUser = (payload) =>
  apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const changePassword = (payload) =>
  apiRequest('/auth/password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateProfile = (payload) =>
  apiRequest('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const uploadProfileImage = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return apiRequest('/profile/image', { method: 'POST', body: formData })
}

export const deleteProfileImage = () =>
  apiRequest('/profile/image', {
    method: 'DELETE',
  })

export const updateUserStatus = (id, status) =>
  apiRequest(`/users/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })

export const updateUserRole = (id, role) =>
  apiRequest(`/users/${id}/role`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  })

export const replaceUserRoleAssignments = (id, roleAssignments) =>
  apiRequest(`/users/${id}/role-assignments`, {
    method: 'PUT',
    body: JSON.stringify({ role_assignments: roleAssignments }),
  })

export const addUserRoleAssignments = (id, roleAssignments) =>
  apiRequest(`/users/${id}/role-assignments`, {
    method: 'POST',
    body: JSON.stringify({ role_assignments: roleAssignments }),
  })

export const updateUserRoleAssignment = (id, assignmentId, payload) =>
  apiRequest(`/users/${id}/role-assignments/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteUserRoleAssignment = (id, assignmentId) =>
  apiRequest(`/users/${id}/role-assignments/${assignmentId}`, {
    method: 'DELETE',
  })

export const sendUserPasswordReset = (id) =>
  apiRequest(`/users/${id}/reset-password`, {
    method: 'POST',
  })

export const lockUser = (id, reason) =>
  apiRequest(`/users/${id}/lock`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  })

export const unlockUser = (id) =>
  apiRequest(`/users/${id}/unlock`, {
    method: 'POST',
  })

export const deleteUser = (id, options = {}) => {
  const query = new URLSearchParams()
  if (options?.permanent) {
    query.set('force', '1')
  }
  const path = query.toString() ? `/users/${id}?${query.toString()}` : `/users/${id}`
  return apiRequest(path, {
    method: 'DELETE',
  })
}

export const restoreUser = (id) =>
  apiRequest(`/users/${id}/restore`, {
    method: 'POST',
  })
