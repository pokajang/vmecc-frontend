import { apiRequest } from './httpClient'

// Teams
export const fetchTeams = () => apiRequest('/teams')
export const fetchTeam = (id) => apiRequest(`/teams/${id}`)
export const createTeam = (payload) =>
  apiRequest('/teams', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
export const updateTeam = (id, payload) =>
  apiRequest(`/teams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

/**
 * Update team with an optional file upload in a single atomic request.
 * Uses multipart/form-data with a _method=PUT field (Laravel method spoofing)
 * so the image and the JSON payload travel together.
 */
export const updateTeamWithImage = (id, payload, imageFile) => {
  const formData = new FormData()
  formData.append('_method', 'PUT')
  formData.append('name', payload.name ?? '')
  if (payload.members) {
    formData.append('members', JSON.stringify(payload.members))
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'image_url')) {
    // null means clear; string means preset key
    formData.append('image_url', payload.image_url ?? '')
  }
  if (imageFile) {
    formData.append('image', imageFile)
  }
  return apiRequest(`/teams/${id}`, { method: 'POST', body: formData })
}

export const deleteTeam = (id) => apiRequest(`/teams/${id}`, { method: 'DELETE' })
export const uploadTeamImage = (id, file) => {
  const formData = new FormData()
  formData.append('image', file)
  return apiRequest(`/teams/${id}/image`, { method: 'POST', body: formData })
}

// Rosters
export const fetchRosters = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      if (key === 'months') {
        // Backend accepts comma-separated months, so join to ensure multiple months are not lost.
        query.append(key, value.join(','))
      } else {
        value.forEach((v) => query.append(key, v))
      }
    } else {
      query.append(key, value)
    }
  })
  const path = query.toString() ? `/rosters?${query.toString()}` : '/rosters'
  return apiRequest(path)
}

export const saveRosters = (entries) =>
  apiRequest('/rosters', {
    method: 'POST',
    body: JSON.stringify({ entries }),
  })

export const publishRosters = (entries, scopeLabel) =>
  apiRequest('/rosters/publish', {
    method: 'POST',
    body: JSON.stringify({ entries, scope_label: scopeLabel }),
  })

// Settings - shift windows
export const fetchShiftWindows = () => apiRequest('/settings/shift-windows')
export const saveShiftWindows = (payload) =>
  apiRequest('/settings/shift-windows', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

// Settings - all shifts (built-ins + custom, ordered) — used by roster assignment UI
export const fetchAllShifts = () => apiRequest('/settings/all-shifts')

// Settings - custom shifts
export const fetchCustomShifts = () => apiRequest('/settings/custom-shifts')
export const saveCustomShift = (payload) =>
  apiRequest('/settings/custom-shifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
export const updateCustomShift = (id, payload) =>
  apiRequest(`/settings/custom-shifts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
export const deleteCustomShift = (id) =>
  apiRequest(`/settings/custom-shifts/${id}`, { method: 'DELETE' })
