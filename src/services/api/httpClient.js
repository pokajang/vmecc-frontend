const normalizeBaseUrl = (url) => {
  if (!url) {
    return ''
  }
  return url.endsWith('/') ? url.slice(0, -1) : url
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
export const SYSTEM_MAINTENANCE_EVENT = 'vmecc:system-maintenance'

let csrfToken = null

export const getCsrfToken = () => csrfToken

export const setCsrfToken = (token) => {
  const normalized = String(token || '').trim()
  csrfToken = normalized || null
}

export const clearCsrfToken = () => {
  csrfToken = null
}

export const buildUrl = (path) => {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`
  }
  return `${API_BASE_URL}${path}`
}

export const buildApiUrl = (path) => buildUrl(path)

const dispatchSystemMaintenanceEvent = (payload) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  try {
    window.dispatchEvent(
      new CustomEvent(SYSTEM_MAINTENANCE_EVENT, {
        detail: payload,
      }),
    )
  } catch {
    // Non-fatal
  }
}

const readMaintenanceHeaderPayload = (response) => {
  if (!response?.headers) return null
  const enabledHeader = String(response.headers.get('x-system-maintenance-enabled') || '').trim()
  const phase = String(response.headers.get('x-system-maintenance-phase') || '')
    .trim()
    .toLowerCase()
  const graceEndsAt = String(
    response.headers.get('x-system-maintenance-grace-ends-at') || '',
  ).trim()
  const updatedAt = String(response.headers.get('x-system-maintenance-version') || '').trim()
  if (enabledHeader !== '1' || !phase) return null
  return {
    enabled: true,
    phase,
    graceEndsAt: graceEndsAt || null,
    updatedAt: updatedAt || '',
  }
}

export const getClientId = () => {
  try {
    const key = 'vmecc_client_id'
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
      localStorage.setItem(key, id)
    }
    return id
  } catch {
    return undefined
  }
}

const isUnsafeMethod = (method) =>
  !['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase())

const hasHeader = (headers, targetName) =>
  Object.keys(headers || {}).some((name) => name.toLowerCase() === targetName.toLowerCase())

const requestHeaders = (options = {}) => {
  const isFormData = options.body instanceof FormData
  const method = String(options.method || 'GET').toUpperCase()
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
    ...(options.headers || {}),
    ...(getClientId() ? { 'X-Client-Id': getClientId() } : {}),
  }

  if (isUnsafeMethod(method) && csrfToken && !hasHeader(headers, 'X-CSRF-Token')) {
    headers['X-CSRF-Token'] = csrfToken
  }

  return headers
}

export const refreshCsrfToken = async () => {
  const response = await fetch(buildUrl('/auth/session'), {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(getClientId() ? { 'X-Client-Id': getClientId() } : {}),
    },
  })
  if (!response.ok) {
    clearCsrfToken()
    return null
  }
  const payload = await response.json()
  setCsrfToken(payload?.csrf_token)
  return getCsrfToken()
}

export const fetchWithCsrfRetry = async (url, options = {}, retried = false) => {
  const method = String(options.method || 'GET').toUpperCase()
  const { headers: _headers, ...fetchOptions } = options
  const response = await fetch(url, {
    ...fetchOptions,
    method,
    credentials: 'include',
    headers: requestHeaders({ ...options, method }),
  })

  if (response.status === 419 && isUnsafeMethod(method) && !retried) {
    const refreshedToken = await refreshCsrfToken()
    if (refreshedToken) {
      return fetchWithCsrfRetry(url, options, true)
    }
  }

  return response
}

export const apiRequest = async (path, options = {}) => {
  const response = await fetchWithCsrfRetry(buildUrl(path), options)

  let payload = null
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    payload = await response.json()
  } else if (response.status !== 204) {
    payload = await response.text()
  }

  if (!response.ok) {
    const maintenanceFromHeaders = readMaintenanceHeaderPayload(response)
    if (maintenanceFromHeaders) {
      dispatchSystemMaintenanceEvent({ data: maintenanceFromHeaders })
    }
    if (response.status === 503 && payload?.code === 'SYSTEM_MAINTENANCE') {
      dispatchSystemMaintenanceEvent(payload)
    }
    const error = new Error(payload?.message || 'Request failed')
    error.status = response.status
    error.payload = payload
    throw error
  }

  if (payload?.csrf_token) {
    setCsrfToken(payload.csrf_token)
  }

  const maintenanceFromHeaders = readMaintenanceHeaderPayload(response)
  if (maintenanceFromHeaders) {
    dispatchSystemMaintenanceEvent({ data: maintenanceFromHeaders })
  }

  return payload
}
