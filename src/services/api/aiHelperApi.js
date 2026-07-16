import { apiRequest, buildApiUrl, fetchWithCsrfRetry } from './httpClient'

const appendQuery = (basePath, params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, typeof value === 'string' ? value : JSON.stringify(value))
  })
  return query.toString() ? `${basePath}?${query.toString()}` : basePath
}

export const fetchAiHelperContext = (params = {}) =>
  apiRequest(appendQuery('/ai-helper/context', params))

export const fetchAiHelperThread = () => apiRequest('/ai-helper/thread')

export const fetchAiHelperThreads = () => apiRequest('/ai-helper/threads')

export const fetchAiHelperThreadById = (threadId) =>
  apiRequest(appendQuery('/ai-helper/thread', { thread_id: threadId }))

export const deleteAiHelperThread = (threadId) =>
  apiRequest(`/ai-helper/threads/${encodeURIComponent(threadId)}`, { method: 'DELETE' })

export const fetchAiHelperDocuments = () => apiRequest('/ai-helper/documents')

export const fetchAiHelperDocumentDetail = (documentId) =>
  apiRequest(`/ai-helper/documents/${encodeURIComponent(documentId)}`)

export const buildAiHelperDocumentFileUrl = (documentId) =>
  buildApiUrl(`/ai-helper/documents/${encodeURIComponent(documentId)}/file`)

const buildKnowledgeFileRequestError = async (response) => {
  let payload = null
  const contentType = response.headers.get('content-type') || ''
  try {
    payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text()
  } catch {
    payload = null
  }

  const error = new Error(payload?.message || 'Request failed')
  error.status = response.status
  error.payload = payload
  return error
}

export const fetchAiHelperDocumentFileBlob = async (documentId) => {
  const response = await fetchWithCsrfRetry(buildAiHelperDocumentFileUrl(documentId), {
    method: 'GET',
    headers: {
      Accept: 'application/pdf, application/octet-stream, */*',
    },
  })

  if (!response.ok) {
    throw await buildKnowledgeFileRequestError(response)
  }

  return response.blob()
}

export const uploadAiHelperDocument = (formData) =>
  apiRequest('/ai-helper/documents', {
    method: 'POST',
    body: formData,
  })

export const uploadAiHelperMarkdownKnowledge = (formData) =>
  apiRequest('/ai-helper/knowledge/markdown', {
    method: 'POST',
    body: formData,
  })

export const deleteAiHelperDocument = (documentId) =>
  apiRequest(`/ai-helper/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' })

export const fetchAiHelperKnowledgeReview = (params = {}) =>
  apiRequest(appendQuery('/ai-helper/knowledge-review', params))

export const fetchAiHelperKnowledgeReviewDetail = (knowledgeId) =>
  apiRequest(`/ai-helper/knowledge-review/${encodeURIComponent(knowledgeId)}`)

export const updateAiHelperKnowledgeReview = (knowledgeId, payload = {}) =>
  apiRequest(`/ai-helper/knowledge-review/${encodeURIComponent(knowledgeId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteAiHelperKnowledgeReview = (knowledgeId) =>
  apiRequest(`/ai-helper/knowledge-review/${encodeURIComponent(knowledgeId)}`, { method: 'DELETE' })

export const fetchAiHelperDiagnostics = () => apiRequest('/ai-helper/diagnostics')

export const reportAiHelperMessage = (messageId, payload = {}) =>
  apiRequest(`/ai-helper/messages/${encodeURIComponent(messageId)}/report`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const fetchAiHelperReports = (params = {}) =>
  apiRequest(appendQuery('/ai-helper/reports', params))

export const fetchAiHelperReport = (reportId) =>
  apiRequest(`/ai-helper/reports/${encodeURIComponent(reportId)}`)

export const updateAiHelperReport = (reportId, payload = {}) =>
  apiRequest(`/ai-helper/reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

const normalizePayloadText = (text) => {
  if (!text) return ''
  return text
}

const parseSsePayload = (eventName, lines = []) => {
  const payloadText = normalizePayloadText(lines.join('\n').trim())
  if (!eventName) {
    return { event: null, payload: null, parseFailed: false }
  }

  if (!payloadText) {
    return { event: eventName, payload: null, parseFailed: false }
  }

  if (payloadText === '[DONE]') {
    return { event: eventName, payload: null, parseFailed: false }
  }

  try {
    return { event: eventName, payload: JSON.parse(payloadText), parseFailed: false }
  } catch {
    return {
      event: eventName,
      payload: { message: payloadText },
      parseFailed: true,
      parseError: new Error('Malformed SSE payload segment.'),
    }
  }
}

const dispatchSseEvent = (eventName, dataLines, handlers) => {
  if (!eventName && !dataLines.length) return null
  const dispatch = parseSsePayload(eventName, dataLines)
  if (!dispatch.event) return null

  if (dispatch.parseFailed && typeof handlers.onRawError === 'function') {
    handlers.onRawError?.(dispatch.parseError, dispatch.payload)
  }

  if (dispatch.event === 'meta') {
    handlers.onMeta?.(dispatch.payload)
    return null
  }

  if (dispatch.event === 'heartbeat') {
    handlers.onHeartbeat?.(dispatch.payload)
    return null
  }

  if (dispatch.event === 'status') {
    handlers.onStatus?.(dispatch.payload || {})
    return null
  }

  if (dispatch.event === 'delta') {
    handlers.onDelta?.(dispatch.payload || {})
    return null
  }

  if (dispatch.event === 'done') {
    handlers.onDone?.(dispatch.payload || {})
    return 'done'
  }

  if (dispatch.event === 'error') {
    handlers.onError?.(dispatch.payload || {})
    return 'error'
  }

  return null
}

export const streamAiHelperMessage = async (payload, handlers = {}, options = {}) => {
  let response
  try {
    response = await fetchWithCsrfRetry(buildApiUrl('/ai-helper/messages/stream'), {
      method: 'POST',
      body: JSON.stringify(payload || {}),
      signal: options.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      const abortError = new Error('Ask AI response was stopped.')
      abortError.code = 'AI_HELPER_STREAM_ABORTED'
      throw abortError
    }

    const transportError = new Error('Ask AI response could not be streamed. Please try again.')
    transportError.code = 'AI_HELPER_STREAM_TRANSPORT_ERROR'
    throw transportError
  }

  if (!response.ok) {
    let body = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    const error = new Error(body?.message || 'AI helper request failed.')
    error.status = response.status
    error.payload = body
    throw error
  }

  if (!response.body?.getReader) {
    const error = new Error('Streaming is not supported by this browser.')
    error.code = 'AI_HELPER_STREAM_TRANSPORT_ERROR'
    throw error
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let eventName = ''
  let dataLines = []
  let completed = false

  const flushEvent = () => {
    if (!eventName && !dataLines.length) return
    const terminalEvent = dispatchSseEvent(eventName, dataLines, handlers)
    if (terminalEvent === 'done' || terminalEvent === 'error') {
      completed = true
    }
    eventName = ''
    dataLines = []
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let index = buffer.indexOf('\n')
      while (index !== -1) {
        const line = buffer.slice(0, index).replace(/\r$/, '')
        buffer = buffer.slice(index + 1)

        if (line === '') {
          flushEvent()
        } else if (line.startsWith('event:')) {
          eventName = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          const data = line.slice(5).trim()
          if (data) {
            dataLines.push(data)
          }
        }

        index = buffer.indexOf('\n')
      }
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      const abortError = new Error('Ask AI response was stopped.')
      abortError.code = 'AI_HELPER_STREAM_ABORTED'
      throw abortError
    }

    const transportError = new Error('Ask AI response could not be streamed. Please try again.')
    transportError.code = 'AI_HELPER_STREAM_TRANSPORT_ERROR'
    throw transportError
  }

  if (eventName || dataLines.length > 0) {
    flushEvent()
  }

  if (!completed) {
    const error = new Error('Ask AI stream ended before the response finished.')
    error.code = 'AI_HELPER_STREAM_INCOMPLETE'
    throw error
  }
}
