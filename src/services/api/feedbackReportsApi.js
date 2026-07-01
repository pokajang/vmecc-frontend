import { apiRequest } from './httpClient'

const appendQuery = (basePath, params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, typeof value === 'string' ? value : JSON.stringify(value))
  })
  return query.toString() ? `${basePath}?${query.toString()}` : basePath
}

export const createFeedbackReport = (payload = {}) =>
  apiRequest('/feedback-reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchFeedbackReports = (params = {}) =>
  apiRequest(appendQuery('/feedback-reports', params))

export const fetchFeedbackReport = (reportId) =>
  apiRequest(`/feedback-reports/${encodeURIComponent(reportId)}`)

export const updateFeedbackReport = (reportId, payload = {}) =>
  apiRequest(`/feedback-reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
