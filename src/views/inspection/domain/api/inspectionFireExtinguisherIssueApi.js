import { apiRequest } from 'src/services/apiClient'

const issuePath = (id = '') =>
  `/inspection/fire-extinguisher-issues${id ? `/${encodeURIComponent(String(id))}` : ''}`

export const fetchFireExtinguisherIssues = async (filters = {}) => {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) query.set(key, String(value))
  })
  const response = await apiRequest(`${issuePath()}${query.toString() ? `?${query}` : ''}`)
  return { data: Array.isArray(response?.data) ? response.data : [], meta: response?.meta || {} }
}

export const fetchFireExtinguisherIssue = async (id) => {
  const response = await apiRequest(issuePath(id))
  return response?.data || null
}

export const updateFireExtinguisherIssue = async (id, payload) => {
  const response = await apiRequest(issuePath(id), {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return response?.data || null
}

const issueAction = async (id, action, payload) => {
  const response = await apiRequest(`${issuePath(id)}/${action}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response?.data || null
}

export const assignFireExtinguisherIssue = (id, payload) => issueAction(id, 'assign', payload)
export const startFireExtinguisherIssue = (id, payload) => issueAction(id, 'start', payload)
export const resolveFireExtinguisherIssue = (id, payload) => issueAction(id, 'resolve', payload)
export const verifyFireExtinguisherIssue = (id, payload) => issueAction(id, 'verify', payload)
export const reopenFireExtinguisherIssue = (id, payload) => issueAction(id, 'reopen', payload)
export const cancelFireExtinguisherIssue = (id, payload) => issueAction(id, 'cancel', payload)
