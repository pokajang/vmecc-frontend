const normalizeBaseUrl = (url) => {
  if (!url) {
    return ''
  }
  return url.endsWith('/') ? url.slice(0, -1) : url
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
export const SYSTEM_MAINTENANCE_EVENT = 'vmecc:system-maintenance'

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

export const apiRequest = async (path, options = {}) => {
  // Do not force Content-Type for FormData — let the browser set it with the multipart boundary.
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
    ...(options.headers || {}),
    ...(getClientId() ? { 'X-Client-Id': getClientId() } : {}),
  }

  const response = await fetch(buildUrl(path), {
    method: options.method || 'GET',
    credentials: 'include',
    ...options,
    headers,
  })

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

  const maintenanceFromHeaders = readMaintenanceHeaderPayload(response)
  if (maintenanceFromHeaders) {
    dispatchSystemMaintenanceEvent({ data: maintenanceFromHeaders })
  }

  return payload
}
