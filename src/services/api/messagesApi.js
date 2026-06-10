import { apiRequest, buildApiUrl } from './httpClient'

export const sendInAppMessage = (payload) =>
  apiRequest('/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchMessageContacts = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/messages/contacts?${query.toString()}` : '/messages/contacts'
  return apiRequest(path)
}

export const fetchInboxMessages = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/messages?${query.toString()}` : '/messages'
  return apiRequest(path)
}

export const fetchSentMessages = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/messages/sent?${query.toString()}` : '/messages/sent'
  return apiRequest(path)
}

export const fetchMessage = (id) => apiRequest(`/messages/${id}`)

export const markMessageRead = (id) =>
  apiRequest(`/messages/${id}/read`, {
    method: 'POST',
  })

export const fetchMessageThreads = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/messages/threads?${query.toString()}` : '/messages/threads'
  return apiRequest(path)
}

export const fetchThreadMessages = (userId, params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString()
    ? `/messages/threads/${userId}?${query.toString()}`
    : `/messages/threads/${userId}`
  return apiRequest(path)
}

export const markThreadRead = (userId) =>
  apiRequest(`/messages/threads/${userId}/read`, {
    method: 'POST',
  })

export const deleteMessageApi = (id) =>
  apiRequest(`/messages/${id}`, {
    method: 'DELETE',
  })

export const deleteThreadApi = (userId) =>
  apiRequest(`/messages/threads/${userId}`, {
    method: 'DELETE',
  })

export const deleteThreadForEveryoneApi = (userId) =>
  apiRequest(`/messages/threads/${userId}/everyone`, {
    method: 'DELETE',
  })

export const uploadMessageAttachment = (file) => {
  const form = new FormData()
  form.append('file', file)
  return apiRequest('/messages/attachments', { method: 'POST', body: form })
}

export const getMessageAttachmentUrl = (id) => buildApiUrl(`/messages/attachments/${id}`)

export const deleteMessageAttachmentApi = (id) =>
  apiRequest(`/messages/attachments/${id}`, { method: 'DELETE' })
