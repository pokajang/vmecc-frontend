export const DEVELOPMENT_API_BASE_URL = 'http://localhost:8000/api'

const trimTrailingSlash = (value) => value.replace(/\/+$/, '')

const isLoopbackHostname = (value) => {
  const hostname = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  )
}

export const resolveApiBaseUrl = ({ configuredUrl, isDevelopment }) => {
  const normalized = trimTrailingSlash(String(configuredUrl || '').trim())
  if (normalized) return normalized
  if (isDevelopment) return DEVELOPMENT_API_BASE_URL
  throw new Error(
    'VITE_API_URL is required outside development. Production builds must provide an explicit API URL.',
  )
}

export const validateProductionEnvironment = ({ command, mode, env }) => {
  if (command !== 'build' || mode !== 'production') return

  const configuredUrl = String(env?.VITE_API_URL || '').trim()
  if (!configuredUrl) {
    throw new Error(
      'Production configuration error: VITE_API_URL is required. Set it to the approved HTTPS API URL.',
    )
  }

  let parsedUrl
  try {
    parsedUrl = new globalThis.URL(configuredUrl)
  } catch {
    throw new Error(
      'Production configuration error: VITE_API_URL must be a valid absolute HTTPS URL.',
    )
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Production configuration error: VITE_API_URL must use HTTPS.')
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Production configuration error: VITE_API_URL must not contain credentials.')
  }
  if (isLoopbackHostname(parsedUrl.hostname)) {
    throw new Error(
      'Production configuration error: VITE_API_URL must not target localhost or another loopback address.',
    )
  }
  if (parsedUrl.search || parsedUrl.hash) {
    throw new Error(
      'Production configuration error: VITE_API_URL must not contain a query string or fragment.',
    )
  }
}
