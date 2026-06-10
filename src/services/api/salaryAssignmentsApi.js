import { apiRequest } from './httpClient'

export const fetchSalaryAssignments = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString()
    ? `/staff/salary-assignments?${query.toString()}`
    : '/staff/salary-assignments'
  return apiRequest(path)
}
export const fetchSalaryAssignmentHistoryApi = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString()
    ? `/staff/salary-assignments/history?${query.toString()}`
    : '/staff/salary-assignments/history'
  return apiRequest(path)
}
export const createSalaryAssignment = (payload) =>
  apiRequest('/staff/salary-assignments', { method: 'POST', body: JSON.stringify(payload || {}) })
export const updateSalaryAssignmentApi = (id, payload) =>
  apiRequest(`/staff/salary-assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload || {}),
  })
export const deleteSalaryAssignmentApi = (id) =>
  apiRequest(`/staff/salary-assignments/${id}`, { method: 'DELETE' })

export const fetchSalaryAssignmentDraftsApi = () => apiRequest('/staff/salary-assignments/drafts')
export const createSalaryAssignmentDraftApi = (payload) =>
  apiRequest('/staff/salary-assignments/drafts', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
export const updateSalaryAssignmentDraftApi = (id, payload) =>
  apiRequest(`/staff/salary-assignments/drafts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload || {}),
  })
export const deleteSalaryAssignmentDraftApi = (id) =>
  apiRequest(`/staff/salary-assignments/drafts/${id}`, { method: 'DELETE' })
