import { apiRequest } from './httpClient'

// Holidays
export const fetchHolidays = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/holidays?${query.toString()}` : '/holidays'
  return apiRequest(path)
}

export const batchSaveHolidaysApi = (payload) =>
  apiRequest('/holidays/batch', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateHolidayApi = (id, payload) =>
  apiRequest(`/holidays/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteHolidayApi = (id) => apiRequest(`/holidays/${id}`, { method: 'DELETE' })
