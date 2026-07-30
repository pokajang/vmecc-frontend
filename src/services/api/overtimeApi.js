import { apiRequest } from './httpClient'

export const fetchOvertimeRecords = (params = {}, options = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/overtime?${query.toString()}` : '/overtime'
  return apiRequest(path, options)
}

export const fetchOvertimeRecord = (id) => apiRequest(`/overtime/${id}`)
export const createOvertimeRecord = (payload) =>
  apiRequest('/overtime', { method: 'POST', body: JSON.stringify(payload || {}) })
export const updateOvertimeRecord = (id, payload) =>
  apiRequest(`/overtime/${id}`, { method: 'PUT', body: JSON.stringify(payload || {}) })
export const deleteOvertimeRecordApi = (id, payload = {}) =>
  apiRequest(`/overtime/${id}`, { method: 'DELETE', body: JSON.stringify(payload) })
export const cancelOvertimeRecord = (id, payload = {}) =>
  apiRequest(`/overtime/${id}/cancel`, { method: 'POST', body: JSON.stringify(payload) })

export const fetchOvertimeDraft = (options = {}) => apiRequest('/overtime/draft', options)
export const saveOvertimeDraftApi = (payload, expectedVersion = null) =>
  apiRequest('/overtime/draft', {
    method: 'POST',
    body: JSON.stringify({
      payload,
      ...(expectedVersion ? { expected_version: expectedVersion } : {}),
    }),
  })
export const clearOvertimeDraftApi = (expectedVersion = null) =>
  apiRequest('/overtime/draft', {
    method: 'DELETE',
    body: JSON.stringify(expectedVersion ? { expected_version: expectedVersion } : {}),
  })
export const fetchOvertimePolicy = (options = {}) => apiRequest('/overtime/policy', options)
export const fetchOvertimeEligibility = () => apiRequest('/overtime/eligibility')
export const classifyOvertimeDateApi = (claimDate) =>
  apiRequest(`/overtime/classify-date?claim_date=${encodeURIComponent(String(claimDate || ''))}`)

export const fetchStaffOvertimeRecords = (params = {}, options = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString()
    ? `/staff/overtime/records?${query.toString()}`
    : '/staff/overtime/records'
  return apiRequest(path, options)
}

export const fetchStaffOvertimeRecord = (ownerId, recordId, options = {}) =>
  apiRequest(`/staff/overtime/records/${ownerId}/${recordId}`, options)
export const fetchStaffOvertimeRecordByPublicId = (publicId, options = {}) =>
  apiRequest(`/staff/overtime/record/${encodeURIComponent(String(publicId || ''))}`, options)
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
export const requestCorrectionStaffOvertimeRecord = (ownerId, recordId, payload = {}) =>
  apiRequest(`/staff/overtime/records/${ownerId}/${recordId}/request-correction`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
