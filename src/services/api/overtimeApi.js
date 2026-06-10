import { apiRequest } from './httpClient'

export const fetchOvertimeRecords = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/overtime?${query.toString()}` : '/overtime'
  return apiRequest(path)
}

export const fetchOvertimeRecord = (id) => apiRequest(`/overtime/${id}`)
export const createOvertimeRecord = (payload) =>
  apiRequest('/overtime', { method: 'POST', body: JSON.stringify(payload || {}) })
export const updateOvertimeRecord = (id, payload) =>
  apiRequest(`/overtime/${id}`, { method: 'PUT', body: JSON.stringify(payload || {}) })
export const deleteOvertimeRecordApi = (id) => apiRequest(`/overtime/${id}`, { method: 'DELETE' })
export const cancelOvertimeRecord = (id, payload = {}) =>
  apiRequest(`/overtime/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) })

export const fetchOvertimeDraft = () => apiRequest('/overtime/draft')
export const saveOvertimeDraftApi = (payload) =>
  apiRequest('/overtime/draft', { method: 'POST', body: JSON.stringify({ payload }) })
export const clearOvertimeDraftApi = () => apiRequest('/overtime/draft', { method: 'DELETE' })
export const fetchOvertimePolicy = () => apiRequest('/overtime/policy')
export const fetchOvertimeEligibility = () => apiRequest('/overtime/eligibility')
export const classifyOvertimeDateApi = (claimDate) =>
  apiRequest(`/overtime/classify-date?claim_date=${encodeURIComponent(String(claimDate || ''))}`)

export const fetchStaffOvertimeRecords = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString()
    ? `/staff/overtime/records?${query.toString()}`
    : '/staff/overtime/records'
  return apiRequest(path)
}

export const fetchStaffOvertimeRecord = (ownerId, recordId) =>
  apiRequest(`/staff/overtime/records/${ownerId}/${recordId}`)
export const reviewStaffOvertimeRecord = (ownerId, recordId, payload = {}) =>
  apiRequest(`/staff/overtime/records/${ownerId}/${recordId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
export const recommendStaffOvertimeRecord = (ownerId, recordId, payload = {}) =>
  apiRequest(`/staff/overtime/records/${ownerId}/${recordId}/recommend`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
export const approveStaffOvertimeRecord = (ownerId, recordId, payload = {}) =>
  apiRequest(`/staff/overtime/records/${ownerId}/${recordId}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
export const rejectStaffOvertimeRecord = (ownerId, recordId, payload = {}) =>
  apiRequest(`/staff/overtime/records/${ownerId}/${recordId}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
export const cancelStaffOvertimeRecord = (ownerId, recordId, payload = {}) =>
  apiRequest(`/staff/overtime/records/${ownerId}/${recordId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
