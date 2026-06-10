import { apiRequest } from './httpClient'

export const fetchUserSessions = (id) => apiRequest(`/users/${id}/sessions`)

export const revokeUserSession = (id, sessionId, reason) =>
  apiRequest(`/users/${id}/sessions/${sessionId}/revoke`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  })

export const revokeAllUserSessions = (id, reason) =>
  apiRequest(`/users/${id}/sessions/revoke-all`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  })

export const fetchAuditLogs = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/audit-logs?${query.toString()}` : '/audit-logs'
  return apiRequest(path)
}
